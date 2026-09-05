CREATE TABLE credential_status (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credential_id   UUID NOT NULL UNIQUE
                    REFERENCES credentials(id),
    status          VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
                    CHECK (status IN ('ACTIVE', 'REVOKED')),
    revoked_at      TIMESTAMP,
    reason          TEXT
);