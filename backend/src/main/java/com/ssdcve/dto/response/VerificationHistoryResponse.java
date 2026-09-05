package com.ssdcve.dto.response;

import com.ssdcve.model.VerificationStatus;

import java.time.Instant;
import java.util.UUID;

public record VerificationHistoryResponse(

        UUID id,

        UUID credentialId,

        String credentialNumber,

        VerificationStatus result,

        String reason,

        Instant verifiedAt
) {
}