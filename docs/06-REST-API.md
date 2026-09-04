# SSD-CVE — Section 6: REST API

## Auth

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/logout` | Revoke refresh token |

## Issuer

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/issuer/register` | Register institution |
| POST | `/api/issuer/credentials` | Issue credential |
| GET | `/api/issuer/credentials` | List own credentials |
| GET | `/api/issuer/credentials/{id}` | Get credential |
| POST | `/api/issuer/credentials/{id}/revoke` | Revoke credential |
| GET | `/api/issuer/verifications` | Verification activity |

## Holder

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/holder/wallet` | List wallet credentials |
| POST | `/api/holder/wallet/{credentialId}` | Add credential |
| DELETE | `/api/holder/wallet/{credentialId}` | Remove credential |
| GET | `/api/holder/credentials/{id}/download` | Download credential |

## Verifier

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/verifier/verify` | Verify uploaded credential (multipart, primary) |
| GET | `/api/verifier/verify/{credentialId}` | Verify by ID (optional) |
| GET | `/api/verifier/history` | Verification history |

## Admin

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/admin/issuers` | List issuers |
| POST | `/api/admin/issuers/{id}/verify` | Approve issuer |
| GET | `/api/admin/users` | List users |
| GET | `/api/admin/verifications` | View verification activity |

## Example: Issue Credential

```http
POST /api/issuer/credentials
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "subjectId": "uuid-of-student",
  "type": "DegreeCertificate",
  "title": "Bachelor of Engineering",
  "claims": {
    "degree": "BE",
    "field": "Computer Science",
    "university": "Example University"
  }
}
```

```http
201 Created
{
  "credentialId": "SSD-CVE-2026-8F42A1",
  "credentialNumber": "SSD-CVE-2026-8F42A1",
  "type": "DegreeCertificate",
  "title": "Bachelor of Engineering",
  "contentHash": "a1b2c3...",
  "ipfsCid": "QmX...",
  "signature": "base64...",
  "signatureAlgorithm": "Ed25519",
  "keyId": "issuer-key-2026-01",
  "issuedAt": "2026-09-04T10:00:00Z",
  "expiresAt": null
}
```

## Example: Verify Credential (primary — file upload)

```http
POST /api/verifier/verify
Authorization: Bearer <jwt>
Content-Type: multipart/form-data

credentialFile: <signed-credential.json>
```

```http
200 OK
{
  "valid": true,
  "credentialId": "SSD-CVE-2026-8F42A1",
  "status": "VALID",
  "issuer": {
    "id": "uuid",
    "name": "Example University",
    "domain": "example.edu",
    "verified": true
  },
  "claims": {
    "degree": "BE",
    "field": "Computer Science"
  },
  "issuedAt": "2026-09-04T10:00:00Z",
  "expiresAt": null,
  "verifiedAt": "2026-09-04T12:00:00Z"
}
```

**Note:** Verification response is tied to credential disclosure — no automatic user-info lookup. Sensitive holder data returned only when present/allowed by the credential.

## Failure Responses

```json
{ "valid": false, "status": "TAMPERED", "reason": "Content hash mismatch" }
{ "valid": false, "status": "REVOKED", "reason": "Revoked by issuer on 2026-09-01" }
{ "valid": false, "status": "EXPIRED", "reason": "Credential expired on 2025-01-01" }
{ "valid": false, "status": "NOT_FOUND", "reason": "Credential not in registry" }
{ "valid": false, "status": "UNAVAILABLE", "reason": "IPFS document unavailable" }
```

## Error Codes

`AUTHENTICATION_FAILED`, `FORBIDDEN`, `VALIDATION_ERROR`, `RESOURCE_NOT_FOUND`, `CREDENTIAL_ALREADY_REVOKED`, `IPFS_UNAVAILABLE`, `INVALID_CREDENTIAL`, `INTERNAL_ERROR`

```json
{
  "timestamp": "2026-09-04T12:00:00Z",
  "status": 400,
  "code": "VALIDATION_ERROR",
  "error": "Bad Request",
  "message": "subjectId must not be null",
  "path": "/api/issuer/credentials"
}
```

## Pagination

```http
GET /api/issuer/credentials?page=0&size=20&sort=issuedAt,desc
```

```json
{
  "content": [ ... ],
  "page": 0,
  "size": 20,
  "totalElements": 57,
  "totalPages": 3
}
```
