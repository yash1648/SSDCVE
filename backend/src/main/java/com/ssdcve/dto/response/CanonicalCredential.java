package com.ssdcve.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@JsonInclude(JsonInclude.Include.ALWAYS)
public record CanonicalCredential(

        String credentialNumber,

        String type,

        String title,

        IssuerInfo issuer,

        SubjectInfo subject,

        Map<String, Object> claims,

        Instant issuedAt,

        Instant expiresAt
) {

    public record IssuerInfo(
            UUID id,
            String name,
            String domain
    ) {
    }

    public record SubjectInfo(
            UUID id,
            String name
    ) {
    }
}