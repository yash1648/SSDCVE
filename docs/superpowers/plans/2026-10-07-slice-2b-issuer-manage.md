# Slice 2b Issuer Manage (Credentials, Documents, Activity) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the issuer management screens (credentials list/detail/revoke, document attachment, activity feed) on the new system.

**Architecture:** Thin portal wrappers over existing `DataTable` + `VerificationsActivityTable`; new detail modal with revoke + document attachment. No duplicate logic.

**Tech Stack:** Vite + React 18 + react-router-dom 7 + `@tanstack/react-query` + axios client (`issuerApi`) + Tailwind + shadcn + Lucide.

**Spec:** `docs/superpowers/specs/2026-10-07-frontend-rewrite-design.md` (§3 issuer rows, §4 tokens, §5 AppShell, §6 slice 2b). Tokens: `frontend/DESIGN.md`.

## Global Constraints

- Backend frozen: never write under `backend/`.
- Endpoints for this slice: `GET /issuer/credentials`, `GET /issuer/credentials/{id}`, `POST /issuer/credentials/{id}/revoke`, `POST /issuer/credentials/{id}/document`, `GET /issuer/verifications`. All authenticated (ISSUER/ADMIN).
- Revoke payload: `{ reason?: string }` — reason is optional but the UI should ask for it.
- Document upload: multipart/form-data, returns updated credential.
- Activity feed: already uses `VerificationsActivityTable` (slice 2a Task 4 kept it).
- No em dashes; no leak tokens; secondary decorative-only; gold large/bold/accents only.
- Verification per task: `npx tsc --noEmit -p tsconfig.app.json` + `npm run build` in `frontend/`; slice closes with live Reticle `verified:yes`.
- No new packages; fetch-on-mount only, no polling.

---

## File structure

- Modify `frontend/src/components/issuer/IssuerCredentialDetail.tsx` (detail modal: revoke with reason, attach document, download/certificate links)
- Modify `frontend/src/pages/IssuerLanding.tsx` (wire detail modal open from credentials table; keep activity tab as-is)
- Reuse: `DataTable` (skeleton + `aria-busy`), `VerificationsActivityTable`, `ResultSeal`, `GlossaryTerm`, `HashDisplay`, `DateTime`, `ConfirmDialog`.

---

### Task 1: Credential detail modal (revoke + document)

**Files:**
- Modify: `frontend/src/components/issuer/IssuerCredentialDetail.tsx`

**Interfaces:**
- Consumes: `issuerApi.getCredential`, `issuerApi.revokeCredential`, `issuerApi.attachDocument`; `IssuerCredential`, `RevokePayload` types; `onClose`, `onRefresh` props.
- Produces: detail modal used by `IssuerLanding`.

- [ ] **Step 1: Rebuild on new tokens**

Modal header: credential number + status badge (reuse `VerificationStatusBadge` or `StatusBadge`). Body sections: metadata (type, title, graduate, issued/expires UTC), hashes (content hash, tx hash via `HashDisplay` + `GlossaryTerm`), signature (algorithm, keyId). Actions row: "Attach Document" (file input, calls `attachDocument`, loading state, `role="alert"` on failure), "Download Certificate" (existing `holderApi.download` via credential id — note: this is a holder endpoint, but the issuer can use it; or add `issuerApi.downloadCredential` if it exists — check api.ts), "Revoke" (opens `ConfirmDialog` with reason textarea, on confirm calls `revokeCredential` with reason, `role="alert"` on failure, on success closes modal and calls `onRefresh`). Close button. All dates UTC-explicit, tabular numerals. No em dashes.

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit -p tsconfig.app.json && npm run build` in `frontend/`
Expected: both PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/issuer/IssuerCredentialDetail.tsx
git commit -m "feat: rebuild issuer credential detail with revoke and document"
```

---

### Task 2: Wire detail modal from credentials table

**Files:**
- Modify: `frontend/src/pages/IssuerLanding.tsx`

**Interfaces:**
- Consumes: `IssuerCredentialDetail`, `issuerApi.getCredentials` (already), `issuerApi.getCredential` (for detail refresh).
- Produces: nothing downstream.

- [ ] **Step 1: Add modal state and open handler**

State: `selectedCredential: IssuerCredential | null`. In credentials table `onRowClick`, fetch full credential via `getCredential(id)` (or use row data if complete), set `selectedCredential`. Render `<IssuerCredentialDetail credential={selectedCredential} onClose={() => setSelectedCredential(null)} onRefresh={refetchCredentials} />` when open. Keep activity tab unchanged (already uses `VerificationsActivityTable`).

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit -p tsconfig.app.json && npm run build` in `frontend/`
Expected: both PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/IssuerLanding.tsx
git commit -m "feat: wire issuer credential detail modal from table"
```

---

### Task 3: Slice gate

**Files:** none (verification only).

- [ ] **Step 1: Copy gate**

Run: `rg -n " — | —|— | —" frontend/src/components/issuer/IssuerCredentialDetail.tsx frontend/src/pages/IssuerLanding.tsx; rg -n "localhost:6969|/api/|Bearer |ed25519|sha-256|SHA-256|ipfs\.io" frontend/src/components/issuer/IssuerCredentialDetail.tsx frontend/src/pages/IssuerLanding.tsx`
Expected: no user-facing matches.

- [ ] **Step 2: Live drive**

Sign in as verified issuer seed. On `/issuer` → Credentials tab:
- Click a row → detail modal opens with metadata, hashes, signature.
- Attach Document: pick a file → upload succeeds → modal updates.
- Revoke: click Revoke → confirm dialog with reason → confirm → credential status changes to REVOKED in table.
- Activity tab: shows the revocation in the feed.
Use reticle_* tools with declared `until`; only `reticle_act_and_wait`/`reticle_assert` produce verdicts; unknown/no-fault = not proved.

- [ ] **Step 3: Report verdicts with evidence to the coordinator (no commit).**

---

## Self-review

- Spec coverage: slice 2b screens → Tasks 1–2; §7 gate → Task 3. Activity tab already done in slice 2a.
- Placeholders: none; files, commands, messages exact.
- Type consistency: `RevokePayload.reason` optional; `IssuerCredential` fields reused; `attachDocument` multipart.