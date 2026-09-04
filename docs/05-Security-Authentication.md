# SSD-CVE — Section 5: Security & Authentication

## JWT + Refresh Cookie

- **Access token:** short-lived (15 min), held in memory
- **Refresh token:** long-lived (7 days), **HttpOnly + Secure + SameSite cookie** (never localStorage), server-side revocable
- Client-side role = **UI routing only**; backend Spring Security is authoritative

```mermaid
sequenceDiagram

    autonumber

    participant C as Client
    participant API as Spring Boot API
    participant AUTH as Auth Service

    C->>API: POST /api/auth/login
    API->>AUTH: Authenticate credentials
    AUTH-->>API: Authentication successful

    API-->>C: Access Token
    API-->>C: HttpOnly Refresh Cookie

    Note over C: Access token kept in memory

    C->>API: Request + Bearer Access Token
    API-->>C: Protected Response

    Note over C,API: Access token expires

    C->>API: Request + expired token
    API-->>C: 401 Unauthorized

    C->>API: POST /api/auth/refresh
    API->>AUTH: Validate refresh token
    AUTH-->>API: Rotate refresh token

    API-->>C: New Access Token
    API-->>C: New HttpOnly Refresh Cookie

    C->>API: Retry original request
    API-->>C: Protected Response
```

## RBAC

| Endpoint Group | ISSUER | HOLDER | VERIFIER | ADMIN |
|----------------|:------:|:------:|:--------:|:-----:|
| `/api/auth/*` | ✅ | ✅ | ✅ | ✅ |
| `/api/issuer/*` | ✅ | ❌ | ❌ | ✅ |
| `/api/holder/*` | ❌ | ✅ | ❌ | ✅ |
| `/api/verifier/verify` | ✅ | ✅ | ✅ | ✅ |
| `/api/admin/*` | ❌ | ❌ | ❌ | ✅ |

## Key Protection

- Private keys in PKCS12 KeyStore, password from env var, never in git
- Public keys in PostgreSQL (`issuers`, `issuer_keys`)
- Key rotation via `keyId` resolution: `issuer → keyId → public key`

```mermaid
flowchart TB

    subgraph DATABASE["POSTGRESQL — Non-Secret Data"]

        PUB["Issuer Public Keys"]
        META["Credential Metadata"]
        HASH["Credential Hashes"]
        SIG["Credential Signatures"]
        STATUS["Credential Status"]
    end

    subgraph KEYSTORE["PKCS12 KEYSTORE — SECRET"]

        PRIVATE["🔐 Private Signing Keys"]
    end

    subgraph ENV["ENVIRONMENT"]

        PASSWORD["🔐 Keystore Password"]
    end

    PUB -.->|"Used to verify"| VERIFY["Ed25519 Verification"]

    PRIVATE -->|"Used to sign"| SIGN["Ed25519 Signing"]

    PASSWORD -->|"Unlocks"| PRIVATE
```

## Issuer Authorization

- Only **verified** issuers can issue
- Issuer can only revoke **own** credentials (ownership check, not URL `{id}` trust)

## Verification Independence

- Verification depends only on **PostgreSQL + local IPFS** — **never** on the issuer being online.

## API Security Measures

| Measure | Implementation |
|---------|---------------|
| CORS | Restrict to frontend origin |
| Rate limiting | Per-user/IP on auth + verify endpoints |
| Input validation | Bean Validation (`@Valid`, `@NotBlank`, etc.) |
| SQL injection | JPA/parameterized queries (no string concat) |
| XSS | React escapes by default; CSP headers |
| CSRF | Disabled (stateless JWT), but CORS locked down |
| HTTPS | TLS in production (self-signed for local dev) |
| Secrets | Env vars / `.env`, never in git |

## Security Boundary

```
┌──────────────────────────────────────────────┐
│              PUBLIC (exposed)                │
│  - Public keys                               │
│  - Credential metadata (non-sensitive)       │
│  - Verification results                      │
├──────────────────────────────────────────────┤
│              PROTECTED (auth required)       │
│  - Issuer operations (issue/revoke)          │
│  - Holder wallet                             │
│  - Verification records                      │
├──────────────────────────────────────────────┤
│              SECRET (never exposed)          │
│  - Private signing keys (PKCS12)             │
│  - Password hashes (BCrypt)                  │
│  - Refresh tokens (DB)                       │
│  - Keystore password (env)                   │
└──────────────────────────────────────────────┘
```

```mermaid
flowchart TB

    subgraph PUBLIC["PUBLIC / LIMITED DISCLOSURE"]

        P1["Public Issuer Keys"]
        P2["Credential-Defined Metadata"]
        P3["Verification Results"]
    end

    subgraph PROTECTED["PROTECTED — AUTHENTICATED"]

        PR1["Issuer Operations<br/>Issue / Revoke"]
        PR2["Holder Wallet"]
        PR3["Verification History"]
        PR4["Admin Operations"]
    end

    subgraph SECRET["SECRET — NEVER EXPOSED"]

        S1["🔐 Private Signing Keys"]
        S2["🔐 BCrypt Password Hashes"]
        S3["🔐 Refresh Tokens"]
        S4["🔐 Keystore Password"]
    end
```