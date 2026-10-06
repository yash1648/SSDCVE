package com.ssdcve.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssdcve.dto.request.CredentialIssueRequest;
import com.ssdcve.dto.request.IssuerRegisterRequest;
import com.ssdcve.dto.response.*;
import com.ssdcve.model.*;
import com.ssdcve.model.CredentialStatus.Status;
import com.ssdcve.repository.*;
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
 * never supplies an issuerId. All authorization, crypto, blockchain
 * anchoring, and persistence is delegated to the appropriate services.
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
    private final CredentialAnchorRepository anchorRepository;
    private final BlockchainAnchorService blockchainAnchorService;
    private final HolderWalletRepository walletRepository;
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
            CredentialAnchorRepository anchorRepository,
            BlockchainAnchorService blockchainAnchorService,
            HolderWalletRepository walletRepository,
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
        this.anchorRepository = anchorRepository;
        this.blockchainAnchorService = blockchainAnchorService;
        this.walletRepository = walletRepository;
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

    @Transactional(readOnly = true)
    public IssuerResponse getIssuerProfile(UUID userId) {

        Issuer issuer = issuerRepository.findByUserId(userId)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Issuer not registered for user: "
                                        + userId
                        ));

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

        /*
         * Anchor the content hash on-chain. Failure rolls back the
         * credential insert: every issued credential is anchored.
         */
        String txHash =
                blockchainAnchorService.anchor(
                        credential.getContentHash()
                );

        Long blockNumber =
                blockchainAnchorService.getBlockNumber(
                        txHash
                );

        anchorRepository.save(
                new CredentialAnchor(
                        credential,
                        txHash,
                        blockNumber,
                        blockchainAnchorService.getChainId()
                )
        );

        deliverToSubject(subject, credential);

        return toCredentialResponse(credential);
    }

    /**
     * Puts a freshly issued credential straight into its recipient's
     * wallet, so issuing IS delivery and the holder has nothing to do.
     */
    private void deliverToSubject(
            User subject,
            Credential credential) {

        if (walletRepository.existsByUserIdAndCredentialId(
                subject.getId(),
                credential.getId())) {

            return;
        }

        HolderWallet entry = new HolderWallet();
        entry.setUser(subject);
        entry.setCredential(credential);
        walletRepository.save(entry);
    }

    /**
     * Resolves a recipient by email so the issuer picks a person rather
     * than a pasted account id.
     */
    @Transactional(readOnly = true)
    public UserResponse findHolderByEmail(String email) {

        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException(
                    "An email address is required"
            );
        }

        User holder =
                userRepository
                        .findByEmail(email.trim().toLowerCase())
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "No holder with that email"
                                ));

        return new UserResponse(
                holder.getId(),
                holder.getEmail(),
                holder.getFullName(),
                holder.getRole()
        );
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

        CredentialAnchor anchor =
                anchorRepository
                        .findByCredentialId(
                                credential.getId()
                        )
                        .orElse(null);

        return new CredentialResponse(
                credential.getId(),
                credential.getCredentialNumber(),
                credential.getType(),
                credential.getTitle(),
                credential.getSubject() == null
                        ? null
                        : credential.getSubject().getId(),
                credential.getSubject() == null
                        ? null
                        : credential.getSubject().getFullName(),
                credential.getContentHash(),
                credential.getIpfsCid(),
                credential.getDocumentCid(),
                anchor == null
                        ? null
                        : anchor.getTxHash(),
                anchor == null
                        ? null
                        : anchor.getBlockNumber(),
                anchor == null
                        ? null
                        : anchor.getChainId(),
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