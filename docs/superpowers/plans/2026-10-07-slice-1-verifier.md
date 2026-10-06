# Slice 1 Verifier Portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the verifier portal on the new system by reusing slice-0 flows, plus a role-aware history page with honest 403 handling.

**Architecture:** Thin portal wrappers over slice-0 components; the only new surface is history + forbidden states. No duplicate verify logic.

**Tech Stack:** Vite + React 18 + react-router-dom 7 + `@tanstack/react-query` + axios client (`verifierApi`) + Tailwind + shadcn + Lucide.

**Spec:** `docs/superpowers/specs/2026-10-07-frontend-rewrite-design.md` (§3 verifier rows, §3b 403 rule, §4 tokens, §5 AppShell, §6 slice 1). Tokens: `frontend/DESIGN.md`.

## Global Constraints

- Backend frozen: never write under `backend/`.
- Endpoints for this slice: `POST /verifier/verify`, `POST /verifier/verify/batch`, `POST /verifier/verify/batch/csv`, `GET /verifier/history` (authenticated; possibly role-restricted). Public GETs already covered in slice 0.
- 403 rule: show "not authorized for your role" with a way back; never refresh, never log out. `apiClient` already marks these errors `isForbidden === true`.
- No em dashes; no leak tokens; secondary decorative-only; gold large/bold/accents only.
- Verification per task: `npx tsc --noEmit -p tsconfig.app.json` + `npm run build` in `frontend/`; slice closes with live Reticle `verified:yes`.
- No new packages; fetch-on-mount only, no polling.

---

## File structure

- Modify `frontend/src/pages/VerifierLanding.tsx` (294 lines): portal workspace reusing slice-0 sections.
- Modify `frontend/src/pages/VerifierHistoryPage.tsx` (129 lines): table + filters + 403 notice.
- Reuse unchanged: `VerificationResultHero`, `BatchVerifySection`, `BatchResultSideSheet`, `ResultSeal`, `GlossaryTerm`, `DataTable` (skeleton + `aria-busy` already), `Error403` (`frontend/src/components/errors/Error403.tsx`).

---

### Task 1: Verifier workspace

**Files:**
- Modify: `frontend/src/pages/VerifierLanding.tsx`

**Interfaces:**
- Consumes: slice-0 `VerificationResultHero`, `BatchVerifySection`; `verifierApi.verifyFile/verifyBatch/exportBatchCsv`.
- Produces: `/verifier` workspace (history page consumes nothing from it).

- [ ] **Step 1: Rebuild as a thin portal wrapper**

Keep the portal's tab/section structure and AppShell context; replace any duplicated verify/batch markup with the slice-0 components (`VerificationResultHero`, `BatchVerifySection`). Single-file upload + batch + CSV download (existing `exportBatchCsv`) on new tokens. Failures render `role="alert"` boxes, never bare toasts alone. No reference-number input here: by-ID lookup stays public (`/verify/:id`); if the workspace has one, point it at the public route instead of duplicating.

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit -p tsconfig.app.json && npm run build` in `frontend/`
Expected: both PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/VerifierLanding.tsx
git commit -m "feat: rebuild verifier workspace on shared verify components"
```

---

### Task 2: History + 403 handling

**Files:**
- Modify: `frontend/src/pages/VerifierHistoryPage.tsx`

**Interfaces:**
- Consumes: `verifierApi.getHistory`, `DataTable`, `Error403`, `error.isForbidden` from the api client.
- Produces: nothing downstream.

- [ ] **Step 1: Rebuild history with three states**

Loading: `DataTable isLoading` (skeletons + `aria-busy`). Forbidden: when the query error carries `isForbidden`, render `Error403` with a portal-appropriate message ("Checking history is not authorized for your role") plus a way back (link to `/verifier`); no retry button, no logout. Other errors: `role="alert"` card with retry. Data: existing filter + search + table on new tokens, UTC-explicit dates, tabular numerals. Empty: "You have not checked any certificates yet." with an action linking to `/verifier`.

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit -p tsconfig.app.json && npm run build` in `frontend/`
Expected: both PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/VerifierHistoryPage.tsx
git commit -m "feat: rebuild verifier history with forbidden handling"
```

---

### Task 3: Slice gate

**Files:** none (verification only).

- [ ] **Step 1: Copy gate**

Run: `rg -n " — | —|— | —" frontend/src/pages/VerifierLanding.tsx frontend/src/pages/VerifierHistoryPage.tsx; rg -n "localhost:6969|/api/|Bearer |ed25519|sha-256|SHA-256|ipfs\.io" frontend/src/pages/VerifierLanding.tsx frontend/src/pages/VerifierHistoryPage.tsx`
Expected: no user-facing matches.

- [ ] **Step 2: Live drive**

Sign in as verifier seed. On `/verifier`, run a file check and assert the `ResultSeal` headline renders (`verified:yes`). On `/verifier/history`, assert rows render. Best-effort 403 probe: sign in as admin, open `/verifier/history`; if the backend 403s, assert the not-authorized notice renders; if it 200s, record that history is admin-visible and move on. Unknown/no-fault = not proved; fix and re-drive.

- [ ] **Step 3: Report verdicts with evidence to the coordinator (no commit).**

---

## Self-review

- Spec coverage: slice-1 screens → Tasks 1–2; §3b 403 rule → Task 2 + best-effort probe; §7 gate → Task 3. CSV honest wiring already proved in slice 0.
- Placeholders: none; files, commands, messages exact.
- Type consistency: `isForbidden` flag shape from Phase 0 Task 2; `VerificationHistoryResponse` fields reused.
