package com.ssdcve.dto.response;

import java.util.List;
import java.util.Map;

public record DisclosureResponse(
        Map<String, Object> claims,
        List<String> hiddenClaims
) {
}
