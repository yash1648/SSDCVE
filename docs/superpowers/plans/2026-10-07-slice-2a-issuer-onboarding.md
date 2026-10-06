# Slice 2a Issuer Onboarding + Keys + Issue Wizard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the issuer onboarding flow, signing keys, and issue wizard on the new system with honest state handling.

**Architecture:** Three states from `/issuer/me`: unregistered (404) → registration form; registered-unverified → pending notice; verified → keys + issue wizard. Keys are session-only (no list endpoint). Issue wizard sends exactly subjectId/type/title/claims (no expiresAt).

**Tech Stack:** Vite + React 18 + react-router-dom 7 + `@tanstack/react-query` + axios client (`issuerApi`) + Tailwind + shadcn + Lucide.

**Spec:** `docs/superpowers/specs/2026-10-07-frontend-rewrite-design.md` (§3 issuer rows, §3b auth foundations, §4 tokens, §5 AppShell, §6 slice 2a). Tokens: `frontend/DESIGN.md`. Phase 0 findings: unverified-issue blocked (403), no-key issue 400, keys session-only.

## Global Constraints

- Backend frozen: never write under `backend/`.
- Endpoints for this slice: `GET /issuer/me` (404 = unregistered), `POST /issuer/register`, `POST /issuer/keys`, `POST /issuer/credentials`, `GET /issuer/holders?email=`. All authenticated (ISSUER/ADMIN roles).
- State machine: `/me` 404 → registration form; registered + `verified=false` → pending notice (issuance blocked); `verified=true` → keys + wizard.
- Keys: no list endpoint exists; UI shows only keys created this session (stored in sessionStorage) and says so.
- Wizard fields: exactly subjectId, type, title, claims. No expiresAt (backend doesn't accept it).
- No em dashes; no leak tokens; secondary decorative-only; gold large/bold/accents only.
- Verification per task: `npx tsc --noEmit -p tsconfig.app.json` + `npm run build` in `frontend/`; slice closes with live Reticle `verified:yes`.
- No new packages; fetch-on-mount only, no polling.

---

## File structure

- Modify `frontend/src/components/issuer/IssuerOnboardingCard.tsx` (registration + pending + verified states)
- Modify `frontend/src/components/issuer/SigningKeysCard.tsx` (session-only keys, honest empty state)
- Modify `frontend/src/components/issuer/IssueCredentialWizard.tsx` (remove expiresAt, add copy-ID + wallet link on success, `role="alert"` errors)
- Modify `frontend/src/pages/IssuerLanding.tsx` (thin portal wrapper: onboarding → keys → wizard tabs)

---

### Task 1: Onboarding card (three states)

**Files:**
- Modify: `frontend/src/components/issuer/IssuerOnboardingCard.tsx`

**Interfaces:**
- Consumes: `issuerApi.getMe` (404 = unregistered), `issuerApi.registerOrg`; `IssuerProfile` type.
- Produces: the onboarding component used by `IssuerLanding`.

- [ ] **Step 1: Rebuild three states on new tokens**

Unregistered (404): centered registration card, form with `role="alert"` inline errors, submit calls `registerOrg`, on success calls `onRegistered` (parent refetches `/me`). Registered-unverified: pending notice with institution name/domain, "Issuance actions are blocked until verified by administrator" (no em dashes). Verified: compact card with name, domain, gold "Verified Institution" badge (gold accent, large/bold only), no em dashes. All states: new tokens, no amber/emerald hardcoded colors (use CSS vars: `--primary`, `--accent`, `--destructive`, `--muted`).

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit -p tsconfig.app.json && npm run build` in `frontend/`
Expected: both PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/issuer/IssuerOnboardingCard.tsx
git commit -m "feat: rebuild issuer onboarding with three honest states"
```

---

### Task 2: Signing keys (session-only)

**Files:**
- Modify: `frontend/src/components/issuer/SigningKeysCard.tsx`

**Interfaces:**
- Consumes: `issuerApi.createKey`; `IssuerKey` type; `isVerifiedIssuer` prop.
- Produces: keys component used by `IssuerLanding`.

- [ ] **Step 1: Rebuild with session-only honesty**

Keep sessionStorage for keys created this session. Empty state: "No keys yet. Create one above to start issuing certificates. (Keys are stored for this session only; there is no server list endpoint.)" — the parenthetical is the honesty note. Generate button disabled when `!isVerifiedIssuer` (already) or `isGenerating`. On success: toast "Signing is ready. You can issue certificates now." (no em dashes). Key cards: new tokens, tabular numerals for keyId, UTC-explicit dates via `DateTime`, `GlossaryTerm` on algorithm if needed. No hardcoded emerald/rose/amber colors.

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit -p tsconfig.app.json && npm run build` in `frontend/`
Expected: both PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/issuer/SigningKeysCard.tsx
git commit -m "feat: rebuild signing keys with session-only honesty"
```

---

### Task 3: Issue wizard (exact fields + success link)

**Files:**
- Modify: `frontend/src/components/issuer/IssueCredentialWizard.tsx`

**Interfaces:**
- Consumes: `issuerApi.lookupHolders`, `issuerApi.issueCredential`; `HolderLookupResponse`, `IssuerCredential` types; `onSuccess`, `onAttachDocument` props.
- Produces: wizard used by `IssuerLanding`.

- [ ] **Step 1: Rebuild on new tokens with exact payload**

Remove `expiresAt` state and input (backend `CredentialIssuePayload` has no such field). Payload sent: `{ subjectId, type, title, claims }` exactly. Holder lookup: keep email search, `role="alert"` on not-found. Claims editor: keep dynamic rows with type select, live JSON preview. Submit: disabled until holder + title present; on success set `issuedResult` and call `onSuccess`. Success screen: `ResultSeal` VALID (gold accent), credential number, graduate name, block number; "Copy ID" button (copies `issuedResult.id`); "Share wallet link" button (copies `/holder?add=${issuedResult.id}`); "Issue another" resets wizard. Errors: `role="alert"` card with retry, never bare toast. No em dashes; tabular numerals; UTC-explicit dates.

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit -p tsconfig.app.json && npm run build` in `frontend/`
Expected: both PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/issuer/IssueCredentialWizard.tsx
git commit -m "feat: rebuild issue wizard with exact payload and wallet link"
```

---

### Task 4: Issuer landing (portal wrapper)

**Files:**
- Modify: `frontend/src/pages/IssuerLanding.tsx`

**Interfaces:**
- Consumes: `IssuerOnboardingCard`, `SigningKeysCard`, `IssueCredentialWizard`, `VerificationsActivityTable`; `issuerApi.getMe`, `issuerApi.getCredentials`, `issuerApi.getVerifications`.
- Produces: `/issuer` portal page.

- [ ] **Step 1: Rebuild as thin portal wrapper**

Tabs: Onboarding (always visible), Keys (visible when verified), Issue (visible when verified), Credentials (visible when verified), Activity (visible when verified). On mount: `getMe` with skeleton loading; 404 → show onboarding unregistered; `verified=false` → show onboarding pending; `verified=true` → show all tabs. Keys tab: `<SigningKeysCard isVerifiedIssuer={true} />`. Issue tab: `<IssueCredentialWizard onSuccess={refetchCredentials} onAttachDocument={openDocumentModal} />`. Credentials tab: keep existing table (already uses `DataTable` with skeletons). Activity tab: keep `VerificationsActivityTable` (already uses `DataTable`). All on new tokens; no em dashes; no hardcoded colors.

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit -p tsconfig.app.json && npm run build` in `frontend/`
Expected: both PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/IssuerLanding.tsx
git commit -m "feat: rebuild issuer landing as portal wrapper with state machine"
```

---

### Task 5: Slice gate

**Files:** none (verification only).

- [ ] **Step 1: Copy gate**

Run: `rg -n " — | —|— | —" frontend/src/components/issuer/IssuerOnboardingCard.tsx frontend/src/components/issuer/SigningKeysCard.tsx frontend/src/components/issuer/IssueCredentialWizard.tsx frontend/src/pages/IssuerLanding.tsx; rg -n "localhost:6969|/api/|Bearer |ed25519|sha-256|SHA-256|ipfs\.io" frontend/src/components/issuer/ frontend/src/pages/IssuerLanding.tsx`
Expected: no user-facing matches.

- [ ] **Step 2: Live drive**

Sign in as issuer seed. On `/issuer`:
- If unregistered: register → pending notice appears.
- If pending: notice shows, keys/issue tabs hidden.
- If verified: keys tab shows session-only note, create key → appears in list; issue wizard → lookup holder → fill claims → issue → success screen shows copy-ID + wallet link; verify the credential appears in credentials table.
Use reticle_* tools with declared `until`; only `reticle_act_and_wait`/`reticle_assert` produce verdicts; unknown/no-fault = not proved.

- [ ] **Step 3: Report verdicts with evidence to the coordinator (no commit).**

---

## Self-review

- Spec coverage: slice 2a screens → Tasks 1–4; Phase 0 findings (unverified blocked, no-key 400, session-only keys) → Tasks 1–3; §7 gate → Task 5.
- Placeholders: none; files, commands, messages exact.
- Type consistency: `IssuerProfile.verified` boolean; `CredentialIssuePayload` four fields; `IssuerKey` session-only.