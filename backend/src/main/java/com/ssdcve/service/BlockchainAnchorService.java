package com.ssdcve.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.Map;

/**
 * Anchors content hashes to an Ethereum-compatible chain via JSON-RPC.
 * A 0-value transaction carries the hash in the data field (no smart
 * contract needed). Works against a local Anvil node or any public
 * chain - only the RPC URL and signing differ.
 */
@Service
public class BlockchainAnchorService {

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;
    private final String rpcUrl;
    private final String fromAddress;
    private final long chainId;

    public BlockchainAnchorService(
            ObjectMapper objectMapper,
            @Value("${ssdcve.blockchain.rpc-url:http://localhost:8545}") String rpcUrl,
            @Value("${ssdcve.blockchain.from-address:0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266}") String fromAddress,
            @Value("${ssdcve.blockchain.chain-id:31337}") long chainId) {

        this.httpClient = HttpClient.newHttpClient();
        this.objectMapper = objectMapper;
        this.rpcUrl = rpcUrl;
        this.fromAddress = fromAddress;
        this.chainId = chainId;
    }

    public long getChainId() {
        return chainId;
    }

    /**
     * Anchors a content hash by sending a 0-value transaction with the
     * hash in the data field. Returns the transaction hash.
     */
    public String anchor(String contentHash)
            throws IOException, InterruptedException {

        JsonNode result = rpc(
                "eth_sendTransaction",
                Map.of(
                        "from", fromAddress,
                        "to", fromAddress,
                        "data", "0x" + contentHash
                )
        );

        return result.asText();
    }

    /**
     * Latest mined block number, or null when the node is unreachable.
     */
     public Long latestBlock()
            throws IOException, InterruptedException {

        JsonNode result = rpc("eth_blockNumber");

        if (result == null || result.isNull()) {
            return null;
        }

        return Long.parseLong(
                result.asText().substring(2),
                16
        );
    }

    /**
     * Block number containing the transaction, or null if not mined yet.
     */
    public Long getBlockNumber(String txHash)
            throws IOException, InterruptedException {

        JsonNode tx = rpc(
                "eth_getTransactionByHash",
                txHash
        );

        if (tx == null || tx.isNull()) {
            return null;
        }

        JsonNode block = tx.get("blockNumber");

        if (block == null || block.isNull()) {
            return null;
        }

        return Long.parseLong(
                block.asText().substring(2),
                16
        );
    }

    /**
     * Confirms the transaction on-chain carries exactly this content hash.
     */
    public boolean verifyAnchor(
            String contentHash,
            String txHash)
            throws IOException, InterruptedException {

        JsonNode tx = rpc(
                "eth_getTransactionByHash",
                txHash
        );

        if (tx == null || tx.isNull()) {
            return false;
        }

        JsonNode data = tx.get("input");

        return data != null
                && ("0x" + contentHash)
                        .equalsIgnoreCase(data.asText());
    }

    private JsonNode rpc(
            String method,
            Object... params)
            throws IOException, InterruptedException {

        HttpRequest request =
                HttpRequest.newBuilder()
                        .uri(URI.create(rpcUrl))
                        .header("Content-Type", "application/json")
                        .POST(HttpRequest.BodyPublishers.ofString(
                                objectMapper.writeValueAsString(
                                        Map.of(
                                                "jsonrpc", "2.0",
                                                "method", method,
                                                "params", params,
                                                "id", 1
                                        )
                                )
                        ))
                        .build();

        HttpResponse<String> response =
                httpClient.send(
                        request,
                        HttpResponse.BodyHandlers.ofString(
                                StandardCharsets.UTF_8
                        )
                );

        if (response.statusCode() / 100 != 2) {
            throw new IOException(
                    "Blockchain RPC failed: HTTP "
                            + response.statusCode()
            );
        }

        JsonNode json =
                objectMapper.readTree(response.body());

        JsonNode error = json.get("error");

        if (error != null) {
            throw new IOException(
                    "Blockchain RPC error: " + error
            );
        }

        return json.get("result");
    }
}
