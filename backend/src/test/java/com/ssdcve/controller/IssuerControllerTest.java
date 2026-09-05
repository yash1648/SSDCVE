package com.ssdcve.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssdcve.model.Credential;
import com.ssdcve.model.CredentialStatus;
import com.ssdcve.model.Issuer;
import com.ssdcve.model.IssuerKey;
import com.ssdcve.model.Role;
import com.ssdcve.model.User;
import com.ssdcve.repository.CredentialRepository;
import com.ssdcve.repository.CredentialStatusRepository;
import com.ssdcve.repository.IssuerKeyRepository;
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
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Full-context issuer tests: real security chain, real JwtUtil,
 * real services, real PostgreSQL + IPFS.
 */
@SpringBootTest
@AutoConfigureMockMvc
class IssuerControllerTest {

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
    private IssuerKeyRepository issuerKeyRepository;

    @Autowired
    private CredentialRepository credentialRepository;

    @Autowired
    private CredentialStatusRepository statusRepository;

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

    private User createSubject() {
        return createUser(Role.HOLDER);
    }

    // ------------------------------------------------------------
    // registration
    // ------------------------------------------------------------

    @Test
    void register_issuer_returns201Unverified() throws Exception {

        User user = createUser(Role.ISSUER);

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
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name")
                        .value("Test University"))
                .andExpect(jsonPath("$.domain")
                        .value("test.edu"))
                .andExpect(jsonPath("$.verified")
                        .value(false));
    }

    @Test
    void register_duplicate_returns400() throws Exception {

        User user = createUser(Role.ISSUER);

        registerIssuer(user);

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
                                          "name": "Second Name",
                                          "domain": "second.edu"
                                        }
                                        """
                                )
                )
                .andExpect(status().isBadRequest());
    }

    @Test
    void register_clientCannotSelfMarkVerified() throws Exception {

        User user = createUser(Role.ISSUER);

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
                                          "domain": "test.edu",
                                          "verified": true
                                        }
                                        """
                                )
                )
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.verified")
                        .value(false));
    }

    @Test
    void register_adminCanRegister() throws Exception {

        User admin = createUser(Role.ADMIN);

        mockMvc.perform(
                        post("/api/issuer/register")
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
                                          "name": "Admin University",
                                          "domain": "admin.edu"
                                        }
                                        """
                                )
                )
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.verified")
                        .value(false));
    }

    // ------------------------------------------------------------
    // key management
    // ------------------------------------------------------------

    @Test
    void unverifiedIssuer_cannotCreateKey_returns403()
            throws Exception {

        User user = createUser(Role.ISSUER);

        registerIssuer(user);

        mockMvc.perform(
                        post("/api/issuer/keys")
                                .header(
                                        "Authorization",
                                        bearer(user)
                                )
                )
                .andExpect(status().isForbidden());
    }

    @Test
    @Transactional
    void verifiedIssuer_canCreateKey_keyIdMapsToDb()
            throws Exception {

        User user = createUser(Role.ISSUER);

        Issuer issuer = registerIssuer(user);

        verifyIssuer(issuer);

        MvcResult result =
                mockMvc.perform(
                                post("/api/issuer/keys")
                                        .header(
                                                "Authorization",
                                                bearer(user)
                                        )
                        )
                        .andExpect(status().isCreated())
                        .andExpect(jsonPath("$.keyId")
                                .isNotEmpty())
                        .andExpect(jsonPath("$.publicKey")
                                .isNotEmpty())
                        .andExpect(jsonPath("$.algorithm")
                                .value("Ed25519"))
                        .andExpect(jsonPath("$.active")
                                .value(true))
                        .andReturn();

        String keyId = objectMapper
                .readTree(
                        result.getResponse()
                                .getContentAsString()
                )
                .get("keyId")
                .asText();

        IssuerKey key =
                issuerKeyRepository
                        .findByKeyId(keyId)
                        .orElseThrow();

        assertThat(key.getIssuer().getId())
                .isEqualTo(issuer.getId());
        assertThat(key.isActive()).isTrue();
    }

    @Test
    void keyResponse_neverContainsPrivateKey()
            throws Exception {

        User user = createUser(Role.ISSUER);

        Issuer issuer = registerIssuer(user);

        verifyIssuer(issuer);

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

        JsonNode body = objectMapper.readTree(
                result.getResponse().getContentAsString()
        );

        body.fieldNames().forEachRemaining(name ->
                assertThat(name.toLowerCase())
                        .doesNotContain("private")
        );
    }

    // ------------------------------------------------------------
    // issuance
    // ------------------------------------------------------------

    @Test
    void unverifiedIssuer_cannotIssue_returns403()
            throws Exception {

        User user = createUser(Role.ISSUER);

        registerIssuer(user);

        mockMvc.perform(
                        post("/api/issuer/credentials")
                                .header(
                                        "Authorization",
                                        bearer(user)
                                )
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content(
                                        objectMapper
                                                .writeValueAsString(
                                                        Map.of(
                                                                "subjectId",
                                                                createSubject()
                                                                        .getId()
                                                                        .toString(),
                                                                "type",
                                                                "DegreeCertificate",
                                                                "title",
                                                                "Bachelor",
                                                                "claims",
                                                                Map.of()
                                                        )
                                                )
                                )
                )
                .andExpect(status().isForbidden());
    }

    @Test
    @Transactional
    void verifiedIssuer_canIssue_persistsCredentialAndIpfs()
            throws Exception {

        User user = createUser(Role.ISSUER);

        Issuer issuer = registerIssuer(user);

        verifyIssuer(issuer);

        createKey(user);

        User subject = createSubject();

        JsonNode response = issueCredential(user, subject);

        String credentialId = response.get("id").asText();
        String ipfsCid = response.get("ipfsCid").asText();

        assertThat(ipfsCid).isNotBlank();
        assertThat(response.get("signature").asText())
                .isNotBlank();
        assertThat(response.get("contentHash").asText())
                .isNotBlank();
        assertThat(response.get("keyId").asText())
                .isNotBlank();
        assertThat(response.get("signatureAlgorithm").asText())
                .isEqualTo("Ed25519");
        assertThat(response.get("status").asText())
                .isEqualTo("ACTIVE");

        Credential credential =
                credentialRepository
                        .findById(UUID.fromString(credentialId))
                        .orElseThrow();

        assertThat(credential.getIssuer().getId())
                .isEqualTo(issuer.getId());
        assertThat(credential.getSubject().getId())
                .isEqualTo(subject.getId());

        /*
         * The signed envelope must actually exist on IPFS.
         */
        byte[] stored = ipfsService.retrieve(ipfsCid);

        assertThat(stored).isNotEmpty();
    }

    @Test
    @Transactional
    void issue_issuerIdentityFromAuthenticatedUser()
            throws Exception {

        User user = createUser(Role.ISSUER);

        Issuer issuer = registerIssuer(user);

        verifyIssuer(issuer);

        createKey(user);

        JsonNode response =
                issueCredential(user, createSubject());

        Credential credential =
                credentialRepository
                        .findById(
                                UUID.fromString(
                                        response.get("id")
                                                .asText()
                                )
                        )
                        .orElseThrow();

        assertThat(credential.getIssuer().getId())
                .isEqualTo(issuer.getId());
        assertThat(credential.getIssuer().getName())
                .isEqualTo("Test University");
        assertThat(credential.getIssuer().getDomain())
                .isEqualTo("test.edu");
    }

    @Test
    void issue_invalidRequest_returns400() throws Exception {

        User user = createUser(Role.ISSUER);

        Issuer issuer = registerIssuer(user);

        verifyIssuer(issuer);

        createKey(user);

        User subject = createSubject();

        /*
         * Missing type.
         */
        mockMvc.perform(
                        post("/api/issuer/credentials")
                                .header(
                                        "Authorization",
                                        bearer(user)
                                )
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content(
                                        objectMapper
                                                .writeValueAsString(
                                                        Map.of(
                                                                "subjectId",
                                                                subject
                                                                        .getId()
                                                                        .toString(),
                                                                "title",
                                                                "Bachelor",
                                                                "claims",
                                                                Map.of()
                                                        )
                                                )
                                )
                )
                .andExpect(status().isBadRequest());

        /*
         * Missing subjectId.
         */
        mockMvc.perform(
                        post("/api/issuer/credentials")
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
                                          "type": "DegreeCertificate",
                                          "title": "Bachelor",
                                          "claims": {}
                                        }
                                        """
                                )
                )
                .andExpect(status().isBadRequest());

        /*
         * Missing claims.
         */
        mockMvc.perform(
                        post("/api/issuer/credentials")
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
                                          "subjectId": "%s",
                                          "type": "DegreeCertificate",
                                          "title": "Bachelor"
                                        }
                                        """.formatted(
                                                subject.getId()
                                        )
                                )
                )
                .andExpect(status().isBadRequest());
    }

    // ------------------------------------------------------------
    // queries
    // ------------------------------------------------------------

    @Test
    void listCredentials_issuerSeesOwnOnly() throws Exception {

        User user = createUser(Role.ISSUER);

        Issuer issuer = registerIssuer(user);

        verifyIssuer(issuer);

        createKey(user);

        User subject = createSubject();

        JsonNode first = issueCredential(user, subject);
        JsonNode second = issueCredential(user, subject);

        mockMvc.perform(
                        get("/api/issuer/credentials")
                                .header(
                                        "Authorization",
                                        bearer(user)
                                )
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()")
                        .value(2))
                .andExpect(jsonPath("$[0].credentialNumber")
                        .value(
                                second.get("credentialNumber")
                                        .asText()
                        ))
                .andExpect(jsonPath("$[1].credentialNumber")
                        .value(
                                first.get("credentialNumber")
                                        .asText()
                        ));
    }

    @Test
    void getCredential_own_returns200() throws Exception {

        User user = createUser(Role.ISSUER);

        Issuer issuer = registerIssuer(user);

        verifyIssuer(issuer);

        createKey(user);

        JsonNode issued =
                issueCredential(user, createSubject());

        mockMvc.perform(
                        get(
                                "/api/issuer/credentials/"
                                        + issued.get("id")
                                                .asText()
                        )
                                .header(
                                        "Authorization",
                                        bearer(user)
                                )
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.credentialNumber")
                        .value(
                                issued.get("credentialNumber")
                                        .asText()
                        ));
    }

    @Test
    void getCredential_anotherIssuers_returns404()
            throws Exception {

        User issuerA = createUser(Role.ISSUER);
        User issuerB = createUser(Role.ISSUER);

        Issuer a = registerIssuer(issuerA);
        Issuer b = registerIssuer(issuerB);

        verifyIssuer(a);
        verifyIssuer(b);

        createKey(issuerA);
        createKey(issuerB);

        JsonNode issuedByB =
                issueCredential(issuerB, createSubject());

        mockMvc.perform(
                        get(
                                "/api/issuer/credentials/"
                                        + issuedByB.get("id")
                                                .asText()
                        )
                                .header(
                                        "Authorization",
                                        bearer(issuerA)
                                )
                )
                .andExpect(status().isNotFound());
    }

    @Test
    void listCredentials_crossIssuerIsolation()
            throws Exception {

        User issuerA = createUser(Role.ISSUER);
        User issuerB = createUser(Role.ISSUER);

        Issuer a = registerIssuer(issuerA);
        Issuer b = registerIssuer(issuerB);

        verifyIssuer(a);
        verifyIssuer(b);

        createKey(issuerA);
        createKey(issuerB);

        JsonNode issuedByA =
                issueCredential(issuerA, createSubject());

        issueCredential(issuerB, createSubject());

        mockMvc.perform(
                        get("/api/issuer/credentials")
                                .header(
                                        "Authorization",
                                        bearer(issuerA)
                                )
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()")
                        .value(1))
                .andExpect(jsonPath("$[0].credentialNumber")
                        .value(
                                issuedByA.get("credentialNumber")
                                        .asText()
                        ));
    }

    // ------------------------------------------------------------
    // revocation
    // ------------------------------------------------------------

    @Test
    void revoke_ownCredential_returnsRevoked() throws Exception {

        User user = createUser(Role.ISSUER);

        Issuer issuer = registerIssuer(user);

        verifyIssuer(issuer);

        createKey(user);

        JsonNode issued =
                issueCredential(user, createSubject());

        mockMvc.perform(
                        post(
                                "/api/issuer/credentials/"
                                        + issued.get("id")
                                                .asText()
                                        + "/revoke"
                        )
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
                                          "reason": "Administrative error"
                                        }
                                        """
                                )
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status")
                        .value("REVOKED"))
                .andExpect(jsonPath("$.reason")
                        .value("Administrative error"));

        CredentialStatus status =
                statusRepository
                        .findByCredentialId(
                                UUID.fromString(
                                        issued.get("id")
                                                .asText()
                                )
                        )
                        .orElseThrow();

        assertThat(status.getStatus())
                .isEqualTo(CredentialStatus.Status.REVOKED);
    }

    @Test
    void revoke_anotherIssuersCredential_returns403()
            throws Exception {

        User issuerA = createUser(Role.ISSUER);
        User issuerB = createUser(Role.ISSUER);

        Issuer a = registerIssuer(issuerA);
        Issuer b = registerIssuer(issuerB);

        verifyIssuer(a);
        verifyIssuer(b);

        createKey(issuerA);
        createKey(issuerB);

        JsonNode issuedByB =
                issueCredential(issuerB, createSubject());

        mockMvc.perform(
                        post(
                                "/api/issuer/credentials/"
                                        + issuedByB.get("id")
                                                .asText()
                                        + "/revoke"
                        )
                                .header(
                                        "Authorization",
                                        bearer(issuerA)
                                )
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content("{}")
                )
                .andExpect(status().isForbidden());
    }

    @Test
    void revoke_repeated_isIdempotent() throws Exception {

        User user = createUser(Role.ISSUER);

        Issuer issuer = registerIssuer(user);

        verifyIssuer(issuer);

        createKey(user);

        JsonNode issued =
                issueCredential(user, createSubject());

        String path =
                "/api/issuer/credentials/"
                        + issued.get("id").asText()
                        + "/revoke";

        mockMvc.perform(
                        post(path)
                                .header(
                                        "Authorization",
                                        bearer(user)
                                )
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content("{}")
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status")
                        .value("REVOKED"));

        mockMvc.perform(
                        post(path)
                                .header(
                                        "Authorization",
                                        bearer(user)
                                )
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content("{}")
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status")
                        .value("REVOKED"));
    }

    @Test
    void revoke_adminCanRevokeAcrossIssuers() throws Exception {

        User issuerUser = createUser(Role.ISSUER);

        Issuer issuer = registerIssuer(issuerUser);

        verifyIssuer(issuer);

        createKey(issuerUser);

        JsonNode issued =
                issueCredential(issuerUser, createSubject());

        User admin = createUser(Role.ADMIN);

        mockMvc.perform(
                        post(
                                "/api/issuer/credentials/"
                                        + issued.get("id")
                                                .asText()
                                        + "/revoke"
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
                                          "reason": "Admin action"
                                        }
                                        """
                                )
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status")
                        .value("REVOKED"))
                .andExpect(jsonPath("$.reason")
                        .value("Admin action"));
    }

    // ------------------------------------------------------------
    // verification history
    // ------------------------------------------------------------

    @Test
    void verifications_issuerSeesOwnOnly() throws Exception {

        User issuerA = createUser(Role.ISSUER);
        User issuerB = createUser(Role.ISSUER);

        Issuer a = registerIssuer(issuerA);
        Issuer b = registerIssuer(issuerB);

        verifyIssuer(a);
        verifyIssuer(b);

        createKey(issuerA);
        createKey(issuerB);

        JsonNode issuedByA1 =
                issueCredential(issuerA, createSubject());
        JsonNode issuedByA2 =
                issueCredential(issuerA, createSubject());

        JsonNode issuedByB =
                issueCredential(issuerB, createSubject());

        mockMvc.perform(
                        get("/api/issuer/verifications")
                                .header(
                                        "Authorization",
                                        bearer(issuerA)
                                )
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()")
                        .value(2))
                .andExpect(jsonPath("$[0].credentialNumber")
                        .value(
                                issuedByA2.get("credentialNumber")
                                        .asText()
                        ))
                .andExpect(jsonPath("$[1].credentialNumber")
                        .value(
                                issuedByA1.get("credentialNumber")
                                        .asText()
                        ))
                .andExpect(jsonPath("$[0].status")
                        .value("ACTIVE"));

        /*
         * Issuer B's credential must not appear in A's records.
         */
        mockMvc.perform(
                        get("/api/issuer/verifications")
                                .header(
                                        "Authorization",
                                        bearer(issuerA)
                                )
                )
                .andExpect(status().isOk())
                .andExpect(
                        jsonPath(
                                "$[?(@.credentialNumber == '"
                                        + issuedByB
                                                .get("credentialNumber")
                                                .asText()
                                        + "')]"
                        ).isEmpty()
                );
    }

    // ------------------------------------------------------------
    // security boundary
    // ------------------------------------------------------------

    @Test
    void holder_cannotAccessIssuerEndpoints_returns403()
            throws Exception {

        User holder = createUser(Role.HOLDER);

        mockMvc.perform(
                        post("/api/issuer/register")
                                .header(
                                        "Authorization",
                                        bearer(holder)
                                )
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content(
                                        """
                                        {
                                          "name": "X",
                                          "domain": "x.edu"
                                        }
                                        """
                                )
                )
                .andExpect(status().isForbidden());

        mockMvc.perform(
                        get("/api/issuer/credentials")
                                .header(
                                        "Authorization",
                                        bearer(holder)
                                )
                )
                .andExpect(status().isForbidden());
    }

    @Test
    void verifier_cannotAccessIssuerEndpoints_returns403()
            throws Exception {

        User verifier = createUser(Role.VERIFIER);

        mockMvc.perform(
                        get("/api/issuer/credentials")
                                .header(
                                        "Authorization",
                                        bearer(verifier)
                                )
                )
                .andExpect(status().isForbidden());

        mockMvc.perform(
                        get("/api/issuer/verifications")
                                .header(
                                        "Authorization",
                                        bearer(verifier)
                                )
                )
                .andExpect(status().isForbidden());
    }
}