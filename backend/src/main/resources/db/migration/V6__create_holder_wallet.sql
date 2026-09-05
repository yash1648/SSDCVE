CREATE TABLE holder_wallet (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id         UUID NOT NULL
                    REFERENCES users(id),

    credential_id   UUID NOT NULL
                    REFERENCES credentials(id),

    stored_at       TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT uk_holder_wallet_user_credential
        UNIQUE (user_id, credential_id)
);