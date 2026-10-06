package com.ssdcve.model;

import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "credential_anchors")
public class CredentialAnchor {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "credential_id", nullable = false, unique = true)
    private Credential credential;

    @Column(name = "tx_hash", nullable = false, length = 66)
    private String txHash;

    @Column(name = "block_number")
    private Long blockNumber;

    @Column(name = "chain_id", nullable = false)
    private Long chainId;

    @Column(name = "anchored_at", nullable = false)
    private LocalDateTime anchoredAt;

    @PrePersist
    protected void onCreate() {
        if (anchoredAt == null) {
            anchoredAt = LocalDateTime.now();
        }
    }

    public CredentialAnchor() {
    }

    public CredentialAnchor(
            Credential credential,
            String txHash,
            Long blockNumber,
            Long chainId) {

        this.credential = credential;
        this.txHash = txHash;
        this.blockNumber = blockNumber;
        this.chainId = chainId;
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

    public String getTxHash() {
        return txHash;
    }

    public void setTxHash(String txHash) {
        this.txHash = txHash;
    }

    public Long getBlockNumber() {
        return blockNumber;
    }

    public void setBlockNumber(Long blockNumber) {
        this.blockNumber = blockNumber;
    }

    public Long getChainId() {
        return chainId;
    }

    public void setChainId(Long chainId) {
        this.chainId = chainId;
    }

    public LocalDateTime getAnchoredAt() {
        return anchoredAt;
    }

    public void setAnchoredAt(LocalDateTime anchoredAt) {
        this.anchoredAt = anchoredAt;
    }
}
