package com.ssdcve.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.GeneralSecurityException;
import java.security.KeyFactory;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.KeyStore;
import java.security.PrivateKey;
import java.security.spec.PKCS8EncodedKeySpec;

@Service
public class KeyStoreService {

    private static final String KEYSTORE_TYPE = "PKCS12";
    private static final String KEY_ALGORITHM = "Ed25519";

    /*
     * PKCS12's built-in provider accepts protected SecretKeyEntry
     * values using recognized keystore algorithms.
     *
     * We use AES only as the storage-entry label. The bytes being
     * protected are still the PKCS#8-encoded Ed25519 private key.
     */
    private static final String STORAGE_ALGORITHM = "AES";

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

        KeyPairGenerator generator =
                KeyPairGenerator.getInstance(KEY_ALGORITHM);

        return generator.generateKeyPair();
    }

    public void storePrivateKey(
            String keyId,
            PrivateKey privateKey)
            throws GeneralSecurityException, IOException {

        requireValidKeyId(keyId);

        if (privateKey == null) {
            throw new IllegalArgumentException(
                    "Private key must not be null"
            );
        }

        if (!KEY_ALGORITHM.equalsIgnoreCase(privateKey.getAlgorithm())
                && !"EdDSA".equalsIgnoreCase(privateKey.getAlgorithm())) {
            throw new IllegalArgumentException(
                    "Expected Ed25519 private key"
            );
        }

        KeyStore keyStore = loadOrCreate();

        byte[] encodedPrivateKey = privateKey.getEncoded();

        if (encodedPrivateKey == null) {
            throw new GeneralSecurityException(
                    "Private key does not provide an encoded representation"
            );
        }

        SecretKey protectedKey =
                new SecretKeySpec(encodedPrivateKey, STORAGE_ALGORITHM);

        KeyStore.SecretKeyEntry entry =
                new KeyStore.SecretKeyEntry(protectedKey);

        KeyStore.PasswordProtection protection =
                new KeyStore.PasswordProtection(keystorePassword);

        keyStore.setEntry(keyId, entry, protection);

        persist(keyStore);
    }

    public PrivateKey loadPrivateKey(String keyId)
            throws GeneralSecurityException, IOException {

        requireValidKeyId(keyId);

        KeyStore keyStore = loadOrCreate();

        KeyStore.PasswordProtection protection =
                new KeyStore.PasswordProtection(keystorePassword);

        KeyStore.Entry entry =
                keyStore.getEntry(keyId, protection);

        if (!(entry instanceof KeyStore.SecretKeyEntry secretKeyEntry)) {
            throw new GeneralSecurityException(
                    "No private key found for alias: " + keyId
            );
        }

        SecretKey secretKey = secretKeyEntry.getSecretKey();

        byte[] encodedPrivateKey = secretKey.getEncoded();

        if (encodedPrivateKey == null) {
            throw new GeneralSecurityException(
                    "Stored private key has no encoded bytes"
            );
        }

        KeyFactory keyFactory =
                KeyFactory.getInstance(KEY_ALGORITHM);

        return keyFactory.generatePrivate(
                new PKCS8EncodedKeySpec(encodedPrivateKey)
        );
    }

    public boolean containsAlias(String keyId)
            throws GeneralSecurityException, IOException {

        requireValidKeyId(keyId);

        KeyStore keyStore = loadOrCreate();

        return keyStore.containsAlias(keyId);
    }

    public void deletePrivateKey(String keyId)
            throws GeneralSecurityException, IOException {

        requireValidKeyId(keyId);

        KeyStore keyStore = loadOrCreate();

        if (!keyStore.containsAlias(keyId)) {
            return;
        }

        keyStore.deleteEntry(keyId);
        persist(keyStore);
    }

    public KeyStore loadOrCreate()
            throws GeneralSecurityException, IOException {

        KeyStore keyStore =
                KeyStore.getInstance(KEYSTORE_TYPE);

        if (Files.exists(keystorePath)) {

            try (InputStream inputStream =
                         Files.newInputStream(keystorePath)) {

                keyStore.load(
                        inputStream,
                        keystorePassword
                );
            }

        } else {
            keyStore.load(
                    null,
                    keystorePassword
            );
        }

        return keyStore;
    }

    private void persist(KeyStore keyStore)
            throws GeneralSecurityException, IOException {

        Path parent = keystorePath.getParent();

        if (parent != null) {
            Files.createDirectories(parent);
        }

        try (OutputStream outputStream =
                     Files.newOutputStream(keystorePath)) {

            keyStore.store(
                    outputStream,
                    keystorePassword
            );
        }
    }

    private void requireValidKeyId(String keyId) {

        if (keyId == null || keyId.isBlank()) {
            throw new IllegalArgumentException(
                    "keyId must not be null or blank"
            );
        }
    }
}