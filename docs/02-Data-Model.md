# SSD-CVE — Section 2: Data Model

## Entity Relationship

```mermaid
erDiagram

    USERS ||--o| ISSUERS : "has"
    USERS ||--o{ CREDENTIALS : "owns"
    USERS ||--o{ HOLDER_WALLET : "stores"
    USERS ||--o{ VERIFICATION_RECORDS : "performs"

    ISSUERS ||--o{ ISSUER_KEYS : "owns"
    ISSUERS ||--o{ CREDENTIALS : "issues"

    CREDENTIALS ||--|| CREDENTIAL_STATUS : "has"
    CREDENTIALS ||--o{ HOLDER_WALLET : "stored_in"
    CREDENTIALS ||--o{ VERIFICATION_RECORDS : "verified"

    USERS {
        UUID id PK
        VARCHAR email UK
        VARCHAR password_hash
        VARCHAR full_name
        VARCHAR role
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    ISSUERS {
        UUID id PK
        UUID user_id FK
        VARCHAR name
        VARCHAR domain
        BOOLEAN verified
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    ISSUER_KEYS {
        UUID id PK
        UUID issuer_id FK
        VARCHAR key_id UK
        TEXT public_key
        VARCHAR algorithm
        BOOLEAN active
        TIMESTAMP created_at
        TIMESTAMP revoked_at
    }

    CREDENTIALS {
        UUID id PK
        VARCHAR credential_number UK
        UUID issuer_id FK
        UUID subject_id FK
        VARCHAR type
        VARCHAR title
        VARCHAR content_hash
        VARCHAR ipfs_cid
        TEXT signature
        VARCHAR signature_algorithm
        JSONB metadata_json
        TIMESTAMP issued_at
        TIMESTAMP expires_at
    }

    CREDENTIAL_STATUS {
        UUID id PK
        UUID credential_id FK
        VARCHAR status
        TIMESTAMP revoked_at
        TEXT reason
    }

    HOLDER_WALLET {
        UUID id PK
        UUID user_id FK
        UUID credential_id FK
        TIMESTAMP stored_at
    }

    VERIFICATION_RECORDS {
        UUID id PK
        UUID credential_id FK
        UUID verifier_id FK
        VARCHAR result
        TEXT reason
        TIMESTAMP verified_at
    }
```

## PostgreSQL Schema

```sql
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(255) NOT NULL,
    role            VARCHAR(20) NOT NULL CHECK (role IN ('ISSUER','HOLDER','VERIFIER','ADMIN')),
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE issuers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id),
    name            VARCHAR(255) NOT NULL,
    domain          VARCHAR(255) NOT NULL,
    public_key      TEXT NOT NULL,
    verified        BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE issuer_keys (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issuer_id       UUID REFERENCES issuers(id),
    key_id          VARCHAR(100) NOT NULL,
    public_key      TEXT NOT NULL,
    active          BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT NOW(),
    UNIQUE(issuer_id, key_id)
);

CREATE TABLE credentials (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credential_number   VARCHAR(100) UNIQUE NOT NULL,
    issuer_id           UUID REFERENCES issuers(id),
    subject_id          UUID REFERENCES users(id),
    type                VARCHAR(100) NOT NULL,
    title               VARCHAR(255) NOT NULL,
    content_hash        VARCHAR(64) NOT NULL,
    ipfs_cid            VARCHAR(255) NOT NULL,
    signature           TEXT NOT NULL,
    signature_algorithm VARCHAR(50) NOT NULL DEFAULT 'Ed25519',
    key_id              VARCHAR(100) NOT NULL,
    metadata_json       JSONB,
    issued_at           TIMESTAMP DEFAULT NOW(),
    expires_at          TIMESTAMP,
    created_at          TIMESTAMP DEFAULT NOW(),
    updated_at          TIMESTAMP DEFAULT NOW()
);

CREATE TABLE credential_status (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credential_id   UUID REFERENCES credentials(id) UNIQUE,
    status          VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','REVOKED')),
    revoked_at      TIMESTAMP,
    reason          TEXT
);

CREATE TABLE holder_wallet (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id),
    credential_id   UUID REFERENCES credentials(id),
    stored_at       TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, credential_id)
);

CREATE TABLE verification_records (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credential_id   UUID REFERENCES credentials(id),
    verifier_id     UUID REFERENCES users(id),
    result          VARCHAR(20) NOT NULL CHECK (result IN ('VALID','TAMPERED','REVOKED','EXPIRED','NOT_FOUND','UNAVAILABLE')),
    reason          TEXT,
    verified_at     TIMESTAMP DEFAULT NOW()
);
```

## Key Notes
- `EXPIRED` is **derived** from `expires_at.isBefore(now())`, not stored.
- `credential_number` is the public-facing identifier (e.g., `SSD-CVE-2026-8F42A1`); internal `id` is UUID.
- Private signing keys **never** stored in PostgreSQL — only in PKCS12 KeyStore.
- `issuer_keys` supports key rotation: `issuer → keyId → public key`.
