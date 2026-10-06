package com.ssdcve.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssdcve.dto.response.BatchItemResult;
import com.ssdcve.dto.response.BatchVerificationResponse;
import com.ssdcve.dto.response.DisclosureInfo;
import com.ssdcve.dto.response.VerificationChecks;
import com.ssdcve.dto.response.VerificationResult;
import com.ssdcve.model.VerificationStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

class BatchVerificationServiceTest {

    private VerificationService verificationService;
    private VerificationHistoryService verificationHistoryService;
    private ObjectMapper objectMapper;
    private BatchVerificationService batchVerificationService;

    @BeforeEach
    void setUp() {
        verificationService = mock(VerificationService.class);
        verificationHistoryService = mock(VerificationHistoryService.class);
        objectMapper = new ObjectMapper();

        batchVerificationService = new BatchVerificationService(
                verificationService,
                verificationHistoryService,
                objectMapper,
                50,               // maxFiles
                100 * 1024,       // maxFileSizeBytes (100KB)
                500 * 1024,       // maxZipSizeBytes (500KB)
                1024 * 1024,      // maxExtractedSizeBytes (1MB)
                4                 // maxConcurrency
        );
    }

    private byte[] createSampleCredentialJson(String credNum, String studentName, String issuerName) throws Exception {
        Map<String, Object> claims = new LinkedHashMap<>();
        claims.put("studentName", studentName);
        claims.put("degree", "B.S. Computer Science");

        Map<String, Object> issuer = new LinkedHashMap<>();
        issuer.put("id", UUID.randomUUID().toString());
        issuer.put("name", issuerName);
        issuer.put("domain", "mit.edu");

        Map<String, Object> cred = new LinkedHashMap<>();
        cred.put("credentialNumber", credNum);
        cred.put("type", "Degree");
        cred.put("claims", claims);
        cred.put("issuer", issuer);

        Map<String, Object> envelope = new LinkedHashMap<>();
        envelope.put("version", "1.0");
        envelope.put("credential", cred);
        envelope.put("contentHash", "0x" + "a".repeat(64));
        envelope.put("signature", "0x" + "b".repeat(64));
        envelope.put("keyId", "mit-key-1");

        return objectMapper.writeValueAsBytes(envelope);
    }

    private VerificationResult createMockResult(boolean valid, VerificationStatus status, String credNum, String reason) {
        return new VerificationResult(
                valid,
                status,
                credNum,
                reason,
                UUID.randomUUID(),
                "MIT",
                "mit.edu",
                true,
                Map.of("studentName", "Alex Mercer"),
                Instant.now(),
                null,
                Instant.now(),
                "0xtx123",
                100L,
                31337L,
                true,
                new DisclosureInfo(2, 2, true)
        );
    }

    private byte[] createZip(Map<String, byte[]> files) throws IOException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (ZipOutputStream zos = new ZipOutputStream(baos)) {
            for (Map.Entry<String, byte[]> entry : files.entrySet()) {
                ZipEntry ze = new ZipEntry(entry.getKey());
                zos.putNextEntry(ze);
                zos.write(entry.getValue());
                zos.closeEntry();
            }
        }
        return baos.toByteArray();
    }

    @Test
    @DisplayName("Valid batch: 10 valid credentials return 10 VALID results")
    void validBatchReturnsAllValid() throws Exception {
        List<MultipartFile> files = new ArrayList<>();
        for (int i = 1; i <= 10; i++) {
            String num = "CRED-" + i;
            byte[] bytes = createSampleCredentialJson(num, "Student " + i, "MIT");
            files.add(new MockMultipartFile("files", "cred-" + i + ".json", "application/json", bytes));
            when(verificationService.verify(bytes)).thenReturn(createMockResult(true, VerificationStatus.VALID, num, "Valid"));
        }

        List<BatchVerificationService.CredentialFileEntry> entries = batchVerificationService.extractAndValidateFiles(files);
        BatchVerificationResponse response = batchVerificationService.processBatch(entries, null);

        assertThat(response.total()).isEqualTo(10);
        assertThat(response.processed()).isEqualTo(10);
        assertThat(response.valid()).isEqualTo(10);
        assertThat(response.tampered()).isZero();
        assertThat(response.revoked()).isZero();
        assertThat(response.failed()).isZero();
        assertThat(response.results()).hasSize(10);
        assertThat(response.results()).allMatch(r -> "VALID".equals(r.status()) && r.valid());
    }

    @Test
    @DisplayName("Mixed batch: correctly aggregates VALID, TAMPERED, REVOKED, and NOT_FOUND")
    void mixedBatchCorrectlyAggregatesStatuses() throws Exception {
        byte[] b1 = createSampleCredentialJson("CRED-1", "Student 1", "MIT");
        byte[] b2 = createSampleCredentialJson("CRED-2", "Student 2", "MIT");
        byte[] b3 = createSampleCredentialJson("CRED-3", "Student 3", "MIT");
        byte[] b4 = createSampleCredentialJson("CRED-4", "Student 4", "MIT");

        when(verificationService.verify(b1)).thenReturn(createMockResult(true, VerificationStatus.VALID, "CRED-1", "Valid"));
        when(verificationService.verify(b2)).thenReturn(createMockResult(false, VerificationStatus.TAMPERED, "CRED-2", "Content hash mismatch"));
        when(verificationService.verify(b3)).thenReturn(createMockResult(false, VerificationStatus.REVOKED, "CRED-3", "Credential revoked by issuer"));
        when(verificationService.verify(b4)).thenReturn(createMockResult(false, VerificationStatus.NOT_FOUND, "CRED-4", "Credential not in registry"));

        List<MultipartFile> files = List.of(
                new MockMultipartFile("files", "cred-1.json", "application/json", b1),
                new MockMultipartFile("files", "cred-2.json", "application/json", b2),
                new MockMultipartFile("files", "cred-3.json", "application/json", b3),
                new MockMultipartFile("files", "cred-4.json", "application/json", b4)
        );

        List<BatchVerificationService.CredentialFileEntry> entries = batchVerificationService.extractAndValidateFiles(files);
        BatchVerificationResponse response = batchVerificationService.processBatch(entries, null);

        assertThat(response.total()).isEqualTo(4);
        assertThat(response.valid()).isEqualTo(1);
        assertThat(response.tampered()).isEqualTo(1);
        assertThat(response.revoked()).isEqualTo(1);
        assertThat(response.notFound()).isEqualTo(1);
        assertThat(response.failed()).isZero();
    }

    @Test
    @DisplayName("Malformed credential does not abort the batch")
    void malformedCredentialDoesNotTerminateBatch() throws Exception {
        byte[] validBytes = createSampleCredentialJson("CRED-VALID", "Valid Student", "MIT");
        byte[] corruptBytes = "{ this is not valid json ".getBytes(StandardCharsets.UTF_8);

        when(verificationService.verify(validBytes)).thenReturn(createMockResult(true, VerificationStatus.VALID, "CRED-VALID", "Valid"));
        when(verificationService.verify(corruptBytes)).thenThrow(new RuntimeException("Malformed JSON"));

        List<MultipartFile> files = List.of(
                new MockMultipartFile("files", "good.json", "application/json", validBytes),
                new MockMultipartFile("files", "bad.json", "application/json", corruptBytes)
        );

        List<BatchVerificationService.CredentialFileEntry> entries = batchVerificationService.extractAndValidateFiles(files);
        BatchVerificationResponse response = batchVerificationService.processBatch(entries, null);

        assertThat(response.total()).isEqualTo(2);
        assertThat(response.valid()).isEqualTo(1);
        assertThat(response.failed()).isEqualTo(1);

        BatchItemResult failedItem = response.results().stream()
                .filter(r -> "bad.json".equals(r.fileName()))
                .findFirst()
                .orElseThrow();

        assertThat(failedItem.status()).isEqualTo("FAILED");
        assertThat(failedItem.valid()).isFalse();
    }

    @Test
    @DisplayName("Empty batch throws meaningful validation error")
    void emptyBatchThrowsError() {
        assertThatThrownBy(() -> batchVerificationService.extractAndValidateFiles(List.of()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("No files uploaded");
    }

    @Test
    @DisplayName("Unsupported file type is rejected")
    void unsupportedFileTypeRejected() {
        MockMultipartFile exeFile = new MockMultipartFile("files", "malware.exe", "application/octet-stream", new byte[]{1, 2, 3});
        assertThatThrownBy(() -> batchVerificationService.extractAndValidateFiles(List.of(exeFile)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Unsupported file type: malware.exe");
    }

    @Test
    @DisplayName("ZIP upload: successfully extracts and verifies JSON credentials")
    void zipUploadProcessedSuccessfully() throws Exception {
        byte[] cred1 = createSampleCredentialJson("ZIP-CRED-1", "Alice", "MIT");
        byte[] cred2 = createSampleCredentialJson("ZIP-CRED-2", "Bob", "MIT");

        byte[] zipBytes = createZip(Map.of(
                "credentials/cred1.json", cred1,
                "credentials/cred2.json", cred2
        ));

        when(verificationService.verify(cred1)).thenReturn(createMockResult(true, VerificationStatus.VALID, "ZIP-CRED-1", "Valid"));
        when(verificationService.verify(cred2)).thenReturn(createMockResult(true, VerificationStatus.VALID, "ZIP-CRED-2", "Valid"));

        MockMultipartFile zipFile = new MockMultipartFile("files", "batch.zip", "application/zip", zipBytes);
        List<BatchVerificationService.CredentialFileEntry> entries = batchVerificationService.extractAndValidateFiles(List.of(zipFile));

        assertThat(entries).hasSize(2);
        BatchVerificationResponse response = batchVerificationService.processBatch(entries, null);
        assertThat(response.total()).isEqualTo(2);
        assertThat(response.valid()).isEqualTo(2);
    }

    @Test
    @DisplayName("ZIP Slip path traversal is safely rejected")
    void zipSlipPathTraversalRejected() throws IOException {
        byte[] dummy = "{}".getBytes(StandardCharsets.UTF_8);
        byte[] zipBytes = createZip(Map.of(
                "../../etc/passwd.json", dummy
        ));

        MockMultipartFile zipFile = new MockMultipartFile("files", "exploit.zip", "application/zip", zipBytes);
        assertThatThrownBy(() -> batchVerificationService.extractAndValidateFiles(List.of(zipFile)))
                .isInstanceOf(SecurityException.class)
                .hasMessageContaining("Zip Slip");
    }

    @Test
    @DisplayName("ZIP bomb protection: excessive uncompressed size is rejected")
    void zipBombOversizedExtractionRejected() throws IOException {
        byte[] bigEntry = new byte[1048577];
        byte[] zipBytes = createZip(Map.of("bomb.json", bigEntry));

        MockMultipartFile zipFile = new MockMultipartFile("files", "bomb.zip", "application/zip", zipBytes);
        assertThatThrownBy(() -> batchVerificationService.extractAndValidateFiles(List.of(zipFile)))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("Nested archives inside ZIP are strictly rejected")
    void nestedArchivesRejected() throws IOException {
        byte[] zipBytes = createZip(Map.of(
                "nested.zip", new byte[]{0x50, 0x4b, 0x03, 0x04}
        ));

        MockMultipartFile zipFile = new MockMultipartFile("files", "outer.zip", "application/zip", zipBytes);
        assertThatThrownBy(() -> batchVerificationService.extractAndValidateFiles(List.of(zipFile)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Nested archives are not permitted");
    }

    @Test
    @DisplayName("File size limit: single file over configured limit is rejected")
    void singleFileOverLimitRejected() {
        byte[] bigFile = new byte[101 * 1024];
        MockMultipartFile file = new MockMultipartFile("files", "huge.json", "application/json", bigFile);
        assertThatThrownBy(() -> batchVerificationService.extractAndValidateFiles(List.of(file)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("exceeds maximum allowed size");
    }

    @Test
    @DisplayName("Max credential count: exceeding configured limit is rejected")
    void maxCredentialCountRejected() throws Exception {
        List<MultipartFile> files = new ArrayList<>();
        byte[] dummy = createSampleCredentialJson("C-1", "S", "M");
        for (int i = 0; i < 51; i++) {
            files.add(new MockMultipartFile("files", "file" + i + ".json", "application/json", dummy));
        }

        assertThatThrownBy(() -> batchVerificationService.extractAndValidateFiles(files))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("exceeds the limit of 50");
    }

    @Test
    @DisplayName("Authenticated verification records history for each batch item")
    void authenticatedBatchRecordsHistory() throws Exception {
        UUID verifierId = UUID.randomUUID();
        byte[] b = createSampleCredentialJson("C-100", "Charlie", "MIT");
        VerificationResult result = createMockResult(true, VerificationStatus.VALID, "C-100", "Valid");
        when(verificationService.verify(b)).thenReturn(result);

        List<BatchVerificationService.CredentialFileEntry> entries = List.of(
                new BatchVerificationService.CredentialFileEntry("c-100.json", b)
        );

        batchVerificationService.processBatch(entries, verifierId);
        verify(verificationHistoryService, times(1)).record(result, verifierId);
    }

    @Test
    @DisplayName("CSV export produces proper headers, values, and defends against formula injection")
    void csvExportGeneratesValidEscapedOutput() {
        VerificationChecks checks = new VerificationChecks(true, true, true, true, true, true);
        BatchItemResult item1 = new BatchItemResult(
                "c1.json",
                "=SUM(A1:A10)",
                "Alex Mercer",
                "MIT",
                "VALID",
                true,
                checks,
                null,
                "OK"
        );

        BatchItemResult item2 = new BatchItemResult(
                "c2.json",
                "MIT-2026",
                "Jane Doe, Ph.D.",
                "MIT, \"School of CS\"",
                "REVOKED",
                false,
                new VerificationChecks(true, true, true, true, false, true),
                null,
                "Revoked by issuer"
        );

        BatchVerificationResponse response = new BatchVerificationResponse(
                "batch-123",
                2,
                2,
                1,
                0,
                1,
                0,
                0,
                0,
                0,
                150L,
                List.of(item1, item2)
        );

        String csv = batchVerificationService.generateCsv(response);

        assertThat(csv).startsWith("credential_id,file_name,holder,issuer,status,envelope_structure,schema_conformance,issuer_signature,on_chain_anchor,revocation_status,ipfs_integrity,error_message\n");
        assertThat(csv).contains("'=SUM(A1:A10)");
        assertThat(csv).contains("\"Jane Doe, Ph.D.\"");
        assertThat(csv).contains("\"MIT, \"\"School of CS\"\"\"");
    }
}
