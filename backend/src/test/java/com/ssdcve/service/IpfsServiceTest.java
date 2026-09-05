package com.ssdcve.service;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Integration test against the real Kubo node (docker-compose).
 * Requires ssdcve-ipfs to be running.
 */
@SpringBootTest
class IpfsServiceTest {

    @Autowired
    private IpfsService ipfsService;

    @Test
    void uploadAndRetrieveRoundTrip() throws Exception {
        byte[] content =
                "{\"hello\":\"SSDCVE\"}"
                        .getBytes(StandardCharsets.UTF_8);

        String cid = ipfsService.upload(content);

        assertTrue(cid.startsWith("Qm") || cid.startsWith("bafy"),
                "unexpected CID format: " + cid);

        byte[] retrieved = ipfsService.retrieve(cid);

        assertArrayEquals(content, retrieved);
    }

    @Test
    void uploadRejectsEmptyContent() {
        assertThrows(
                IllegalArgumentException.class,
                () -> ipfsService.upload(new byte[0])
        );

        assertThrows(
                IllegalArgumentException.class,
                () -> ipfsService.upload(null)
        );
    }

    @Test
    void retrieveUnknownCidFails() {
        assertThrows(
                IOException.class,
                () -> ipfsService.retrieve(
                        "Qm0000000000000000000000000000000000000000"
                )
        );
    }
}