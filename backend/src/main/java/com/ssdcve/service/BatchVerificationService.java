package com.ssdcve.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssdcve.dto.response.BatchItemResult;
import com.ssdcve.dto.response.BatchVerificationResponse;
import com.ssdcve.dto.response.VerificationChecks;
import com.ssdcve.dto.response.VerificationResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.*;
import java.util.concurrent.*;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

@Service
public class BatchVerificationService {

    private static final Logger log = LoggerFactory.getLogger(BatchVerificationService.class);

    private final VerificationService verificationService;
    private final VerificationHistoryService verificationHistoryService;
    private final ObjectMapper objectMapper;

    private final int maxFiles;
    private final long maxFileSizeBytes;
    private final long maxZipSizeBytes;
    private final long maxExtractedSizeBytes;
    private final int maxConcurrency;

    public BatchVerificationService(
            VerificationService verificationService,
            VerificationHistoryService verificationHistoryService,
            ObjectMapper objectMapper,
            @Value("${ssdcve.batch-verification.max-files:500}") int maxFiles,
            @Value("${ssdcve.batch-verification.max-file-size-bytes:2097152}") long maxFileSizeBytes,
            @Value("${ssdcve.batch-verification.max-zip-size-bytes:20971520}") long maxZipSizeBytes,
            @Value("${ssdcve.batch-verification.max-extracted-size-bytes:52428800}") long maxExtractedSizeBytes,
            @Value("${ssdcve.batch-verification.max-concurrency:10}") int maxConcurrency) {

        this.verificationService = verificationService;
        this.verificationHistoryService = verificationHistoryService;
        this.objectMapper = objectMapper;
        this.maxFiles = maxFiles;
        this.maxFileSizeBytes = maxFileSizeBytes;
        this.maxZipSizeBytes = maxZipSizeBytes;
        this.maxExtractedSizeBytes = maxExtractedSizeBytes;
        this.maxConcurrency = maxConcurrency;
    }

    public record CredentialFileEntry(String fileName, byte[] bytes) {}

    /**
     * Extracts and validates files from multipart inputs.
     */
    public List<CredentialFileEntry> extractAndValidateFiles(List<MultipartFile> uploadedFiles) throws IOException {
        if (uploadedFiles == null || uploadedFiles.isEmpty()) {
            throw new IllegalArgumentException("No files uploaded for batch verification");
        }

        List<CredentialFileEntry> extracted = new ArrayList<>();

        for (MultipartFile file : uploadedFiles) {
            if (file == null || file.isEmpty()) {
                continue;
            }

            String originalName = file.getOriginalFilename();
            if (originalName == null) {
                originalName = "unnamed-file";
            }
            String lowerName = originalName.toLowerCase();

            if (lowerName.endsWith(".zip")) {
                if (file.getSize() > maxZipSizeBytes) {
                    throw new IllegalArgumentException("ZIP file exceeds maximum allowed size of " + maxZipSizeBytes + " bytes: " + originalName);
                }
                List<CredentialFileEntry> fromZip = extractFromZip(file.getInputStream(), originalName);
                extracted.addAll(fromZip);
            } else if (lowerName.endsWith(".json")) {
                if (file.getSize() > maxFileSizeBytes) {
                    throw new IllegalArgumentException("File exceeds maximum allowed size of " + maxFileSizeBytes + " bytes: " + originalName);
                }
                extracted.add(new CredentialFileEntry(originalName, file.getBytes()));
            } else {
                throw new IllegalArgumentException("Unsupported file type: " + originalName + ". Only .json and .zip files are supported.");
            }

            if (extracted.size() > maxFiles) {
                throw new IllegalArgumentException("Batch contains " + extracted.size() + " files, which exceeds the limit of " + maxFiles);
            }
        }

        if (extracted.isEmpty()) {
            throw new IllegalArgumentException("No valid credential files found in the upload");
        }

        return extracted;
    }

    /**
     * Safely unpacks a ZIP archive in memory, enforcing Zip Slip protection,
     * ZIP bomb mitigations, file count, and rejection of nested archives.
     */
    public List<CredentialFileEntry> extractFromZip(InputStream zipInputStream, String zipName) throws IOException {
        List<CredentialFileEntry> entries = new ArrayList<>();
        long totalExtractedBytes = 0;
        int entryCount = 0;

        try (ZipInputStream zis = new ZipInputStream(zipInputStream)) {
            ZipEntry entry;
            while ((entry = zis.getNextEntry()) != null) {
                entryCount++;
                if (entryCount > maxFiles) {
                    throw new IllegalArgumentException("ZIP archive " + zipName + " contains more than " + maxFiles + " entries");
                }

                String name = entry.getName();

                // Zip Slip Path Traversal Check
                if (name.contains("..") || name.startsWith("/") || name.startsWith("\\")) {
                    throw new SecurityException("Potential path traversal (Zip Slip) detected in ZIP entry: " + name);
                }

                // Check for nested archives
                String lower = name.toLowerCase();
                if (lower.endsWith(".zip") || lower.endsWith(".tar") || lower.endsWith(".gz")
                        || lower.endsWith(".tgz") || lower.endsWith(".7z") || lower.endsWith(".rar")) {
                    throw new IllegalArgumentException("Nested archives are not permitted: " + name);
                }

                // Ignore directories and OS metadata
                if (entry.isDirectory() || name.startsWith("__MACOSX/") || name.endsWith(".DS_Store")) {
                    zis.closeEntry();
                    continue;
                }

                // Only process .json files
                if (!lower.endsWith(".json")) {
                    zis.closeEntry();
                    continue;
                }

                // Read entry with size safety checks
                ByteArrayOutputStream baos = new ByteArrayOutputStream();
                byte[] buffer = new byte[8192];
                int n;
                long entryBytesRead = 0;

                while ((n = zis.read(buffer)) != -1) {
                    entryBytesRead += n;
                    totalExtractedBytes += n;

                    if (entryBytesRead > maxFileSizeBytes) {
                        throw new IllegalArgumentException("ZIP entry exceeds maximum allowed single file size of "
                                + maxFileSizeBytes + " bytes: " + name);
                    }

                    if (totalExtractedBytes > maxExtractedSizeBytes) {
                        throw new IllegalArgumentException("ZIP archive total uncompressed size exceeds limit of "
                                + maxExtractedSizeBytes + " bytes (potential ZIP bomb): " + zipName);
                    }

                    baos.write(buffer, 0, n);
                }

                byte[] fileBytes = baos.toByteArray();
                entries.add(new CredentialFileEntry(name, fileBytes));
                zis.closeEntry();
            }
        }

        if (entries.isEmpty()) {
            throw new IllegalArgumentException("ZIP archive " + zipName + " contains no .json credential files");
        }

        return entries;
    }

    /**
     * Executes batch verification across extracted credential files with bounded concurrency.
     */
    public BatchVerificationResponse processBatch(List<CredentialFileEntry> entries, UUID verifierId) {
        String batchId = "batch-" + UUID.randomUUID();
        long startTime = System.currentTimeMillis();

        log.info("Batch verification started: batchId={}, fileCount={}", batchId, entries.size());

        ExecutorService executor = Executors.newFixedThreadPool(
                Math.min(entries.size(), Math.max(1, maxConcurrency))
        );

        List<CompletableFuture<BatchItemResult>> futures = new ArrayList<>(entries.size());

        for (CredentialFileEntry entry : entries) {
            futures.add(CompletableFuture.supplyAsync(
                    () -> verifySingleItem(entry.fileName(), entry.bytes(), verifierId),
                    executor
            ));
        }

        List<BatchItemResult> results = new ArrayList<>(entries.size());
        for (CompletableFuture<BatchItemResult> future : futures) {
            try {
                results.add(future.join());
            } catch (Exception ex) {
                log.error("Unexpected error retrieving batch item result: {}", ex.getMessage());
                results.add(new BatchItemResult(
                        "unknown",
                        null,
                        null,
                        null,
                        "FAILED",
                        false,
                        new VerificationChecks(false, false, false, false, false, false),
                        null,
                        "Internal execution error"
                ));
            }
        }

        executor.shutdown();

        // Calculate summary metrics
        int validCount = 0;
        int tamperedCount = 0;
        int revokedCount = 0;
        int expiredCount = 0;
        int notFoundCount = 0;
        int unavailableCount = 0;
        int failedCount = 0;

        for (BatchItemResult item : results) {
            switch (item.status()) {
                case "VALID" -> validCount++;
                case "TAMPERED" -> tamperedCount++;
                case "REVOKED" -> revokedCount++;
                case "EXPIRED" -> expiredCount++;
                case "NOT_FOUND" -> notFoundCount++;
                case "UNAVAILABLE" -> unavailableCount++;
                default -> failedCount++;
            }
        }

        long durationMs = System.currentTimeMillis() - startTime;

        log.info("Batch verification completed: batchId={}, total={}, valid={}, tampered={}, revoked={}, expired={}, notFound={}, unavailable={}, failed={}, durationMs={}",
                batchId, results.size(), validCount, tamperedCount, revokedCount, expiredCount, notFoundCount, unavailableCount, failedCount, durationMs);

        return new BatchVerificationResponse(
                batchId,
                results.size(),
                results.size(),
                validCount,
                tamperedCount,
                revokedCount,
                expiredCount,
                notFoundCount,
                unavailableCount,
                failedCount,
                durationMs,
                results
        );
    }

    /**
     * Verifies an individual credential byte payload, isolating failures and preventing batch abort.
     */
    public BatchItemResult verifySingleItem(String fileName, byte[] bytes, UUID verifierId) {
        if (bytes == null || bytes.length == 0) {
            return new BatchItemResult(
                    fileName,
                    null,
                    null,
                    null,
                    "FAILED",
                    false,
                    new VerificationChecks(false, false, false, false, false, false),
                    null,
                    "Credential file is empty"
            );
        }

        try {
            VerificationResult result = verificationService.verify(bytes);

            boolean isMalformed = "Invalid credential JSON".equals(result.reason())
                    || "Credential envelope is incomplete".equals(result.reason())
                    || "Credential payload is empty".equals(result.reason());

            String statusStr;
            if (isMalformed) {
                statusStr = "FAILED";
            } else {
                statusStr = result.status().name();
            }

            VerificationChecks checks = VerificationChecks.fromResult(result, isMalformed);

            String recipient = extractRecipient(result, bytes);
            String issuer = result.issuerName() != null ? result.issuerName() : extractIssuer(bytes);
            String credNum = result.credentialNumber() != null ? result.credentialNumber() : extractCredNum(bytes);

            if (verifierId != null) {
                try {
                    verificationHistoryService.record(result, verifierId);
                } catch (Exception ex) {
                    log.warn("Could not record verification history for batch item {}: {}", credNum, ex.getMessage());
                }
            }

            return new BatchItemResult(
                    fileName,
                    credNum,
                    recipient,
                    issuer,
                    statusStr,
                    "VALID".equals(statusStr),
                    checks,
                    result,
                    result.reason()
            );

        } catch (Exception ex) {
            log.warn("Exception during single credential verification for {}: {}", fileName, ex.getMessage());
            return new BatchItemResult(
                    fileName,
                    extractCredNum(bytes),
                    extractRecipient(null, bytes),
                    extractIssuer(bytes),
                    "FAILED",
                    false,
                    new VerificationChecks(false, false, false, false, false, false),
                    null,
                    ex.getMessage() != null ? ex.getMessage() : "Processing failure"
            );
        }
    }

    private String extractRecipient(VerificationResult result, byte[] bytes) {
        if (result != null && result.claims() != null) {
            Object name = result.claims().get("studentName");
            if (name == null) name = result.claims().get("recipientName");
            if (name == null) name = result.claims().get("name");
            if (name != null) return String.valueOf(name);
        }

        if (bytes != null && bytes.length > 0) {
            try {
                JsonNode root = objectMapper.readTree(bytes);
                JsonNode cred = root.get("credential");
                if (cred != null) {
                    JsonNode claims = cred.get("claims");
                    if (claims != null) {
                        if (claims.has("studentName")) return claims.get("studentName").asText();
                        if (claims.has("recipientName")) return claims.get("recipientName").asText();
                        if (claims.has("name")) return claims.get("name").asText();
                    }
                    JsonNode subject = cred.get("subject");
                    if (subject != null && subject.has("name")) {
                        return subject.get("name").asText();
                    }
                }
            } catch (Exception ignored) {
            }
        }

        return null;
    }

    private String extractIssuer(byte[] bytes) {
        if (bytes != null && bytes.length > 0) {
            try {
                JsonNode root = objectMapper.readTree(bytes);
                JsonNode cred = root.get("credential");
                if (cred != null) {
                    JsonNode issuer = cred.get("issuer");
                    if (issuer != null && issuer.has("name")) {
                        return issuer.get("name").asText();
                    }
                }
            } catch (Exception ignored) {
            }
        }
        return null;
    }

    private String extractCredNum(byte[] bytes) {
        if (bytes != null && bytes.length > 0) {
            try {
                JsonNode root = objectMapper.readTree(bytes);
                JsonNode cred = root.get("credential");
                if (cred != null && cred.has("credentialNumber")) {
                    return cred.get("credentialNumber").asText();
                }
            } catch (Exception ignored) {
            }
        }
        return null;
    }

    /**
     * Generates RFC-4180 compliant CSV report with formula-injection defenses.
     */
    public String generateCsv(BatchVerificationResponse response) {
        StringBuilder csv = new StringBuilder();
        csv.append("credential_id,file_name,holder,issuer,status,envelope_structure,schema_conformance,issuer_signature,on_chain_anchor,revocation_status,ipfs_integrity,error_message\n");

        if (response.results() != null) {
            for (BatchItemResult item : response.results()) {
                VerificationChecks checks = item.checks() != null
                        ? item.checks()
                        : new VerificationChecks(false, false, false, false, false, false);

                csv.append(escapeCsv(item.credentialNumber())).append(",")
                        .append(escapeCsv(item.fileName())).append(",")
                        .append(escapeCsv(item.recipientName())).append(",")
                        .append(escapeCsv(item.issuerName())).append(",")
                        .append(escapeCsv(item.status())).append(",")
                        .append(checks.envelopeStructure()).append(",")
                        .append(checks.schemaConformance()).append(",")
                        .append(checks.issuerSignature()).append(",")
                        .append(checks.onChainAnchor()).append(",")
                        .append(checks.revocationStatus()).append(",")
                        .append(checks.ipfsIntegrity()).append(",")
                        .append(escapeCsv(item.errorMessage()))
                        .append("\n");
            }
        }

        return csv.toString();
    }

    private String escapeCsv(String value) {
        if (value == null) {
            return "";
        }

        // Prevent CSV Formula Injection
        String sanitized = value;
        if (!sanitized.isEmpty() && (sanitized.startsWith("=") || sanitized.startsWith("+")
                || sanitized.startsWith("-") || sanitized.startsWith("@"))) {
            sanitized = "'" + sanitized;
        }

        if (sanitized.contains(",") || sanitized.contains("\"") || sanitized.contains("\n") || sanitized.contains("\r")) {
            return "\"" + sanitized.replace("\"", "\"\"") + "\"";
        }

        return sanitized;
    }
}
