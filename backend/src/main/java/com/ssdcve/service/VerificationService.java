package com.ssdcve.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssdcve.dto.response.SignedCredentialEnvelope;
import com.ssdcve.dto.response.VerificationResult;
import com.ssdcve.model.Credential;
import com.ssdcve.model.CredentialStatus;
import com.ssdcve.model.CredentialStatus.Status;
import com.ssdcve.model.IssuerKey;
import com.ssdcve.model.VerificationStatus;
import com.ssdcve.repository.CredentialRepository;
import com.ssdcve.repository.CredentialStatusRepository;
import com.ssdcve.repository.IssuerKeyRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class VerificationService {

    private final ObjectMapper objectMapper;
    private final CredentialRepository credentialRepository;
    private final CredentialStatusRepository statusRepository;
    private final IssuerKeyRepository issuerKeyRepository;
    private final IpfsService ipfsService;
    private final CanonicalizationService canonicalizationService;
    private final CryptoService cryptoService;

    public VerificationService(
            ObjectMapper objectMapper,
            CredentialRepository credentialRepository,
            CredentialStatusRepository statusRepository,
            IssuerKeyRepository issuerKeyRepository,
            IpfsService ipfsService,
            CanonicalizationService canonicalizationService,
            CryptoService cryptoService) {

        this.objectMapper = objectMapper;
        this.credentialRepository = credentialRepository;
        this.statusRepository = statusRepository;
        this.issuerKeyRepository = issuerKeyRepository;
        this.ipfsService = ipfsService;
        this.canonicalizationService = canonicalizationService;
        this.cryptoService = cryptoService;
    }

    @Transactional(readOnly = true)
    public VerificationResult verify(
            byte[] uploadedCredential)
            throws Exception {

        if (uploadedCredential == null
                || uploadedCredential.length == 0) {

            return failure(
                    VerificationStatus.NOT_FOUND,
                    "Credential payload is empty"
            );
        }

        final SignedCredentialEnvelope envelope;

        try {
            envelope =
                    objectMapper.readValue(
                            uploadedCredential,
                            SignedCredentialEnvelope.class
                    );
        } catch (Exception ex) {

            return failure(
                    VerificationStatus.TAMPERED,
                    "Invalid credential JSON"
            );
        }

        if (envelope.credential() == null
                || envelope.contentHash() == null
                || envelope.signature() == null
                || envelope.keyId() == null) {

            return failure(
                    VerificationStatus.TAMPERED,
                    "Credential envelope is incomplete"
            );
        }

        String credentialNumber =
                envelope.credential().credentialNumber();

        Optional<Credential> credentialOptional =
                credentialRepository
                        .findByCredentialNumber(
                                credentialNumber
                        );

        if (credentialOptional.isEmpty()) {

            return failure(
                    VerificationStatus.NOT_FOUND,
                    "Credential not in registry"
            );
        }

        Credential credential =
                credentialOptional.get();

        IssuerKey issuerKey =
                issuerKeyRepository
                        .findByIssuerIdAndKeyId(
                                credential.getIssuer().getId(),
                                envelope.keyId()
                        )
                        .orElse(null);

        if (issuerKey == null) {

            return failureForCredential(
                    credential,
                    VerificationStatus.NOT_FOUND,
                    "Unknown issuer key"
            );
        }

        final byte[] storedBytes;

        try {

            storedBytes =
                    ipfsService.retrieve(
                            credential.getIpfsCid()
                    );

        } catch (Exception ex) {

            return failureForCredential(
                    credential,
                    VerificationStatus.UNAVAILABLE,
                    "IPFS document unavailable"
            );
        }

        final SignedCredentialEnvelope storedEnvelope;

        try {

            storedEnvelope =
                    objectMapper.readValue(
                            storedBytes,
                            SignedCredentialEnvelope.class
                    );

        } catch (Exception ex) {

            return failureForCredential(
                    credential,
                    VerificationStatus.TAMPERED,
                    "Stored credential is invalid"
            );
        }

        /*
         * The uploaded credential must represent the same
         * registered credential envelope.
         */
        if (!credentialNumber.equals(
                storedEnvelope.credential()
                        .credentialNumber())) {

            return failureForCredential(
                    credential,
                    VerificationStatus.TAMPERED,
                    "Credential number mismatch"
            );
        }

        String recomputedHash =
                canonicalizationService.sha256(
                        objectMapper.valueToTree(
                                envelope.credential()
                        )
                );

        /*
         * CHECK 1:
         * recomputed payload hash == envelope hash
         */
        if (!recomputedHash.equals(
                envelope.contentHash())) {

            return failureForCredential(
                    credential,
                    VerificationStatus.TAMPERED,
                    "Content hash mismatch"
            );
        }

        /*
         * CHECK 2:
         * recomputed payload hash == DB hash
         */
        if (!recomputedHash.equals(
                credential.getContentHash())) {

            return failureForCredential(
                    credential,
                    VerificationStatus.TAMPERED,
                    "Database hash mismatch"
            );
        }

        /*
         * Also ensure the uploaded envelope hash agrees
         * with the registered envelope.
         */
        if (!envelope.contentHash().equals(
                storedEnvelope.contentHash())) {

            return failureForCredential(
                    credential,
                    VerificationStatus.TAMPERED,
                    "Envelope hash mismatch"
            );
        }

        /*
         * CHECK 3:
         * Ed25519 signature over contentHash.
         */
        final boolean signatureValid;

        try {

            signatureValid =
                    cryptoService.verify(
                            envelope.contentHash(),
                            envelope.signature(),
                            cryptoService
                                    .decodeEd25519PublicKey(
                                            issuerKey.getPublicKey()
                                    )
                    );

        } catch (Exception ex) {

            return failureForCredential(
                    credential,
                    VerificationStatus.TAMPERED,
                    "Invalid signature"
            );
        }

        if (!signatureValid) {

            return failureForCredential(
                    credential,
                    VerificationStatus.TAMPERED,
                    "Invalid signature"
            );
        }

        /*
         * Cryptographic integrity and authenticity are now
         * established. Only now do we trust status and expiry.
         */
        CredentialStatus status =
                statusRepository
                        .findByCredentialId(
                                credential.getId()
                        )
                        .orElse(null);

        if (status != null
                && status.getStatus() == Status.REVOKED) {

            return success(
                    credential,
                    envelope,
                    VerificationStatus.REVOKED,
                    "Credential revoked by issuer"
            );
        }

        if (credential.getExpiresAt() != null
                && credential.getExpiresAt()
                        .isBefore(
                                LocalDateTime.now()
                        )) {

            return success(
                    credential,
                    envelope,
                    VerificationStatus.EXPIRED,
                    "Credential has expired"
            );
        }

        return success(
                credential,
                envelope,
                VerificationStatus.VALID,
                "Credential verified successfully"
        );
    }

    /**
     * Public verification by credential id: loads the stored
     * envelope from IPFS and runs the full verification engine.
     * Used by the QR code printed on certificate PDFs.
     */
    @Transactional(readOnly = true)
    public VerificationResult verifyByCredentialId(
            UUID credentialId)
            throws Exception {

        Credential credential =
                credentialRepository
                        .findById(credentialId)
                        .orElse(null);

        if (credential == null) {

            return failure(
                    VerificationStatus.NOT_FOUND,
                    "Credential not in registry"
            );
        }

        final byte[] storedBytes;

        try {

            storedBytes =
                    ipfsService.retrieve(
                            credential.getIpfsCid()
                    );

        } catch (Exception ex) {

            return failureForCredential(
                    credential,
                    VerificationStatus.UNAVAILABLE,
                    "IPFS document unavailable"
            );
        }

        return verify(storedBytes);
    }

    private VerificationResult success(
            Credential credential,
            SignedCredentialEnvelope envelope,
            VerificationStatus status,
            String reason) {

        return new VerificationResult(
                status == VerificationStatus.VALID,
                status,
                credential.getCredentialNumber(),
                reason,
                credential.getIssuer().getId(),
                credential.getIssuer().getName(),
                credential.getIssuer().getDomain(),
                credential.getIssuer().isVerified(),
                envelope == null
                        ? Map.of()
                        : envelope.credential().claims(),
                credential.getIssuedAt()
                        .toInstant(ZoneOffset.UTC),
                credential.getExpiresAt() == null
                        ? null
                        : credential.getExpiresAt()
                            .toInstant(
                                ZoneOffset.UTC
                            ),
                Instant.now()
        );
    }

    private VerificationResult failureForCredential(
            Credential credential,
            VerificationStatus status,
            String reason) {

        return success(
                credential,
                null,
                status,
                reason
        );
    }

    private VerificationResult failure(
            VerificationStatus status,
            String reason) {

        return new VerificationResult(
                false,
                status,
                null,
                reason,
                null,
                null,
                null,
                false,
                null,
                null,
                null,
                Instant.now()
        );
    }
}