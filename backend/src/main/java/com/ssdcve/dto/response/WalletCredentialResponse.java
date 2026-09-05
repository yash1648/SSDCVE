package com.ssdcve.dto.response;

import com.ssdcve.model.CredentialStatus;

import java.time.Instant;
import java.util.UUID;

public record WalletCredentialResponse(

        UUID credentialId,

        String credentialNumber,

        String type,

        String title,

        UUID issuerId,

        String issuerName,

        String issuerDomain,

        Instant issuedAt,

        Instant expiresAt,

        CredentialStatus.Status status
) {
}