package com.ssdcve.dto.response;

import com.ssdcve.model.Role;

import java.util.UUID;

public record AuthResponse(

        String accessToken,

        String tokenType,

        long expiresInSeconds,

        UUID userId,

        String email,

        String fullName,

        Role role
) {
}