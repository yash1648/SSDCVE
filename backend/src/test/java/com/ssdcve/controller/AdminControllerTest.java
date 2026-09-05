package com.ssdcve.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssdcve.model.Issuer;
import com.ssdcve.model.Role;
import com.ssdcve.model.User;
import com.ssdcve.repository.IssuerRepository;
import com.ssdcve.repository.UserRepository;
import com.ssdcve.service.IpfsService;
import com.ssdcve.service.JwtUtil;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.ArrayList;
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
 * Full-context admin tests: real security chain, real services,
 * real PostgreSQL + IPFS. Proves the ADMIN-only boundary and the
 * issuer-verification state transition.
 */
@SpringBootTest
@AutoConfigureMockMvc
class AdminControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private IssuerRepository issuerRepository;

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
        user.setPasswordHash(
                "hash-" + UUID.randomUUID()
        );
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

    private void verifyCredential(byte[] bytes, String bearer)
            throws Exception {

        var request = multipart("/api/verifier/verify")
                .file(
                        new org.springframework.mock.web
                                .MockMultipartFile(
                                "credentialFile",
                                "credential.json",
                                "application/json",
                                bytes
                        )
                );

        if (bearer != null) {
            request.header("Authorization", bearer);
        }

        mockMvc.perform(request)
                .andExpect(status().isOk());
    }

    // ------------------------------------------------------------
    // authorization boundary
    // ------------------------------------------------------------

    @Test
    void adminEndpoints_unauthenticated_returns401()
            throws Exception {

        mockMvc.perform(get("/api/admin/issuers"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/admin/users"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/admin/verifications"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(
                        post(
                                "/api/admin/issuers/"
                                        + UUID.randomUUID()
                                        + "/verify"
                        )
                )
                .andExpect(status().isUnauthorized());
    }

    @Test
    void adminEndpoints_nonAdminRoles_returns403()
            throws Exception {

        for (Role role : new Role[]{
                Role.HOLDER, Role.ISSUER, Role.VERIFIER
        }) {

            String token = bearer(createUser(role));

            mockMvc.perform(
                            get("/api/admin/issuers")
                                    .header(
                                            "Authorization",
                                            token
                                    )
                    )
                    .andExpect(status().isForbidden());

            mockMvc.perform(
                            get("/api/admin/users")
                                    .header(
                                            "Authorization",
                                            token
                                    )
                    )
                    .andExpect(status().isForbidden());

            mockMvc.perform(
                            get("/api/admin/verifications")
                                    .header(
                                            "Authorization",
                                            token
                                    )
                    )
                    .andExpect(status().isForbidden());

            mockMvc.perform(
                            post(
                                    "/api/admin/issuers/"
                                            + UUID.randomUUID()
                                            + "/verify"
                            )
                                    .header(
                                            "Authorization",
                                            token
                                    )
                    )
                    .andExpect(status().isForbidden());
        }
    }

    @Test
    void adminEndpoints_admin_succeeds() throws Exception {

        User admin = createUser(Role.ADMIN);

        mockMvc.perform(
                        get("/api/admin/issuers")
                                .header(
                                        "Authorization",
                                        bearer(admin)
                                )
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());

        mockMvc.perform(
                        get("/api/admin/users")
                                .header(
                                        "Authorization",
                                        bearer(admin)
                                )
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());

        mockMvc.perform(
                        get("/api/admin/verifications")
                                .header(
                                        "Authorization",
                                        bearer(admin)
                                )
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    // ------------------------------------------------------------
    // issuer administration
    // ------------------------------------------------------------

    @Test
    void admin_listsIssuers_withoutKeyMaterial()
            throws Exception {

        User issuerUser = createUser(Role.ISSUER);

        Issuer issuer = registerIssuer(issuerUser);

        User admin = createUser(Role.ADMIN);

        MvcResult result =
                mockMvc.perform(
                                get("/api/admin/issuers")
                                        .header(
                                                "Authorization",
                                                bearer(admin)
                                        )
                        )
                        .andExpect(status().isOk())
                        .andReturn();

        JsonNode array = objectMapper.readTree(
                result.getResponse().getContentAsString()
        );

        JsonNode mine = null;

        for (JsonNode node : array) {
            if (issuer.getId().toString()
                    .equals(node.get("id").asText())) {
                mine = node;
            }
        }

        assertThat(mine).isNotNull();

        assertThat(mine.get("userId").asText())
                .isEqualTo(issuerUser.getId().toString());

        assertThat(mine.get("name").asText())
                .isEqualTo("Test University");

        assertThat(mine.get("domain").asText())
                .isEqualTo("test.edu");

        assertThat(mine.get("verified").asBoolean())
                .isFalse();

        assertThat(mine.has("createdAt")).isTrue();

        assertThat(mine.has("updatedAt")).isTrue();

        /*
         * No key material of any kind.
         */
        assertThat(mine.has("publicKey")).isFalse();

        assertThat(mine.has("keyId")).isFalse();

        assertThat(mine.has("privateKey")).isFalse();

        assertThat(mine.has("signature")).isFalse();
    }

    @Test
    void admin_verifiesUnverifiedIssuer_persistsInDb()
            throws Exception {

        User issuerUser = createUser(Role.ISSUER);

        Issuer issuer = registerIssuer(issuerUser);

        User admin = createUser(Role.ADMIN);

        mockMvc.perform(
                        post(
                                "/api/admin/issuers/"
                                        + issuer.getId()
                                        + "/verify"
                        )
                                .header(
                                        "Authorization",
                                        bearer(admin)
                                )
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.verified")
                        .value(true))
                .andExpect(jsonPath("$.id")
                        .value(issuer.getId().toString()));

        assertThat(
                issuerRepository
                        .findById(issuer.getId())
                        .orElseThrow()
                        .isVerified()
        ).isTrue();
    }

    @Test
    void admin_verifyRepeated_isIdempotent() throws Exception {

        User issuerUser = createUser(Role.ISSUER);

        Issuer issuer = registerIssuer(issuerUser);

        User admin = createUser(Role.ADMIN);

        String url =
                "/api/admin/issuers/"
                        + issuer.getId()
                        + "/verify";

        mockMvc.perform(
                        post(url)
                                .header(
                                        "Authorization",
                                        bearer(admin)
                                )
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.verified")
                        .value(true));

        mockMvc.perform(
                        post(url)
                                .header(
                                        "Authorization",
                                        bearer(admin)
                                )
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.verified")
                        .value(true));

        assertThat(
                issuerRepository
                        .findById(issuer.getId())
                        .orElseThrow()
                        .isVerified()
        ).isTrue();
    }

    @Test
    void admin_verifyUnknownIssuer_returns404() throws Exception {

        User admin = createUser(Role.ADMIN);

        mockMvc.perform(
                        post(
                                "/api/admin/issuers/"
                                        + UUID.randomUUID()
                                        + "/verify"
                        )
                                .header(
                                        "Authorization",
                                        bearer(admin)
                                )
                )
                .andExpect(status().isNotFound());
    }

    @Test
    void issuer_cannotSelfVerify() throws Exception {

        User issuerUser = createUser(Role.ISSUER);

        Issuer issuer = registerIssuer(issuerUser);

        /*
         * The issuer's own token cannot reach the admin endpoint,
         * and the issuer stays unverified.
         */
        mockMvc.perform(
                        post(
                                "/api/admin/issuers/"
                                        + issuer.getId()
                                        + "/verify"
                        )
                                .header(
                                        "Authorization",
                                        bearer(issuerUser)
                                )
                )
                .andExpect(status().isForbidden());

        assertThat(
                issuerRepository
                        .findById(issuer.getId())
                        .orElseThrow()
                        .isVerified()
        ).isFalse();
    }

    // ------------------------------------------------------------
    // user administration
    // ------------------------------------------------------------

    @Test
    void admin_listsUsers_withoutSecrets() throws Exception {

        User holder = createUser(Role.HOLDER);

        User issuerUser = createUser(Role.ISSUER);

        User admin = createUser(Role.ADMIN);

        MvcResult result =
                mockMvc.perform(
                                get("/api/admin/users")
                                        .header(
                                                "Authorization",
                                                bearer(admin)
                                        )
                        )
                        .andExpect(status().isOk())
                        .andReturn();

        String body = result.getResponse()
                .getContentAsString();

        JsonNode array = objectMapper.readTree(body);

        List<JsonNode> mine = new ArrayList<>();

        for (JsonNode node : array) {
            String email = node.get("email").asText();

            if (email.equals(holder.getEmail())
                    || email.equals(issuerUser.getEmail())) {
                mine.add(node);
            }
        }

        assertThat(mine).hasSize(2);

        for (JsonNode node : mine) {
            assertThat(node.has("id")).isTrue();

            assertThat(node.has("fullName")).isTrue();

            assertThat(node.has("role")).isTrue();

            assertThat(node.has("createdAt")).isTrue();

            assertThat(node.has("updatedAt")).isTrue();

            /*
             * Never password hashes or token material.
             */
            assertThat(node.has("passwordHash")).isFalse();

            assertThat(node.has("refreshToken")).isFalse();

            assertThat(node.has("tokenHash")).isFalse();

            assertThat(node.has("rawToken")).isFalse();
        }

        assertThat(body)
                .doesNotContain(holder.getPasswordHash());

        assertThat(body)
                .doesNotContain(issuerUser.getPasswordHash());
    }

    @Test
    void users_nonAdmin_returns403() throws Exception {

        mockMvc.perform(
                        get("/api/admin/users")
                                .header(
                                        "Authorization",
                                        bearer(
                                                createUser(
                                                        Role.HOLDER
                                                )
                                        )
                                )
                )
                .andExpect(status().isForbidden());
    }

    // ------------------------------------------------------------
    // verification administration
    // ------------------------------------------------------------

    @Test
    void admin_seesVerificationsAcrossVerifiers_includingAnonymous_newestFirst()
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

        User verifierA = createUser(Role.VERIFIER);

        User verifierB = createUser(Role.VERIFIER);

        verifyCredential(envelope, bearer(verifierA));

        verifyCredential(envelope, bearer(verifierB));

        verifyCredential(envelope, null);

        User admin = createUser(Role.ADMIN);

        MvcResult result =
                mockMvc.perform(
                                get("/api/admin/verifications")
                                        .header(
                                                "Authorization",
                                                bearer(admin)
                                        )
                        )
                        .andExpect(status().isOk())
                        .andReturn();

        JsonNode array = objectMapper.readTree(
                result.getResponse().getContentAsString()
        );

        String credentialId = issued.get("id").asText();

        List<JsonNode> mine = new ArrayList<>();

        for (JsonNode node : array) {
            if (credentialId.equals(
                    node.get("credentialId").asText())) {
                mine.add(node);
            }
        }

        assertThat(mine).hasSize(3);

        /*
         * Newest first: anonymous (last), then B, then A.
         */
        assertThat(mine.get(0).get("verifierId").isNull())
                .isTrue();

        assertThat(mine.get(1).get("verifierId").asText())
                .isEqualTo(verifierB.getId().toString());

        assertThat(mine.get(2).get("verifierId").asText())
                .isEqualTo(verifierA.getId().toString());

        for (JsonNode node : mine) {
            assertThat(node.get("result").asText())
                    .isEqualTo("VALID");

            assertThat(node.get("credentialNumber").asText())
                    .isEqualTo(
                            issued.get("credentialNumber")
                                    .asText()
                    );

            assertThat(node.has("reason")).isTrue();

            assertThat(node.has("verifiedAt")).isTrue();

            assertThat(node.has("id")).isTrue();
        }
    }

    @Test
    void verifications_nonAdmin_returns403() throws Exception {

        mockMvc.perform(
                        get("/api/admin/verifications")
                                .header(
                                        "Authorization",
                                        bearer(
                                                createUser(
                                                        Role.VERIFIER
                                                )
                                        )
                                )
                )
                .andExpect(status().isForbidden());
    }

    // ------------------------------------------------------------
    // integration: verified gate drives issuance
    // ------------------------------------------------------------

    @Test
    void unverifiedIssuer_cannotIssue() throws Exception {

        User issuerUser = createUser(Role.ISSUER);

        registerIssuer(issuerUser);

        mockMvc.perform(
                        post("/api/issuer/credentials")
                                .header(
                                        "Authorization",
                                        bearer(issuerUser)
                                )
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content(
                                        objectMapper
                                                .writeValueAsString(
                                                        Map.of(
                                                                "subjectId",
                                                                createUser(
                                                                        Role.HOLDER
                                                                )
                                                                        .getId()
                                                                        .toString(),
                                                                "type",
                                                                "DegreeCertificate",
                                                                "title",
                                                                "Bachelor of Engineering",
                                                                "claims",
                                                                Map.of()
                                                        )
                                                )
                                )
                )
                .andExpect(status().isForbidden());
    }

    @Test
    void verifiedIssuer_canIssueAfterAdminVerification()
            throws Exception {

        User issuerUser = createUser(Role.ISSUER);

        Issuer issuer = registerIssuer(issuerUser);

        User admin = createUser(Role.ADMIN);

        /*
         * Unverified: issuance is blocked.
         */
        mockMvc.perform(
                        post("/api/issuer/credentials")
                                .header(
                                        "Authorization",
                                        bearer(issuerUser)
                                )
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content(
                                        objectMapper
                                                .writeValueAsString(
                                                        Map.of(
                                                                "subjectId",
                                                                createUser(
                                                                        Role.HOLDER
                                                                )
                                                                        .getId()
                                                                        .toString(),
                                                                "type",
                                                                "DegreeCertificate",
                                                                "title",
                                                                "Bachelor of Engineering",
                                                                "claims",
                                                                Map.of()
                                                        )
                                                )
                                )
                )
                .andExpect(status().isForbidden());

        /*
         * Admin verification flips the existing gate.
         */
        mockMvc.perform(
                        post(
                                "/api/admin/issuers/"
                                        + issuer.getId()
                                        + "/verify"
                        )
                                .header(
                                        "Authorization",
                                        bearer(admin)
                                )
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.verified")
                        .value(true));

        /*
         * The same issuance call now succeeds.
         */
        createKey(issuerUser);

        issueCredential(
                issuerUser,
                createUser(Role.HOLDER)
        );
    }

    // ------------------------------------------------------------
    // security boundary: no body-driven escalation
    // ------------------------------------------------------------

    @Test
    void verifyEndpoint_ignoresRequestBody() throws Exception {

        User issuerUser = createUser(Role.ISSUER);

        Issuer issuer = registerIssuer(issuerUser);

        User admin = createUser(Role.ADMIN);

        /*
         * A forged body cannot set verified=false or otherwise
         * influence the transition: the endpoint takes no body.
         */
        mockMvc.perform(
                        post(
                                "/api/admin/issuers/"
                                        + issuer.getId()
                                        + "/verify"
                        )
                                .header(
                                        "Authorization",
                                        bearer(admin)
                                )
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content(
                                        """
                                        {
                                          "verified": false,
                                          "userId": "00000000-0000-0000-0000-000000000000",
                                          "issuerId": "00000000-0000-0000-0000-000000000000"
                                        }
                                        """
                                )
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.verified")
                        .value(true))
                .andExpect(jsonPath("$.id")
                        .value(issuer.getId().toString()));

        assertThat(
                issuerRepository
                        .findById(issuer.getId())
                        .orElseThrow()
                        .isVerified()
        ).isTrue();
    }
}