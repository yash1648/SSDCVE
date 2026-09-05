package com.ssdcve.controller;

import com.ssdcve.dto.request.LoginRequest;
import com.ssdcve.dto.request.RegisterRequest;
import com.ssdcve.dto.response.UserResponse;
import com.ssdcve.model.Role;
import com.ssdcve.service.AuthService;
import com.ssdcve.service.AuthService.AuthTokens;
import com.ssdcve.service.JwtUtil;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AuthController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(JwtUtil.class)
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AuthService authService;

    @Test
    void register_returns201() throws Exception {

        when(authService.register(any(RegisterRequest.class)))
                .thenReturn(
                        new UserResponse(
                                UUID.randomUUID(),
                                "new@example.edu",
                                "New User",
                                Role.HOLDER
                        )
                );

        mockMvc.perform(
                        post("/api/auth/register")
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content(
                                        """
                                        {
                                          "email": "new@example.edu",
                                          "password": "password123",
                                          "fullName": "New User"
                                        }
                                        """
                                )
                )
                .andExpect(status().isCreated())
                .andExpect(
                        jsonPath("$.email")
                                .value("new@example.edu")
                )
                .andExpect(
                        jsonPath("$.role")
                                .value("HOLDER")
                );
    }

    @Test
    void login_setsSecureRefreshCookie() throws Exception {

        AuthTokens tokens =
                new AuthTokens(
                        "access-token-xyz",
                        "raw-refresh-token",
                        604800,
                        UUID.randomUUID(),
                        "holder@example.edu",
                        "Test Holder",
                        Role.HOLDER
                );

        when(authService.login(any(LoginRequest.class)))
                .thenReturn(tokens);

        mockMvc.perform(
                        post("/api/auth/login")
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content(
                                        """
                                        {
                                          "email": "holder@example.edu",
                                          "password": "correct-horse-battery"
                                        }
                                        """
                                )
                )
                .andExpect(status().isOk())
                .andExpect(
                        jsonPath("$.accessToken")
                                .value("access-token-xyz")
                )
                .andExpect(
                        jsonPath("$.tokenType")
                                .value("Bearer")
                )
                .andExpect(
                        jsonPath("$.role")
                                .value("HOLDER")
                )
                .andExpect(
                        header().string(
                                "Set-Cookie",
                                org.hamcrest.Matchers.allOf(
                                        org.hamcrest.Matchers
                                                .containsString(
                                                        "refresh_token=raw-refresh-token"
                                                ),
                                        org.hamcrest.Matchers
                                                .containsString(
                                                        "HttpOnly"
                                                ),
                                        org.hamcrest.Matchers
                                                .containsString(
                                                        "Secure"
                                                ),
                                        org.hamcrest.Matchers
                                                .containsString(
                                                        "SameSite=Lax"
                                                ),
                                        org.hamcrest.Matchers
                                                .containsString(
                                                        "Max-Age=604800"
                                                ),
                                        org.hamcrest.Matchers
                                                .containsString(
                                                        "Path=/api/auth"
                                                )
                                )
                        )
                );
    }

    @Test
    void refresh_returnsNewTokensAndCookie() throws Exception {

        AuthTokens tokens =
                new AuthTokens(
                        "new-access-token",
                        "new-refresh-token",
                        604800,
                        UUID.randomUUID(),
                        "holder@example.edu",
                        "Test Holder",
                        Role.HOLDER
                );

        when(authService.refresh("old-refresh-token"))
                .thenReturn(tokens);

        mockMvc.perform(
                        post("/api/auth/refresh")
                                .cookie(
                                        new jakarta.servlet.http
                                                .Cookie(
                                                "refresh_token",
                                                "old-refresh-token"
                                        )
                                )
                )
                .andExpect(status().isOk())
                .andExpect(
                        jsonPath("$.accessToken")
                                .value("new-access-token")
                )
                .andExpect(
                        header().string(
                                "Set-Cookie",
                                org.hamcrest.Matchers
                                        .containsString(
                                                "refresh_token=new-refresh-token"
                                        )
                        )
                );
    }

    @Test
    void logout_returns204AndClearsCookie() throws Exception {

        mockMvc.perform(
                        post("/api/auth/logout")
                                .cookie(
                                        new jakarta.servlet.http
                                                .Cookie(
                                                "refresh_token",
                                                "some-token"
                                        )
                                )
                )
                .andExpect(status().isNoContent())
                .andExpect(
                        header().string(
                                "Set-Cookie",
                                org.hamcrest.Matchers
                                        .containsString(
                                                "Max-Age=0"
                                        )
                        )
                );
    }
}