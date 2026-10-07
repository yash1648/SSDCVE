package com.ssdcve.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.ssdcve.dto.response.ChainStatusResponse;
import com.ssdcve.dto.response.RecentAnchorResponse;
import com.ssdcve.model.Credential;
import com.ssdcve.model.CredentialAnchor;
import com.ssdcve.model.Issuer;
import com.ssdcve.repository.CredentialAnchorRepository;
import com.ssdcve.repository.CredentialDisclosureRepository;
import com.ssdcve.repository.CredentialRepository;
import com.ssdcve.repository.CredentialStatusRepository;
import com.ssdcve.repository.IssuerKeyRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class ChainVisibilityTest {

    private CredentialAnchorRepository anchorRepository;
    private BlockchainAnchorService blockchainAnchorService;
    private VerificationService service;

    @BeforeEach
    void setUp() {
        ObjectMapper objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());

        anchorRepository = mock(CredentialAnchorRepository.class);
        blockchainAnchorService = mock(BlockchainAnchorService.class);

        service = new VerificationService(
                objectMapper,
                mock(CredentialRepository.class),
                mock(CredentialStatusRepository.class),
                mock(IssuerKeyRepository.class),
                mock(IpfsService.class),
                new CanonicalizationService(objectMapper),
                new CryptoService(),
                anchorRepository,
                blockchainAnchorService,
                mock(CredentialDisclosureRepository.class)
        );

        when(blockchainAnchorService.getChainId()).thenReturn(31337L);
    }

    private CredentialAnchor anchor(
            String credentialNumber,
            String issuerName,
            long blockNumber) {

        Issuer issuer = mock(Issuer.class);
        when(issuer.getName()).thenReturn(issuerName);

        Credential credential = mock(Credential.class);
        when(credential.getCredentialNumber())
                .thenReturn(credentialNumber);
        when(credential.getIssuer()).thenReturn(issuer);

        CredentialAnchor anchor = new CredentialAnchor(
                credential,
                "0x" + "ab".repeat(32),
                blockNumber,
                31337L
        );
        anchor.setAnchoredAt(LocalDateTime.now());

        return anchor;
    }

    @Test
    void chainStatusReportsBlockAndCount() throws Exception {
        when(blockchainAnchorService.latestBlock()).thenReturn(42L);
        when(anchorRepository.count()).thenReturn(7L);

        ChainStatusResponse status = service.chainStatus();

        assertEquals(31337L, status.chainId());
        assertEquals(42L, status.latestBlock());
        assertEquals(7L, status.anchoredCount());
    }

    @Test
    void chainStatusSurvivesUnreachableNode() throws Exception {
        when(blockchainAnchorService.latestBlock())
                .thenThrow(new java.io.IOException("down"));
        when(anchorRepository.count()).thenReturn(0L);

        ChainStatusResponse status = service.chainStatus();

        assertNull(status.latestBlock());
        assertEquals(0L, status.anchoredCount());
    }

    @Test
    void recentAnchorsMapsNewestFirst() {
        CredentialAnchor first =
                anchor("SSD-CVE-2026-AAAAAA", "Uni A", 9L);
        CredentialAnchor second =
                anchor("SSD-CVE-2026-BBBBBB", "Uni B", 7L);

        when(anchorRepository.findAllByOrderByAnchoredAtDesc(any(Pageable.class)))
                .thenReturn(List.of(first, second));

        List<RecentAnchorResponse> recent =
                service.recentAnchors(20);

        assertEquals(2, recent.size());
        assertEquals("SSD-CVE-2026-AAAAAA", recent.get(0).credentialNumber());
        assertEquals("Uni A", recent.get(0).issuerName());
        assertEquals(9L, recent.get(0).blockNumber());
        assertNotNull(recent.get(0).anchoredAt());
    }

    @Test
    void recentAnchorsClampsLimit() {
        when(anchorRepository.findAllByOrderByAnchoredAtDesc(any(Pageable.class)))
                .thenReturn(List.of());

        service.recentAnchors(0);
        verify(anchorRepository).findAllByOrderByAnchoredAtDesc(
                org.springframework.data.domain.PageRequest.of(0, 1));

        service.recentAnchors(500);
        verify(anchorRepository).findAllByOrderByAnchoredAtDesc(
                org.springframework.data.domain.PageRequest.of(0, 100));
    }
}
