CREATE TABLE credentials (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credential_number   VARCHAR(100) UNIQUE NOT NULL,
    issuer_id           UUID NOT NULL REFERENCES issuers(id),
    subject_id          UUID NOT NULL REFERENCES users(id),
    type                VARCHAR(100) NOT NULL,
    title               VARCHAR(255) NOT NULL,
    content_hash        VARCHAR(64) NOT NULL,
    ipfs_cid            VARCHAR(255) NOT NULL,
    signature           TEXT NOT NULL,
    signature_algorithm VARCHAR(50) NOT NULL DEFAULT 'Ed25519',
    key_id              VARCHAR(100) NOT NULL,
    metadata_json       JSONB,
    issued_at           TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at          TIMESTAMP,
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP NOT NULL DEFAULT NOW()
);