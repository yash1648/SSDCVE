package com.ssdcve.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(
        name = "credentials",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_credentials_credential_number",
                        columnNames = "credential_number"
                )
        }
)
public class Credential {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(
            name = "credential_number",
            nullable = false,
            length = 100
    )
    private String credentialNumber;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "issuer_id", nullable = false)
    private Issuer issuer;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "subject_id", nullable = false)
    private User subject;

    @Column(nullable = false, length = 100)
    private String type;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(
            name = "content_hash",
            nullable = false,
            length = 64
    )
    private String contentHash;

    @Column(
            name = "ipfs_cid",
            nullable = false,
            length = 255
    )
    private String ipfsCid;

    @Column(
            nullable = false,
            columnDefinition = "TEXT"
    )
    private String signature;

    @Column(
            name = "signature_algorithm",
            nullable = false,
            length = 50
    )
    private String signatureAlgorithm = "Ed25519";

    @Column(
            name = "key_id",
            nullable = false,
            length = 100
    )
    private String keyId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(
            name = "metadata_json",
            columnDefinition = "jsonb"
    )
    private String metadataJson;

    @Column(
            name = "issued_at",
            nullable = false
    )
    private LocalDateTime issuedAt;

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    @Column(
            name = "created_at",
            nullable = false
    )
    private LocalDateTime createdAt;

    @Column(
            name = "updated_at",
            nullable = false
    )
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();

        if (createdAt == null) {
            createdAt = now;
        }

        if (updatedAt == null) {
            updatedAt = now;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public Credential() {
    }

    public UUID getId() {
        return id;
    }

    public String getCredentialNumber() {
        return credentialNumber;
    }

    public void setCredentialNumber(String credentialNumber) {
        this.credentialNumber = credentialNumber;
    }

    public Issuer getIssuer() {
        return issuer;
    }

    public void setIssuer(Issuer issuer) {
        this.issuer = issuer;
    }

    public User getSubject() {
        return subject;
    }

    public void setSubject(User subject) {
        this.subject = subject;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getContentHash() {
        return contentHash;
    }

    public void setContentHash(String contentHash) {
        this.contentHash = contentHash;
    }

    public String getIpfsCid() {
        return ipfsCid;
    }

    public void setIpfsCid(String ipfsCid) {
        this.ipfsCid = ipfsCid;
    }

    public String getSignature() {
        return signature;
    }

    public void setSignature(String signature) {
        this.signature = signature;
    }

    public String getSignatureAlgorithm() {
        return signatureAlgorithm;
    }

    public void setSignatureAlgorithm(String signatureAlgorithm) {
        this.signatureAlgorithm = signatureAlgorithm;
    }

    public String getKeyId() {
        return keyId;
    }

    public void setKeyId(String keyId) {
        this.keyId = keyId;
    }

    public String getMetadataJson() {
        return metadataJson;
    }

    public void setMetadataJson(String metadataJson) {
        this.metadataJson = metadataJson;
    }

    public LocalDateTime getIssuedAt() {
        return issuedAt;
    }

    public void setIssuedAt(LocalDateTime issuedAt) {
        this.issuedAt = issuedAt;
    }

    public LocalDateTime getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(LocalDateTime expiresAt) {
        this.expiresAt = expiresAt;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}