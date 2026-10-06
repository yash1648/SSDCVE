package com.ssdcve.dto.response;

import java.util.List;

public record BatchVerificationResponse(
        String batchId,
        int total,
        int processed,
        int valid,
        int tampered,
        int revoked,
        int expired,
        int notFound,
        int unavailable,
        int failed,
        long durationMs,
        List<BatchItemResult> results
) {
}
