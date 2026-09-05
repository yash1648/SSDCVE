package com.ssdcve.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Iterator;
import java.util.List;
import java.util.Map;

@Service
public class CanonicalizationService {

    private final ObjectMapper objectMapper;

    public CanonicalizationService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper.copy();

        this.objectMapper.configure(
                SerializationFeature.WRITE_DATES_AS_TIMESTAMPS,
                false
        );
    }

    public String canonicalize(JsonNode input)
            throws JsonProcessingException {

        if (input == null) {
            throw new IllegalArgumentException(
                    "Input must not be null"
            );
        }

        JsonNode canonical = canonicalizeNode(input);

        return objectMapper.writeValueAsString(canonical);
    }

    public byte[] canonicalizeToUtf8(JsonNode input)
            throws JsonProcessingException {

        return canonicalize(input)
                .getBytes(StandardCharsets.UTF_8);
    }

    public String sha256(JsonNode input)
            throws JsonProcessingException {

        byte[] canonicalBytes =
                canonicalizeToUtf8(input);

        try {

            MessageDigest digest =
                    MessageDigest.getInstance("SHA-256");

            byte[] hash =
                    digest.digest(canonicalBytes);

            return toHex(hash);

        } catch (NoSuchAlgorithmException ex) {

            throw new IllegalStateException(
                    "SHA-256 is not available",
                    ex
            );
        }
    }

    private JsonNode canonicalizeNode(JsonNode node) {

        if (node.isObject()) {

            ObjectNode sortedObject =
                    objectMapper.createObjectNode();

            List<Map.Entry<String, JsonNode>> fields =
                    new ArrayList<>();

            Iterator<Map.Entry<String, JsonNode>> iterator =
                    node.fields();

            while (iterator.hasNext()) {
                fields.add(iterator.next());
            }

            fields.sort(
                    Comparator.comparing(
                            Map.Entry::getKey
                    )
            );

            for (Map.Entry<String, JsonNode> field : fields) {

                sortedObject.set(
                        field.getKey(),
                        canonicalizeNode(field.getValue())
                );
            }

            return sortedObject;
        }

        if (node.isArray()) {

            var array =
                    objectMapper.createArrayNode();

            for (JsonNode element : node) {
                array.add(canonicalizeNode(element));
            }

            return array;
        }

        /*
         * Value nodes are already deterministic JSON values.
         * null remains null and is NOT removed.
         */
        return node;
    }

    private String toHex(byte[] bytes) {

        StringBuilder result =
                new StringBuilder(bytes.length * 2);

        for (byte b : bytes) {

            result.append(
                    String.format("%02x", b & 0xff)
            );
        }

        return result.toString();
    }
}