# SSD-CVE — Section 1: System Overview

## Purpose
A decentralized engine for issuing, storing, and verifying digital certificates using Self-Sovereign Identity (SSI) principles. Three roles: **Issuer** (institution), **Holder** (student), **Verifier** (employer/organization).

## Architecture

```mermaid
flowchart TB

    %% =========================
    %% FRONTEND
    %% =========================
    subgraph FE["FRONTEND — React + Vite"]
        direction LR

        ISSUER["Issuer Dashboard"]
        HOLDER["Holder Wallet"]
        VERIFIER["Verifier Portal"]
        ADMIN["Admin Dashboard"]
    end

    %% =========================
    %% BACKEND
    %% =========================
    subgraph BE["BACKEND — Java 21 + Spring Boot"]

        API["REST API Layer"]

        subgraph SERVICES["Service Layer"]
            ISSUER_SVC["Issuer Service"]
            HOLDER_SVC["Holder Service"]
            CREDENTIAL_SVC["Credential Service"]
            VERIFY_SVC["Verification Service"]
        end

        subgraph CORE["Core Services"]
            CANON["Canonicalization"]
            CRYPTO["Crypto Engine<br/>SHA-256 + Ed25519"]
            IPFS_SVC["IPFS Service"]
            KEYSTORE["KeyStore Service"]
            STATUS["Credential Status"]
        end

        API --> SERVICES
        SERVICES --> CORE
    end

    %% =========================
    %% STORAGE
    %% =========================
    subgraph STORAGE["STORAGE"]
        DB[("PostgreSQL 16")]
        IPFS[("Local IPFS / Kubo")]
        KS[("PKCS12 KeyStore")]
    end

    %% =========================
    %% CONNECTIONS
    %% =========================
    ISSUER --> API
    HOLDER --> API
    VERIFIER --> API
    ADMIN --> API

    CORE --> DB
    IPFS_SVC --> IPFS
    KEYSTORE --> KS
```

## Locked Decisions

| Decision | Value |
|----------|-------|
| Hash | SHA-256 |
| Signature | Ed25519 |
| Credential representation | Canonical JSON (deterministic) |
| Document storage | Local IPFS (content-addressed) |
| Metadata | PostgreSQL 16 |
| Private keys | Java KeyStore API + PKCS12 |
| Blockchain | None in MVP |
| Platform | Web only |
| Cost | ₹0 |

## IPFS Accuracy
- **Local IPFS** provides content-addressed storage and local retrieval.
- **CID = content addressing**; **SHA-256 + Ed25519 = cryptographic integrity/authenticity**.
- Decentralized availability requires **multiple IPFS nodes** (future work, not MVP).
- IPFS upload is **not** part of the PostgreSQL transaction; orphaned IPFS objects handled on DB failure.
