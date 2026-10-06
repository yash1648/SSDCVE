package com.ssdcve.model;

import com.ssdcve.repository.CredentialDisclosureRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;

import java.time.LocalDateTime;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Runs against the real Hibernate and the real PostgreSQL, because
 * a mock cannot carry what this proves. The question is whether a
 * change to the hidden set on a MANAGED entity survives a real
 * flush.
 */
@DataJpaTest
@AutoConfigureTestDatabase(
        replace = AutoConfigureTestDatabase.Replace.NONE)
class CredentialDisclosurePersistenceTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private CredentialDisclosureRepository disclosureRepository;

    private UUID credentialId;

    @BeforeEach
    void setUp() {
        String unique = UUID.randomUUID().toString();

        User subject = new User();
        subject.setEmail("disclosure-subject-" + unique + "@example.com");
        subject.setPasswordHash("not-a-real-hash");
        subject.setFullName("Disclosure Subject");
        subject.setRole(Role.HOLDER);

        User issuerUser = new User();
        issuerUser.setEmail("disclosure-issuer-" + unique + "@example.com");
        issuerUser.setPasswordHash("not-a-real-hash");
        issuerUser.setFullName("Disclosure Issuer");
        issuerUser.setRole(Role.ISSUER);

        Issuer issuer = new Issuer();
        issuer.setUser(issuerUser);
        issuer.setName("Disclosure Issuer Ltd");
        issuer.setDomain("issuer-" + unique + ".example");

        Credential credential = new Credential();
        credential.setCredentialNumber("DISC-" + unique);
        credential.setIssuer(issuer);
        credential.setSubject(subject);
        credential.setType("Degree");
        credential.setTitle("Bachelor of Science");
        credential.setContentHash("a".repeat(64));
        credential.setIpfsCid("bafytestcid");
        credential.setSignature("sig");
        credential.setKeyId("key-1");
        credential.setIssuedAt(LocalDateTime.now());

        entityManager.persist(subject);
        entityManager.persist(issuerUser);
        entityManager.persist(issuer);
        entityManager.persist(credential);

        credentialId = credential.getId();

        entityManager.persistAndFlush(
                new CredentialDisclosure(credential, Set.of("gpa")));
    }

    @Test
    @DisplayName("changing the hidden set on a managed entity reaches the database")
    void setterChangeOnAManagedEntityIsPersisted() {
        entityManager.clear();

        CredentialDisclosure managed =
                disclosureRepository
                        .findByCredentialId(credentialId)
                        .orElseThrow();

        assertThat(entityManager.getEntityManager().contains(managed))
                .as("a detached entity would never reach the database "
                        + "whatever the setter does, so if this is "
                        + "false the rest of the test proves nothing")
                .isTrue();

        managed.setHiddenClaims(Set.of("major"));

        entityManager.flush();
        entityManager.clear();

        assertThat(disclosureRepository
                .findByCredentialId(credentialId)
                .orElseThrow()
                .getHiddenClaims())
                .as("the holder's new choice must survive the flush")
                .containsExactly("major");
    }
}
