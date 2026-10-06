package com.ssdcve.service;

import com.ssdcve.dto.request.LoginRequest;
import com.ssdcve.dto.request.RegisterRequest;
import com.ssdcve.dto.response.UserResponse;
import com.ssdcve.model.Issuer;
import com.ssdcve.model.RefreshToken;
import com.ssdcve.model.Role;
import com.ssdcve.model.User;
import com.ssdcve.repository.IssuerRepository;
import com.ssdcve.repository.RefreshTokenRepository;
import com.ssdcve.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.UUID;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final IssuerRepository issuerRepository;
    private final BCryptPasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final SecureRandom secureRandom;
    private final long refreshTokenTtlDays;

    public AuthService(
            UserRepository userRepository,
            RefreshTokenRepository refreshTokenRepository,
            IssuerRepository issuerRepository,
            JwtUtil jwtUtil,
            @Value("${ssdcve.auth.refresh-token-ttl-days:7}")
            long refreshTokenTtlDays) {

        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.issuerRepository = issuerRepository;
        this.passwordEncoder = new BCryptPasswordEncoder();
        this.jwtUtil = jwtUtil;
        this.secureRandom = new SecureRandom();
        this.refreshTokenTtlDays = refreshTokenTtlDays;
    }

    @Transactional
    public UserResponse register(RegisterRequest request) {

        if (request == null) {
            throw new IllegalArgumentException(
                    "Registration request must not be null"
            );
        }

        String email =
                request.email().trim().toLowerCase();

        /*
         * Self-registration is always HOLDER. The role on the request is
         * advisory only: trusting it would let anyone mint themselves an
         * ADMIN, and would let them skip the issuer approval flow in
         * IssuerService.register by self-provisioning a verified issuer.
         * Privileged accounts are provisioned out of band via
         * provisionUser or promoted by an administrator.
         */
        return provisionUser(
                email,
                request.password(),
                request.fullName(),
                Role.HOLDER,
                false
        );
    }

    /**
     * Creates a user with an explicitly assigned role, provisioning a
     * pre-verified issuer record when requested. This is the only path
     * that may grant a role other than HOLDER and it is not exposed over
     * HTTP.
     *
     * <p>Idempotent by email: re-running against a database that already
     * contains the account raises IllegalArgumentException rather than a
     * constraint violation.
     */
    @Transactional
    public UserResponse provisionUser(
            String email,
            String password,
            String fullName,
            Role role,
            boolean provisionVerifiedIssuer) {

        String normalizedEmail = email.trim().toLowerCase();

        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new IllegalArgumentException(
                    "Email already registered"
            );
        }

        User user = new User();
        user.setEmail(normalizedEmail);
        user.setPasswordHash(
                passwordEncoder.encode(password)
        );
        user.setFullName(fullName);
        user.setRole(role);

        User saved = userRepository.save(user);

        if (role == Role.ISSUER && provisionVerifiedIssuer) {
            ensureVerifiedIssuer(saved);
        }

        return new UserResponse(
                saved.getId(),
                saved.getEmail(),
                saved.getFullName(),
                saved.getRole()
        );
    }

    /**
     * Grants ISSUER to an existing account and gives it a verified
     * issuer record, so the promoted user can issue immediately.
     * Reached only from the admin API.
     */
    @Transactional
    public UserResponse promoteToIssuer(UUID userId) {

        User user = userRepository.findById(userId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "User not found: " + userId
                        ));

        if (user.getRole() == Role.ADMIN) {
            throw new IllegalArgumentException(
                    "An administrator cannot be promoted to issuer"
            );
        }

        if (user.getRole() == Role.ISSUER) {
            throw new IllegalArgumentException(
                    "User is already an issuer"
            );
        }

        user.setRole(Role.ISSUER);
        User saved = userRepository.save(user);

        ensureVerifiedIssuer(saved);

        return new UserResponse(
                saved.getId(),
                saved.getEmail(),
                saved.getFullName(),
                saved.getRole()
        );
    }

    private void ensureVerifiedIssuer(User user) {

        if (issuerRepository.existsByUserId(user.getId())) {
            return;
        }

        Issuer issuer = new Issuer();
        issuer.setUser(user);
        issuer.setName(user.getFullName());

        String domain = "ssdcve.org";
        if (user.getEmail() != null && user.getEmail().contains("@")) {
            domain = user.getEmail().substring(user.getEmail().indexOf("@") + 1);
        }
        issuer.setDomain(domain);
        issuer.setVerified(true);
        issuerRepository.save(issuer);
    }

    @Transactional
    public AuthTokens login(LoginRequest request) {

        if (request == null) {
            throw new IllegalArgumentException(
                    "Login request must not be null"
            );
        }

        String email =
                request.email().trim().toLowerCase();

        User user =
                userRepository.findByEmail(email)
                        .orElseThrow(() ->
                                new BadCredentialsException(
                                        "Invalid credentials"
                                ));

        if (!passwordEncoder.matches(
                request.password(),
                user.getPasswordHash())) {

            throw new BadCredentialsException(
                    "Invalid credentials"
            );
        }

        return issueTokens(user);
    }

    @Transactional
    public AuthTokens refresh(String rawRefreshToken) {

        if (rawRefreshToken == null
                || rawRefreshToken.isBlank()) {

            throw new IllegalArgumentException(
                    "Refresh token is required"
            );
        }

        String tokenHash =
                sha256Hex(rawRefreshToken);

        RefreshToken stored =
                refreshTokenRepository
                        .findByTokenHash(tokenHash)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Unknown refresh token"
                                ));

        if (stored.getRevokedAt() != null) {
            throw new IllegalArgumentException(
                    "Refresh token has been revoked"
            );
        }

        if (stored.getExpiresAt()
                .isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException(
                    "Refresh token has expired"
            );
        }

        /*
         * Rotation: revoke the presented token and issue a
         * replacement, linking the family via replaced_by.
         * Save the replacement first so JPA generates its id,
         * then link the old token to it.
         */
        RefreshToken replacement =
                createRefreshToken(stored.getUser());

        refreshTokenRepository.save(replacement);

        stored.setRevokedAt(LocalDateTime.now());
        stored.setReplacedBy(replacement.getId());

        refreshTokenRepository.save(stored);

        return new AuthTokens(
                jwtUtil.generateAccessToken(
                        stored.getUser().getId(),
                        stored.getUser().getRole()
                ),
                replacement.getRawToken(),
                jwtUtil.accessTokenTtlSeconds(),
                stored.getUser().getId(),
                stored.getUser().getEmail(),
                stored.getUser().getFullName(),
                stored.getUser().getRole()
        );
    }

    @Transactional
    public void logout(String rawRefreshToken) {

        if (rawRefreshToken == null
                || rawRefreshToken.isBlank()) {
            return;
        }

        String tokenHash =
                sha256Hex(rawRefreshToken);

        refreshTokenRepository
                .findByTokenHash(tokenHash)
                .ifPresent(stored -> {
                    if (stored.getRevokedAt() == null) {
                        stored.setRevokedAt(
                                LocalDateTime.now()
                        );
                        refreshTokenRepository.save(stored);
                    }
                });
    }

    private AuthTokens issueTokens(User user) {

        RefreshToken refreshToken =
                createRefreshToken(user);

        refreshTokenRepository.save(refreshToken);

        return new AuthTokens(
                jwtUtil.generateAccessToken(
                        user.getId(),
                        user.getRole()
                ),
                refreshToken.getRawToken(),
                jwtUtil.accessTokenTtlSeconds(),
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getRole()
        );
    }

    private RefreshToken createRefreshToken(User user) {

        byte[] randomBytes =
                new byte[32];

        secureRandom.nextBytes(randomBytes);

        String rawToken =
                Base64.getUrlEncoder()
                        .withoutPadding()
                        .encodeToString(randomBytes);

        RefreshToken token = new RefreshToken();
        token.setUser(user);
        token.setTokenHash(sha256Hex(rawToken));
        token.setExpiresAt(
                LocalDateTime.now()
                        .plusDays(refreshTokenTtlDays)
        );
        token.setRawToken(rawToken);

        return token;
    }

    private String sha256Hex(String value) {

        try {

            MessageDigest digest =
                    MessageDigest.getInstance("SHA-256");

            return HexFormat.of().formatHex(
                    digest.digest(
                            value.getBytes(
                                    StandardCharsets.UTF_8
                            )
                    )
            );

        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException(
                    "SHA-256 unavailable",
                    ex
            );
        }
    }

    /**
     * Access token + refresh token pair returned by login/refresh.
     * The raw refresh token is only ever handed to the client
     * boundary (the cookie); the DB stores its SHA-256 hash.
     */
    public record AuthTokens(
            String accessToken,
            String rawRefreshToken,
            long expiresInSeconds,
            UUID userId,
            String email,
            String fullName,
            Role role
    ) {
    }
}