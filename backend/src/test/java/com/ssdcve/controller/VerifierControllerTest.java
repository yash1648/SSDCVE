package com.ssdcve.controller;

import com.ssdcve.dto.response.VerificationResult;
import com.ssdcve.model.VerificationStatus;
import com.ssdcve.service.JwtUtil;
import com.ssdcve.service.VerificationHistoryService;
import com.ssdcve.service.VerificationService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(VerifierController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(JwtUtil.class)
class VerifierControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private VerificationService verificationService;

    @MockBean
    private VerificationHistoryService verificationHistoryService;

    private MockMultipartFile credentialFile() {
        return new MockMultipartFile(
                "credentialFile",
                "credential.json",
                "application/json",
                "{}".getBytes()
        );
    }

    private VerificationResult result(
            boolean valid,
            VerificationStatus status) {

        return new VerificationResult(
                valid,
                status,
                "SSD-CVE-2026-ABC123",
                "reason",
                UUID.randomUUID(),
                "Example University",
                "example.edu",
                true,
                Map.of(
                        "degree", "BE",
                        "field", "Computer Science"
                ),
                Instant.now(),
                null,
                Instant.now()
        );
    }

    @Test
    void verify_validCredential_returns200() throws Exception {

        when(verificationService.verify(any(byte[].class)))
                .thenReturn(
                        result(
                                true,
                                VerificationStatus.VALID
                        )
                );

        mockMvc.perform(
                        multipart("/api/verifier/verify")
                                .file(credentialFile())
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valid").value(true))
                .andExpect(
                        jsonPath("$.status")
                                .value("VALID")
                )
                .andExpect(
                        jsonPath("$.credentialNumber")
                                .value("SSD-CVE-2026-ABC123")
                )
                .andExpect(
                        jsonPath("$.issuerName")
                                .value("Example University")
                );
    }

    @Test
    void verify_tamperedResult_returns200WithTampered()
            throws Exception {

        when(verificationService.verify(any(byte[].class)))
                .thenReturn(
                        result(
                                false,
                                VerificationStatus.TAMPERED
                        )
                );

        mockMvc.perform(
                        multipart("/api/verifier/verify")
                                .file(credentialFile())
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valid").value(false))
                .andExpect(
                        jsonPath("$.status")
                                .value("TAMPERED")
                );
    }

    @Test
    void verify_revokedResult_returns200WithRevoked()
            throws Exception {

        when(verificationService.verify(any(byte[].class)))
                .thenReturn(
                        result(
                                false,
                                VerificationStatus.REVOKED
                        )
                );

        mockMvc.perform(
                        multipart("/api/verifier/verify")
                                .file(credentialFile())
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valid").value(false))
                .andExpect(
                        jsonPath("$.status")
                                .value("REVOKED")
                );
    }

    @Test
    void verify_emptyFile_returns400() throws Exception {

        MockMultipartFile empty =
                new MockMultipartFile(
                        "credentialFile",
                        "credential.json",
                        "application/json",
                        new byte[0]
                );

        mockMvc.perform(
                        multipart("/api/verifier/verify")
                                .file(empty)
                )
                .andExpect(status().isBadRequest())
                .andExpect(
                        jsonPath("$.status")
                                .value("TAMPERED")
                );
    }

    @Test
    void verify_missingFile_returns400() throws Exception {

        mockMvc.perform(
                        multipart("/api/verifier/verify")
                )
                .andExpect(status().isBadRequest());
    }
}