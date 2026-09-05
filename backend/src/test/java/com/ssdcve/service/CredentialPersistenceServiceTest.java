package com.ssdcve.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.ssdcve.dto.response.CanonicalCredential;
import com.ssdcve.dto.response.SignedCredentialEnvelope;
import com.ssdcve.model.Credential;
import com.ssdcve.model.Issuer;
import com.ssdcve.model.User;
import com.ssdcve.repository.CredentialRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class CredentialPersistenceServiceTest {

    private ObjectMapper objectMapper;
    private CanonicalizationService canonicalizationService;
    private IpfsService ipfsService;
    private CredentialRepository credentialRepository;
    private CredentialService service;

    private SignedCredentialEnvelope envelope;
    private Issuer issuer;
    private User subject;
    private String expectedCid;

    @BeforeEach
    void setUp() throws Exception {

        objectMapper =
                new ObjectMapper();

        objectMapper.registerModule(
                new JavaTimeModule()
        );

        canonicalizationService =
                new CanonicalizationService(objectMapper);

        ipfsService =
                mock(IpfsService.class);

        credentialRepository =
                mock(CredentialRepository.class);

        service =
                new CredentialService(
                        objectMapper,
                        canonicalizationService,
                        new CryptoService(),
                        mock(KeyStoreService.class),
                        ipfsService,
                        credentialRepository
                );

        expectedCid =
                "QmTestCid123456789abcdef";

        when(ipfsService.upload(any(byte[].class)))
                .thenReturn(expectedCid);

        when(credentialRepository.save(any(Credential.class)))
                .thenAnswer(invocation -> {
                    Credential c =
                            invocation.getArgument(0);
                    return c;
                });

        issuer = new Issuer();
        issuer.setName("Example University");
        issuer.setDomain("example.edu");

        subject = new User();
        subject.setEmail("student@example.edu");
        subject.setFullName("Test Student");

        CanonicalCredential credential =
                new CanonicalCredential(
                        "SSD-CVE-2026-A1B2C3",
                        "DegreeCertificate",
                        "Bachelor of Engineering",
                        new CanonicalCredential.IssuerInfo(
                                issuer.getId(),
                                issuer.getName(),
                                issuer.getDomain()
                        ),
                        new CanonicalCredential.SubjectInfo(
                                subject.getId(),
                                subject.getEmail()
                        ),
                        Map.of("degree", "BE"),
                        Instant.parse("2026-01-15T10:30:00Z"),
                        null
                );

        String contentHash =
                canonicalizationService.sha256(
                        objectMapper.valueToTree(credential)
                );

        envelope =
                new SignedCredentialEnvelope(
                        "1.0",
                        credential,
                        contentHash,
                        "mocked-signature-base64",
                        "Ed25519",
                        "issuer-key-2026-01"
                );
    }

    @Test
    void persistCredential_happyPath() throws Exception {

        Credential saved =
                service.persistCredential(
                        envelope,
                        issuer,
                        subject,
                        null
                );

        assertNotNull(saved);
        assertEquals(
                "SSD-CVE-2026-A1B2C3",
                saved.getCredentialNumber()
        );
        assertEquals(
                "DegreeCertificate",
                saved.getType()
        );
        assertEquals(
                "Bachelor of Engineering",
                saved.getTitle()
        );
        assertEquals(
                envelope.contentHash(),
                saved.getContentHash()
        );
        assertEquals(
                expectedCid,
                saved.getIpfsCid()
        );
        assertEquals(
                envelope.signature(),
                saved.getSignature()
        );
        assertEquals(
                envelope.signatureAlgorithm(),
                saved.getSignatureAlgorithm()
        );
        assertEquals(
                envelope.keyId(),
                saved.getKeyId()
        );
        assertSame(issuer, saved.getIssuer());
        assertSame(subject, saved.getSubject());

        verify(ipfsService)
                .upload(any(byte[].class));

        verify(credentialRepository)
                .save(any(Credential.class));
    }

    @Test
    void persistCredential_dbFailure_triggersIpfsCleanup()
            throws Exception {

        when(credentialRepository.save(any()))
                .thenThrow(
                        new RuntimeException("DB failure")
                );

        assertThrows(
                RuntimeException.class,
                () -> service.persistCredential(
                        envelope,
                        issuer,
                        subject,
                        null
                )
        );

        verify(ipfsService)
                .upload(any(byte[].class));

        verify(ipfsService)
                .remove(expectedCid);
    }

    @Test
    void persistCredential_cleanupFailure_stillThrowsOriginal()
            throws Exception {

        when(credentialRepository.save(any()))
                .thenThrow(
                        new RuntimeException("DB failure")
                );

        doThrow(new IOException("cleanup failure"))
                .when(ipfsService)
                .remove(expectedCid);

        RuntimeException thrown =
                assertThrows(
                        RuntimeException.class,
                        () -> service.persistCredential(
                                envelope,
                                issuer,
                                subject,
                                null
                        )
                );

        assertEquals(
                "DB failure",
                thrown.getMessage()
        );

        assertEquals(
                1,
                thrown.getSuppressed().length
        );

        assertEquals(
                "cleanup failure",
                thrown.getSuppressed()[0].getMessage()
        );
    }

    @Test
    void persistCredential_ipfsFails_noDatabaseInteraction()
            throws Exception {

        when(ipfsService.upload(any(byte[].class)))
                .thenThrow(
                        new IOException("IPFS down")
                );

        assertThrows(
                IOException.class,
                () -> service.persistCredential(
                        envelope,
                        issuer,
                        subject,
                        null
                )
        );

        verify(credentialRepository, never())
                .save(any());

        verify(ipfsService, never())
                .remove(any());
    }

    @Test
    void persistCredential_rejectsNullEnvelope() {

        assertThrows(
                IllegalArgumentException.class,
                () -> service.persistCredential(
                        null,
                        issuer,
                        subject,
                        null
                )
        );
    }

    @Test
    void persistCredential_rejectsNullIssuer() {

        assertThrows(
                IllegalArgumentException.class,
                () -> service.persistCredential(
                        envelope,
                        null,
                        subject,
                        null
                )
        );
    }

    @Test
    void persistCredential_rejectsNullSubject() {

        assertThrows(
                IllegalArgumentException.class,
                () -> service.persistCredential(
                        envelope,
                        issuer,
                        null,
                        null
                )
        );
    }
}