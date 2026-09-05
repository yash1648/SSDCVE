package com.ssdcve.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.ALWAYS)
public record SignedCredentialEnvelope(

        String version,

        CanonicalCredential credential,

        String contentHash,

        String signature,

        String signatureAlgorithm,

        String keyId
) {
}