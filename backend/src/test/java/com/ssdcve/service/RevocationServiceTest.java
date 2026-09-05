package com.ssdcve.service;

import com.ssdcve.model.Credential;
import com.ssdcve.model.CredentialStatus;
import com.ssdcve.model.CredentialStatus.Status;
import com.ssdcve.model.Issuer;
import com.ssdcve.repository.CredentialRepository;
import com.ssdcve.repository.CredentialStatusRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class RevocationServiceTest {

    private CredentialRepository credentialRepository;
    private CredentialStatusRepository statusRepository;
    private RevocationService service;

    private UUID credentialId;
    private Issuer issuerA;
    private Issuer issuerB;
    private Credential credential;

    @BeforeEach
    void setUp() {

        credentialRepository =
                mock(CredentialRepository.class);

        statusRepository =
                mock(CredentialStatusRepository.class);

        service =
                new RevocationService(
                        credentialRepository,
                        statusRepository
                );

        credentialId =
                UUID.randomUUID();

        issuerA = mock(Issuer.class);
        when(issuerA.getId())
                .thenReturn(UUID.randomUUID());
        when(issuerA.getName())
                .thenReturn("Issuer A");

        issuerB = mock(Issuer.class);
        when(issuerB.getId())
                .thenReturn(UUID.randomUUID());
        when(issuerB.getName())
                .thenReturn("Issuer B");

        credential = new Credential();
        credential.setIssuer(issuerA);
    }

    @Test
    void revoke_activeToRevoked() {

        when(credentialRepository.findById(credentialId))
                .thenReturn(Optional.of(credential));

        when(statusRepository.findByCredentialId(credentialId))
                .thenReturn(Optional.empty());

        when(statusRepository.save(any(CredentialStatus.class)))
                .thenAnswer(invocation ->
                        invocation.getArgument(0));

        CredentialStatus result =
                service.revoke(
                        credentialId,
                        issuerA,
                        "Degree revoked"
                );

        assertEquals(Status.REVOKED, result.getStatus());
        assertNotNull(result.getRevokedAt());
        assertEquals("Degree revoked", result.getReason());
        assertSame(credential, result.getCredential());

        verify(statusRepository, times(1))
                .save(any(CredentialStatus.class));
    }

    @Test
    void revoke_alreadyRevoked_isIdempotent() {

        when(credentialRepository.findById(credentialId))
                .thenReturn(Optional.of(credential));

        CredentialStatus alreadyRevoked =
                new CredentialStatus();

        alreadyRevoked.setCredential(credential);
        alreadyRevoked.setStatus(Status.REVOKED);
        alreadyRevoked.setRevokedAt(
                java.time.LocalDateTime.now()
        );
        alreadyRevoked.setReason("Original reason");

        when(statusRepository.findByCredentialId(credentialId))
                .thenReturn(Optional.of(alreadyRevoked));

        CredentialStatus result =
                service.revoke(
                        credentialId,
                        issuerA,
                        "Second attempt"
                );

        assertEquals(Status.REVOKED, result.getStatus());
        assertEquals(
                "Original reason",
                result.getReason()
        );

        verify(statusRepository, never())
                .save(any(CredentialStatus.class));
    }

    @Test
    void revoke_crossIssuer_rejected() {

        when(credentialRepository.findById(credentialId))
                .thenReturn(Optional.of(credential));

        assertThrows(
                SecurityException.class,
                () -> service.revoke(
                        credentialId,
                        issuerB,
                        "malicious"
                )
        );

        verifyNoInteractions(statusRepository);
    }

    @Test
    void revoke_credentialNotFound() {

        when(credentialRepository.findById(credentialId))
                .thenReturn(Optional.empty());

        assertThrows(
                IllegalArgumentException.class,
                () -> service.revoke(
                        credentialId,
                        issuerA,
                        "reason"
                )
        );

        verifyNoInteractions(statusRepository);
    }

    @Test
    void revoke_nullCredentialId() {

        assertThrows(
                IllegalArgumentException.class,
                () -> service.revoke(
                        null,
                        issuerA,
                        "reason"
                )
        );
    }

    @Test
    void revoke_nullIssuer() {

        assertThrows(
                IllegalArgumentException.class,
                () -> service.revoke(
                        credentialId,
                        null,
                        "reason"
                )
        );
    }
}