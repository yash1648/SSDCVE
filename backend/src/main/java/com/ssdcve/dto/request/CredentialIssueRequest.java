package com.ssdcve.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.Map;
import java.util.UUID;

public record CredentialIssueRequest(

        @NotNull
        UUID subjectId,

        @NotBlank
        String type,

        @NotBlank
        String title,

        @NotNull
        Map<String, Object> claims
) {
}