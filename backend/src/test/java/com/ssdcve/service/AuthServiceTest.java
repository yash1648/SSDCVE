package com.ssdcve.service;

import com.ssdcve.dto.request.LoginRequest;
import com.ssdcve.dto.request.RegisterRequest;
import com.ssdcve.dto.response.UserResponse;
import com.ssdcve.model.RefreshToken;
import com.ssdcve.model.Role;
import com.ssdcve.model.User;
import com.ssdcve.repository.RefreshTokenRepository;
import com.ssdcve.repository.UserRepository;
import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class AuthServiceTest {

    private static final String JWT_SECRET =
            "dev-only-secret-change-me-0123456789abcdef0123456789abcdef";

    private UserRepository userRepository;
    private RefreshTokenRepository refreshTokenRepository;
    private JwtUtil jwtUtil;
    private AuthService service;
    private BCryptPasswordEncoder encoder;

    private UUID userId;
    private User user;

    @BeforeEach
    void setUp() {

        userRepository =
                mock(UserRepository.class);

        refreshTokenRepository =
                mock(RefreshTokenRepository.class);

        jwtUtil =
                new JwtUtil(JWT_SECRET, 15);

        service =
                new AuthService(
                        userRepository,
                        refreshTokenRepository,
                        jwtUtil,
                        7
                );

        encoder = new BCryptPasswordEncoder();

        userId = UUID.randomUUID();

        user = mock(User.class);
        when(user.getId()).thenReturn(userId);
        when(user.getEmail())
                .thenReturn("holder@example.edu");
        when(user.getPasswordHash())
                .thenReturn(
                        encoder.encode(
                                "correct-horse-battery"
                        )
                );
        when(user.getFullName())
                .thenReturn("Test Holder");
        when(user.getRole())
                .thenReturn(Role.HOLDER);
    }

    private String sha256Hex(String value) throws Exception {
        MessageDigest digest =
                MessageDigest.getInstance("SHA-256");
        return HexFormat.of().formatHex(
                digest.digest(
                        value.getBytes(StandardCharsets.UTF_8)
                )
        );
    }

    @Test
    void register_success_hashesPassword() {

        when(userRepository.existsByEmail(
                "new@example.edu"))
                .thenReturn(false);

        when(userRepository.save(any(User.class)))
                .thenAnswer(invocation ->
                        invocation.getArgument(0));

        UserResponse response =
                service.register(
                        new RegisterRequest(
                                "new@example.edu",
                                "password123",
                                "New User"
                        )
                );

        assertEquals("new@example.edu", response.email());
        assertEquals(Role.HOLDER, response.role());

        verify(userRepository).save(argThat(saved -> {
            String hash = saved.getPasswordHash();
            return !hash.equals("password123")
                    && encoder.matches(
                            "password123",
                            hash
                    );
        }));
    }

    @Test
    void register_duplicateEmail_rejected() {

        when(userRepository.existsByEmail(
                "dup@example.edu"))
                .thenReturn(true);

        assertThrows(
                IllegalArgumentException.class,
                () -> service.register(
                        new RegisterRequest(
                                "dup@example.edu",
                                "password123",
                                "Dup User"
                        )
                )
        );

        verify(userRepository, never())
                .save(any());
    }

    @Test
    void login_success_returnsTokensAndStoresHash()
            throws Exception {

        when(userRepository.findByEmail("holder@example.edu"))
                .thenReturn(Optional.of(user));

        when(refreshTokenRepository.save(any(RefreshToken.class)))
                .thenAnswer(invocation ->
                        invocation.getArgument(0));

        AuthService.AuthTokens tokens =
                service.login(
                        new LoginRequest(
                                "holder@example.edu",
                                "correct-horse-battery"
                        )
                );

        assertNotNull(tokens.accessToken());
        assertNotNull(tokens.rawRefreshToken());
        assertEquals(userId, tokens.userId());
        assertEquals(Role.HOLDER, tokens.role());
        assertEquals(7L * 24 * 60 * 60, tokens.expiresInSeconds());

        /*
         * The DB must store the SHA-256 hash, never the raw token.
         */
        verify(refreshTokenRepository).save(argThat(saved -> {
            String hash = saved.getTokenHash();
            return !hash.equals(tokens.rawRefreshToken())
                    && hash.equals(
                            sha256HexUnchecked(
                                    tokens.rawRefreshToken()
                            )
                    );
        }));
    }

    @Test
    void login_wrongPassword_rejected() {

        when(userRepository.findByEmail("holder@example.edu"))
                .thenReturn(Optional.of(user));

        assertThrows(
                BadCredentialsException.class,
                () -> service.login(
                        new LoginRequest(
                                "holder@example.edu",
                                "wrong-password"
                        )
                )
        );

        verify(refreshTokenRepository, never())
                .save(any());
    }

    @Test
    void login_unknownEmail_rejected() {

        when(userRepository.findByEmail("ghost@example.edu"))
                .thenReturn(Optional.empty());

        assertThrows(
                BadCredentialsException.class,
                () -> service.login(
                        new LoginRequest(
                                "ghost@example.edu",
                                "whatever"
                        )
                )
        );
    }

    @Test
    void accessToken_containsSubjectAndRole() {

        String token =
                jwtUtil.generateAccessToken(
                        userId,
                        Role.VERIFIER
                );

        Claims claims =
                jwtUtil.parseAccessToken(token);

        assertEquals(
                userId.toString(),
                claims.getSubject()
        );
        assertEquals(
                "VERIFIER",
                claims.get("role", String.class)
        );
    }

    @Test
    void accessToken_expiresAfterConfiguredTtl() {

        String token =
                jwtUtil.generateAccessToken(
                        userId,
                        Role.HOLDER
                );

        Claims claims =
                jwtUtil.parseAccessToken(token);

        long ttlSeconds =
                (claims.getExpiration().getTime()
                        - claims.getIssuedAt().getTime())
                        / 1000;

        assertEquals(15 * 60, ttlSeconds);
    }

    @Test
    void refresh_success_rotatesToken() {

        String rawToken = "raw-token-a";
        String tokenHash = sha256HexUnchecked(rawToken);

        RefreshToken stored = new RefreshToken();
        stored.setUser(user);
        stored.setTokenHash(tokenHash);
        stored.setExpiresAt(
                LocalDateTime.now().plusDays(7)
        );

        when(refreshTokenRepository
                .findByTokenHash(tokenHash))
                .thenReturn(Optional.of(stored));

        when(refreshTokenRepository.save(any(RefreshToken.class)))
                .thenAnswer(invocation -> {
                    RefreshToken token =
                            invocation.getArgument(0);
                    if (token.getId() == null) {
                        java.lang.reflect.Field idField =
                                RefreshToken.class
                                        .getDeclaredField("id");
                        idField.setAccessible(true);
                        idField.set(
                                token,
                                UUID.randomUUID()
                        );
                    }
                    return token;
                });

        AuthService.AuthTokens tokens =
                service.refresh(rawToken);

        assertNotNull(tokens.accessToken());
        assertNotNull(tokens.rawRefreshToken());
        assertNotEquals(rawToken, tokens.rawRefreshToken());

        /*
         * Old token revoked, linked to replacement.
         */
        assertNotNull(stored.getRevokedAt());
        assertNotNull(stored.getReplacedBy());

        verify(refreshTokenRepository, times(2))
                .save(any(RefreshToken.class));
    }

    @Test
    void refresh_unknownToken_rejected() {

        when(refreshTokenRepository
                .findByTokenHash(anyString()))
                .thenReturn(Optional.empty());

        assertThrows(
                IllegalArgumentException.class,
                () -> service.refresh("unknown-token")
        );
    }

    @Test
    void refresh_revokedToken_rejected() {

        String rawToken = "revoked-token";
        String tokenHash = sha256HexUnchecked(rawToken);

        RefreshToken stored = new RefreshToken();
        stored.setUser(user);
        stored.setTokenHash(tokenHash);
        stored.setExpiresAt(
                LocalDateTime.now().plusDays(7)
        );
        stored.setRevokedAt(LocalDateTime.now());

        when(refreshTokenRepository
                .findByTokenHash(tokenHash))
                .thenReturn(Optional.of(stored));

        assertThrows(
                IllegalArgumentException.class,
                () -> service.refresh(rawToken)
        );

        verify(refreshTokenRepository, never())
                .save(any());
    }

    @Test
    void refresh_expiredToken_rejected() {

        String rawToken = "expired-token";
        String tokenHash = sha256HexUnchecked(rawToken);

        RefreshToken stored = new RefreshToken();
        stored.setUser(user);
        stored.setTokenHash(tokenHash);
        stored.setExpiresAt(
                LocalDateTime.now().minusDays(1)
        );

        when(refreshTokenRepository
                .findByTokenHash(tokenHash))
                .thenReturn(Optional.of(stored));

        assertThrows(
                IllegalArgumentException.class,
                () -> service.refresh(rawToken)
        );

        verify(refreshTokenRepository, never())
                .save(any());
    }

    @Test
    void logout_revokesToken() {

        String rawToken = "logout-token";
        String tokenHash = sha256HexUnchecked(rawToken);

        RefreshToken stored = new RefreshToken();
        stored.setUser(user);
        stored.setTokenHash(tokenHash);
        stored.setExpiresAt(
                LocalDateTime.now().plusDays(7)
        );

        when(refreshTokenRepository
                .findByTokenHash(tokenHash))
                .thenReturn(Optional.of(stored));

        service.logout(rawToken);

        assertNotNull(stored.getRevokedAt());
        verify(refreshTokenRepository)
                .save(stored);
    }

    @Test
    void logout_unknownToken_isNoOp() {

        when(refreshTokenRepository
                .findByTokenHash(anyString()))
                .thenReturn(Optional.empty());

        service.logout("unknown-token");

        verify(refreshTokenRepository, never())
                .save(any());
    }

    private String sha256HexUnchecked(String value) {
        try {
            return sha256Hex(value);
        } catch (Exception ex) {
            throw new RuntimeException(ex);
        }
    }
}