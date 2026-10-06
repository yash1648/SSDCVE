CREATE TABLE credential_disclosures (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credential_id   UUID NOT NULL REFERENCES credentials(id),
    CONSTRAINT uk_credential_disclosures_credential UNIQUE (credential_id)
);

CREATE TABLE credential_disclosure_claims (
    disclosure_id   UUID NOT NULL REFERENCES credential_disclosures(id) ON DELETE CASCADE,
    claim_key       VARCHAR(100) NOT NULL,
    CONSTRAINT pk_credential_disclosure_claims PRIMARY KEY (disclosure_id, claim_key)
);
