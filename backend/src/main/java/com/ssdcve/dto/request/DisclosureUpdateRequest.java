package com.ssdcve.dto.request;

import jakarta.validation.constraints.NotNull;
import java.util.List;

public record DisclosureUpdateRequest(
        @NotNull List<String> hiddenClaims
) {
}
