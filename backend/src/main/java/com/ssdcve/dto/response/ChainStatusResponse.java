package com.ssdcve.dto.response;

public record ChainStatusResponse(
        long chainId,
        Long latestBlock,
        long anchoredCount
) {
}
