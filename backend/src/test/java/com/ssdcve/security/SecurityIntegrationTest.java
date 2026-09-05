package com.ssdcve.security;

import com.ssdcve.model.Role;
import com.ssdcve.service.JwtUtil;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Full-context security tests: real JwtFilter + SecurityConfig +
 * real JwtUtil. A test-only controller provides an authenticated
 * endpoint; role rules are exercised against path patterns.
 */
@SpringBootTest
@AutoConfigureMockMvc
class SecurityIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtUtil jwtUtil;

    @Value("${ssdcve.jwt.secret}")
    private String jwtSecret;

    private String holderToken;
    private String issuerToken;
    private String verifierToken;
    private String adminToken;

    @TestConfiguration
    static class TestConfig {

        @Bean
        TestSecureController testSecureController() {
            return new TestSecureController();
        }
    }

    @RestController
    static class TestSecureController {

        @GetMapping("/api/test/secure")
        public String secure() {
            return "ok";
        }
    }

    @BeforeEach
    void setUp() {

        holderToken =
                jwtUtil.generateAccessToken(
                        UUID.randomUUID(),
                        Role.HOLDER
                );

        issuerToken =
                jwtUtil.generateAccessToken(
                        UUID.randomUUID(),
                        Role.ISSUER
                );

        verifierToken =
                jwtUtil.generateAccessToken(
                        UUID.randomUUID(),
                        Role.VERIFIER
                );

        adminToken =
                jwtUtil.generateAccessToken(
                        UUID.randomUUID(),
                        Role.ADMIN
                );
    }

    private String bearer(String token) {
        return "Bearer " + token;
    }

    @Test
    void noJwt_protectedEndpoint_returns401() throws Exception {

        mockMvc.perform(get("/api/test/secure"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void validJwt_authenticatedEndpoint_succeeds() throws Exception {

        mockMvc.perform(
                        get("/api/test/secure")
                                .header(
                                        "Authorization",
                                        bearer(holderToken)
                                )
                )
                .andExpect(status().isOk())
                .andExpect(
                        org.springframework.test.web.servlet
                                .result.MockMvcResultMatchers
                                .content()
                                .string("ok")
                );
    }

    @Test
    void malformedJwt_returns401() throws Exception {

        mockMvc.perform(
                        get("/api/test/secure")
                                .header(
                                        "Authorization",
                                        bearer("not.a.jwt")
                                )
                )
                .andExpect(status().isUnauthorized());
    }

    @Test
    void expiredJwt_returns401() throws Exception {

        JwtUtil expiredUtil =
                new JwtUtil(jwtSecret, -1);

        String expiredToken =
                expiredUtil.generateAccessToken(
                        UUID.randomUUID(),
                        Role.HOLDER
                );

        mockMvc.perform(
                        get("/api/test/secure")
                                .header(
                                        "Authorization",
                                        bearer(expiredToken)
                                )
                )
                .andExpect(status().isUnauthorized());
    }

    @Test
    void invalidSignature_returns401() throws Exception {

        JwtUtil otherUtil =
                new JwtUtil(
                        "another-secret-0123456789abcdef0123456789abcdef",
                        15
                );

        String forgedToken =
                otherUtil.generateAccessToken(
                        UUID.randomUUID(),
                        Role.ADMIN
                );

        mockMvc.perform(
                        get("/api/test/secure")
                                .header(
                                        "Authorization",
                                        bearer(forgedToken)
                                )
                )
                .andExpect(status().isUnauthorized());
    }

    @Test
    void refreshTokenAsBearer_returns401() throws Exception {

        mockMvc.perform(
                        get("/api/test/secure")
                                .header(
                                        "Authorization",
                                        bearer(
                                                "opaque-refresh-token-value"
                                        )
                                )
                )
                .andExpect(status().isUnauthorized());
    }

    /**
     * A token carrying a role that is not a valid enum value must
     * never authenticate - Role.valueOf throws and the filter
     * leaves the request unauthenticated.
     */
    @Test
    void invalidRoleClaim_returns401() throws Exception {

        mockMvc.perform(
                        get("/api/test/secure")
                                .header(
                                        "Authorization",
                                        bearer(
                                                rawTokenWithRole(
                                                        "SUPERADMIN"
                                                )
                                        )
                                )
                )
                .andExpect(status().isUnauthorized());
    }

    /**
     * Lowercase "admin" is not a valid enum value either; only the
     * exact enum names can produce authorities.
     */
    @Test
    void lowercaseRoleClaim_returns401() throws Exception {

        mockMvc.perform(
                        get("/api/test/secure")
                                .header(
                                        "Authorization",
                                        bearer(
                                                rawTokenWithRole(
                                                        "admin"
                                                )
                                        )
                                )
                )
                .andExpect(status().isUnauthorized());
    }

    @Test
    void missingRoleClaim_returns401() throws Exception {

        mockMvc.perform(
                        get("/api/test/secure")
                                .header(
                                        "Authorization",
                                        bearer(
                                                rawTokenWithoutRole()
                                        )
                                )
                )
                .andExpect(status().isUnauthorized());
    }

    /**
     * The subject must be a parseable UUID; anything else is
     * rejected before any authority is granted.
     */
    @Test
    void invalidSubjectUuid_returns401() throws Exception {

        mockMvc.perform(
                        get("/api/test/secure")
                                .header(
                                        "Authorization",
                                        bearer(
                                                rawTokenWithSubject(
                                                        "not-a-uuid"
                                                )
                                        )
                                )
                )
                .andExpect(status().isUnauthorized());
    }

    /**
     * Access tokens carry exactly sub, role, iat, exp - nothing
     * sensitive, nothing extra.
     */
    @Test
    void accessToken_containsOnlyExpectedClaims() {

        String token =
                jwtUtil.generateAccessToken(
                        UUID.randomUUID(),
                        Role.HOLDER
                );

        Claims claims =
                jwtUtil.parseAccessToken(token);

        assertThat(claims.keySet())
                .containsExactlyInAnyOrder(
                        "sub", "role", "iat", "exp"
                );
    }

    private String rawTokenWithRole(String role) {

        return Jwts.builder()
                .subject(UUID.randomUUID().toString())
                .claim("role", role)
                .issuedAt(Date.from(Instant.now()))
                .expiration(
                        Date.from(
                                Instant.now()
                                        .plusSeconds(900)
                        )
                )
                .signWith(
                        Keys.hmacShaKeyFor(
                                jwtSecret.getBytes(
                                        StandardCharsets.UTF_8
                                )
                        )
                )
                .compact();
    }

    private String rawTokenWithoutRole() {

        return Jwts.builder()
                .subject(UUID.randomUUID().toString())
                .issuedAt(Date.from(Instant.now()))
                .expiration(
                        Date.from(
                                Instant.now()
                                        .plusSeconds(900)
                        )
                )
                .signWith(
                        Keys.hmacShaKeyFor(
                                jwtSecret.getBytes(
                                        StandardCharsets.UTF_8
                                )
                        )
                )
                .compact();
    }

    private String rawTokenWithSubject(String subject) {

        return Jwts.builder()
                .subject(subject)
                .claim("role", "HOLDER")
                .issuedAt(Date.from(Instant.now()))
                .expiration(
                        Date.from(
                                Instant.now()
                                        .plusSeconds(900)
                        )
                )
                .signWith(
                        Keys.hmacShaKeyFor(
                                jwtSecret.getBytes(
                                        StandardCharsets.UTF_8
                                )
                        )
                )
                .compact();
    }

    @Test
    void holderCannotAccessIssuerEndpoints() throws Exception {

        mockMvc.perform(
                        get("/api/issuer/anything")
                                .header(
                                        "Authorization",
                                        bearer(holderToken)
                                )
                )
                .andExpect(status().isForbidden());
    }

    @Test
    void holderCannotAccessAdminEndpoints() throws Exception {

        mockMvc.perform(
                        get("/api/admin/anything")
                                .header(
                                        "Authorization",
                                        bearer(holderToken)
                                )
                )
                .andExpect(status().isForbidden());
    }

    @Test
    void issuerCannotAccessAdminEndpoints() throws Exception {

        mockMvc.perform(
                        get("/api/admin/anything")
                                .header(
                                        "Authorization",
                                        bearer(issuerToken)
                                )
                )
                .andExpect(status().isForbidden());
    }

    @Test
    void issuerCanAccessIssuerEndpoints() throws Exception {

        /*
         * 404 (no controller) proves the request passed the
         * security layer and reached routing.
         */
        mockMvc.perform(
                        get("/api/issuer/anything")
                                .header(
                                        "Authorization",
                                        bearer(issuerToken)
                                )
                )
                .andExpect(status().isNotFound());
    }

    @Test
    void holderCanAccessHolderEndpoints() throws Exception {

        mockMvc.perform(
                        get("/api/holder/anything")
                                .header(
                                        "Authorization",
                                        bearer(holderToken)
                                )
                )
                .andExpect(status().isNotFound());
    }

    @Test
    void adminCanAccessAllRoleEndpoints() throws Exception {

        mockMvc.perform(
                        get("/api/issuer/anything")
                                .header(
                                        "Authorization",
                                        bearer(adminToken)
                                )
                )
                .andExpect(status().isNotFound());

        mockMvc.perform(
                        get("/api/holder/anything")
                                .header(
                                        "Authorization",
                                        bearer(adminToken)
                                )
                )
                .andExpect(status().isNotFound());

        mockMvc.perform(
                        get("/api/admin/anything")
                                .header(
                                        "Authorization",
                                        bearer(adminToken)
                                )
                )
                .andExpect(status().isNotFound());
    }

    @Test
    void verifierHistory_requiresAuthentication() throws Exception {

        mockMvc.perform(get("/api/verifier/history"))
                .andExpect(status().isUnauthorized());

        /*
         * Any authenticated role may read verifier history.
         */
        mockMvc.perform(
                        get("/api/verifier/history")
                                .header(
                                        "Authorization",
                                        bearer(holderToken)
                                )
                )
                .andExpect(status().isOk());

        mockMvc.perform(
                        get("/api/verifier/history")
                                .header(
                                        "Authorization",
                                        bearer(verifierToken)
                                )
                )
                .andExpect(status().isOk());
    }

    @Test
    void publicAuthEndpoints_accessibleWithoutJwt() throws Exception {

        /*
         * Empty body fails validation with 400, proving the
         * endpoint is reachable without authentication.
         */
        mockMvc.perform(
                        post("/api/auth/register")
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content("{}")
                )
                .andExpect(status().isBadRequest());
    }

    @Test
    void verifyEndpoint_publicWithoutJwt() throws Exception {

        MockMultipartFile file =
                new MockMultipartFile(
                        "credentialFile",
                        "credential.json",
                        "application/json",
                        "{}".getBytes()
                );

        /*
         * Real VerificationService: "{}" is an incomplete envelope,
         * so the outcome is TAMPERED with HTTP 200 - proving the
         * endpoint is public.
         */
        mockMvc.perform(
                        multipart("/api/verifier/verify")
                                .file(file)
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("TAMPERED"));
    }
}