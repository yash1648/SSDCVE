package com.ssdcve.controller;

import com.ssdcve.dto.response.VerificationHistoryResponse;
import com.ssdcve.dto.response.VerificationResult;
import com.ssdcve.model.VerificationStatus;
import com.ssdcve.service.VerificationHistoryService;
import com.ssdcve.service.VerificationService;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/verifier")
public class VerifierController {

    private final VerificationService verificationService;

    private final VerificationHistoryService verificationHistoryService;

    public VerifierController(
            VerificationService verificationService,
            VerificationHistoryService verificationHistoryService) {
        this.verificationService = verificationService;
        this.verificationHistoryService =
                verificationHistoryService;
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
                            Instant.now()
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