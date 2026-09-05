CREATE TABLE refresh_tokens (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id       UUID NOT NULL
                  REFERENCES users(id),

    token_hash    VARCHAR(64) NOT NULL UNIQUE,

    expires_at    TIMESTAMP NOT NULL,

    revoked_at    TIMESTAMP,

    created_at    TIMESTAMP NOT NULL DEFAULT NOW(),

    replaced_by   UUID
);

CREATE INDEX idx_refresh_tokens_user
    ON refresh_tokens(user_id);