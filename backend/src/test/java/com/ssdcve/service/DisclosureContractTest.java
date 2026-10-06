package com.ssdcve.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssdcve.model.Credential;
import com.ssdcve.model.CredentialDisclosure;
import com.ssdcve.model.HolderWallet;
import com.ssdcve.repository.CredentialAnchorRepository;
import com.ssdcve.repository.CredentialDisclosureRepository;
import com.ssdcve.repository.CredentialRepository;
import com.ssdcve.repository.CredentialStatusRepository;
import com.ssdcve.repository.HolderWalletRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Disclosure is presentation-layer privacy. The raw file still
 * contains every claim, and the UI tells the holder so. If this test
 * ever fails, the product is describing a guarantee it does not have.
 */
class DisclosureContractTest {

    @Test
    @DisplayName("the raw download still contains every claim, hidden ones included")
    void rawDownloadIsNeverFiltered() throws Exception {
        Map<String, Object> claims = new LinkedHashMap<>();
        claims.put("major", "Computer Science");
        claims.put("gpa", "3.9");

        Map<String, Object> credentialNode = new LinkedHashMap<>();
        credentialNode.put("credentialNumber", "SSD-TEST-0001");
        credentialNode.put("type", "Degree");
        credentialNode.put("title", "Bachelor of Science");
        credentialNode.put("claims", claims);

        Map<String, Object> envelope = new LinkedHashMap<>();
        envelope.put("credential", credentialNode);
        envelope.put("contentHash", "a".repeat(64));
        envelope.put("signature", "sig");
        envelope.put("keyId", "key-1");

        byte[] stored = new ObjectMapper().writeValueAsBytes(envelope);

        HolderWalletRepository walletRepository = mock(HolderWalletRepository.class);
        IpfsService ipfsService = mock(IpfsService.class);
        CredentialDisclosureRepository disclosureRepository =
                mock(CredentialDisclosureRepository.class);

        UUID userId = UUID.randomUUID();
        UUID credentialId = UUID.randomUUID();

        Credential credential = new Credential();
        credential.setIpfsCid("bafytestcid");

        HolderWallet wallet = new HolderWallet();
        wallet.setCredential(credential);

        when(walletRepository.findByUserIdAndCredentialId(userId, credentialId))
                .thenReturn(Optional.of(wallet));
        when(ipfsService.retrieve("bafytestcid")).thenReturn(stored);

        when(disclosureRepository.findByCredentialId(credentialId))
                .thenReturn(Optional.of(
                        new CredentialDisclosure(credential, Set.of("gpa"))));

        HolderService holderService = new HolderService(
                walletRepository,
                mock(CredentialRepository.class),
                mock(CredentialStatusRepository.class),
                ipfsService,
                mock(CredentialAnchorRepository.class),
                disclosureRepository,
                new ObjectMapper(),
                mock(CertificatePdfService.class),
                "http://localhost:6969"
        );

        byte[] downloaded = holderService.downloadCredential(userId, credentialId);

        String json = new String(downloaded, StandardCharsets.UTF_8);

        assertThat(json).contains("\"gpa\"").contains("3.9");
    }

    @Test
    @DisplayName("the download still requires wallet ownership")
    void downloadRemainsScopedToTheOwner() {
        HolderWalletRepository walletRepository = mock(HolderWalletRepository.class);

        UUID userId = UUID.randomUUID();
        UUID credentialId = UUID.randomUUID();

        when(walletRepository.findByUserIdAndCredentialId(userId, credentialId))
                .thenReturn(Optional.empty());

        HolderService holderService = new HolderService(
                walletRepository,
                mock(CredentialRepository.class),
                mock(CredentialStatusRepository.class),
                mock(IpfsService.class),
                mock(CredentialAnchorRepository.class),
                mock(CredentialDisclosureRepository.class),
                new ObjectMapper(),
                mock(CertificatePdfService.class),
                "http://localhost:6969"
        );

        assertThatThrownBy(() -> holderService.downloadCredential(userId, credentialId))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("404");
    }
}
