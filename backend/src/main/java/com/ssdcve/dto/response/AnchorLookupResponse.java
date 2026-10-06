package com.ssdcve.dto.response;

public record AnchorLookupResponse(
        String credentialNumber,
        String contentHash,
        String txHash,
        Long blockNumber,
        Long chainId,
        boolean anchorVerified
) {
}
