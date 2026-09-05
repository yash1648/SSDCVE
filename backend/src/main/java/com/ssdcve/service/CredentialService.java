package com.ssdcve.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssdcve.dto.request.CredentialIssueRequest;
import com.ssdcve.dto.response.CanonicalCredential;
import com.ssdcve.dto.response.SignedCredentialEnvelope;
import com.ssdcve.model.Credential;
import com.ssdcve.model.Issuer;
import com.ssdcve.model.IssuerKey;
import com.ssdcve.model.User;
import com.ssdcve.repository.CredentialRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.PrivateKey;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

@Service
public class CredentialService {

    private static final String VERSION = "1.0";
    private static final String SIGNATURE_ALGORITHM = "Ed25519";

    private final ObjectMapper objectMapper;
    private final CanonicalizationService canonicalizationService;
    private final CryptoService cryptoService;
    private final KeyStoreService keyStoreService;
    private final IpfsService ipfsService;
    private final CredentialRepository credentialRepository;

    public CredentialService(
            ObjectMapper objectMapper,
            CanonicalizationService canonicalizationService,
            CryptoService cryptoService,
            KeyStoreService keyStoreService,
            IpfsService ipfsService,
            CredentialRepository credentialRepository) {

        this.objectMapper = objectMapper;
        this.canonicalizationService = canonicalizationService;
        this.cryptoService = cryptoService;
        this.keyStoreService = keyStoreService;
        this.ipfsService = ipfsService;
        this.credentialRepository = credentialRepository;
    }

    public SignedCredentialEnvelope buildAndSign(
            CredentialIssueRequest request,
            Issuer issuer,
            IssuerKey issuerKey,
            String subjectName)
            throws Exception {

        if (request == null) {
            throw new IllegalArgumentException(
                    "Credential request must not be null"
            );
        }

        if (issuer == null) {
            throw new IllegalArgumentException(
                    "Issuer must not be null"
            );
        }

        if (issuerKey == null) {
            throw new IllegalArgumentException(
                    "Issuer key must not be null"
            );
        }

        if (!issuerKey.isActive()) {
            throw new IllegalStateException(
                    "Issuer key is not active"
            );
        }

        Instant issuedAt = Instant.now();

        String credentialNumber =
                generateCredentialNumber();

        CanonicalCredential credential =
                new CanonicalCredential(
                        credentialNumber,
                        request.type(),
                        request.title(),
                        new CanonicalCredential.IssuerInfo(
                                issuer.getId(),
                                issuer.getName(),
                                issuer.getDomain()
                        ),
                        new CanonicalCredential.SubjectInfo(
                                request.subjectId(),
                                subjectName
                        ),
                        request.claims(),
                        issuedAt,
                        null
                );

        JsonNode credentialNode =
                objectMapper.valueToTree(credential);

        String contentHash =
                canonicalizationService.sha256(
                        credentialNode
                );

        PrivateKey privateKey =
                keyStoreService.loadPrivateKey(
                        issuerKey.getKeyId()
                );

        String signature =
                cryptoService.sign(
                        contentHash,
                        privateKey
                );

        return new SignedCredentialEnvelope(
                VERSION,
                credential,
                contentHash,
                signature,
                SIGNATURE_ALGORITHM,
                issuerKey.getKeyId()
        );
    }

    private byte[] serializeEnvelope(
            SignedCredentialEnvelope envelope)
            throws JsonProcessingException {

        return objectMapper.writeValueAsBytes(envelope);
    }

    @Transactional
    public Credential persistCredential(
            SignedCredentialEnvelope envelope,
            Issuer issuer,
            User subject,
            String metadataJson)
            throws Exception {

        if (envelope == null) {
            throw new IllegalArgumentException(
                    "Envelope must not be null"
            );
        }

        if (issuer == null) {
            throw new IllegalArgumentException(
                    "Issuer must not be null"
            );
        }

        if (subject == null) {
            throw new IllegalArgumentException(
                    "Subject must not be null"
            );
        }

        byte[] envelopeBytes =
                serializeEnvelope(envelope);

        String cid =
                ipfsService.upload(envelopeBytes);

        try {

            Credential credential =
                    new Credential();

            credential.setCredentialNumber(
                    envelope.credential().credentialNumber()
            );

            credential.setIssuer(issuer);

            credential.setSubject(subject);

            credential.setType(
                    envelope.credential().type()
            );

            credential.setTitle(
                    envelope.credential().title()
            );

            credential.setContentHash(
                    envelope.contentHash()
            );

            credential.setIpfsCid(cid);

            credential.setSignature(
                    envelope.signature()
            );

            credential.setSignatureAlgorithm(
                    envelope.signatureAlgorithm()
            );

            credential.setKeyId(
                    envelope.keyId()
            );

            credential.setMetadataJson(
                    metadataJson
            );

            credential.setIssuedAt(
                    LocalDateTime.ofInstant(
                            envelope.credential().issuedAt(),
                            ZoneOffset.UTC
                    )
            );

            if (envelope.credential().expiresAt() != null) {

                credential.setExpiresAt(
                        LocalDateTime.ofInstant(
                                envelope.credential().expiresAt(),
                                ZoneOffset.UTC
                        )
                );
            }

            return credentialRepository.save(
                    credential
            );

        } catch (Exception databaseException) {

            /*
             * PostgreSQL transaction will roll back.
             * The IPFS object is outside that transaction,
             * so explicitly attempt cleanup.
             */
            try {

                ipfsService.remove(cid);

            } catch (Exception cleanupException) {

                databaseException.addSuppressed(
                        cleanupException
                );
            }

            throw databaseException;
        }
    }

    private String generateCredentialNumber() {

        String randomPart =
                UUID.randomUUID()
                        .toString()
                        .replace("-", "")
                        .substring(0, 6)
                        .toUpperCase();

        return "SSD-CVE-"
                + Instant.now().toString().substring(0, 4)
                + "-"
                + randomPart;
    }
}