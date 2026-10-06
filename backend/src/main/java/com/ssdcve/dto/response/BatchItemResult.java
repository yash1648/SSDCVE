package com.ssdcve.dto.response;

public record BatchItemResult(
        String fileName,
        String credentialNumber,
        String recipientName,
        String issuerName,
        String status,
        boolean valid,
        VerificationChecks checks,
        VerificationResult verificationResult,
        String errorMessage
) {
}
