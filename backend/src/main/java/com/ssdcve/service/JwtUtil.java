package com.ssdcve.service;

import com.ssdcve.model.Role;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

@Component
public class JwtUtil {

    private static final String DEFAULT_SECRET =
            "change-me-in-production-minimum-32-bytes-long!!!";

    private final SecretKey key;
    private final long accessTokenTtlMinutes;

    public JwtUtil(
            @Value("${ssdcve.jwt.secret}") String secret,
            @Value("${ssdcve.jwt.access-token-ttl-minutes:15}")
            long accessTokenTtlMinutes) {

        if (secret == null
                || secret.getBytes(StandardCharsets.UTF_8).length
                < 32) {

            throw new IllegalStateException(
                    "ssdcve.jwt.secret must be at least 32 bytes"
            );
        }

        if ("production".equals(System.getenv("SSDCVE_ENV"))
                && DEFAULT_SECRET.equals(secret)) {

            throw new IllegalStateException(
                    "ssdcve.jwt.secret must be overridden in production"
            );
        }

        this.key =
                Keys.hmacShaKeyFor(
                        secret.getBytes(StandardCharsets.UTF_8)
                );
        this.accessTokenTtlMinutes =
                accessTokenTtlMinutes;
    }

    public String generateAccessToken(
            UUID userId,
            Role role) {

        Instant now = Instant.now();

        return Jwts.builder()
                .subject(userId.toString())
                .claim("role", role.name())
                .issuedAt(Date.from(now))
                .expiration(
                        Date.from(
                                now.plusSeconds(
                                        accessTokenTtlMinutes * 60
                                )
                        )
                )
                .signWith(key)
                .compact();
    }

    /**
     * Lifetime of a freshly issued access token, in seconds.
     * The client schedules its refresh from this, so it must be the
     * access token's own TTL and not the refresh token's.
     */
    public long accessTokenTtlSeconds() {
        return accessTokenTtlMinutes * 60;
    }

    public Claims parseAccessToken(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public UUID extractUserId(Claims claims) {
        return UUID.fromString(claims.getSubject());
    }

    public Role extractRole(Claims claims) {
        return Role.valueOf(
                claims.get("role", String.class)
        );
    }
}