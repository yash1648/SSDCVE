# SSD-CVE — Section 8: Project Structure & Tech Stack

## Monorepo Layout

```
SSDCVE/
├── docs/
│   ├── Self-Sovereign.pdf
│   ├── PROJECT-ANALYSIS.md
│   ├── SSDCVE-DESIGN.md
│   └── 01-...-10-... (section docs)
├── backend/
│   ├── pom.xml
│   └── src/main/java/com/ssdcve/
│       ├── SsdcveApplication.java
│       ├── config/
│       │   ├── SecurityConfig.java
│       │   ├── JwtConfig.java
│       │   ├── IpfsConfig.java
│       │   └── CorsConfig.java
│       ├── controller/
│       │   ├── AuthController.java
│       │   ├── IssuerController.java
│       │   ├── HolderController.java
│       │   ├── VerifierController.java
│       │   └── AdminController.java
│       ├── service/
│       │   ├── AuthService.java
│       │   ├── IssuerService.java
│       │   ├── HolderService.java
│       │   ├── CredentialService.java
│       │   ├── VerificationService.java
│       │   ├── CanonicalizationService.java
│       │   ├── CryptoService.java
│       │   ├── IpfsService.java
│       │   └── KeyStoreService.java
│       ├── repository/
│       │   ├── UserRepository.java
│       │   ├── IssuerRepository.java
│       │   ├── IssuerKeyRepository.java
│       │   ├── CredentialRepository.java
│       │   ├── CredentialStatusRepository.java
│       │   ├── HolderWalletRepository.java
│       │   └── VerificationRecordRepository.java
│       ├── model/
│       │   ├── User.java
│       │   ├── Issuer.java
│       │   ├── IssuerKey.java
│       │   ├── Credential.java
│       │   ├── CredentialStatus.java
│       │   ├── HolderWallet.java
│       │   └── VerificationRecord.java
│       ├── dto/
│       │   ├── request/
│       │   └── response/
│       ├── security/
│       │   ├── JwtFilter.java
│       │   ├── JwtUtil.java
│       │   └── UserPrincipal.java
│       ├── exception/
│       │   ├── GlobalExceptionHandler.java
│       │   └── ApiError.java
│       └── util/
│           └── CredentialNumberGenerator.java
│   └── src/main/resources/
│       ├── application.yml
│       └── keystore/
│           └── .gitkeep          # actual .p12 not committed
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── api/
│       ├── context/
│       ├── components/
│       ├── pages/
│       ├── utils/
│       └── styles/
├── docker-compose.yml
└── README.md
```

## Backend Tech Stack

| Concern | Technology |
|---------|-----------|
| Language | Java 21 |
| Framework | Spring Boot 3.x |
| Security | Spring Security |
| JWT | Access + refresh token architecture |
| Password | BCrypt / Spring PasswordEncoder |
| Crypto | Java JCA/JCE (SHA-256, Ed25519, KeyPair, Signature, MessageDigest, KeyStore) |
| Key Storage | Java KeyStore API + PKCS12 |
| ORM | Spring Data JPA / Hibernate |
| Database | PostgreSQL 16 |
| IPFS Client | Java IPFS/Kubo HTTP API client |
| JSON | Jackson |
| Validation | Jakarta Bean Validation |
| Build | Maven |
| PDF | Apache PDFBox |
| Testing | JUnit 5 + Mockito + Testcontainers |

**No extra crypto library** — Java JCA/JCE provides all needed primitives.

## Frontend Tech Stack

| Concern | Technology |
|---------|-----------|
| Build | Vite |
| Framework | React |
| HTTP | Axios |
| Routing | React Router |
| State | React Context + useReducer |
| Forms | React Hook Form |
| Validation | Zod |
| Styling | Tailwind CSS |
| Icons | Lucide React |
| QR | Client-side QR library |
| File handling | Native File API + FormData |
| Notifications | Custom Toast |

## Infrastructure

```
docker-compose.yml
├── postgres (PostgreSQL 16)
├── ipfs (ipfs/kubo:<pinned-version> — NOT latest)
└── backend (Spring Boot, optional container)
```

- **Dev:** React/Vite → Spring Boot local → PostgreSQL container → IPFS/Kubo container
- **Demo/deploy:** all containerized
- **Pin infrastructure versions** instead of `latest` for reproducibility

## Cost Summary (₹0)

| Component | Cost |
|-----------|-----:|
| Java 21 + Spring Boot | ₹0 |
| React + Vite | ₹0 |
| PostgreSQL | ₹0 |
| Local IPFS / Kubo | ₹0 |
| JCA/JCE + PKCS12 KeyStore | ₹0 |
| Maven | ₹0 |
| Docker | ₹0 |
| PDFBox | ₹0 |
| JUnit / Mockito / Testcontainers | ₹0 |
| Axios / React Router / Tailwind / Zod etc. | ₹0 |
| **Total** | **₹0** |

Hosting, domains, and cloud infrastructure are outside the MVP scope.
