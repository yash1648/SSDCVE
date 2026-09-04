# SSD-CVE — Section 4: Verification Engine

## Flow

```mermaid
flowchart TD

    START(["Credential Uploaded"])
    --> PARSE["Parse Signed Envelope"]

    PARSE
    --> SCHEMA["Validate JSON Schema"]

    SCHEMA
    --> EXTRACT["Extract Credential Number<br/>Issuer ID + Key ID"]

    EXTRACT
    --> DB["Lookup PostgreSQL<br/>Credential + Issuer Key"]

    DB
    --> EXISTS{"Credential Exists?"}

    EXISTS -->|No| NOT_FOUND["NOT_FOUND"]

    EXISTS -->|Yes| IPFS["Resolve Credential from IPFS"]

    IPFS
    --> AVAILABLE{"IPFS Available?"}

    AVAILABLE -->|No| UNAVAILABLE["UNAVAILABLE"]

    AVAILABLE -->|Yes| CANON["Canonicalize Payload"]

    CANON
    --> HASH["Calculate SHA-256"]

    HASH
    --> HASH_CHECK{"Hashes Match?"}

    HASH_CHECK -->|"No"| TAMPER_HASH["TAMPERED"]

    HASH_CHECK -->|"Yes"| SIGNATURE["Verify Ed25519 Signature"]

    SIGNATURE
    --> SIG_CHECK{"Signature Valid?"}

    SIG_CHECK -->|No| TAMPER_SIG["TAMPERED"]

    SIG_CHECK -->|Yes| STATUS{"Credential Status"}

    STATUS -->|REVOKED| REVOKED["REVOKED"]

    STATUS -->|ACTIVE| EXPIRY{"Expired?"}

    EXPIRY -->|Yes| EXPIRED["EXPIRED"]

    EXPIRY -->|No| VALID["VALID"]

    %% Results
    NOT_FOUND --> END1(["Verification Result"])
    UNAVAILABLE --> END2(["Verification Result"])
    TAMPER_HASH --> END3(["Verification Result"])
    TAMPER_SIG --> END3
    REVOKED --> END4(["Verification Result"])
    EXPIRED --> END5(["Verification Result"])
    VALID --> END6(["Verification Result"])
```

## Three-Check Security Story

1. **Integrity:** payload → SHA-256 → envelope hash (detects modification)
2. **Registry consistency:** hash vs PostgreSQL (detects mismatch with registered credential)
3. **Authenticity:** contentHash → Ed25519 → issuer public key (proves issuer signed it)

```mermaid
flowchart LR

    CRED["Credential Payload"]

    CRED
    --> HASH["SHA-256"]

    HASH
    --> INTEGRITY["INTEGRITY<br/>Hash Verified"]

    INTEGRITY
    --> SIGN["Ed25519 Signature"]

    SIGN
    --> AUTH["AUTHENTICITY<br/>Issuer Verified"]

    AUTH
    --> DB[("PostgreSQL Registry")]

    DB
    --> REGISTRY["REGISTRY CONSISTENCY<br/>Credential + Hash + Key"]

    REGISTRY
    --> RESULT["Trusted Verification Result"]
```

## Failure Precedence (dependency flow)

```mermaid
flowchart TD

    LOOKUP["Credential Lookup"]

    LOOKUP --> NF["NOT_FOUND"]
    LOOKUP --> UA["UNAVAILABLE"]
    LOOKUP --> CRYPTO["Cryptographic Verification"]

    CRYPTO -->|Integrity / Authenticity Failed| T["TAMPERED"]

    CRYPTO -->|Valid| STATUS["Check Credential Status"]

    STATUS -->|Revoked| R["REVOKED"]
    STATUS -->|Active| EXP["Check Expiry"]

    EXP -->|Expired| E["EXPIRED"]
    EXP -->|Valid| V["VALID"]

    T --> FINAL["Final Verification Result"]
    R --> FINAL
    E --> FINAL
    V --> FINAL

    NOTE["Security Invariant:<br/>Cryptographic integrity/authenticity<br/>must be established before trusting<br/>status or expiry."]
```

**Invariant:** Cryptographic integrity/authenticity must be established **before** trusting credential status or expiry. `revokedAndTampered → TAMPERED`, `expiredAndTampered → TAMPERED`.

## VerificationStatus Enum

```java
public enum VerificationStatus {
    VALID, TAMPERED, REVOKED, EXPIRED, NOT_FOUND, UNAVAILABLE
}
```

Used consistently across controller, service, API response, and `verification_records.result`.

## Verification Independence

Verification depends only on **PostgreSQL + local IPFS** — **never** on the issuer being online. This is a key architectural differentiator.

## Decision Matrix

| Check | Pass | Fail |
|-------|------|------|
| Credential exists in DB | Continue | `NOT_FOUND` |
| IPFS CID resolves | Continue | `UNAVAILABLE` |
| Recomputed hash == envelope hash | Continue | `TAMPERED` |
| Recomputed hash == DB hash | Continue | `TAMPERED` |
| Ed25519 signature valid | Continue | `TAMPERED` |
| Status == ACTIVE | Continue | `REVOKED` |
| `expires_at` future/null | Continue | `EXPIRED` |
| **All pass** | **`VALID`** | — |
