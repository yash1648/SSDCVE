package com.ssdcve.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssdcve.dto.response.BatchItemResult;
import com.ssdcve.dto.response.BatchVerificationResponse;
import com.ssdcve.dto.response.VerificationChecks;
import com.ssdcve.service.BatchVerificationService;
import com.ssdcve.service.VerificationHistoryService;
import com.ssdcve.service.VerificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class VerifierControllerBatchTest {

    private MockMvc mockMvc;

    @Mock
    private VerificationService verificationService;

    @Mock
    private VerificationHistoryService verificationHistoryService;

    @Mock
    private BatchVerificationService batchVerificationService;

    @InjectMocks
    private VerifierController verifierController;

    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        mockMvc = MockMvcBuilders
                .standaloneSetup(verifierController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("POST /api/verifier/verify/batch with files returns BatchVerificationResponse")
    void verifyBatchReturnsResponse() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "files",
                "cred-1.json",
                "application/json",
                "{}".getBytes()
        );

        BatchItemResult itemResult = new BatchItemResult(
                "cred-1.json",
                "MIT-2026",
                "Alex Mercer",
                "MIT",
                "VALID",
                true,
                new VerificationChecks(true, true, true, true, true, true),
                null,
                "Valid"
        );

        BatchVerificationResponse mockResponse = new BatchVerificationResponse(
                "batch-test-123",
                1,
                1,
                1,
                0,
                0,
                0,
                0,
                0,
                0,
                45L,
                List.of(itemResult)
        );

        when(batchVerificationService.extractAndValidateFiles(any())).thenReturn(
                List.of(new BatchVerificationService.CredentialFileEntry("cred-1.json", "{}".getBytes()))
        );
        when(batchVerificationService.processBatch(any(), any())).thenReturn(mockResponse);

        mockMvc.perform(multipart("/api/verifier/verify/batch").file(file))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.batchId").value("batch-test-123"))
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.valid").value(1))
                .andExpect(jsonPath("$.results[0].status").value("VALID"))
                .andExpect(jsonPath("$.results[0].recipientName").value("Alex Mercer"));
    }

    @Test
    @DisplayName("POST /api/verifier/verify/batch with no files returns 400 Bad Request")
    void verifyBatchEmptyFilesReturnsBadRequest() throws Exception {
        mockMvc.perform(multipart("/api/verifier/verify/batch"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("No files uploaded for batch verification"));
    }

    @Test
    @DisplayName("POST /api/verifier/verify/batch/csv exports CSV report")
    void exportCsvReturnsCsvFile() throws Exception {
        BatchVerificationResponse response = new BatchVerificationResponse(
                "batch-csv",
                1,
                1,
                1,
                0,
                0,
                0,
                0,
                0,
                0,
                50L,
                List.of()
        );

        String sampleCsv = "credential_id,file_name,holder,issuer,status,envelope_structure,schema_conformance,issuer_signature,on_chain_anchor,revocation_status,ipfs_integrity,error_message\n";
        when(batchVerificationService.generateCsv(any())).thenReturn(sampleCsv);

        mockMvc.perform(post("/api/verifier/verify/batch/csv")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(response)))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", "attachment; filename=\"batch-verification-report.csv\""))
                .andExpect(content().string(sampleCsv));
    }
}
