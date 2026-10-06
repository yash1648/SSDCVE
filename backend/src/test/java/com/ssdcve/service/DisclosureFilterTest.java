package com.ssdcve.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssdcve.model.Credential;
import com.ssdcve.model.CredentialDisclosure;
import com.ssdcve.repository.CredentialAnchorRepository;
import com.ssdcve.repository.CredentialDisclosureRepository;
import com.ssdcve.repository.CredentialRepository;
import com.ssdcve.repository.CredentialStatusRepository;
import com.ssdcve.repository.IssuerKeyRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * The holder's disclosure policy is presentation only. The property
 * that matters most is the negative one: a credential with no policy
 * must come back byte-identical to how it behaved before disclosure
 * existed.
 */
class DisclosureFilterTest {

    private CredentialDisclosureRepository disclosureRepository;
    private VerificationService verificationService;
    private Credential credential;

    private Map<String, Object> claims;

    @BeforeEach
    void setUp() {
        disclosureRepository = mock(CredentialDisclosureRepository.class);

        credential = new Credential();
        try {
            java.lang.reflect.Field field =
                    Credential.class.getDeclaredField("id");
            field.setAccessible(true);
            field.set(credential, UUID.randomUUID());
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }

        claims = new LinkedHashMap<>();
        claims.put("program", "Computer Science");
        claims.put("gpa", "3.9");
        claims.put("honors", "summa cum laude");

        verificationService = new VerificationService(
                new ObjectMapper(),
                mock(CredentialRepository.class),
                mock(CredentialStatusRepository.class),
                mock(IssuerKeyRepository.class),
                mock(IpfsService.class),
                new CanonicalizationService(new ObjectMapper()),
                mock(CryptoService.class),
                mock(CredentialAnchorRepository.class),
                mock(BlockchainAnchorService.class),
                disclosureRepository
        );
    }

    /** Package-private on the service, so no reflection is needed here. */
    private VerificationService.DisclosedView filter(Map<String, Object> allClaims) {
        return verificationService.applyDisclosure(credential, allClaims);
    }

    @Test
    @DisplayName("no policy means every claim is disclosed and the view is complete")
    void noPolicyDisclosesEverything() {
        when(disclosureRepository.findByCredentialId(credential.getId()))
                .thenReturn(Optional.empty());

        VerificationService.DisclosedView result = filter(claims);

        assertThat(result.visible()).containsExactlyEntriesOf(claims);
        assertThat(result.info().complete()).isTrue();
    }

    @Test
    @DisplayName("a hidden claim is withheld and the view reports itself partial")
    void hiddenClaimIsWithheld() {
        when(disclosureRepository.findByCredentialId(credential.getId()))
                .thenReturn(Optional.of(new CredentialDisclosure(
                        credential, Set.of("gpa"))));

        VerificationService.DisclosedView result = filter(claims);

        assertThat(result.visible())
                .containsEntry("program", "Computer Science")
                .doesNotContainKey("gpa");
        assertThat(result.info().disclosed()).isEqualTo(2);
        assertThat(result.info().total()).isEqualTo(3);
        assertThat(result.info().complete()).isFalse();
    }

    @Test
    @DisplayName("hiding every claim yields an empty but honest view")
    void hidingEverythingYieldsEmptyView() {
        when(disclosureRepository.findByCredentialId(credential.getId()))
                .thenReturn(Optional.of(new CredentialDisclosure(
                        credential, Set.of("program", "gpa", "honors"))));

        VerificationService.DisclosedView result = filter(claims);

        assertThat(result.visible()).isEmpty();
        assertThat(result.info().disclosed()).isZero();
        assertThat(result.info().complete()).isFalse();
    }

    @Test
    @DisplayName("claim order is preserved so the verifier view is stable")
    void preservesClaimOrder() {
        when(disclosureRepository.findByCredentialId(credential.getId()))
                .thenReturn(Optional.of(new CredentialDisclosure(
                        credential, Set.of("gpa"))));

        assertThat(filter(claims).visible().keySet())
                .containsExactly("program", "honors");

        when(disclosureRepository.findByCredentialId(credential.getId()))
                .thenReturn(Optional.empty());

        assertThat(filter(claims).visible().keySet())
                .containsExactly("program", "gpa", "honors");
    }

    @Test
    @DisplayName("a policy naming a claim the credential no longer has withholds nothing")
    void stalePolicyKeyDoesNotClaimPartiality() {
        when(disclosureRepository.findByCredentialId(credential.getId()))
                .thenReturn(Optional.of(new CredentialDisclosure(
                        credential, Set.of("aClaimThisCredentialNeverHad",
                                "anotherRetiredClaim"))));

        VerificationService.DisclosedView result = filter(claims);

        assertThat(result.visible()).containsExactlyEntriesOf(claims);
        assertThat(result.info().disclosed()).isEqualTo(3);
        assertThat(result.info().total()).isEqualTo(3);
        assertThat(result.info().complete())
                .as("a policy key with no matching claim hides nothing, "
                        + "so this view is complete")
                .isTrue();
    }
}
