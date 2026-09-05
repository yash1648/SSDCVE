package com.ssdcve.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.ssdcve.dto.request.CredentialIssueRequest;
import com.ssdcve.dto.response.SignedCredentialEnvelope;
import com.ssdcve.model.Issuer;
import com.ssdcve.model.IssuerKey;
import com.ssdcve.repository.CredentialRepository;
import org.junit.jupiter.api.Test;

import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class CredentialServiceTest {

    @Test
    void buildAndSign_createsCorrectSignedEnvelope()
            throws Exception {

        ObjectMapper objectMapper =
                new ObjectMapper();

        objectMapper.registerModule(
                new JavaTimeModule()
        );

        CanonicalizationService canonicalizationService =
                new CanonicalizationService(objectMapper);

        CryptoService cryptoService =
                new CryptoService();

        KeyStoreService keyStoreService =
                mock(KeyStoreService.class);

        KeyPairGenerator generator =
                KeyPairGenerator.getInstance("Ed25519");

        KeyPair keyPair =
                generator.generateKeyPair();

        String keyId =
                "issuer-key-2026-01";

        when(keyStoreService.loadPrivateKey(keyId))
                .thenReturn(keyPair.getPrivate());

        Issuer issuer = new Issuer();
        issuer.setName("Example University");
        issuer.setDomain("example.edu");

        IssuerKey issuerKey = new IssuerKey();
        issuerKey.setIssuer(issuer);
        issuerKey.setKeyId(keyId);
        issuerKey.setActive(true);
        issuerKey.setAlgorithm("Ed25519");

        CredentialIssueRequest request =
                new CredentialIssueRequest(
                        UUID.randomUUID(),
                        "DegreeCertificate",
                        "Bachelor of Engineering",
                        Map.of(
                                "degree", "BE",
                                "field", "Computer Science"
                        )
                );

        IpfsService ipfsService =
                mock(IpfsService.class);

        CredentialRepository credentialRepository =
                mock(CredentialRepository.class);

        CredentialService service =
                new CredentialService(
                        objectMapper,
                        canonicalizationService,
                        cryptoService,
                        keyStoreService,
                        ipfsService,
                        credentialRepository
                );

        SignedCredentialEnvelope envelope =
                service.buildAndSign(
                        request,
                        issuer,
                        issuerKey,
                        "Test Student"
                );

        assertNotNull(envelope);
        assertEquals("1.0", envelope.version());
        assertNotNull(envelope.credential());
        assertNotNull(envelope.contentHash());
        assertNotNull(envelope.signature());
        assertEquals(
                "Ed25519",
                envelope.signatureAlgorithm()
        );
        assertEquals(
                keyId,
                envelope.keyId()
        );

        /*
         * Verify the signature using the corresponding public key.
         */
        assertTrue(
                cryptoService.verify(
                        envelope.contentHash(),
                        envelope.signature(),
                        keyPair.getPublic()
                )
        );

        /*
         * Recompute the hash from the actual payload and ensure
         * it equals the envelope hash.
         */
        JsonNode payload =
                objectMapper.valueToTree(
                        envelope.credential()
                );

        String recomputedHash =
                canonicalizationService.sha256(payload);

        assertEquals(
                envelope.contentHash(),
                recomputedHash
        );
    }
}