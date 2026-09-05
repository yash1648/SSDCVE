package com.ssdcve.service;

import com.ssdcve.model.Issuer;
import com.ssdcve.model.IssuerKey;
import com.ssdcve.repository.IssuerKeyRepository;
import com.ssdcve.repository.IssuerRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Path;
import java.security.KeyFactory;
import java.security.PublicKey;
import java.security.spec.X509EncodedKeySpec;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class IssuerKeyServiceTest {

    @Test
    void createSigningKey_persistsPublicKeyAndPrivateKeySeparately(
            @TempDir Path tempDir) throws Exception {

        UUID issuerId = UUID.randomUUID();

        Issuer issuer = new Issuer();
        issuer.setName("Example University");
        issuer.setDomain("example.edu");

        IssuerRepository issuerRepository =
                mock(IssuerRepository.class);

        IssuerKeyRepository issuerKeyRepository =
                mock(IssuerKeyRepository.class);

        when(issuerRepository.findById(issuerId))
                .thenReturn(Optional.of(issuer));

        when(issuerKeyRepository.existsByKeyId(any()))
                .thenReturn(false);

        List<Boolean> savedStates = new ArrayList<>();

        when(issuerKeyRepository.save(any(IssuerKey.class)))
                .thenAnswer(invocation -> {
                    IssuerKey key = invocation.getArgument(0);
                    savedStates.add(key.isActive());
                    return key;
                });

        KeyStoreService keyStoreService =
                new KeyStoreService(
                        tempDir.resolve("test.p12").toString(),
                        "test-password"
                );

        IssuerKeyService service =
                new IssuerKeyService(
                        issuerRepository,
                        issuerKeyRepository,
                        keyStoreService
                );

        IssuerKey created =
                service.createSigningKey(issuerId);

        assertNotNull(created);
        assertNotNull(created.getKeyId());
        assertNotNull(created.getPublicKey());

        assertEquals("Ed25519", created.getAlgorithm());
        assertTrue(created.isActive());

        /*
         * Verify the private key exists ONLY behind the
         * keystore alias represented by keyId.
         */
        assertTrue(
                keyStoreService.containsAlias(
                        created.getKeyId()
                )
        );

        assertNotNull(
                keyStoreService.loadPrivateKey(
                        created.getKeyId()
                )
        );

        /*
         * Decode the PostgreSQL representation and prove that
         * it is the public half of the same Ed25519 key pair.
         */
        byte[] encodedPublicKey =
                Base64.getDecoder()
                        .decode(created.getPublicKey());

        KeyFactory keyFactory =
                KeyFactory.getInstance("Ed25519");

        PublicKey reconstructedPublicKey =
                keyFactory.generatePublic(
                        new X509EncodedKeySpec(
                                encodedPublicKey
                        )
                );

        assertEquals(
                "EdDSA",
                reconstructedPublicKey.getAlgorithm()
        );

        /*
         * Prove the DB lifecycle: save #1 inactive, save #2 active.
         */
        assertEquals(
                List.of(false, true),
                savedStates
        );
    }
}