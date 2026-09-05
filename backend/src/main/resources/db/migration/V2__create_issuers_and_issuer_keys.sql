CREATE TABLE issuers (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL UNIQUE REFERENCES users(id),
    name        VARCHAR(255) NOT NULL,
    domain      VARCHAR(255) NOT NULL,
    verified    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE issuer_keys (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issuer_id   UUID NOT NULL REFERENCES issuers(id),
    key_id      VARCHAR(100) NOT NULL,
    public_key  TEXT NOT NULL,
    algorithm   VARCHAR(50) NOT NULL DEFAULT 'Ed25519',
    active      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    revoked_at  TIMESTAMP,
    UNIQUE (issuer_id, key_id)
);