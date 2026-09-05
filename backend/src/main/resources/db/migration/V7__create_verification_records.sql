CREATE TABLE verification_records (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credential_id   UUID REFERENCES credentials(id),
    verifier_id     UUID REFERENCES users(id),
    result          VARCHAR(20) NOT NULL
                    CHECK (result IN ('VALID', 'TAMPERED', 'REVOKED', 'EXPIRED', 'NOT_FOUND', 'UNAVAILABLE')),
    reason          TEXT,
    verified_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_verification_records_verifier
    ON verification_records(verifier_id, verified_at);

CREATE INDEX idx_verification_records_credential
    ON verification_records(credential_id);