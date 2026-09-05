package com.ssdcve.service;

import com.ssdcve.model.Issuer;
import com.ssdcve.model.IssuerKey;
import com.ssdcve.repository.IssuerKeyRepository;
import com.ssdcve.repository.IssuerRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.KeyPair;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.time.Year;
import java.util.Base64;
import java.util.UUID;

@Service
public class IssuerKeyService {

    private final IssuerRepository issuerRepository;
    private final IssuerKeyRepository issuerKeyRepository;
    private final KeyStoreService keyStoreService;

    public IssuerKeyService(
            IssuerRepository issuerRepository,
            IssuerKeyRepository issuerKeyRepository,
            KeyStoreService keyStoreService) {

        this.issuerRepository = issuerRepository;
        this.issuerKeyRepository = issuerKeyRepository;
        this.keyStoreService = keyStoreService;
    }

    @Transactional
    public IssuerKey createSigningKey(UUID issuerId) throws Exception {

        Issuer issuer = issuerRepository.findById(issuerId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Issuer not found: " + issuerId
                        ));

        KeyPair keyPair =
                keyStoreService.generateEd25519KeyPair();

        String keyId = generateUniqueKeyId();

        String publicKey =
                encodePublicKey(keyPair.getPublic());

        /*
         * First create the DB record as INACTIVE.
         * The key becomes active only after the private key
         * has successfully been stored in PKCS12.
         */
        IssuerKey issuerKey = new IssuerKey();

        issuerKey.setIssuer(issuer);
        issuerKey.setKeyId(keyId);
        issuerKey.setPublicKey(publicKey);
        issuerKey.setAlgorithm("Ed25519");
        issuerKey.setActive(false);

        issuerKey = issuerKeyRepository.save(issuerKey);

        boolean privateKeyStored = false;

        try {

            PrivateKey privateKey = keyPair.getPrivate();

            keyStoreService.storePrivateKey(
                    keyId,
                    privateKey
            );

            privateKeyStored = true;

            issuerKey.setActive(true);

            return issuerKeyRepository.save(issuerKey);

        } catch (Exception ex) {

            if (privateKeyStored) {
                try {
                    keyStoreService.deletePrivateKey(keyId);
                } catch (Exception cleanupException) {
                    ex.addSuppressed(cleanupException);
                }
            }

            issuerKeyRepository.delete(issuerKey);

            throw ex;
        }
    }

    public String encodePublicKey(PublicKey publicKey) {

        if (publicKey == null) {
            throw new IllegalArgumentException(
                    "Public key must not be null"
            );
        }

        byte[] encoded = publicKey.getEncoded();

        if (encoded == null) {
            throw new IllegalArgumentException(
                    "Public key has no encoded representation"
            );
        }

        return Base64.getEncoder().encodeToString(encoded);
    }

    private String generateUniqueKeyId() {

        String keyId;

        do {
            keyId =
                    "issuer-key-"
                    + Year.now()
                    + "-"
                    + UUID.randomUUID();

        } while (issuerKeyRepository.existsByKeyId(keyId));

        return keyId;
    }
}