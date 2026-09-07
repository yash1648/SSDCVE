package com.ssdcve.controller;

import com.ssdcve.dto.request.CredentialIssueRequest;
import com.ssdcve.dto.request.IssuerRegisterRequest;
import com.ssdcve.dto.request.RevokeRequest;
import com.ssdcve.dto.response.CredentialResponse;
import com.ssdcve.dto.response.IssuerKeyResponse;
import com.ssdcve.dto.response.IssuerResponse;
import com.ssdcve.dto.response.RevokeResponse;
import com.ssdcve.dto.response.VerificationRecordResponse;
import com.ssdcve.model.Role;
import com.ssdcve.service.IssuerService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Issuer REST surface. The authenticated user is always derived
 * from the SecurityContext principal - a client-provided issuerId
 * is never accepted or trusted.
 */
@RestController
@RequestMapping("/api/issuer")
public class IssuerController {

    private static final Set<String> ALLOWED_DOCUMENT_TYPES =
            Set.of(
                    MediaType.APPLICATION_PDF_VALUE,
                    MediaType.IMAGE_PNG_VALUE,
                    MediaType.IMAGE_JPEG_VALUE
            );

    private final IssuerService issuerService;

    public IssuerController(IssuerService issuerService) {
        this.issuerService = issuerService;
    }

    @PostMapping("/register")
    public ResponseEntity<IssuerResponse> register(
            Authentication authentication,
            @Valid @RequestBody IssuerRegisterRequest request) {

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(issuerService.register(
                        currentUserId(authentication),
                        request
                ));
    }

    @PostMapping("/keys")
    public ResponseEntity<IssuerKeyResponse> createKey(
            Authentication authentication)
            throws Exception {

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(issuerService.createSigningKey(
                        currentUserId(authentication)
                ));
    }

    @PostMapping("/credentials")
    public ResponseEntity<CredentialResponse> issue(
            Authentication authentication,
            @Valid @RequestBody CredentialIssueRequest request)
            throws Exception {

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(issuerService.issueCredential(
                        currentUserId(authentication),
                        request
                ));
    }

    @GetMapping("/credentials")
    public ResponseEntity<List<CredentialResponse>> list(
            Authentication authentication) {

        return ResponseEntity.ok(
                issuerService.listCredentials(
                        currentUserId(authentication)
                )
        );
    }

    @GetMapping("/credentials/{id}")
    public ResponseEntity<CredentialResponse> get(
            Authentication authentication,
            @PathVariable UUID id) {

        return ResponseEntity.ok(
                issuerService.getCredential(
                        currentUserId(authentication),
                        id
                )
        );
    }

    @PostMapping("/credentials/{id}/revoke")
    public ResponseEntity<RevokeResponse> revoke(
            Authentication authentication,
            @PathVariable UUID id,
            @Valid @RequestBody(required = false)
            RevokeRequest request) {

        String reason =
                request == null ? null : request.reason();

        return ResponseEntity.ok(
                issuerService.revokeCredential(
                        currentUserId(authentication),
                        currentRole(authentication),
                        id,
                        reason
                )
        );
    }

    @GetMapping("/verifications")
    public ResponseEntity<List<VerificationRecordResponse>>
    verifications(Authentication authentication) {

        return ResponseEntity.ok(
                issuerService.listVerifications(
                        currentUserId(authentication)
                )
        );
    }

    @PostMapping(
            value = "/credentials/{id}/document",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public ResponseEntity<CredentialResponse> attachDocument(
            Authentication authentication,
            @PathVariable UUID id,
            @RequestPart("document") MultipartFile document)
            throws Exception {

        if (document.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        String contentType = document.getContentType();

        if (contentType == null
                || !ALLOWED_DOCUMENT_TYPES.contains(contentType)) {

            return ResponseEntity
                    .status(HttpStatus.UNSUPPORTED_MEDIA_TYPE)
                    .build();
        }

        return ResponseEntity.ok(
                issuerService.attachDocument(
                        currentUserId(authentication),
                        id,
                        document.getBytes(),
                        contentType
                )
        );
    }

    private UUID currentUserId(
            Authentication authentication) {

        return (UUID) authentication.getPrincipal();
    }

    private Role currentRole(
            Authentication authentication) {

        String authority = authentication.getAuthorities()
                .iterator()
                .next()
                .getAuthority();

        return Role.valueOf(
                authority.substring("ROLE_".length())
        );
    }
}