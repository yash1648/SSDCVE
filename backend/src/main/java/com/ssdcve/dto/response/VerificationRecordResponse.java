package com.ssdcve.dto.response;

import com.ssdcve.model.CredentialStatus;

import java.time.Instant;
import java.time.LocalDateTime;

/**
 * Verification-relevant state of one of the issuer's credentials:
 * current status, revocation details, and validity window.
 */
public record VerificationRecordResponse(

        String credentialNumber,

        CredentialStatus.Status status,

        String reason,

        LocalDateTime revokedAt,

        Instant issuedAt,

        Instant expiresAt
) {
}