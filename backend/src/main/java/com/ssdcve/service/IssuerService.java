package com.ssdcve.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssdcve.dto.request.CredentialIssueRequest;
import com.ssdcve.dto.request.IssuerRegisterRequest;
import com.ssdcve.dto.response.CredentialResponse;
import com.ssdcve.dto.response.IssuerKeyResponse;
import com.ssdcve.dto.response.IssuerResponse;
import com.ssdcve.dto.response.RevokeResponse;
import com.ssdcve.dto.response.SignedCredentialEnvelope;
import com.ssdcve.dto.response.VerificationRecordResponse;
import com.ssdcve.model.Credential;
import com.ssdcve.model.CredentialStatus;
import com.ssdcve.model.CredentialStatus.Status;
import com.ssdcve.model.Issuer;
import com.ssdcve.model.IssuerKey;
import com.ssdcve.model.Role;
import com.ssdcve.model.User;
import com.ssdcve.repository.CredentialRepository;
import com.ssdcve.repository.CredentialStatusRepository;
import com.ssdcve.repository.IssuerKeyRepository;
import com.ssdcve.repository.IssuerRepository;
import com.ssdcve.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

/**
 * Issuer business layer. The authenticated user (from the JWT
 * principal) is the single source of issuer identity - a client
 * never supplies an issuerId. All authorization, crypto, and
 * persistence is delegated to the existing services.
 */
@Service
public class IssuerService {

    private final UserRepository userRepository;
    private final IssuerRepository issuerRepository;
    private final IssuerKeyRepository issuerKeyRepository;
    private final IssuerKeyService issuerKeyService;
    private final CredentialRepository credentialRepository;
    private final CredentialStatusRepository statusRepository;
    private final CredentialService credentialService;
    private final RevocationService revocationService;
    private final IpfsService ipfsService;
    private final ObjectMapper objectMapper;

    public IssuerService(
            UserRepository userRepository,
            IssuerRepository issuerRepository,
            IssuerKeyRepository issuerKeyRepository,
            IssuerKeyService issuerKeyService,
            CredentialRepository credentialRepository,
            CredentialStatusRepository statusRepository,
            CredentialService credentialService,
            RevocationService revocationService,
            IpfsService ipfsService,
            ObjectMapper objectMapper) {

        this.userRepository = userRepository;
        this.issuerRepository = issuerRepository;
        this.issuerKeyRepository = issuerKeyRepository;
        this.issuerKeyService = issuerKeyService;
        this.credentialRepository = credentialRepository;
        this.statusRepository = statusRepository;
        this.credentialService = credentialService;
        this.revocationService = revocationService;
        this.ipfsService = ipfsService;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public IssuerResponse register(
            UUID userId,
            IssuerRegisterRequest request) {

        if (issuerRepository.existsByUserId(userId)) {
            throw new IllegalArgumentException(
                    "Issuer already registered for this user"
            );
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "User not found: " + userId
                        ));

        Issuer issuer = new Issuer();

        issuer.setUser(user);
        issuer.setName(request.name());
        issuer.setDomain(request.domain());
        issuer.setVerified(false);

        issuer = issuerRepository.save(issuer);

        return new IssuerResponse(
                issuer.getId(),
                issuer.getName(),
                issuer.getDomain(),
                issuer.isVerified(),
                issuer.getCreatedAt()
        );
    }

    @Transactional
    public IssuerKeyResponse createSigningKey(UUID userId)
            throws Exception {

        Issuer issuer = requireVerifiedIssuer(userId);

        IssuerKey key =
                issuerKeyService.createSigningKey(
                        issuer.getId()
                );

        return new IssuerKeyResponse(
                key.getKeyId(),
                key.getPublicKey(),
                key.getAlgorithm(),
                key.isActive(),
                key.getCreatedAt(),
                key.getRevokedAt()
        );
    }

    @Transactional
    public CredentialResponse issueCredential(
            UUID userId,
            CredentialIssueRequest request)
            throws Exception {

        Issuer issuer = requireVerifiedIssuer(userId);

        IssuerKey key =
                issuerKeyRepository
                        .findByIssuerIdAndActiveTrue(
                                issuer.getId()
                        )
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Issuer has no active "
                                                + "signing key"
                                ));

        User subject =
                userRepository.findById(request.subjectId())
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Subject not found: "
                                                + request.subjectId()
                                ));

        SignedCredentialEnvelope envelope =
                credentialService.buildAndSign(
                        request,
                        issuer,
                        key,
                        subject.getFullName()
                );

        String metadataJson =
                objectMapper.writeValueAsString(
                        request.claims()
                );

        Credential credential =
                credentialService.persistCredential(
                        envelope,
                        issuer,
                        subject,
                        metadataJson
                );

        return toCredentialResponse(credential);
    }

    @Transactional(readOnly = true)
    public List<CredentialResponse> listCredentials(
            UUID userId) {

        Issuer issuer = getIssuerForUser(userId);

        return credentialRepository
                .findByIssuerIdOrderByIssuedAtDesc(
                        issuer.getId()
                )
                .stream()
                .map(this::toCredentialResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public CredentialResponse getCredential(
            UUID userId,
            UUID credentialId) {

        Issuer issuer = getIssuerForUser(userId);

        Credential credential =
                credentialRepository
                        .findByIdAndIssuerId(
                                credentialId,
                                issuer.getId()
                        )
                        .orElseThrow(() ->
                                /*
                                 * 404 for both "does not exist"
                                 * and "belongs to another issuer":
                                 * no cross-tenant existence leak.
                                 */
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "Credential not found: "
                                                + credentialId
                                ));

        return toCredentialResponse(credential);
    }

    /**
     * Attaches the student's original certificate document
     * (scan/PDF) to an issued credential. The document is stored
     * on IPFS and composed into the certificate PDF on download.
     * It is an attachment, not part of the signed envelope.
     */
    @Transactional
    public CredentialResponse attachDocument(
            UUID userId,
            UUID credentialId,
            byte[] document,
            String contentType)
            throws Exception {

        Issuer issuer = requireVerifiedIssuer(userId);

        Credential credential =
                credentialRepository
                        .findByIdAndIssuerId(
                                credentialId,
                                issuer.getId()
                        )
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "Credential not found: "
                                                + credentialId
                                ));

        String cid = ipfsService.upload(document);

        credential.setDocumentCid(cid);
        credential.setDocumentContentType(contentType);
        credentialRepository.save(credential);

        return toCredentialResponse(credential);
    }

    @Transactional
    public RevokeResponse revokeCredential(
            UUID userId,
            Role role,
            UUID credentialId,
            String reason) {

        CredentialStatus status;

        if (role == Role.ADMIN) {

            /*
             * ADMIN acts across issuers: resolve the credential's
             * own issuer and pass it through the existing
             * RevocationService ownership check, which then
             * passes trivially.
             */
            Credential credential =
                    credentialRepository
                            .findById(credentialId)
                            .orElseThrow(() ->
                                    new IllegalArgumentException(
                                            "Credential not found: "
                                                    + credentialId
                                    ));

            status = revocationService.revoke(
                    credentialId,
                    credential.getIssuer(),
                    reason
            );

        } else {

            Issuer issuer = getIssuerForUser(userId);

            /*
             * Ownership check lives inside RevocationService:
             * cross-issuer revocation throws SecurityException.
             */
            status = revocationService.revoke(
                    credentialId,
                    issuer,
                    reason
            );
        }

        return new RevokeResponse(
                credentialId,
                status.getCredential().getCredentialNumber(),
                status.getStatus(),
                status.getRevokedAt(),
                status.getReason()
        );
    }

    @Transactional(readOnly = true)
    public List<VerificationRecordResponse> listVerifications(
            UUID userId) {

        Issuer issuer = getIssuerForUser(userId);

        return credentialRepository
                .findByIssuerIdOrderByIssuedAtDesc(
                        issuer.getId()
                )
                .stream()
                .map(credential -> {

                    CredentialStatus status =
                            statusRepository
                                    .findByCredentialId(
                                            credential.getId()
                                    )
                                    .orElse(null);

                    return new VerificationRecordResponse(
                            credential.getCredentialNumber(),
                            status == null
                                    ? Status.ACTIVE
                                    : status.getStatus(),
                            status == null
                                    ? null
                                    : status.getReason(),
                            status == null
                                    ? null
                                    : status.getRevokedAt(),
                            credential.getIssuedAt()
                                    .toInstant(ZoneOffset.UTC),
                            credential.getExpiresAt() == null
                                    ? null
                                    : credential.getExpiresAt()
                                        .toInstant(
                                                ZoneOffset.UTC
                                        )
                    );
                })
                .toList();
    }

    private Issuer getIssuerForUser(UUID userId) {

        return issuerRepository.findByUserId(userId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Issuer not registered for user: "
                                        + userId
                        ));
    }

    private Issuer requireVerifiedIssuer(UUID userId) {

        Issuer issuer = getIssuerForUser(userId);

        if (!issuer.isVerified()) {
            throw new SecurityException(
                    "Issuer is not verified"
            );
        }

        return issuer;
    }

    private CredentialResponse toCredentialResponse(
            Credential credential) {

        CredentialStatus status =
                statusRepository
                        .findByCredentialId(
                                credential.getId()
                        )
                        .orElse(null);

        return new CredentialResponse(
                credential.getId(),
                credential.getCredentialNumber(),
                credential.getType(),
                credential.getTitle(),
                credential.getContentHash(),
                credential.getIpfsCid(),
                credential.getDocumentCid(),
                credential.getSignature(),
                credential.getSignatureAlgorithm(),
                credential.getKeyId(),
                credential.getIssuedAt()
                        .toInstant(ZoneOffset.UTC),
                credential.getExpiresAt() == null
                        ? null
                        : credential.getExpiresAt()
                            .toInstant(ZoneOffset.UTC),
                status == null
                        ? Status.ACTIVE
                        : status.getStatus()
        );
    }
}