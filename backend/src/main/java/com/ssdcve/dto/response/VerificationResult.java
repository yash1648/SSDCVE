package com.ssdcve.dto.response;

import com.ssdcve.model.VerificationStatus;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record VerificationResult(

        boolean valid,

        VerificationStatus status,

        String credentialNumber,

        String reason,

        UUID issuerId,

        String issuerName,

        String issuerDomain,

        boolean issuerVerified,

        Map<String, Object> claims,

        Instant issuedAt,

        Instant expiresAt,

        Instant verifiedAt
) {
}