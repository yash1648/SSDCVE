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
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * Issuer REST surface. The authenticated user is always derived
 * from the SecurityContext principal - a client-provided issuerId
 * is never accepted or trusted.
 */
@RestController
@RequestMapping("/api/issuer")
public class IssuerController {

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