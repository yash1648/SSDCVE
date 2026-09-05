package com.ssdcve.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssdcve.model.Credential;
import com.ssdcve.model.Issuer;
import com.ssdcve.model.Role;
import com.ssdcve.model.User;
import com.ssdcve.repository.CredentialRepository;
import com.ssdcve.repository.IssuerRepository;
import com.ssdcve.repository.UserRepository;
import com.ssdcve.service.IpfsService;
import com.ssdcve.service.JwtUtil;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.nio.charset.StandardCharsets;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Full-context verification-history tests: real security chain,
 * real services, real PostgreSQL + IPFS. Record persistence is
 * asserted directly against the database via JdbcTemplate so the
 * row, foreign keys, nullable verifier and timestamp are proven.
 */
@SpringBootTest
@AutoConfigureMockMvc
class VerificationHistoryTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private IssuerRepository issuerRepository;

    @Autowired
    private CredentialRepository credentialRepository;

    @Autowired
    private IpfsService ipfsService;

    // ------------------------------------------------------------
    // helpers
    // ------------------------------------------------------------

    private User createUser(Role role) {

        User user = new User();

        user.setEmail(
                "user-" + UUID.randomUUID() + "@test.edu"
        );
        user.setPasswordHash("not-used-in-tests");
        user.setFullName("Test " + role);
        user.setRole(role);

        return userRepository.save(user);
    }

    private String bearer(User user) {

        return "Bearer "
                + jwtUtil.generateAccessToken(
                        user.getId(),
                        user.getRole()
                );
    }

    private Issuer registerIssuer(User user) throws Exception {

        mockMvc.perform(
                        post("/api/issuer/register")
                                .header(
                                        "Authorization",
                                        bearer(user)
                                )
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content(
                                        """
                                        {
                                          "name": "Test University",
                                          "domain": "test.edu"
                                        }
                                        """
                                )
                )
                .andExpect(status().isCreated());

        return issuerRepository
                .findByUserId(user.getId())
                .orElseThrow();
    }

    private void verifyIssuer(Issuer issuer) {

        issuer.setVerified(true);
        issuerRepository.save(issuer);
    }

    private String createKey(User user) throws Exception {

        MvcResult result =
                mockMvc.perform(
                                post("/api/issuer/keys")
                                        .header(
                                                "Authorization",
                                                bearer(user)
                                        )
                        )
                        .andExpect(status().isCreated())
                        .andReturn();

        return objectMapper
                .readTree(
                        result.getResponse()
                                .getContentAsString()
                )
                .get("keyId")
                .asText();
    }

    private JsonNode issueCredential(
            User issuerUser,
            User subject)
            throws Exception {

        MvcResult result =
                mockMvc.perform(
                                post("/api/issuer/credentials")
                                        .header(
                                                "Authorization",
                                                bearer(issuerUser)
                                        )
                                        .contentType(
                                                MediaType
                                                        .APPLICATION_JSON
                                        )
                                        .content(
                                                objectMapper
                                                        .writeValueAsString(
                                                                Map.of(
                                                                        "subjectId",
                                                                        subject
                                                                                .getId()
                                                                                .toString(),
                                                                        "type",
                                                                        "DegreeCertificate",
                                                                        "title",
                                                                        "Bachelor of Engineering",
                                                                        "claims",
                                                                        Map.of(
                                                                                "degree",
                                                                                "BE"
                                                                        )
                                                                )
                                                        )
                                        )
                        )
                        .andExpect(status().isCreated())
                        .andReturn();

        return objectMapper.readTree(
                result.getResponse().getContentAsString()
        );
    }

    private byte[] envelopeBytes(JsonNode issued)
            throws Exception {

        return ipfsService.retrieve(
                issued.get("ipfsCid").asText()
        );
    }

    private MockMultipartFile file(byte[] bytes) {

        return new MockMultipartFile(
                "credentialFile",
                "credential.json",
                "application/json",
                bytes
        );
    }

    private ResultActions verify(
            byte[] bytes,
            String bearer)
            throws Exception {

        MockHttpServletRequestBuilder request =
                multipart("/api/verifier/verify")
                        .file(file(bytes));

        if (bearer != null) {
            request.header("Authorization", bearer);
        }

        return mockMvc.perform(request);
    }

    private List<Map<String, Object>> recordsForCredential(
            UUID credentialId) {

        return jdbcTemplate.queryForList(
                "SELECT id, credential_id, verifier_id, "
                        + "result, reason, verified_at "
                        + "FROM verification_records "
                        + "WHERE credential_id = ? "
                        + "ORDER BY verified_at DESC",
                credentialId
        );
    }

    private long recordCount() {

        Long count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM verification_records",
                Long.class
        );

        return count == null ? 0 : count;
    }

    // ------------------------------------------------------------
    // recording
    // ------------------------------------------------------------

    @Test
    void verify_validCredential_recordsHistoryRow()
            throws Exception {

        User issuerUser = createUser(Role.ISSUER);

        Issuer issuer = registerIssuer(issuerUser);

        verifyIssuer(issuer);

        createKey(issuerUser);

        JsonNode issued =
                issueCredential(
                        issuerUser,
                        createUser(Role.HOLDER)
                );

        User verifier = createUser(Role.VERIFIER);

        verify(
                envelopeBytes(issued),
                bearer(verifier)
        )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status")
                        .value("VALID"));

        UUID credentialId = UUID.fromString(
                issued.get("id").asText()
        );

        List<Map<String, Object>> rows =
                recordsForCredential(credentialId);

        assertThat(rows).hasSize(1);

        Map<String, Object> row = rows.get(0);

        assertThat(row.get("verifier_id"))
                .isEqualTo(verifier.getId());

        assertThat(row.get("result"))
                .isEqualTo("VALID");

        assertThat(row.get("reason"))
                .isEqualTo("Credential verified successfully");

        Timestamp verifiedAt =
                (Timestamp) row.get("verified_at");

        assertThat(verifiedAt).isNotNull();

        assertThat(verifiedAt.toInstant())
                .isBetween(
                        Instant.now().minusSeconds(60),
                        Instant.now().plusSeconds(5)
                );

        /*
         * Foreign key is real: the record joins back to the
         * credentials row.
         */
        String credentialNumber = jdbcTemplate.queryForObject(
                "SELECT c.credential_number "
                        + "FROM verification_records vr "
                        + "JOIN credentials c "
                        + "ON c.id = vr.credential_id "
                        + "WHERE vr.id = ?",
                String.class,
                row.get("id")
        );

        assertThat(credentialNumber)
                .isEqualTo(
                        issued.get("credentialNumber")
                                .asText()
                );
    }

    @Test
    void verify_tamperedIdentifiedCredential_recordsHistory()
            throws Exception {

        User issuerUser = createUser(Role.ISSUER);

        Issuer issuer = registerIssuer(issuerUser);

        verifyIssuer(issuer);

        createKey(issuerUser);

        JsonNode issued =
                issueCredential(
                        issuerUser,
                        createUser(Role.HOLDER)
                );

        String envelopeJson =
                new String(
                        envelopeBytes(issued),
                        StandardCharsets.UTF_8
                );

        /*
         * Same-length-safe content change: JSON stays valid, the
         * credential number stays intact, the hash no longer
         * matches -> TAMPERED for an identified credential.
         */
        byte[] tampered =
                envelopeJson
                        .replace(
                                "Bachelor of Engineering",
                                "Bachelor of EngineeringX"
                        )
                        .getBytes(StandardCharsets.UTF_8);

        verify(
                tampered,
                bearer(createUser(Role.VERIFIER))
        )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status")
                        .value("TAMPERED"));

        List<Map<String, Object>> rows =
                recordsForCredential(
                        UUID.fromString(
                                issued.get("id").asText()
                        )
                );

        assertThat(rows).hasSize(1);

        assertThat(rows.get(0).get("result"))
                .isEqualTo("TAMPERED");
    }

    @Test
    void verify_revokedCredential_recordsHistory()
            throws Exception {

        User issuerUser = createUser(Role.ISSUER);

        Issuer issuer = registerIssuer(issuerUser);

        verifyIssuer(issuer);

        createKey(issuerUser);

        JsonNode issued =
                issueCredential(
                        issuerUser,
                        createUser(Role.HOLDER)
                );

        mockMvc.perform(
                        post(
                                "/api/issuer/credentials/"
                                        + issued.get("id")
                                                .asText()
                                        + "/revoke"
                        )
                                .header(
                                        "Authorization",
                                        bearer(issuerUser)
                                )
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content(
                                        """
                                        {
                                          "reason": "test revocation"
                                        }
                                        """
                                )
                )
                .andExpect(status().isOk());

        verify(
                envelopeBytes(issued),
                bearer(createUser(Role.VERIFIER))
        )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status")
                        .value("REVOKED"));

        List<Map<String, Object>> rows =
                recordsForCredential(
                        UUID.fromString(
                                issued.get("id").asText()
                        )
                );

        assertThat(rows).hasSize(1);

        assertThat(rows.get(0).get("result"))
                .isEqualTo("REVOKED");
    }

    @Test
    void verify_expiredCredential_recordsHistory()
            throws Exception {

        User issuerUser = createUser(Role.ISSUER);

        Issuer issuer = registerIssuer(issuerUser);

        verifyIssuer(issuer);

        createKey(issuerUser);

        JsonNode issued =
                issueCredential(
                        issuerUser,
                        createUser(Role.HOLDER)
                );

        Credential credential = credentialRepository
                .findById(
                        UUID.fromString(
                                issued.get("id").asText()
                        )
                )
                .orElseThrow();

        credential.setExpiresAt(
                LocalDateTime.now().minusDays(1)
        );

        credentialRepository.save(credential);

        verify(
                envelopeBytes(issued),
                bearer(createUser(Role.VERIFIER))
        )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status")
                        .value("EXPIRED"));

        List<Map<String, Object>> rows =
                recordsForCredential(
                        credential.getId()
                );

        assertThat(rows).hasSize(1);

        assertThat(rows.get(0).get("result"))
                .isEqualTo("EXPIRED");
    }

    @Test
    void verify_unknownCredential_doesNotFabricateCredentialId()
            throws Exception {

        Map<String, Object> credential = new HashMap<>();

        credential.put(
                "credentialNumber",
                "SSD-CVE-2099-UNKNOWN-"
                        + UUID.randomUUID()
        );
        credential.put("type", "X");
        credential.put("title", "X");
        credential.put(
                "issuer",
                Map.of(
                        "id", UUID.randomUUID().toString(),
                        "name", "X",
                        "domain", "x"
                )
        );
        credential.put(
                "subject",
                Map.of(
                        "id", UUID.randomUUID().toString(),
                        "name", "X"
                )
        );
        credential.put("claims", Map.of());
        credential.put("issuedAt", "2026-01-01T00:00:00Z");
        credential.put("expiresAt", null);

        Map<String, Object> envelope = new HashMap<>();

        envelope.put("version", "1.0");
        envelope.put("credential", credential);
        envelope.put("contentHash", "abc");
        envelope.put("signature", "abc");
        envelope.put("signatureAlgorithm", "Ed25519");
        envelope.put("keyId", "unknown-key");

        User verifier = createUser(Role.VERIFIER);

        verify(
                objectMapper.writeValueAsBytes(envelope),
                bearer(verifier)
        )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status")
                        .value("NOT_FOUND"));

        List<Map<String, Object>> rows =
                jdbcTemplate.queryForList(
                        "SELECT credential_id, verifier_id, "
                                + "result "
                                + "FROM verification_records "
                                + "WHERE result = 'NOT_FOUND' "
                                + "AND verifier_id = ?",
                        verifier.getId()
                );

        assertThat(rows).hasSize(1);

        /*
         * No fabricated credential reference: the artifact could
         * not be matched, so credential_id stays NULL. The
         * authenticated verifier is still recorded.
         */
        assertThat(rows.get(0).get("credential_id"))
                .isNull();

        assertThat(rows.get(0).get("verifier_id"))
                .isEqualTo(verifier.getId());
    }

    @Test
    void verify_anonymous_recordsWithoutVerifierId()
            throws Exception {

        User issuerUser = createUser(Role.ISSUER);

        Issuer issuer = registerIssuer(issuerUser);

        verifyIssuer(issuer);

        createKey(issuerUser);

        JsonNode issued =
                issueCredential(
                        issuerUser,
                        createUser(Role.HOLDER)
                );

        /*
         * Public endpoint: no JWT, verification still succeeds and
         * is recorded with a NULL verifier_id.
         */
        verify(envelopeBytes(issued), null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status")
                        .value("VALID"));

        List<Map<String, Object>> rows =
                recordsForCredential(
                        UUID.fromString(
                                issued.get("id").asText()
                        )
                );

        assertThat(rows).hasSize(1);

        assertThat(rows.get(0).get("verifier_id"))
                .isNull();
    }

    @Test
    void verify_malformedAndEmptyUpload_followExistingBehavior()
            throws Exception {

        /*
         * Malformed JSON: 200 TAMPERED (existing behavior), still
         * recorded with no fabricated credential reference.
         */
        User verifier = createUser(Role.VERIFIER);

        verify(
                "this is not json".getBytes(
                        StandardCharsets.UTF_8
                ),
                bearer(verifier)
        )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status")
                        .value("TAMPERED"));

        List<Map<String, Object>> rows =
                jdbcTemplate.queryForList(
                        "SELECT credential_id, result "
                                + "FROM verification_records "
                                + "WHERE result = 'TAMPERED' "
                                + "AND credential_id IS NULL "
                                + "AND verifier_id = ?",
                        verifier.getId()
                );

        assertThat(rows).hasSize(1);

        /*
         * Empty upload: 400 TAMPERED (existing behavior), and no
         * record is created (the engine is never invoked).
         */
        long before = recordCount();

        mockMvc.perform(
                        multipart("/api/verifier/verify")
                                .file(
                                        new MockMultipartFile(
                                                "credentialFile",
                                                "credential.json",
                                                "application/json",
                                                new byte[0]
                                        )
                                )
                )
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status")
                        .value("TAMPERED"));

        assertThat(recordCount()).isEqualTo(before);
    }

    // ------------------------------------------------------------
    // history access
    // ------------------------------------------------------------

    @Test
    void history_authenticatedVerifier_returnsOwnHistoryNewestFirst()
            throws Exception {

        User issuerUser = createUser(Role.ISSUER);

        Issuer issuer = registerIssuer(issuerUser);

        verifyIssuer(issuer);

        createKey(issuerUser);

        JsonNode issued =
                issueCredential(
                        issuerUser,
                        createUser(Role.HOLDER)
                );

        byte[] envelope = envelopeBytes(issued);

        User verifier = createUser(Role.VERIFIER);

        verify(envelope, bearer(verifier))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status")
                        .value("VALID"));

        String tampered =
                new String(envelope, StandardCharsets.UTF_8)
                        .replace(
                                "Bachelor of Engineering",
                                "Bachelor of EngineeringX"
                        );

        verify(
                tampered.getBytes(StandardCharsets.UTF_8),
                bearer(verifier)
        )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status")
                        .value("TAMPERED"));

        mockMvc.perform(
                        get("/api/verifier/history")
                                .header(
                                        "Authorization",
                                        bearer(verifier)
                                )
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()")
                        .value(2))
                .andExpect(jsonPath("$[0].result")
                        .value("TAMPERED"))
                .andExpect(jsonPath("$[1].result")
                        .value("VALID"))
                .andExpect(jsonPath("$[0].credentialId")
                        .value(
                                issued.get("id").asText()
                        ))
                .andExpect(jsonPath("$[0].credentialNumber")
                        .value(
                                issued.get("credentialNumber")
                                        .asText()
                        ))
                .andExpect(jsonPath("$[0].reason")
                        .value("Content hash mismatch"))
                .andExpect(jsonPath("$[0].verifiedAt")
                        .exists())
                .andExpect(jsonPath("$[0].id")
                        .exists());
    }

    @Test
    void history_anotherUsersHistoryNotReturned()
            throws Exception {

        User issuerUser = createUser(Role.ISSUER);

        Issuer issuer = registerIssuer(issuerUser);

        verifyIssuer(issuer);

        createKey(issuerUser);

        JsonNode issued =
                issueCredential(
                        issuerUser,
                        createUser(Role.HOLDER)
                );

        verify(
                envelopeBytes(issued),
                bearer(createUser(Role.VERIFIER))
        )
                .andExpect(status().isOk());

        User otherVerifier = createUser(Role.VERIFIER);

        mockMvc.perform(
                        get("/api/verifier/history")
                                .header(
                                        "Authorization",
                                        bearer(otherVerifier)
                                )
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    void history_unauthenticated_returns401() throws Exception {

        mockMvc.perform(get("/api/verifier/history"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void history_holderAndIssuer_scopedAccess() throws Exception {

        /*
         * Documented policy: any authenticated role may read
         * verifier history, scoped to the requesting user.
         */
        mockMvc.perform(
                        get("/api/verifier/history")
                                .header(
                                        "Authorization",
                                        bearer(
                                                createUser(
                                                        Role.HOLDER
                                                )
                                        )
                                )
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());

        mockMvc.perform(
                        get("/api/verifier/history")
                                .header(
                                        "Authorization",
                                        bearer(
                                                createUser(
                                                        Role.ISSUER
                                                )
                                        )
                                )
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    void history_admin_returns200() throws Exception {

        mockMvc.perform(
                        get("/api/verifier/history")
                                .header(
                                        "Authorization",
                                        bearer(
                                                createUser(Role.ADMIN)
                                        )
                                )
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());
    }
}