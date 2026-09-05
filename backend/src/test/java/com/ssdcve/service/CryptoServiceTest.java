package com.ssdcve.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.security.KeyPair;
import java.security.KeyPairGenerator;

import static org.junit.jupiter.api.Assertions.*;

class CryptoServiceTest {

    private CryptoService cryptoService;
    private KeyPair keyPair;

    @BeforeEach
    void setUp() throws Exception {
        cryptoService = new CryptoService();

        KeyPairGenerator generator = KeyPairGenerator.getInstance("Ed25519");
        keyPair = generator.generateKeyPair();
    }

    @Test
    void signThenVerify_returnsTrue() throws Exception {
        String content = "hello SSD-CVE";

        String signature = cryptoService.sign(
                content,
                keyPair.getPrivate()
        );

        assertNotNull(signature);
        assertFalse(signature.isBlank());

        boolean verified = cryptoService.verify(
                content,
                signature,
                keyPair.getPublic()
        );

        assertTrue(verified);
    }

    @Test
    void tamperedContent_returnsFalse() throws Exception {
        String original = "hello SSD-CVE";

        String signature = cryptoService.sign(
                original,
                keyPair.getPrivate()
        );

        boolean verified = cryptoService.verify(
                "hello TAMPERED",
                signature,
                keyPair.getPublic()
        );

        assertFalse(verified);
    }

    @Test
    void wrongPublicKey_returnsFalse() throws Exception {
        String content = "hello SSD-CVE";

        String signature = cryptoService.sign(
                content,
                keyPair.getPrivate()
        );

        KeyPairGenerator generator = KeyPairGenerator.getInstance("Ed25519");
        KeyPair differentKeyPair = generator.generateKeyPair();

        boolean verified = cryptoService.verify(
                content,
                signature,
                differentKeyPair.getPublic()
        );

        assertFalse(verified);
    }

    @Test
    void invalidBase64Signature_returnsFalse() throws Exception {
        boolean verified = cryptoService.verify(
                "hello SSD-CVE",
                "not-valid-base64!!!",
                keyPair.getPublic()
        );

        assertFalse(verified);
    }

    @Test
    void emptyContent_isRejectedForSigning() {
        assertThrows(
                IllegalArgumentException.class,
                () -> cryptoService.sign("", keyPair.getPrivate())
        );
    }
}