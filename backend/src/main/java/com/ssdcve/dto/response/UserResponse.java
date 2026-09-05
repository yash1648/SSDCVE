package com.ssdcve.dto.response;

import com.ssdcve.model.Role;

import java.util.UUID;

public record UserResponse(

        UUID id,

        String email,

        String fullName,

        Role role
) {
}