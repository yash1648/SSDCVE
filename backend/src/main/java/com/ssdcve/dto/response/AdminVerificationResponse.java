package com.ssdcve.dto.response;

import com.ssdcve.model.VerificationStatus;

import java.time.Instant;
import java.util.UUID;

public record AdminVerificationResponse(

        UUID id,

        UUID credentialId,

        String credentialNumber,

        UUID verifierId,

        VerificationStatus result,

        String reason,

        Instant verifiedAt
) {
}