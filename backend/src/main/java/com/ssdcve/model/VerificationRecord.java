package com.ssdcve.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(
        name = "verification_records",
        indexes = {
                @Index(
                        name = "idx_verification_records_verifier",
                        columnList = "verifier_id, verified_at"
                ),
                @Index(
                        name = "idx_verification_records_credential",
                        columnList = "credential_id"
                )
        }
)
public class VerificationRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /*
     * Nullable: an uploaded artifact that cannot be matched to a
     * credential must not fabricate a credential reference.
     */
    @ManyToOne(fetch = FetchType.LAZY, optional = true)
    @JoinColumn(name = "credential_id")
    private Credential credential;

    /*
     * Nullable: POST /api/verifier/verify is public, so anonymous
     * verification attempts are valid and must be recorded.
     */
    @ManyToOne(fetch = FetchType.LAZY, optional = true)
    @JoinColumn(name = "verifier_id")
    private User verifier;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private VerificationStatus result;

    @Column(columnDefinition = "TEXT")
    private String reason;

    @Column(name = "verified_at", nullable = false)
    private LocalDateTime verifiedAt;

    public VerificationRecord() {
    }

    public UUID getId() {
        return id;
    }

    public Credential getCredential() {
        return credential;
    }

    public void setCredential(Credential credential) {
        this.credential = credential;
    }

    public User getVerifier() {
        return verifier;
    }

    public void setVerifier(User verifier) {
        this.verifier = verifier;
    }

    public VerificationStatus getResult() {
        return result;
    }

    public void setResult(VerificationStatus result) {
        this.result = result;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public LocalDateTime getVerifiedAt() {
        return verifiedAt;
    }

    public void setVerifiedAt(LocalDateTime verifiedAt) {
        this.verifiedAt = verifiedAt;
    }
}