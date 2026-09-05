package com.ssdcve.dto.response;

import com.ssdcve.model.Role;

import java.time.Instant;
import java.util.UUID;

public record AdminUserResponse(

        UUID id,

        String email,

        String fullName,

        Role role,

        Instant createdAt,

        Instant updatedAt
) {
}