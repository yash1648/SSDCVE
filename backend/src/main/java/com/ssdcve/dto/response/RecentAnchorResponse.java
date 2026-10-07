package com.ssdcve.dto.response;

import java.time.LocalDateTime;

public record RecentAnchorResponse(
        String credentialNumber,
        String issuerName,
        Long blockNumber,
        LocalDateTime anchoredAt
) {
}
