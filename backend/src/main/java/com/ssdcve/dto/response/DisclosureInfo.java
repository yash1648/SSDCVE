package com.ssdcve.dto.response;

public record DisclosureInfo(
        int disclosed,
        int total,
        boolean complete
) {
}
