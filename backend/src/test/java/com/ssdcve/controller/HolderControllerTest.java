package com.ssdcve.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssdcve.model.Issuer;
import com.ssdcve.model.Role;
import com.ssdcve.model.User;
import com.ssdcve.repository.CredentialRepository;
import com.ssdcve.repository.HolderWalletRepository;
import com.ssdcve.repository.IssuerKeyRepository;
import com.ssdcve.repository.IssuerRepository;
import com.ssdcve.repository.UserRepository;
import com.ssdcve.service.IpfsService;
import com.ssdcve.service.JwtUtil;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Full-context holder tests: real security chain, real services,
 * real PostgreSQL + IPFS.
 */
@SpringBootTest
@AutoConfigureMockMvc
class HolderControllerTest {

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
    private HolderWalletRepository walletRepository;

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

    private void createKey(User user) throws Exception {

        mockMvc.perform(
                        post("/api/issuer/keys")
                                .header(
                                        "Authorization",
                                        bearer(user)
                                )
                )
                .andExpect(status().isCreated());
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

    /**
     * Full issuer setup: ISSUER user + verified issuer + key,
     * returns a freshly issued credential for the given subject.
     */
    private JsonNode issuedCredentialFor(User subject)
            throws Exception {

        User issuerUser = createUser(Role.ISSUER);

        Issuer issuer = registerIssuer(issuerUser);

        verifyIssuer(issuer);

        createKey(issuerUser);

        return issueCredential(issuerUser, subject);
    }

    private void addToWallet(User holder, String credentialId)
            throws Exception {

        mockMvc.perform(
                        post(
                                "/api/holder/wallet/"
                                        + credentialId
                        )
                                .header(
                                        "Authorization",
                                        bearer(holder)
                                )
                )
                .andExpect(status().isCreated());
    }

    // ------------------------------------------------------------
    // wallet
    // ------------------------------------------------------------

    @Test
    void wallet_empty_returnsEmptyList() throws Exception {

        User holder = createUser(Role.HOLDER);

        mockMvc.perform(
                        get("/api/holder/wallet")
                                .header(
                                        "Authorization",
                                        bearer(holder)
                                )
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()")
                        .value(0));
    }

    @Test
    void wallet_holderSeesOwnOnly() throws Exception {

        User holderA = createUser(Role.HOLDER);
        User holderB = createUser(Role.HOLDER);

        JsonNode credential =
                issuedCredentialFor(holderA);

        addToWallet(holderA, credential.get("id").asText());

        /*
         * Holder A sees the credential.
         */
        mockMvc.perform(
                        get("/api/holder/wallet")
                                .header(
                                        "Authorization",
                                        bearer(holderA)
                                )
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()")
                        .value(1))
                .andExpect(jsonPath("$[0].credentialId")
                        .value(
                                credential.get("id").asText()
                        ))
                .andExpect(jsonPath("$[0].credentialNumber")
                        .value(
                                credential.get("credentialNumber")
                                        .asText()
                        ))
                .andExpect(jsonPath("$[0].issuerName")
                        .value("Test University"))
                .andExpect(jsonPath("$[0].status")
                        .value("ACTIVE"));

        /*
         * Holder B must not see it.
         */
        mockMvc.perform(
                        get("/api/holder/wallet")
                                .header(
                                        "Authorization",
                                        bearer(holderB)
                                )
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()")
                        .value(0));
    }

    @Test
    void add_validCredential_succeeds() throws Exception {

        User holder = createUser(Role.HOLDER);

        JsonNode credential =
                issuedCredentialFor(holder);

        mockMvc.perform(
                        post(
                                "/api/holder/wallet/"
                                        + credential.get("id")
                                                .asText()
                        )
                                .header(
                                        "Authorization",
                                        bearer(holder)
                                )
                )
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.credentialId")
                        .value(
                                credential.get("id").asText()
                        ));

        assertThat(
                walletRepository
                        .existsByUserIdAndCredentialId(
                                holder.getId(),
                                UUID.fromString(
                                        credential.get("id")
                                                .asText()
                                )
                        )
        ).isTrue();
    }

    @Test
    void add_duplicate_isIdempotent() throws Exception {

        User holder = createUser(Role.HOLDER);

        JsonNode credential =
                issuedCredentialFor(holder);

        String credentialId = credential.get("id").asText();

        addToWallet(holder, credentialId);

        mockMvc.perform(
                        post(
                                "/api/holder/wallet/"
                                        + credentialId
                        )
                                .header(
                                        "Authorization",
                                        bearer(holder)
                                )
                )
                .andExpect(status().isCreated());

        /*
         * Still exactly one wallet entry.
         */
        assertThat(
                walletRepository
                        .findByUserIdAndCredentialId(
                                holder.getId(),
                                UUID.fromString(credentialId)
                        )
        ).isPresent();

        assertThat(
                walletRepository
                        .findByUserIdOrderByStoredAtDesc(
                                holder.getId()
                        )
        ).hasSize(1);
    }

    @Test
    void add_nonexistentCredential_returns404()
            throws Exception {

        User holder = createUser(Role.HOLDER);

        mockMvc.perform(
                        post(
                                "/api/holder/wallet/"
                                        + UUID.randomUUID()
                        )
                                .header(
                                        "Authorization",
                                        bearer(holder)
                                )
                )
                .andExpect(status().isNotFound());
    }

    @Test
    void remove_ownCredential_works() throws Exception {

        User holder = createUser(Role.HOLDER);

        JsonNode credential =
                issuedCredentialFor(holder);

        String credentialId = credential.get("id").asText();

        addToWallet(holder, credentialId);

        mockMvc.perform(
                        delete(
                                "/api/holder/wallet/"
                                        + credentialId
                        )
                                .header(
                                        "Authorization",
                                        bearer(holder)
                                )
                )
                .andExpect(status().isNoContent());

        mockMvc.perform(
                        get("/api/holder/wallet")
                                .header(
                                        "Authorization",
                                        bearer(holder)
                                )
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()")
                        .value(0));
    }

    @Test
    void remove_anotherHoldersCredential_doesNotTouchIt()
            throws Exception {

        User holderA = createUser(Role.HOLDER);
        User holderB = createUser(Role.HOLDER);

        JsonNode credential =
                issuedCredentialFor(holderA);

        String credentialId = credential.get("id").asText();

        addToWallet(holderA, credentialId);

        /*
         * Holder B attempts removal - scoped to B's own wallet,
         * so A's entry is untouched.
         */
        mockMvc.perform(
                        delete(
                                "/api/holder/wallet/"
                                        + credentialId
                        )
                                .header(
                                        "Authorization",
                                        bearer(holderB)
                                )
                )
                .andExpect(status().isNoContent());

        assertThat(
                walletRepository
                        .existsByUserIdAndCredentialId(
                                holderA.getId(),
                                UUID.fromString(credentialId)
                        )
        ).isTrue();
    }

    // ------------------------------------------------------------
    // download
    // ------------------------------------------------------------

    @Test
    void download_ownWalletCredential_returnsStoredBytes()
            throws Exception {

        User holder = createUser(Role.HOLDER);

        JsonNode credential =
                issuedCredentialFor(holder);

        String credentialId = credential.get("id").asText();

        addToWallet(holder, credentialId);

        byte[] stored =
                ipfsService.retrieve(
                        credential.get("ipfsCid").asText()
                );

        mockMvc.perform(
                        get(
                                "/api/holder/credentials/"
                                        + credentialId
                                        + "/download"
                        )
                                .header(
                                        "Authorization",
                                        bearer(holder)
                                )
                )
                .andExpect(status().isOk())
                .andExpect(
                        content().contentType(
                                MediaType.APPLICATION_JSON
                        )
                )
                .andExpect(
                        header().string(
                                HttpHeaders.CONTENT_DISPOSITION,
                                org.hamcrest.Matchers
                                        .startsWith(
                                                "attachment; filename=\""
                                        )
                        )
                )
                .andExpect(
                        header().string(
                                HttpHeaders.CONTENT_DISPOSITION,
                                org.hamcrest.Matchers
                                        .containsString(".json\"")
                        )
                )
                .andExpect(content().bytes(stored));
    }

    @Test
    void certificate_ownWalletCredential_returnsPdf()
            throws Exception {

        User holder = createUser(Role.HOLDER);

        JsonNode credential =
                issuedCredentialFor(holder);

        String credentialId = credential.get("id").asText();

        addToWallet(holder, credentialId);

        mockMvc.perform(
                        get(
                                "/api/holder/credentials/"
                                        + credentialId
                                        + "/certificate"
                        )
                                .header(
                                        "Authorization",
                                        bearer(holder)
                                )
                )
                .andExpect(status().isOk())
                .andExpect(
                        content().contentType(
                                MediaType.APPLICATION_PDF
                        )
                )
                .andExpect(
                        header().string(
                                HttpHeaders.CONTENT_DISPOSITION,
                                org.hamcrest.Matchers
                                        .containsString(".pdf\"")
                        )
                )
                .andExpect(
                        content().string(
                                org.hamcrest.Matchers
                                        .startsWith("%PDF")
                        )
                );
    }

    @Test
    void certificate_notInWallet_returns404() throws Exception {

        User holder = createUser(Role.HOLDER);

        mockMvc.perform(
                        get(
                                "/api/holder/credentials/"
                                        + UUID.randomUUID()
                                        + "/certificate"
                        )
                                .header(
                                        "Authorization",
                                        bearer(holder)
                                )
                )
                .andExpect(status().isNotFound());
    }

    @Test
    void download_notInWallet_returns404() throws Exception {

        User holder = createUser(Role.HOLDER);
        User otherHolder = createUser(Role.HOLDER);

        JsonNode credential =
                issuedCredentialFor(holder);

        /*
         * Credential exists but belongs to another holder's
         * wallet (actually: not in this holder's wallet at all).
         */
        mockMvc.perform(
                        get(
                                "/api/holder/credentials/"
                                        + credential.get("id")
                                                .asText()
                                        + "/download"
                        )
                                .header(
                                        "Authorization",
                                        bearer(otherHolder)
                                )
                )
                .andExpect(status().isNotFound());
    }

    @Test
    void download_nonexistentCredential_returns404()
            throws Exception {

        User holder = createUser(Role.HOLDER);

        mockMvc.perform(
                        get(
                                "/api/holder/credentials/"
                                        + UUID.randomUUID()
                                        + "/download"
                        )
                                .header(
                                        "Authorization",
                                        bearer(holder)
                                )
                )
                .andExpect(status().isNotFound());
    }

    // ------------------------------------------------------------
    // security boundary
    // ------------------------------------------------------------

    @Test
    void issuer_cannotAccessHolderEndpoints_returns403()
            throws Exception {

        User issuer = createUser(Role.ISSUER);

        mockMvc.perform(
                        get("/api/holder/wallet")
                                .header(
                                        "Authorization",
                                        bearer(issuer)
                                )
                )
                .andExpect(status().isForbidden());
    }

    @Test
    void verifier_cannotAccessHolderEndpoints_returns403()
            throws Exception {

        User verifier = createUser(Role.VERIFIER);

        mockMvc.perform(
                        get("/api/holder/wallet")
                                .header(
                                        "Authorization",
                                        bearer(verifier)
                                )
                )
                .andExpect(status().isForbidden());
    }

    @Test
    void unauthenticated_returns401() throws Exception {

        mockMvc.perform(get("/api/holder/wallet"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void admin_canAccessHolderEndpoints() throws Exception {

        User admin = createUser(Role.ADMIN);

        mockMvc.perform(
                        get("/api/holder/wallet")
                                .header(
                                        "Authorization",
                                        bearer(admin)
                                )
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()")
                        .value(0));

        /*
         * ADMIN adds a credential to their own wallet and
         * downloads it.
         */
        JsonNode credential =
                issuedCredentialFor(admin);

        String credentialId = credential.get("id").asText();

        addToWallet(admin, credentialId);

        mockMvc.perform(
                        get(
                                "/api/holder/credentials/"
                                        + credentialId
                                        + "/download"
                        )
                                .header(
                                        "Authorization",
                                        bearer(admin)
                                )
                )
                .andExpect(status().isOk());
    }
}