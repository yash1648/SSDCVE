package com.ssdcve.dto.response;

import java.time.LocalDateTime;
import java.util.UUID;

public record IssuerResponse(

        UUID id,

        String name,

        String domain,

        boolean verified,

        LocalDateTime createdAt
) {
}