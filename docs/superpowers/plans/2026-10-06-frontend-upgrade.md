# SSD-CVE Frontend Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-grade, secure, and accessible React 18/19 + TypeScript + Tailwind + shadcn/ui frontend for the Self-Sovereign Digital Credential Verification Engine (SSD-CVE), seamlessly wired to the existing Spring Boot backend and blockchain anchoring engine without mocks.

**Architecture:** Client-side SPA using Vite, React Router, and TanStack Query for server state caching and optimistic invalidations. Authentication features an in-memory access token with sessionStorage fallback and HttpOnly refresh cookie rotation over Axios with automatic concurrency-queued 401 retries. Visual identity implements a security/fintech theme (Navy + Emerald) with comprehensive role-specific dashboards, a 4-step issuance wizard, and interactive cryptographic verification result sheets.

**Tech Stack:** React 19 / 18, TypeScript, Vite, React Router, TanStack Query (`@tanstack/react-query`), react-hook-form + zod, Radix UI / shadcn/ui primitives, lucide-react, sonner, recharts, tailwindcss.

**Spec:** [`/home/grim/Downloads/api-docs.yaml`](file:///home/grim/Downloads/api-docs.yaml) and [`backend/api-docs.yaml`](file:///home/grim/Projects/SSDCVE/backend/api-docs.yaml).

## Global Constraints

- **Zero Mock Policy:** All views must consume real endpoints defined in OpenAPI 3.1.0 (`api-docs.yaml`).
- **Security Floor:** Access tokens must live in-memory (React Context) with `sessionStorage` fallback. Never persist tokens in `localStorage`.
- **CORS & Credentials:** All API requests must send credentials (`credentials: "include"` / `withCredentials: true`) to support HttpOnly refresh token cookies.
- **Role Redirection:** After login, redirect by role: `ADMIN` → `/admin`, `ISSUER` → `/issuer`, `HOLDER` → `/holder`, `VERIFIER` → `/verifier`.
- **Visual Design:** Navy (`#0B132B` / `#1C2541`) neutral base with Emerald (`#10B981` / `#059669`) valid accents. Light/dark toggle support. Accessible WCAG 2.1 AA contrast; never convey status by color alone.
- **Form Validation:** All user inputs must be validated with Zod schemas matching backend constraints (UUID format, email, password length 8–72, text length limits).
- **Destructive Confirmations:** Explicit confirm modals required for credential revocation, wallet removal, issuer verification, and role promotion.

---

## File Structure & Map

```text
frontend/
├── .env.example                                  # VITE_API_BASE_URL=http://localhost:6969
├── package.json                                  # Adds @tanstack/react-query, sonner, recharts
├── src/
│   ├── types/
│   │   ├── index.ts                              # Unified export for all data models
│   │   ├── auth.ts                               # Roles, User, AuthResponse, Register/Login payloads
│   │   ├── admin.ts                              # AdminUserResponse, AdminIssuerResponse, AdminVerificationResponse
│   │   ├── issuer.ts                             # IssuerProfile, IssuerKey, CredentialIssueRequest, IssuerCredential
│   │   ├── holder.ts                             # WalletCredential, DisclosureResponse, DisclosureUpdateRequest
│   │   └── verifier.ts                           # VerificationResult, BatchVerificationResponse, ChainStatus, Anchor
│   ├── lib/
│   │   ├── api.ts                                # Core Axios instance, 401 retry queue, domain APIs
│   │   └── utils.ts                              # cn(), formatting, truncation helpers
│   ├── context/
│   │   └── AuthContext.tsx                       # In-memory token, user state, login/logout/register
│   ├── hooks/
│   │   ├── useAuth.ts                            # Context consumer
│   │   └── useTheme.ts                           # Light/dark mode state
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppShell.tsx                      # Sidebar, mobile drawer, topbar, user menu, breadcrumbs
│   │   │   ├── Sidebar.tsx                       # Role-aware navigation links
│   │   │   └── Topbar.tsx                        # Profile badge, theme toggle, logout
│   │   ├── common/
│   │   │   ├── StatusBadge.tsx                   # ACTIVE / REVOKED
│   │   │   ├── VerificationStatusBadge.tsx       # VALID / TAMPERED / REVOKED / EXPIRED / NOT_FOUND / UNAVAILABLE
│   │   │   ├── HashDisplay.tsx                   # Copyable monospace hash with tooltip
│   │   │   ├── DateTime.tsx                      # Formatted timestamp
│   │   │   ├── EmptyState.tsx                    # Icon, title, description, action
│   │   │   ├── ConfirmDialog.tsx                 # Modal for destructive operations
│   │   │   ├── DataTable.tsx                     # Searchable, sortable, paginated table
│   │   │   └── FileDropzone.tsx                  # Drag-and-drop file upload with validation
│   │   ├── guards/
│   │   │   ├── RequireAuth.tsx                   # Auth guard
│   │   │   └── RequireRole.tsx                   # Role guard
│   │   ├── errors/
│   │   │   ├── Error401.tsx                      # Unauthorized view
│   │   │   ├── Error403.tsx                      # Forbidden view
│   │   │   └── NotFoundPage.tsx                  # 404 view
│   │   ├── admin/
│   │   │   ├── AdminStatsCards.tsx               # Metric cards
│   │   │   ├── AdminCharts.tsx                   # Recharts donut & bar chart
│   │   │   ├── UsersTable.tsx                    # Users + promote action
│   │   │   ├── IssuersTable.tsx                  # Issuers + verify action
│   │   │   └── VerificationsAuditTable.tsx       # Global verification log
│   │   ├── issuer/
│   │   │   ├── IssuerOnboardingCard.tsx          # Org registration gate & pending banner
│   │   │   ├── SigningKeysCard.tsx               # Key generation & public key view
│   │   │   ├── IssueCredentialWizard.tsx         # 4-step issuance flow with dynamic claims
│   │   │   ├── IssuerCredentialDetail.tsx        # Crypto proofs, IPFS, attach document, revoke
│   │   │   └── VerificationsActivityTable.tsx    # Issuer's credential activity
│   │   ├── holder/
│   │   │   ├── WalletGrid.tsx                    # Card grid with search/filter
│   │   │   ├── AddToWalletModal.tsx              # Add credential UUID dialog
│   │   │   ├── HolderCredentialDetail.tsx        # Detail view + JSON/PDF download
│   │   │   └── SelectiveDisclosurePanel.tsx      # Privacy toggles + masked claims
│   │   └── verifier/
│   │       ├── ChainStatusCard.tsx               # 15s polling on-chain card
│   │       ├── RecentAnchorsList.tsx             # Feed of anchored credentials
│   │       ├── VerificationResultHero.tsx        # Hero verification outcome & 6-point checks
│   │       ├── BatchVerifySection.tsx            # Multi-file/zip upload & summary donut
│   │       ├── BatchResultSideSheet.tsx          # Side sheet for inspecting batch row
│   │       └── AnchorLookupSection.tsx           # Direct credentialNumber query
│   └── pages/
│       ├── LandingPage.tsx                       # Public marketing landing
│       ├── LoginPage.tsx                         # Auth login
│       ├── RegisterPage.tsx                      # Auth register with strength meter
│       ├── PublicVerifyPage.tsx                  # Public verification entry
│       ├── AdminPage.tsx                         # Admin portal (/admin)
│       ├── IssuerPage.tsx                        # Issuer portal (/issuer)
│       ├── HolderPage.tsx                        # Holder portal (/holder)
│       └── VerifierPage.tsx                      # Verifier portal (/verifier)
```

---

## Tasks Breakdown

### Task 1: Package Dependencies, Tooling & Theme Setup

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/.env.example`
- Modify: `frontend/src/index.css`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/main.tsx`

**Interfaces:**
- Consumes: Tailwind CSS base, React 19 root
- Produces: `QueryClientProvider`, Sonner `<Toaster />`, theme CSS variables (Navy + Emerald)

- [ ] **Step 1: Install required packages**
  Run `npm install @tanstack/react-query sonner recharts` in `frontend/`.
- [ ] **Step 2: Create `.env.example`**
  Add `VITE_API_BASE_URL=http://localhost:6969`.
- [ ] **Step 3: Define theme CSS variables in `index.css`**
  Set dark navy background (`#0B132B`, `#1C2541`), border, card, and emerald accent tokens for both light and dark modes.
- [ ] **Step 4: Configure App root with Providers**
  Wrap router with `QueryClientProvider` (TanStack Query) and mount `<Toaster richColors position="top-right" />` from `sonner`.
- [ ] **Step 5: Verify build**
  Run `npm run build` to verify clean compilation.

---

### Task 2: Complete TypeScript Data Models (Section 4 & OpenAPI)

**Files:**
- Create/Update: `frontend/src/types/auth.ts`
- Create/Update: `frontend/src/types/admin.ts`
- Create/Update: `frontend/src/types/issuer.ts`
- Create/Update: `frontend/src/types/holder.ts`
- Create/Update: `frontend/src/types/verifier.ts`
- Create: `frontend/src/types/index.ts`

**Interfaces:**
- Produces: Strict TypeScript interfaces for all 31 endpoints:
  - Roles: `'ADMIN' | 'ISSUER' | 'HOLDER' | 'VERIFIER'`
  - Statuses: `'ACTIVE' | 'REVOKED'`, `'VALID' | 'TAMPERED' | 'REVOKED' | 'EXPIRED' | 'NOT_FOUND' | 'UNAVAILABLE'`
  - Auth: `AuthResponse`, `UserResponse`, `RegisterRequest`, `LoginRequest`
  - Admin: `AdminUserResponse`, `AdminIssuerResponse`, `AdminVerificationResponse`
  - Issuer: `IssuerProfile`, `IssuerRegisterPayload`, `IssuerKey`, `HolderLookupResponse`, `CredentialIssueRequest`, `CredentialResponse`, `RevokeRequest`, `RevokeResponse`
  - Holder: `WalletCredentialResponse`, `DisclosureResponse`, `DisclosureUpdateRequest`, `DisclosureInfo`
  - Verifier: `VerificationResult`, `VerificationChecks`, `BatchItemResult`, `BatchVerificationResponse`, `VerificationHistoryResponse`, `ChainStatusResponse`, `RecentAnchorResponse`, `AnchorLookupResponse`

- [ ] **Step 1: Write type definitions**
  Author models strictly matching OpenAPI schemas in `backend/api-docs.yaml`.
- [ ] **Step 2: Export from `frontend/src/types/index.ts`**
  Aggregate all model types for clean import throughout the codebase.
- [ ] **Step 3: Run type check**
  Run `npm run build` or `npx tsc --noEmit` to ensure no duplicate or circular references.

---

### Task 3: Typed API Client with Concurrency-Safe 401 Interceptor

**Files:**
- Create/Replace: `frontend/src/lib/api.ts`
- Test: `frontend/tests/api-client.spec.ts` (or integration test)

**Interfaces:**
- Consumes: `sessionStorage`, in-memory token state, Axios
- Produces: `apiClient` instance and typed domain API services:
  - `authApi`: `login`, `register`, `refresh`, `logout`
  - `adminApi`: `getUsers`, `getIssuers`, `getVerifications`, `promoteIssuer`, `verifyIssuer`
  - `issuerApi`: `getMe`, `registerOrg`, `createKey`, `lookupHolders`, `getCredentials`, `getCredential`, `issueCredential`, `attachDocument`, `revokeCredential`, `getVerifications`
  - `holderApi`: `getWallet`, `addToWallet`, `removeFromWallet`, `downloadEnvelope`, `downloadCertificate`, `getDisclosure`, `updateDisclosure`
  - `verifierApi`: `verifyFile`, `verifyById`, `verifyBatch`, `exportBatchCsv`, `getAnchor`, `getChainStatus`, `getRecentAnchors`, `getHistory`

- [ ] **Step 1: Implement Token Holder & Fallback**
  Provide `setAccessToken(token)` and `getAccessToken()` using in-memory variable with `sessionStorage` sync (NEVER `localStorage`).
- [ ] **Step 2: Implement Request Interceptor**
  Attach `Authorization: Bearer <token>` to all calls except auth login/register. Ensure `withCredentials: true`.
- [ ] **Step 3: Implement 401 Refresh Queue Interceptor**
  On 401, buffer pending requests in a queue, invoke `POST /api/auth/refresh` once, update in-memory/session token, and retry all queued requests. If refresh fails, purge token and execute onAuthFailure callback (redirect to `/login`).
- [ ] **Step 4: Implement Binary Download & Multipart Helpers**
  Implement blob downloads (triggering browser file save) and multipart upload configurations.
- [ ] **Step 5: Implement Typed Domain Methods**
  Implement all methods in `authApi`, `adminApi`, `issuerApi`, `holderApi`, `verifierApi`.

---

### Task 4: AuthContext, Session Lifecyle & Role Guards

**Files:**
- Modify: `frontend/src/context/AuthContext.tsx`
- Modify: `frontend/src/hooks/useAuth.ts`
- Modify: `frontend/src/components/guards/RequireAuth.tsx`
- Modify: `frontend/src/components/guards/RequireRole.tsx`

**Interfaces:**
- Consumes: `api.ts`, `sessionStorage`
- Produces: `useAuth()` providing `user`, `login(credentials)`, `register(credentials)`, `logout()`, `isAuthenticated`, `isLoading`, `role`.

- [ ] **Step 1: Update AuthContext with Silent Session Restore**
  On boot, attempt silent session restore via `sessionStorage` or `POST /api/auth/refresh` with HttpOnly cookie.
- [ ] **Step 2: Implement Role Redirection logic**
  Define `getHomeForRole(role)`:
  `ADMIN` → `/admin`, `ISSUER` → `/issuer`, `HOLDER` → `/holder`, `VERIFIER` → `/verifier`.
- [ ] **Step 3: Update `RequireAuth` & `RequireRole`**
  Unauthenticated redirects to `/login`. Unauthorized role redirects to `/forbidden`.

---

### Task 5: App Shell & Reusable Component Library

**Files:**
- Create: `frontend/src/components/layout/AppShell.tsx`
- Create: `frontend/src/components/layout/Sidebar.tsx`
- Create: `frontend/src/components/layout/Topbar.tsx`
- Create: `frontend/src/components/common/StatusBadge.tsx`
- Create: `frontend/src/components/common/VerificationStatusBadge.tsx`
- Create: `frontend/src/components/common/HashDisplay.tsx`
- Create: `frontend/src/components/common/DateTime.tsx`
- Create: `frontend/src/components/common/EmptyState.tsx`
- Create: `frontend/src/components/common/ConfirmDialog.tsx`
- Create: `frontend/src/components/common/DataTable.tsx`
- Create: `frontend/src/components/common/FileDropzone.tsx`

**Interfaces:**
- Consumes: Lucide icons, Radix UI dialog/tooltip/dropdown
- Produces: Polished, reusable components fulfilling Section 2 requirements.

- [ ] **Step 1: Build `StatusBadge` & `VerificationStatusBadge`**
  - `StatusBadge`: ACTIVE (emerald), REVOKED (rose) with icons.
  - `VerificationStatusBadge`: VALID (emerald), TAMPERED (rose), REVOKED (orange), EXPIRED (amber), NOT_FOUND (zinc), UNAVAILABLE (slate) with icons.
- [ ] **Step 2: Build `HashDisplay`**
  Render truncated mono hash (`0x1234...abcd`) with copy button, visual copied state, and tooltip showing full string.
- [ ] **Step 3: Build `DataTable`**
  Support search filter, column sorting, and client-side pagination with clean pagination controls.
- [ ] **Step 4: Build `ConfirmDialog`**
  Accessible modal with customizable title, warning message, confirm label, destructive style variant, and loading spinner.
- [ ] **Step 5: Build `FileDropzone`**
  Drag-and-drop file uploader supporting drag-over highlight, MIME filtering, size limit warnings, and clear button.
- [ ] **Step 6: Build `AppShell`**
  Responsive layout with role-specific navigation links, mobile slide-over drawer, topbar with user avatar, role badge, theme toggle, and logout button.

---

### Task 6: Public Pages (Landing, Auth, Public Verify)

**Files:**
- Modify: `frontend/src/pages/LandingPage.tsx`
- Modify: `frontend/src/pages/LoginPage.tsx`
- Modify: `frontend/src/pages/RegisterPage.tsx`
- Modify: `frontend/src/pages/PublicVerifyPage.tsx`
- Create: `frontend/src/pages/NotFoundPage.tsx`

**Interfaces:**
- Consumes: `useAuth`, `authApi`, `verifierApi`
- Produces: Fully interactive public flows.

- [ ] **Step 1: Refactor `LandingPage.tsx`**
  - Hero: "Issue, hold and verify tamper-proof credentials".
  - 3-Step Explainer: Issue (Registrar signs) → Hold (Student wallet & selective disclosure) → Verify (Cryptographic & blockchain check).
  - Feature Grid: Digital signatures, Ethereum blockchain anchoring, IPFS storage, Selective disclosure, On-chain revocation.
  - Quick CTAs: Login, Register, Verify Credential.
- [ ] **Step 2: Refactor `LoginPage.tsx`**
  Email + Password form with Zod validation. On 200, save session and immediately redirect by role (`getHomeForRole`).
- [ ] **Step 3: Refactor `RegisterPage.tsx`**
  Email, password (8–72 chars with visual strength meter), fullName. Show note: "New accounts start with HOLDER access. An administrator can promote your account to ISSUER." Redirect to `/login` with sonner toast on success.
- [ ] **Step 4: Refactor `PublicVerifyPage.tsx`**
  Allow anonymous single credential verification via file drop or credential UUID without requiring login.
- [ ] **Step 5: Create `NotFoundPage.tsx`**
  Clean 404 page with return-home navigation.

---

### Task 7: Admin Portal Upgrade (`/admin`)

**Files:**
- Modify: `frontend/src/pages/AdminPage.tsx` (or `AdminLanding.tsx`)
- Create: `frontend/src/components/admin/AdminStatsCards.tsx`
- Create: `frontend/src/components/admin/AdminCharts.tsx`
- Create: `frontend/src/components/admin/UsersTable.tsx`
- Create: `frontend/src/components/admin/IssuersTable.tsx`
- Create: `frontend/src/components/admin/VerificationsAuditTable.tsx`

**Interfaces:**
- Consumes: TanStack Query, `adminApi`
- Produces: Admin portal dashboard with live analytics and action tables.

- [ ] **Step 1: Admin Stats & Charts**
  - Metric cards: Total Users, Total Issuers, Verified vs Unverified Issuers, Total Verifications.
  - Recharts Donut Chart: Verifications distribution by status (VALID, TAMPERED, REVOKED, etc.).
  - Recharts Bar Chart: Users distribution by role (`ADMIN`, `ISSUER`, `HOLDER`, `VERIFIER`).
- [ ] **Step 2: Users Table & Promotion Action**
  `DataTable` over `GET /api/admin/users`. Action "Promote to Issuer" with `ConfirmDialog` calling `POST /api/admin/users/{id}/promote-issuer` and invalidating `'admin-users'` query. Action hidden for existing ISSUER or ADMIN.
- [ ] **Step 3: Issuers Table & Verification Action**
  `DataTable` over `GET /api/admin/issuers`. Action "Verify issuer" with `ConfirmDialog` calling `POST /api/admin/issuers/{id}/verify` and invalidating `'admin-issuers'` query.
- [ ] **Step 4: Global Verifications Audit Table**
  `DataTable` over `GET /api/admin/verifications`. Filter by status dropdown and date range filter. Shows credentialNumber, verifierId, result badge, reason, timestamp.

---

### Task 8: Issuer Portal Upgrade & 4-Step Issuance Wizard (`/issuer`)

**Files:**
- Modify: `frontend/src/pages/IssuerPage.tsx` (or `IssuerLanding.tsx`)
- Create: `frontend/src/components/issuer/IssuerOnboardingCard.tsx`
- Create: `frontend/src/components/issuer/SigningKeysCard.tsx`
- Create: `frontend/src/components/issuer/IssueCredentialWizard.tsx`
- Create: `frontend/src/components/issuer/IssuerCredentialDetail.tsx`
- Create: `frontend/src/components/issuer/VerificationsActivityTable.tsx`

**Interfaces:**
- Consumes: TanStack Query, `issuerApi`
- Produces: Complete registrar/issuer workflow.

- [ ] **Step 1: Onboarding Gate & Verification Banner**
  Query `GET /api/issuer/me`.
  - If 404/unregistered: show "Register your organization" form (name, domain) → `POST /api/issuer/register`.
  - If registered but `verified=false`: display warning banner "Pending verification by admin".
  - If `verified=true`: show verified institution profile card with green badge.
- [ ] **Step 2: Dashboard Overview & Signing Keys**
  - Org stats: issued, active, revoked credentials (`GET /api/issuer/credentials`).
  - Signing Keys section: "Generate new signing key" button → `POST /api/issuer/keys`. Display keyId, algorithm, copyable public key, created/revoked timestamps, and notice that keys sign credentials.
- [ ] **Step 3: 4-Step Issuance Wizard (`/issuer/credentials/new`)**
  - **Step 1 (Find Holder):** Email input → `GET /api/issuer/holders?email=` → display holder card (name, email, subjectId).
  - **Step 2 (Details):** Type (Degree, Certificate, License, etc.), Title, optional Expiry Date.
  - **Step 3 (Claims):** Dynamic key/value list editor (add/remove rows, type dropdown for string/number/boolean/date) with live formatted JSON preview.
  - **Step 4 (Review & Issue):** Summary preview, submit → `POST /api/issuer/credentials`. On success: display credentialNumber, contentHash, ipfsCid, anchorTxHash, blockNumber, chainId, keyId, with quick actions "Attach document" and "View credential".
- [ ] **Step 4: Credential Detail & Management**
  - View credential headers, subject, cryptographic proofs, IPFS CIDs, on-chain anchor details.
  - Action "Attach supporting document": File upload modal → `POST /api/issuer/credentials/{id}/document` (multipart).
  - Action "Revoke": Modal with optional reason (max 1000 chars, counter) → `POST /api/issuer/credentials/{id}/revoke`.
- [ ] **Step 5: Verifications Activity Feed**
  `DataTable` over `GET /api/issuer/verifications`.

---

### Task 9: Holder Portal Upgrade & Selective Disclosure (`/holder`)

**Files:**
- Modify: `frontend/src/pages/HolderPage.tsx` (or `HolderLanding.tsx`)
- Create: `frontend/src/components/holder/WalletGrid.tsx`
- Create: `frontend/src/components/holder/AddToWalletModal.tsx`
- Create: `frontend/src/components/holder/HolderCredentialDetail.tsx`
- Create: `frontend/src/components/holder/SelectiveDisclosurePanel.tsx`

**Interfaces:**
- Consumes: TanStack Query, `holderApi`
- Produces: Student credential wallet with privacy-preserving disclosure controls.

- [ ] **Step 1: Wallet Card Grid**
  Query `GET /api/holder/wallet`. Render card grid with title, type, issuer name & domain, status badge, dates, anchor tx hash. Search by title/issuer and status filter.
- [ ] **Step 2: Add to Wallet & Remove Actions**
  - "Add to wallet" modal: paste credential UUID (validated with Zod) → `POST /api/holder/wallet/{credentialId}`.
  - "Remove from wallet" action per card with `ConfirmDialog` → `DELETE /api/holder/wallet/{credentialId}`.
- [ ] **Step 3: Credential Detail & Downloads**
  - "Download credential file" button → `GET /api/holder/credentials/{id}/download` (saves `credential-<number>.json`).
  - "Download certificate" button → `GET /api/holder/credentials/{id}/certificate` (saves PDF).
- [ ] **Step 4: Selective Disclosure Panel**
  Query `GET /api/holder/credentials/{id}/disclosure`.
  - Render list of all claims with a toggle switch (Shared / Hidden).
  - When hidden, visually mask claim value ("••••••••").
  - "Save privacy settings" button → `PUT /api/holder/credentials/{id}/disclosure` with `{ hiddenClaims: [...] }`.
  - Progress badge: "X of Y claims shared". Informative helper text explaining hidden claims are never sent to verifiers.

---

### Task 10: Verifier Portal Upgrade (Hero Result, Batch & Chain) (`/verifier`)

**Files:**
- Modify: `frontend/src/pages/VerifierPage.tsx` (or `VerifierLanding.tsx`)
- Create: `frontend/src/components/verifier/ChainStatusCard.tsx`
- Create: `frontend/src/components/verifier/RecentAnchorsList.tsx`
- Create: `frontend/src/components/verifier/VerificationResultHero.tsx`
- Create: `frontend/src/components/verifier/BatchVerifySection.tsx`
- Create: `frontend/src/components/verifier/BatchResultSideSheet.tsx`
- Create: `frontend/src/components/verifier/AnchorLookupSection.tsx`
- Modify: `frontend/src/pages/VerifierHistoryPage.tsx`

**Interfaces:**
- Consumes: TanStack Query, `verifierApi`
- Produces: Complete enterprise verification suite.

- [ ] **Step 1: Verifier Dashboard Overview**
  - Chain Status Card: `GET /api/verifier/chain/status` (chainId, latestBlock, anchoredCount) auto-polling every 15s.
  - Recent Anchors Feed: `GET /api/verifier/anchors/recent?limit=20`.
  - Quick action tabs/cards: Verify single, Batch verify, Anchor lookup.
- [ ] **Step 2: Hero Verify Single View**
  - Drag-and-drop dropzone for `credentialFile` (`POST /api/verifier/verify`) + "Verify by ID" UUID input (`GET /api/verifier/verify/{credentialId}`).
  - **Hero Result View:**
    - High-visibility status banner with `VerificationStatusBadge`, status text, and detailed `reason`.
    - Issuer card: issuerName, issuerDomain, and "Issuer verified" badge (`issuerVerified`).
    - Credential card: credentialNumber, issuedAt, expiresAt, verifiedAt.
    - Claims table: key/value. If `disclosure` present, progress bar "X of Y claims disclosed by holder", and alert "Holder has hidden some details" if `complete=false`.
    - Blockchain card: anchorTxHash, anchorBlockNumber, anchorChainId, and `anchorVerified` checkmark.
    - 6-step checklist component (envelopeStructure, schemaConformance, issuerSignature, onChainAnchor, revocationStatus, ipfsIntegrity).
- [ ] **Step 3: Enterprise Batch Verification**
  - Multi-file dropzone supporting multiple JSON files or a single ZIP (`POST /api/verifier/verify/batch`).
  - Indeterminate animated progress indicator during processing.
  - Summary metrics: total, processed, valid, tampered, revoked, expired, notFound, unavailable, failed, durationMs. Recharts donut chart of outcome distribution.
  - Results `DataTable`: fileName, credentialNumber, recipientName, issuerName, status badge, error message.
  - Expandable row revealing the 6-step verification checklist.
  - Side sheet / modal "View full result" rendering the nested `VerificationResultHero`.
  - "Export CSV" button calling `POST /api/verifier/verify/batch/csv` and downloading `batch-<batchId>.csv`.
- [ ] **Step 4: Public Anchor Lookup**
  Credential number input → `GET /api/verifier/anchor/{credentialNumber}` → display contentHash, txHash, blockNumber, chainId, and anchorVerified status.
- [ ] **Step 5: Verifier History Table**
  `DataTable` over `GET /api/verifier/history` with status filter, search, and date formatting.

---

### Task 11: Route Orchestration, Navigation & Error Pages

**Files:**
- Modify: `frontend/src/routes/AppRoutes.tsx`

**Interfaces:**
- Consumes: All updated pages, `AppShell`, `RequireAuth`, `RequireRole`
- Produces: Consolidated, role-routed frontend application.

- [ ] **Step 1: Configure AppRoutes**
  - Public routes: `/`, `/login`, `/register`, `/verify`, `/unauthorized`, `/forbidden`, `*` (404).
  - Admin routes under `AppShell`: `/admin`, `/admin/users`, `/admin/issuers`, `/admin/verifications`.
  - Issuer routes under `AppShell`: `/issuer`, `/issuer/credentials`, `/issuer/credentials/new`, `/issuer/credentials/:id`, `/issuer/keys`, `/issuer/verifications`.
  - Holder routes under `AppShell`: `/holder`, `/holder/credentials/:id`.
  - Verifier routes under `AppShell`: `/verifier`, `/verifier/verify`, `/verifier/batch`, `/verifier/anchor`, `/verifier/history`.
- [ ] **Step 2: Verify TypeScript and Vite dev server**
  Run `npm run build` to confirm zero compilation errors.

---

### Task 12: End-to-End Test Suite Verification

**Files:**
- Create/Update: Playwright E2E test specs in `frontend/e2e/` (or run existing test scripts).
- Run: Reticle verification / Playwright test suite against live backend.

**Interfaces:**
- Consumes: Running Spring Boot backend (`http://localhost:6969`) + Anvil + IPFS + Postgres.
- Produces: Verified green pass on all persona journeys.

- [ ] **Step 1: Anonymous Verifier Flow**
  Verify public upload of valid and tampered credentials; check 6-point checklist display.
- [ ] **Step 2: Admin Flow**
  Verify admin dashboard metrics, user promotion to ISSUER, and unverified institution approval.
- [ ] **Step 3: Issuer Flow**
  Verify organization registration, key generation, 4-step issuance wizard, document attachment, and revocation.
- [ ] **Step 4: Holder Flow**
  Verify wallet card loading, add to wallet by UUID, JSON envelope and certificate PDF downloads, and selective disclosure privacy toggling.
- [ ] **Step 5: Security & Token Audit**
  Verify 401 token refresh cycle, verify `localStorage` contains zero tokens, verify 403 forbidden redirection for cross-role attempts.
