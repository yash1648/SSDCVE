package com.ssdcve.controller;

import com.ssdcve.dto.request.LoginRequest;
import com.ssdcve.dto.request.RegisterRequest;
import com.ssdcve.dto.response.AuthResponse;
import com.ssdcve.dto.response.UserResponse;
import com.ssdcve.service.AuthService;
import com.ssdcve.service.AuthService.AuthTokens;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final String REFRESH_COOKIE_NAME =
            "refresh_token";

    private final AuthService authService;
    private final boolean cookieSecure;
    private final long refreshTokenTtlDays;

    public AuthController(
            AuthService authService,
            @Value("${ssdcve.auth.cookie-secure}")
            boolean cookieSecure,
            @Value("${ssdcve.auth.refresh-token-ttl-days}")
            long refreshTokenTtlDays) {

        this.authService = authService;
        this.cookieSecure = cookieSecure;
        this.refreshTokenTtlDays = refreshTokenTtlDays;
    }

    @PostMapping("/register")
    public ResponseEntity<UserResponse> register(
            @Valid @RequestBody RegisterRequest request) {

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletResponse response) {

        AuthTokens tokens = authService.login(request);

        setRefreshCookie(response, tokens.rawRefreshToken());

        return ResponseEntity.ok(
                toAuthResponse(tokens)
        );
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(
            @CookieValue(
                    name = REFRESH_COOKIE_NAME,
                    required = false
            ) String refreshToken,
            HttpServletResponse response) {

        AuthTokens tokens =
                authService.refresh(refreshToken);

        setRefreshCookie(response, tokens.rawRefreshToken());

        return ResponseEntity.ok(
                toAuthResponse(tokens)
        );
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            @CookieValue(
                    name = REFRESH_COOKIE_NAME,
                    required = false
            ) String refreshToken,
            HttpServletResponse response) {

        authService.logout(refreshToken);

        ResponseCookie clearCookie =
                ResponseCookie.from(
                                REFRESH_COOKIE_NAME,
                                ""
                        )
                        .httpOnly(true)
                        .secure(cookieSecure)
                        .sameSite("Lax")
                        .maxAge(Duration.ZERO)
                        .path("/api/auth")
                        .build();

        response.addHeader(
                HttpHeaders.SET_COOKIE,
                clearCookie.toString()
        );

        return ResponseEntity.noContent().build();
    }

    private void setRefreshCookie(
            HttpServletResponse response,
            String rawRefreshToken) {

        ResponseCookie cookie =
                ResponseCookie.from(
                                REFRESH_COOKIE_NAME,
                                rawRefreshToken
                        )
                        .httpOnly(true)
                        .secure(cookieSecure)
                        .sameSite("Lax")
                        .maxAge(
                                Duration.ofDays(
                                        refreshTokenTtlDays
                                )
                        )
                        .path("/api/auth")
                        .build();

        response.addHeader(
                HttpHeaders.SET_COOKIE,
                cookie.toString()
        );
    }

    private AuthResponse toAuthResponse(AuthTokens tokens) {

        return new AuthResponse(
                tokens.accessToken(),
                "Bearer",
                tokens.expiresInSeconds(),
                tokens.userId(),
                tokens.email(),
                tokens.fullName(),
                tokens.role()
        );
    }
}