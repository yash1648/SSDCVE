package com.ssdcve.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.ssdcve.dto.response.CanonicalCredential;
import com.ssdcve.dto.response.SignedCredentialEnvelope;
import com.ssdcve.dto.response.VerificationResult;
import com.ssdcve.model.Credential;
import com.ssdcve.model.CredentialStatus;
import com.ssdcve.model.CredentialStatus.Status;
import com.ssdcve.model.Issuer;
import com.ssdcve.model.IssuerKey;
import com.ssdcve.model.VerificationStatus;
import com.ssdcve.repository.CredentialRepository;
import com.ssdcve.repository.CredentialStatusRepository;
import com.ssdcve.repository.IssuerKeyRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class VerificationServiceTest {

    private static final String CREDENTIAL_NUMBER =
            "SSD-CVE-2026-A1B2C3";
    private static final String KEY_ID =
            "issuer-key-2026-01";

    private ObjectMapper objectMapper;
    private CanonicalizationService canonicalizationService;
    private CryptoService cryptoService;
    private CredentialRepository credentialRepository;
    private CredentialStatusRepository statusRepository;
    private IssuerKeyRepository issuerKeyRepository;
    private IpfsService ipfsService;
    private VerificationService service;

    private UUID issuerId;
    private UUID subjectId;
    private UUID credentialId;
    private KeyPair keyPair;
    private Issuer issuer;
    private Credential credential;
    private IssuerKey issuerKey;
    private SignedCredentialEnvelope envelope;
    private byte[] envelopeBytes;

    @BeforeEach
    void setUp() throws Exception {

        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());

        canonicalizationService =
                new CanonicalizationService(objectMapper);

        cryptoService = new CryptoService();

        credentialRepository =
                mock(CredentialRepository.class);

        statusRepository =
                mock(CredentialStatusRepository.class);

        issuerKeyRepository =
                mock(IssuerKeyRepository.class);

        ipfsService =
                mock(IpfsService.class);

        service =
                new VerificationService(
                        objectMapper,
                        credentialRepository,
                        statusRepository,
                        issuerKeyRepository,
                        ipfsService,
                        canonicalizationService,
                        cryptoService
                );

        issuerId = UUID.randomUUID();
        subjectId = UUID.randomUUID();
        credentialId = UUID.randomUUID();

        KeyPairGenerator generator =
                KeyPairGenerator.getInstance("Ed25519");

        keyPair = generator.generateKeyPair();

        issuer = mock(Issuer.class);
        when(issuer.getId()).thenReturn(issuerId);
        when(issuer.getName())
                .thenReturn("Example University");
        when(issuer.getDomain())
                .thenReturn("example.edu");
        when(issuer.isVerified()).thenReturn(true);

        issuerKey = mock(IssuerKey.class);
        when(issuerKey.getPublicKey())
                .thenReturn(
                        Base64.getEncoder()
                                .encodeToString(
                                        keyPair.getPublic()
                                                .getEncoded()
                                )
                );

        credential = mock(Credential.class);
        when(credential.getId()).thenReturn(credentialId);
        when(credential.getCredentialNumber())
                .thenReturn(CREDENTIAL_NUMBER);
        when(credential.getIssuer()).thenReturn(issuer);
        when(credential.getIssuedAt())
                .thenReturn(
                        LocalDateTime.of(
                                2026, 1, 15, 10, 30
                        )
                );
        when(credential.getExpiresAt())
                .thenReturn(null);
        when(credential.getIpfsCid())
                .thenReturn("QmTestCid");

        envelope =
                buildEnvelope(
                        Map.of(
                                "degree", "BE",
                                "field", "Computer Science"
                        ),
                        keyPair
                );

        envelopeBytes =
                objectMapper.writeValueAsBytes(envelope);

        when(credential.getContentHash())
                .thenReturn(envelope.contentHash());

        when(credentialRepository
                .findByCredentialNumber(CREDENTIAL_NUMBER))
                .thenReturn(Optional.of(credential));

        when(issuerKeyRepository
                .findByIssuerIdAndKeyId(
                        issuerId,
                        KEY_ID
                ))
                .thenReturn(Optional.of(issuerKey));

        when(ipfsService.retrieve(anyString()))
                .thenReturn(envelopeBytes);
    }

    private SignedCredentialEnvelope buildEnvelope(
            Map<String, Object> claims,
            KeyPair signingKey)
            throws Exception {

        CanonicalCredential canonical =
                new CanonicalCredential(
                        CREDENTIAL_NUMBER,
                        "DegreeCertificate",
                        "Bachelor of Engineering",
                        new CanonicalCredential.IssuerInfo(
                                issuerId,
                                "Example University",
                                "example.edu"
                        ),
                        new CanonicalCredential.SubjectInfo(
                                subjectId,
                                "Test Student"
                        ),
                        claims,
                        Instant.parse("2026-01-15T10:30:00Z"),
                        null
                );

        String contentHash =
                canonicalizationService.sha256(
                        objectMapper.valueToTree(canonical)
                );

        String signature =
                cryptoService.sign(
                        contentHash,
                        signingKey.getPrivate()
                );

        return new SignedCredentialEnvelope(
                "1.0",
                canonical,
                contentHash,
                signature,
                "Ed25519",
                KEY_ID
        );
    }

    @Test
    void validCredential_returnsValid()
            throws Exception {

        VerificationResult result =
                service.verify(envelopeBytes);

        assertEquals(
                VerificationStatus.VALID,
                result.status()
        );
        assertTrue(result.valid());
        assertEquals(
                CREDENTIAL_NUMBER,
                result.credentialNumber()
        );
        assertEquals(issuerId, result.issuerId());
        assertEquals(
                "Example University",
                result.issuerName()
        );
        assertTrue(result.issuerVerified());
        assertEquals(
                Map.of(
                        "degree", "BE",
                        "field", "Computer Science"
                ),
                result.claims()
        );
        assertNotNull(result.verifiedAt());
    }

    @Test
    void modifiedPayload_returnsTampered()
            throws Exception {

        SignedCredentialEnvelope tampered =
                buildEnvelope(
                        Map.of(
                                "degree", "PhD",
                                "field", "Physics"
                        ),
                        keyPair
                );

        /*
         * Simulate an attacker who modified the claims but kept
         * the original contentHash and signature.
         */
        SignedCredentialEnvelope stale =
                new SignedCredentialEnvelope(
                        tampered.version(),
                        tampered.credential(),
                        envelope.contentHash(),
                        envelope.signature(),
                        tampered.signatureAlgorithm(),
                        tampered.keyId()
                );

        VerificationResult result =
                service.verify(
                        objectMapper.writeValueAsBytes(stale)
                );

        assertEquals(
                VerificationStatus.TAMPERED,
                result.status()
        );
        assertFalse(result.valid());
    }

    @Test
    void envelopeHashMismatch_returnsTampered()
            throws Exception {

        /*
         * Uploaded envelope is internally consistent, but the
         * stored envelope in IPFS has a different contentHash.
         */
        SignedCredentialEnvelope otherEnvelope =
                buildEnvelope(
                        Map.of(
                                "degree", "BE",
                                "field", "Computer Science"
                        ),
                        keyPair
                );

        SignedCredentialEnvelope differentStored =
                new SignedCredentialEnvelope(
                        otherEnvelope.version(),
                        otherEnvelope.credential(),
                        "deadbeef",
                        otherEnvelope.signature(),
                        otherEnvelope.signatureAlgorithm(),
                        otherEnvelope.keyId()
                );

        when(ipfsService.retrieve(anyString()))
                .thenReturn(
                        objectMapper.writeValueAsBytes(
                                differentStored
                        )
                );

        VerificationResult result =
                service.verify(envelopeBytes);

        assertEquals(
                VerificationStatus.TAMPERED,
                result.status()
        );
    }

    @Test
    void databaseHashMismatch_returnsTampered()
            throws Exception {

        when(credential.getContentHash())
                .thenReturn("deadbeef");

        VerificationResult result =
                service.verify(envelopeBytes);

        assertEquals(
                VerificationStatus.TAMPERED,
                result.status()
        );
    }

    @Test
    void invalidSignature_returnsTampered()
            throws Exception {

        KeyPairGenerator generator =
                KeyPairGenerator.getInstance("Ed25519");

        KeyPair attackerKey =
                generator.generateKeyPair();

        SignedCredentialEnvelope forged =
                buildEnvelope(
                        Map.of(
                                "degree", "BE",
                                "field", "Computer Science"
                        ),
                        attackerKey
                );

        VerificationResult result =
                service.verify(
                        objectMapper.writeValueAsBytes(forged)
                );

        assertEquals(
                VerificationStatus.TAMPERED,
                result.status()
        );
    }

    @Test
    void unknownKey_returnsNotFound()
            throws Exception {

        when(issuerKeyRepository
                .findByIssuerIdAndKeyId(
                        issuerId,
                        KEY_ID
                ))
                .thenReturn(Optional.empty());

        VerificationResult result =
                service.verify(envelopeBytes);

        assertEquals(
                VerificationStatus.NOT_FOUND,
                result.status()
        );
    }

    @Test
    void revokedCredential_returnsRevoked()
            throws Exception {

        CredentialStatus status =
                new CredentialStatus();

        status.setStatus(Status.REVOKED);
        status.setRevokedAt(LocalDateTime.now());
        status.setReason("Degree revoked");

        when(statusRepository
                .findByCredentialId(credentialId))
                .thenReturn(Optional.of(status));

        VerificationResult result =
                service.verify(envelopeBytes);

        assertEquals(
                VerificationStatus.REVOKED,
                result.status()
        );
        assertFalse(result.valid());
    }

    @Test
    void expiredCredential_returnsExpired()
            throws Exception {

        when(credential.getExpiresAt())
                .thenReturn(
                        LocalDateTime.now()
                                .minusDays(30)
                );

        VerificationResult result =
                service.verify(envelopeBytes);

        assertEquals(
                VerificationStatus.EXPIRED,
                result.status()
        );
        assertFalse(result.valid());
    }

    @Test
    void revokedAndTampered_returnsTampered()
            throws Exception {

        CredentialStatus status =
                new CredentialStatus();

        status.setStatus(Status.REVOKED);
        status.setRevokedAt(LocalDateTime.now());

        when(statusRepository
                .findByCredentialId(credentialId))
                .thenReturn(Optional.of(status));

        SignedCredentialEnvelope tampered =
                buildEnvelope(
                        Map.of(
                                "degree", "PhD",
                                "field", "Physics"
                        ),
                        keyPair
                );

        SignedCredentialEnvelope stale =
                new SignedCredentialEnvelope(
                        tampered.version(),
                        tampered.credential(),
                        envelope.contentHash(),
                        envelope.signature(),
                        tampered.signatureAlgorithm(),
                        tampered.keyId()
                );

        VerificationResult result =
                service.verify(
                        objectMapper.writeValueAsBytes(stale)
                );

        assertEquals(
                VerificationStatus.TAMPERED,
                result.status()
        );
    }

    @Test
    void expiredAndTampered_returnsTampered()
            throws Exception {

        when(credential.getExpiresAt())
                .thenReturn(
                        LocalDateTime.now()
                                .minusDays(30)
                );

        SignedCredentialEnvelope tampered =
                buildEnvelope(
                        Map.of(
                                "degree", "PhD",
                                "field", "Physics"
                        ),
                        keyPair
                );

        SignedCredentialEnvelope stale =
                new SignedCredentialEnvelope(
                        tampered.version(),
                        tampered.credential(),
                        envelope.contentHash(),
                        envelope.signature(),
                        tampered.signatureAlgorithm(),
                        tampered.keyId()
                );

        VerificationResult result =
                service.verify(
                        objectMapper.writeValueAsBytes(stale)
                );

        assertEquals(
                VerificationStatus.TAMPERED,
                result.status()
        );
    }

    @Test
    void ipfsUnavailable_returnsUnavailable()
            throws Exception {

        when(ipfsService.retrieve(anyString()))
                .thenThrow(
                        new IOException("IPFS down")
                );

        VerificationResult result =
                service.verify(envelopeBytes);

        assertEquals(
                VerificationStatus.UNAVAILABLE,
                result.status()
        );
        assertFalse(result.valid());
    }

    @Test
    void unknownCredential_returnsNotFound()
            throws Exception {

        when(credentialRepository
                .findByCredentialNumber(CREDENTIAL_NUMBER))
                .thenReturn(Optional.empty());

        VerificationResult result =
                service.verify(envelopeBytes);

        assertEquals(
                VerificationStatus.NOT_FOUND,
                result.status()
        );
        assertFalse(result.valid());
    }

    @Test
    void emptyPayload_returnsNotFound()
            throws Exception {

        VerificationResult result =
                service.verify(new byte[0]);

        assertEquals(
                VerificationStatus.NOT_FOUND,
                result.status()
        );
    }

    @Test
    void invalidJson_returnsTampered()
            throws Exception {

        VerificationResult result =
                service.verify(
                        "not json".getBytes()
                );

        assertEquals(
                VerificationStatus.TAMPERED,
                result.status()
        );
    }
}