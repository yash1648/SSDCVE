package com.ssdcve.dto.response;

import com.ssdcve.model.CredentialStatus;

import java.time.LocalDateTime;
import java.util.UUID;

public record RevokeResponse(

        UUID credentialId,

        String credentialNumber,

        CredentialStatus.Status status,

        LocalDateTime revokedAt,

        String reason
) {
}