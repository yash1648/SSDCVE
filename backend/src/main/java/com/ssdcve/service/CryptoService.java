package com.ssdcve.service;

import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.security.Signature;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;

@Service
public class CryptoService {

    private static final String ALGORITHM = "Ed25519";

    public String sign(String content, PrivateKey privateKey)
            throws GeneralSecurityException {

        if (content == null || content.isBlank()) {
            throw new IllegalArgumentException("Content must not be null or blank");
        }

        if (privateKey == null) {
            throw new IllegalArgumentException("Private key must not be null");
        }

        Signature signature = Signature.getInstance(ALGORITHM);
        signature.initSign(privateKey);
        signature.update(content.getBytes(StandardCharsets.UTF_8));

        return Base64.getEncoder().encodeToString(signature.sign());
    }

    public boolean verify(
            String content,
            String base64Signature,
            PublicKey publicKey)
            throws GeneralSecurityException {

        if (content == null || content.isBlank()) {
            return false;
        }

        if (base64Signature == null || base64Signature.isBlank()) {
            return false;
        }

        if (publicKey == null) {
            return false;
        }

        final byte[] signatureBytes;

        try {
            signatureBytes = Base64.getDecoder().decode(base64Signature);
        } catch (IllegalArgumentException ex) {
            return false;
        }

        Signature signature = Signature.getInstance(ALGORITHM);
        signature.initVerify(publicKey);
        signature.update(content.getBytes(StandardCharsets.UTF_8));

        return signature.verify(signatureBytes);
    }

    public PublicKey decodeEd25519PublicKey(
            String base64PublicKey)
            throws GeneralSecurityException {

        if (base64PublicKey == null
                || base64PublicKey.isBlank()) {

            throw new IllegalArgumentException(
                    "Public key must not be blank"
            );
        }

        final byte[] encoded;

        try {
            encoded =
                    Base64.getDecoder()
                            .decode(base64PublicKey);
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException(
                    "Invalid Base64 public key",
                    ex
            );
        }

        KeyFactory keyFactory =
                KeyFactory.getInstance("Ed25519");

        return keyFactory.generatePublic(
                new X509EncodedKeySpec(encoded)
        );
    }
}