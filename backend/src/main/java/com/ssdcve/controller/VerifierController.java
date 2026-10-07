package com.ssdcve.controller;

import com.ssdcve.dto.response.AnchorLookupResponse;
import com.ssdcve.dto.response.BatchVerificationResponse;
import com.ssdcve.dto.response.ChainStatusResponse;
import com.ssdcve.dto.response.DisclosureInfo;
import com.ssdcve.dto.response.RecentAnchorResponse;
import com.ssdcve.dto.response.VerificationHistoryResponse;
import com.ssdcve.dto.response.VerificationResult;
import com.ssdcve.model.VerificationStatus;
import com.ssdcve.service.BatchVerificationService;
import com.ssdcve.service.VerificationHistoryService;
import com.ssdcve.service.VerificationService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.multipart.MultipartHttpServletRequest;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/verifier")
public class VerifierController {

    private final VerificationService verificationService;
    private final VerificationHistoryService verificationHistoryService;
    private final BatchVerificationService batchVerificationService;

    public VerifierController(
            VerificationService verificationService,
            VerificationHistoryService verificationHistoryService,
            BatchVerificationService batchVerificationService) {
        this.verificationService = verificationService;
        this.verificationHistoryService = verificationHistoryService;
        this.batchVerificationService = batchVerificationService;
    }

    @PostMapping(
            value = "/verify",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE,
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    public ResponseEntity<VerificationResult> verify(
            @RequestPart("credentialFile")
            @NotNull MultipartFile credentialFile)
            throws Exception {

        if (credentialFile.isEmpty()) {
            return ResponseEntity.badRequest().body(
                    new VerificationResult(
                            false,
                            VerificationStatus.TAMPERED,
                            null,
                            "Credential file is empty",
                            null,
                            null,
                            null,
                            false,
                            null,
                            null,
                            null,
                            Instant.now(),
                            null,
                            null,
                            null,
                            false,
                            new DisclosureInfo(0, 0, true)
                    )
            );
        }

        VerificationResult result =
                verificationService.verify(
                        credentialFile.getBytes()
                );

        /*
         * The endpoint is public: the verifier is the authenticated
         * principal when present, null for anonymous attempts.
         */
        verificationHistoryService.record(
                result,
                currentVerifierId()
        );

        return ResponseEntity.ok(result);
    }

    @GetMapping(
            value = "/verify/{credentialId}",
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    public ResponseEntity<VerificationResult> verifyById(
            @PathVariable UUID credentialId)
            throws Exception {

        VerificationResult result =
                verificationService.verifyByCredentialId(
                        credentialId
                );

        verificationHistoryService.record(
                result,
                currentVerifierId()
        );

        return ResponseEntity.ok(result);
    }

    @PostMapping(
            value = "/verify/batch",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE,
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    public ResponseEntity<BatchVerificationResponse> verifyBatch(
            @RequestPart(value = "files", required = false) List<MultipartFile> files,
            @RequestPart(value = "file", required = false) MultipartFile file,
            HttpServletRequest request) throws Exception {

        List<MultipartFile> allFiles = new ArrayList<>();
        if (files != null) {
            allFiles.addAll(files);
        }
        if (file != null) {
            allFiles.add(file);
        }
        if (request instanceof MultipartHttpServletRequest multipartReq) {
            multipartReq.getMultiFileMap().forEach((paramName, paramFiles) -> {
                for (MultipartFile f : paramFiles) {
                    if (!allFiles.contains(f)) {
                        allFiles.add(f);
                    }
                }
            });
        }

        if (allFiles.isEmpty()) {
            throw new IllegalArgumentException("No files uploaded for batch verification");
        }

        List<BatchVerificationService.CredentialFileEntry> entries =
                batchVerificationService.extractAndValidateFiles(allFiles);

        BatchVerificationResponse response =
                batchVerificationService.processBatch(entries, currentVerifierId());

        return ResponseEntity.ok(response);
    }

    @PostMapping(
            value = "/verify/batch/csv",
            consumes = MediaType.APPLICATION_JSON_VALUE,
            produces = "text/csv"
    )
    public ResponseEntity<String> exportCsv(
            @RequestBody BatchVerificationResponse response) {

        String csv = batchVerificationService.generateCsv(response);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"batch-verification-report.csv\"")
                .body(csv);
    }

    @GetMapping(
            value = "/anchor/{credentialNumber}",
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    public ResponseEntity<AnchorLookupResponse> anchor(
            @PathVariable String credentialNumber) {

        AnchorLookupResponse response =
                verificationService.lookupAnchor(
                        credentialNumber
                );

        if (response == null) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(response);
    }

    @GetMapping(
            value = "/chain/status",
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    public ResponseEntity<ChainStatusResponse> chainStatus() {
        return ResponseEntity.ok(
                verificationService.chainStatus()
        );
    }

    @GetMapping(
            value = "/anchors/recent",
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    public ResponseEntity<List<RecentAnchorResponse>> recentAnchors(
            @RequestParam(name = "limit", defaultValue = "20") int limit) {

        return ResponseEntity.ok(
                verificationService.recentAnchors(limit)
        );
    }

    @GetMapping(
            value = "/history",
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    public ResponseEntity<List<VerificationHistoryResponse>> history(
            Authentication authentication) {

        return ResponseEntity.ok(
                verificationHistoryService.listHistory(
                        currentUserId(authentication)
                )
        );
    }

    private UUID currentVerifierId() {

        Authentication authentication =
                SecurityContextHolder.getContext()
                        .getAuthentication();

        if (authentication != null
                && authentication.getPrincipal()
                instanceof UUID userId) {
            return userId;
        }

        return null;
    }

    private UUID currentUserId(
            Authentication authentication) {

        return (UUID) authentication.getPrincipal();
    }
}