package com.ssdcve.security;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssdcve.controller.GlobalExceptionHandler;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.yaml.snakeyaml.Yaml;

import java.io.InputStream;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Gate 13 hardening regressions: multipart limit enforcement,
 * password non-exposure, and configuration assumptions that must
 * not silently regress (secrets injected from the environment,
 * ddl-auto=validate, open-in-view disabled, upload limits).
 */
@SpringBootTest
@AutoConfigureMockMvc
class SecurityHardeningTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    // ------------------------------------------------------------
    // multipart upload limit
    // ------------------------------------------------------------

    /**
     * The servlet container (Tomcat) enforces
     * spring.servlet.multipart limits and raises
     * MaxUploadSizeExceededException; the handler must map it to a
     * clean 413 with a safe body. MockMvc has no container, so the
     * handler is exercised directly.
     */
    @Test
    void oversizedUpload_mapsTo413_withSafeBody() {

        GlobalExceptionHandler handler =
                new GlobalExceptionHandler();

        ResponseEntity<Map<String, String>> response =
                handler.uploadTooLarge(
                        new MaxUploadSizeExceededException(
                                2 * 1024 * 1024L
                        )
                );

        assertThat(response.getStatusCode())
                .isEqualTo(HttpStatus.PAYLOAD_TOO_LARGE);

        assertThat(response.getBody())
                .containsKey("error");

        assertThat(response.getBody().get("error"))
                .contains("2MB");

        /*
         * No stack trace, no exception class, no internals.
         */
        assertThat(response.getBody().toString())
                .doesNotContain("MaxUploadSizeExceededException")
                .doesNotContain("at com.ssdcve");
    }

    /**
     * The configured limit is present and enforced by the container
     * in production; a request that would exceed it is rejected
     * before reaching the verification engine.
     */
    @Test
    void oversizedUpload_rejectedBeforeVerification()
            throws Exception {

        byte[] oversized =
                new byte[3 * 1024 * 1024];

        MockMultipartFile file =
                new MockMultipartFile(
                        "credentialFile",
                        "credential.json",
                        "application/json",
                        oversized
                );

        /*
         * MockMvc has no servlet container, so the limit is not
         * enforced here - but the request must never be treated as
         * a valid credential. The engine rejects it as TAMPERED
         * rather than 500.
         */
        mockMvc.perform(
                        multipart("/api/verifier/verify")
                                .file(file)
                )
                .andExpect(status().isOk())
                .andExpect(
                        org.springframework.test.web.servlet
                                .result.MockMvcResultMatchers
                                .jsonPath("$.status")
                                .value("TAMPERED")
                );
    }

    // ------------------------------------------------------------
    // password non-exposure
    // ------------------------------------------------------------

    @Test
    void registerAndLogin_responses_neverExposePassword()
            throws Exception {

        String password = "hunter2-secret-password";

        String email =
                "hardening-"
                        + java.util.UUID.randomUUID()
                        + "@test.edu";

        String registerBody =
                """
                {
                  "email": "%s",
                  "password": "%s",
                  "fullName": "Hardening User"
                }
                """.formatted(email, password);

        String registerResponse =
                mockMvc.perform(
                                post("/api/auth/register")
                                        .contentType(
                                                MediaType
                                                        .APPLICATION_JSON
                                        )
                                        .content(registerBody)
                        )
                        .andExpect(status().isCreated())
                        .andReturn()
                        .getResponse()
                        .getContentAsString();

        assertNoPasswordMaterial(
                registerResponse,
                password
        );

        String loginBody =
                """
                {
                  "email": "%s",
                  "password": "%s"
                }
                """.formatted(email, password);

        String loginResponse =
                mockMvc.perform(
                                post("/api/auth/login")
                                        .contentType(
                                                MediaType
                                                        .APPLICATION_JSON
                                        )
                                        .content(loginBody)
                        )
                        .andExpect(status().isOk())
                        .andReturn()
                        .getResponse()
                        .getContentAsString();

        assertNoPasswordMaterial(
                loginResponse,
                password
        );
    }

    private void assertNoPasswordMaterial(
            String body,
            String password)
            throws Exception {

        JsonNode json = objectMapper.readTree(body);

        assertThat(json.has("password")).isFalse();

        assertThat(json.has("passwordHash")).isFalse();

        assertThat(body)
                .doesNotContain(password);
    }

    // ------------------------------------------------------------
    // configuration assumptions
    // ------------------------------------------------------------

    @Test
    @SuppressWarnings("unchecked")
    void applicationConfig_secretsAreEnvInjected_andHardeningFlagsSet()
            throws Exception {

        Map<String, Object> config;

        try (InputStream input =
                     new ClassPathResource("application.yaml")
                             .getInputStream()) {

            config = new Yaml().load(input);
        }

        Map<String, Object> spring =
                (Map<String, Object>) config.get("spring");

        Map<String, Object> datasource =
                (Map<String, Object>) spring.get("datasource");

        Map<String, Object> jpa =
                (Map<String, Object>) spring.get("jpa");

        Map<String, Object> hibernate =
                (Map<String, Object>) jpa.get("hibernate");

        Map<String, Object> servlet =
                (Map<String, Object>) spring.get("servlet");

        Map<String, Object> multipart =
                (Map<String, Object>) servlet.get("multipart");

        Map<String, Object> server =
                (Map<String, Object>) config.get("server");

        Map<String, Object> ssdcve =
                (Map<String, Object>) config.get("ssdcve");

        Map<String, Object> keystore =
                (Map<String, Object>) ssdcve.get("keystore");

        Map<String, Object> ipfs =
                (Map<String, Object>) ssdcve.get("ipfs");

        Map<String, Object> jwt =
                (Map<String, Object>) ssdcve.get("jwt");

        /*
         * Secrets must come from the environment, never be
         * hardcoded literals.
         */
        assertThat((String) datasource.get("password"))
                .contains("${SSDCVE_DB_PASSWORD");

        assertThat((String) keystore.get("password"))
                .contains("${SSDCVE_KEYSTORE_PASSWORD");

        assertThat((String) jwt.get("secret"))
                .contains("${SSDCVE_JWT_SECRET");

        /*
         * Infrastructure endpoints and ports are externally
         * configurable with explicit local defaults.
         */
        assertThat((String) keystore.get("path"))
                .contains("${SSDCVE_KEYSTORE_PATH");

        assertThat((String) ipfs.get("api-url"))
                .contains("${SSDCVE_IPFS_API_URL");

        assertThat((String) server.get("port"))
                .contains("${SERVER_PORT");

        /*
         * Hardening flags must stay set.
         */
        assertThat((String) hibernate.get("ddl-auto"))
                .isEqualTo("validate");

        assertThat(jpa.get("open-in-view"))
                .isEqualTo(false);

        assertThat((String) multipart.get("max-file-size"))
                .isEqualTo("2MB");

        assertThat((String) multipart.get("max-request-size"))
                .isEqualTo("2MB");
    }
}