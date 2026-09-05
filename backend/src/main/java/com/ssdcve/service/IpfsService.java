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

@Service
public class IpfsService {

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;
    private final String apiUrl;

    public IpfsService(
            ObjectMapper objectMapper,
            @Value("${ssdcve.ipfs.api-url}") String apiUrl) {

        this.httpClient = HttpClient.newHttpClient();
        this.objectMapper = objectMapper;
        this.apiUrl = apiUrl;
    }

    public String upload(byte[] content)
            throws IOException, InterruptedException {

        if (content == null || content.length == 0) {
            throw new IllegalArgumentException(
                    "IPFS content must not be empty"
            );
        }

        String boundary =
                "----SSDCVE-" + System.currentTimeMillis();

        byte[] body =
                buildMultipartBody(
                        boundary,
                        content
                );

        HttpRequest request =
                HttpRequest.newBuilder()
                        .uri(URI.create(
                                apiUrl + "/api/v0/add"
                        ))
                        .header(
                                "Content-Type",
                                "multipart/form-data; boundary="
                                        + boundary
                        )
                        .POST(
                                HttpRequest.BodyPublishers.ofByteArray(
                                        body
                                )
                        )
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
                    "IPFS upload failed: HTTP "
                            + response.statusCode()
                            + " - "
                            + response.body()
            );
        }

        JsonNode json =
                objectMapper.readTree(response.body());

        JsonNode hash =
                json.get("Hash");

        if (hash == null || hash.asText().isBlank()) {
            throw new IOException(
                    "IPFS response did not contain a CID"
            );
        }

        return hash.asText();
    }

    public byte[] retrieve(String cid)
            throws IOException, InterruptedException {

        if (cid == null || cid.isBlank()) {
            throw new IllegalArgumentException(
                    "CID must not be blank"
            );
        }

        HttpRequest request =
                HttpRequest.newBuilder()
                        .uri(
                                URI.create(
                                        apiUrl
                                                + "/api/v0/cat?arg="
                                                + cid
                                )
                        )
                        .POST(
                                HttpRequest.BodyPublishers.noBody()
                        )
                        .build();

        HttpResponse<byte[]> response =
                httpClient.send(
                        request,
                        HttpResponse.BodyHandlers.ofByteArray()
                );

        if (response.statusCode() / 100 != 2) {
            throw new IOException(
                    "IPFS retrieval failed: HTTP "
                            + response.statusCode()
            );
        }

        return response.body();
    }

    public void remove(String cid)
            throws IOException, InterruptedException {

        if (cid == null || cid.isBlank()) {
            return;
        }

        HttpRequest request =
                HttpRequest.newBuilder()
                        .uri(
                                URI.create(
                                        apiUrl
                                                + "/api/v0/pin/rm?arg="
                                                + cid
                        )
                        )
                        .POST(
                                HttpRequest.BodyPublishers.noBody()
                        )
                        .build();

        HttpResponse<String> response =
                httpClient.send(
                        request,
                        HttpResponse.BodyHandlers.ofString(
                                StandardCharsets.UTF_8
                        )
                );

        /*
         * Pin removal is cleanup, so a missing pin should not
         * obscure the original database failure.
         */
        if (response.statusCode() / 100 != 2
                && response.statusCode() != 500) {

            throw new IOException(
                    "IPFS cleanup failed: HTTP "
                            + response.statusCode()
            );
        }
    }

    private byte[] buildMultipartBody(
            String boundary,
            byte[] content) {

        String header =
                "--" + boundary + "\r\n"
                        + "Content-Disposition: form-data; "
                        + "name=\"file\"; filename=\"credential.json\"\r\n"
                        + "Content-Type: application/json\r\n"
                        + "\r\n";

        String footer =
                "\r\n--" + boundary + "--\r\n";

        byte[] headerBytes =
                header.getBytes(StandardCharsets.UTF_8);

        byte[] footerBytes =
                footer.getBytes(StandardCharsets.UTF_8);

        byte[] body =
                new byte[
                        headerBytes.length
                                + content.length
                                + footerBytes.length
                ];

        System.arraycopy(
                headerBytes,
                0,
                body,
                0,
                headerBytes.length
        );

        System.arraycopy(
                content,
                0,
                body,
                headerBytes.length,
                content.length
        );

        System.arraycopy(
                footerBytes,
                0,
                body,
                headerBytes.length + content.length,
                footerBytes.length
        );

        return body;
    }
}