package com.ssdcve.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class CanonicalizationServiceTest {

    private CanonicalizationService service;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        service = new CanonicalizationService(objectMapper);
    }

    @Test
    void sameDataDifferentKeyOrder_producesSameCanonicalJson()
            throws Exception {

        JsonNode first =
                objectMapper.readTree("""
                {
                  "b": 2,
                  "a": 1
                }
                """);

        JsonNode second =
                objectMapper.readTree("""
                {
                  "a": 1,
                  "b": 2
                }
                """);

        assertEquals(
                service.canonicalize(first),
                service.canonicalize(second)
        );
    }

    @Test
    void nestedObjects_areSortedRecursively()
            throws Exception {

        JsonNode first =
                objectMapper.readTree("""
                {
                  "outer": {
                    "z": 3,
                    "a": 1,
                    "m": 2
                  }
                }
                """);

        String canonical =
                service.canonicalize(first);

        assertEquals(
                "{\"outer\":{\"a\":1,\"m\":2,\"z\":3}}",
                canonical
        );
    }

    @Test
    void whitespace_doesNotChangeCanonicalRepresentation()
            throws Exception {

        JsonNode first =
                objectMapper.readTree("""
                { "a": 1, "b": 2 }
                """);

        JsonNode second =
                objectMapper.readTree("""
                {
                    "a": 1,
                    "b": 2
                }
                """);

        assertEquals(
                service.canonicalize(first),
                service.canonicalize(second)
        );
    }

    @Test
    void nullValues_arePreserved()
            throws Exception {

        JsonNode input =
                objectMapper.readTree("""
                {
                  "expiresAt": null,
                  "title": "Degree"
                }
                """);

        assertEquals(
                "{\"expiresAt\":null,\"title\":\"Degree\"}",
                service.canonicalize(input)
        );
    }

    @Test
    void arrayOrdering_isPreserved()
            throws Exception {

        JsonNode input =
                objectMapper.readTree("""
                {
                  "items": ["first", "second", "third"]
                }
                """);

        assertEquals(
                "{\"items\":[\"first\",\"second\",\"third\"]}",
                service.canonicalize(input)
        );
    }

    @Test
    void utf8_isUsed()
            throws Exception {

        JsonNode input =
                objectMapper.readTree("""
                {
                  "name": "Université"
                }
                """);

        byte[] bytes =
                service.canonicalizeToUtf8(input);

        assertArrayEquals(
                service.canonicalize(input)
                        .getBytes(java.nio.charset.StandardCharsets.UTF_8),
                bytes
        );
    }

    @Test
    void sha256_isDeterministic()
            throws Exception {

        JsonNode first =
                objectMapper.readTree("""
                {
                  "b": 2,
                  "a": 1
                }
                """);

        JsonNode second =
                objectMapper.readTree("""
                {
                  "a": 1,
                  "b": 2
                }
                """);

        assertEquals(
                service.sha256(first),
                service.sha256(second)
        );
    }

    @Test
    void sameSemanticData_differentJsonFormatting_producesSameHash()
            throws Exception {

        JsonNode first =
                objectMapper.readTree(
                        "{\"b\":2,\"a\":1}"
                );

        JsonNode second =
                objectMapper.readTree("""
                {
                    "a": 1,
                    "b": 2
                }
                """);

        assertEquals(
                service.sha256(first),
                service.sha256(second)
        );
    }
}