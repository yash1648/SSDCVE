CREATE TABLE credential_anchors (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credential_id   UUID NOT NULL REFERENCES credentials(id),
    tx_hash         VARCHAR(66) NOT NULL,
    block_number    BIGINT,
    chain_id        BIGINT NOT NULL,
    anchored_at     TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_credential_anchors_credential UNIQUE (credential_id)
);
