package com.ssdcve.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Path;
import java.security.KeyPair;
import java.security.PrivateKey;
import java.security.PublicKey;

import static org.junit.jupiter.api.Assertions.*;

class KeyStoreServiceTest {

    @Test
    void storeAndReloadPrivateKey_survivesKeystoreReload(
            @TempDir Path tempDir) throws Exception {

        Path keystorePath =
                tempDir.resolve("test-keystore.p12");

        String password = "test-password";
        String keyId = "issuer-key-2026-01";

        KeyStoreService firstInstance =
                new KeyStoreService(
                        keystorePath.toString(),
                        password
                );

        KeyPair original =
                firstInstance.generateEd25519KeyPair();

        firstInstance.storePrivateKey(
                keyId,
                original.getPrivate()
        );

        assertTrue(
                firstInstance.containsAlias(keyId)
        );

        /*
         * Simulate application restart by constructing
         * an entirely new service instance.
         */
        KeyStoreService secondInstance =
                new KeyStoreService(
                        keystorePath.toString(),
                        password
                );

        PrivateKey reloaded =
                secondInstance.loadPrivateKey(keyId);

        assertNotNull(reloaded);

        assertEquals(
                original.getPrivate().getAlgorithm(),
                reloaded.getAlgorithm()
        );

        CryptoService cryptoService =
                new CryptoService();

        String content = "persistent SSD-CVE test";

        String signature =
                cryptoService.sign(
                        content,
                        reloaded
                );

        boolean verified =
                cryptoService.verify(
                        content,
                        signature,
                        original.getPublic()
                );

        assertTrue(verified);
    }

    @Test
    void wrongPassword_cannotReloadPrivateKey(
            @TempDir Path tempDir) throws Exception {

        Path keystorePath =
                tempDir.resolve("test-keystore.p12");

        KeyStoreService writer =
                new KeyStoreService(
                        keystorePath.toString(),
                        "correct-password"
                );

        KeyPair keyPair =
                writer.generateEd25519KeyPair();

        writer.storePrivateKey(
                "issuer-key-2026-01",
                keyPair.getPrivate()
        );

        KeyStoreService reader =
                new KeyStoreService(
                        keystorePath.toString(),
                        "wrong-password"
                );

        assertThrows(
                Exception.class,
                () -> reader.loadPrivateKey(
                        "issuer-key-2026-01"
                )
        );
    }

    @Test
    void unknownAlias_isRejected(
            @TempDir Path tempDir) throws Exception {

        Path keystorePath =
                tempDir.resolve("test-keystore.p12");

        KeyStoreService service =
                new KeyStoreService(
                        keystorePath.toString(),
                        "test-password"
                );

        assertThrows(
                Exception.class,
                () -> service.loadPrivateKey(
                        "does-not-exist"
                )
        );
    }
}