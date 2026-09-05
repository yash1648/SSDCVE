package com.ssdcve.dto.request;

import jakarta.validation.constraints.Size;

public record RevokeRequest(

        @Size(max = 1000)
        String reason
) {
}