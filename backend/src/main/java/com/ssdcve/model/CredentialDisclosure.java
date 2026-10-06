package com.ssdcve.model;

import jakarta.persistence.*;

import java.util.LinkedHashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "credential_disclosures")
public class CredentialDisclosure {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "credential_id", nullable = false, unique = true)
    private Credential credential;

    /*
     * Hidden keys, not visible ones. A missing row therefore means
     * "hide nothing", which keeps credentials valid without a migration.
     */
    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(
            name = "credential_disclosure_claims",
            joinColumns = @JoinColumn(name = "disclosure_id")
    )
    @Column(name = "claim_key", nullable = false, length = 100)
    private Set<String> hiddenClaims = new LinkedHashSet<>();

    public CredentialDisclosure() {
    }

    public CredentialDisclosure(
            Credential credential,
            Set<String> hiddenClaims) {

        this.credential = credential;
        this.hiddenClaims = new LinkedHashSet<>(hiddenClaims);
    }

    public UUID getId() {
        return id;
    }

    public Credential getCredential() {
        return credential;
    }

    public Set<String> getHiddenClaims() {
        return hiddenClaims;
    }

    public void setHiddenClaims(Set<String> hiddenClaims) {
        this.hiddenClaims = new LinkedHashSet<>(hiddenClaims);
    }
}
