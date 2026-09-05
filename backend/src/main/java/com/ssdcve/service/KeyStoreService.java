package com.ssdcve.service;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyPairGenerator;
import java.security.KeyStore;
import java.security.PrivateKey;
import java.security.GeneralSecurityException;
import java.security.KeyPair;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class KeyStoreService {

    private final Path keystorePath;
    private final char[] keystorePassword;

    public KeyStoreService(
            @Value("${ssdcve.keystore.path}") String keystorePath,
            @Value("${ssdcve.keystore.password}") String keystorePassword) {

        this.keystorePath = Path.of(keystorePath);
        this.keystorePassword = keystorePassword.toCharArray();
    }

    public KeyPair generateEd25519KeyPair()
            throws GeneralSecurityException {

        KeyPairGenerator generator = KeyPairGenerator.getInstance("Ed25519");
        return generator.generateKeyPair();
    }

    public KeyStore loadOrCreate()
            throws GeneralSecurityException, IOException {

        KeyStore keyStore = KeyStore.getInstance("PKCS12");

        if (Files.exists(keystorePath)) {
            try (InputStream inputStream = Files.newInputStream(keystorePath)) {
                keyStore.load(inputStream, keystorePassword);
            }
        } else {
            keyStore.load(null, keystorePassword);
        }

        return keyStore;
    }

    public void store(
            String alias,
            PrivateKey privateKey)
            throws GeneralSecurityException, IOException {

        KeyStore keyStore = loadOrCreate();

        /*
         * PKCS12 private-key entries require a certificate chain in
         * the standard KeyStore API, so this operation will be
         * implemented through the dedicated key/certificate utility
         * in the next step.
         */
        throw new UnsupportedOperationException(
                "Private-key persistence implementation is next"
        );
    }
}