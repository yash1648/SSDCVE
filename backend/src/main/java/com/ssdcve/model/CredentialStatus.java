package com.ssdcve.model;

import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(
        name = "credential_status",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_credential_status_credential",
                        columnNames = "credential_id"
                )
        }
)
public class CredentialStatus {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
            name = "credential_id",
            nullable = false,
            unique = true
    )
    private Credential credential;

    @Enumerated(EnumType.STRING)
    @Column(
            nullable = false,
            length = 20
    )
    private Status status = Status.ACTIVE;

    @Column(name = "revoked_at")
    private LocalDateTime revokedAt;

    @Column(columnDefinition = "TEXT")
    private String reason;

    public CredentialStatus() {
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

    public Status getStatus() {
        return status;
    }

    public void setStatus(Status status) {
        this.status = status;
    }

    public LocalDateTime getRevokedAt() {
        return revokedAt;
    }

    public void setRevokedAt(LocalDateTime revokedAt) {
        this.revokedAt = revokedAt;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public enum Status {
        ACTIVE,
        REVOKED
    }
}