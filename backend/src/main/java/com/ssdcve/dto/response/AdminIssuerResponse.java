package com.ssdcve.dto.response;

import java.time.Instant;
import java.util.UUID;

public record AdminIssuerResponse(

        UUID id,

        UUID userId,

        String name,

        String domain,

        boolean verified,

        Instant createdAt,

        Instant updatedAt
) {
}