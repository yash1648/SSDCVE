# SSD-CVE — Section 3: Credential File Format

## Canonical Payload (what gets hashed — no hash/signature inside)

```json
{
  "credentialNumber": "SSD-CVE-2026-8F42A1",
  "type": "DegreeCertificate",
  "title": "Bachelor of Engineering",
  "issuer": { "id": "uuid", "name": "Example University", "domain": "example.edu" },
  "subject": { "id": "uuid", "name": "Jaykumar Patil" },
  "claims": { "degree": "BE", "field": "Computer Science" },
  "issuedAt": "2026-09-04T10:00:00Z",
  "expiresAt": null
}
```

## Canonicalization Rules (via dedicated `CanonicalizationService`)

- Keys sorted alphabetically (including nested objects)
- Compact JSON (no whitespace)
- UTF-8 encoding
- `null` values preserved
- Timestamps ISO-8601 UTC (`Z` suffix)
- Array ordering preserved

**Never hash whatever JSON string happens to come out of a normal serializer** — this eliminates ambiguity where `{"a":1,"b":2}` and `{ "b": 2, "a": 1 }` would produce different hashes.

## Signed Envelope (what gets stored/shared)

```json
{
  "version": "1.0",
  "credential": { "...canonical payload..." },
  "contentHash": "a1b2c3...",
  "signature": "base64-ed25519-signature",
  "signatureAlgorithm": "Ed25519",
  "keyId": "issuer-key-2026-01"
}
```

## Hash & Sign Pipeline

```
Canonical payload → UTF-8 bytes → SHA-256 → contentHash → Ed25519(contentHash) → signature → envelope → IPFS → CID → PostgreSQL
```

## Why Two Representations (no circular hash)

The canonical payload does **not** include `contentHash` or `signature`. Hashing a JSON that contains its own hash would create a circular dependency. Instead:

1. Hash the **unsigned canonical payload** → `contentHash`
2. Sign the `contentHash` with Ed25519 → `signature`
3. Wrap both in the **signed envelope**
