package com.ssdcve.service;

import com.ssdcve.dto.request.LoginRequest;
import com.ssdcve.dto.request.RegisterRequest;
import com.ssdcve.dto.response.AuthResponse;
import com.ssdcve.dto.response.UserResponse;
import com.ssdcve.model.RefreshToken;
import com.ssdcve.model.Role;
import com.ssdcve.model.User;
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
    private final BCryptPasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final SecureRandom secureRandom;
    private final long refreshTokenTtlDays;

    public AuthService(
            UserRepository userRepository,
            RefreshTokenRepository refreshTokenRepository,
            JwtUtil jwtUtil,
            @Value("${ssdcve.auth.refresh-token-ttl-days}")
            long refreshTokenTtlDays) {

        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
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

        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException(
                    "Email already registered"
            );
        }

        User user = new User();
        user.setEmail(email);
        user.setPasswordHash(
                passwordEncoder.encode(request.password())
        );
        user.setFullName(request.fullName());
        user.setRole(Role.HOLDER);

        User saved = userRepository.save(user);

        return new UserResponse(
                saved.getId(),
                saved.getEmail(),
                saved.getFullName(),
                saved.getRole()
        );
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
                refreshTokenTtlDays * 24 * 60 * 60,
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
                refreshTokenTtlDays * 24 * 60 * 60,
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