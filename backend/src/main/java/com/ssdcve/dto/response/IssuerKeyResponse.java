package com.ssdcve.dto.response;

import java.time.LocalDateTime;

/**
 * Public issuer key material only. The private key lives
 * exclusively in the PKCS12 keystore and is never exposed.
 */
public record IssuerKeyResponse(

        String keyId,

        String publicKey,

        String algorithm,

        boolean active,

        LocalDateTime createdAt,

        LocalDateTime revokedAt
) {
}