# Slice 4 Admin Portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the admin portal (overview, institutions queue, accounts, audit) on the new system.

**Architecture:** Thin portal wrapper over existing `DataTable` components; stats cards + charts on overview. No new endpoints.

**Tech Stack:** Vite + React 18 + react-router-dom 7 + `@tanstack/react-query` + axios client (`adminApi`) + Tailwind + shadcn + Lucide.

**Spec:** `docs/superpowers/specs/2026-10-07-frontend-rewrite-design.md` (§3 admin rows, §4 tokens, §5 AppShell, §6 slice 4). Tokens: `frontend/DESIGN.md`.

## Global Constraints

- Backend frozen: never write under `backend/`.
- Endpoints for this slice: `GET /admin/users`, `GET /admin/issuers`, `POST /admin/users/{userId}/promote-issuer`, `GET /admin/verifications`. All authenticated (ADMIN only).
- Promote issuer: POST with empty body, returns updated user.
- No em dashes; no leak tokens; secondary decorative-only; gold large/bold/accents only.
- Verification per task: `npx tsc --noEmit -p tsconfig.app.json` + `npm run build` in `frontend/`; slice closes with live Reticle `verified:yes`.
- No new packages; fetch-on-mount only, no polling.

---

## File structure

- Modify `frontend/src/components/admin/AdminStatsCards.tsx` (new tokens, skeleton loading)
- Modify `frontend/src/components/admin/AdminCharts.tsx` (new tokens, skeleton loading)
- Modify `frontend/src/components/admin/IssuersTable.tsx` (verify-issuer action, new tokens)
- Modify `frontend/src/components/admin/UsersTable.tsx` (promote-issuer action, new tokens)
- Modify `frontend/src/components/admin/VerificationsAuditTable.tsx` (new tokens, filters)
- Modify `frontend/src/pages/AdminLanding.tsx` (new tokens, wiring)
- Reuse: `DataTable` (skeleton + `aria-busy`), `StatusBadge`, `DateTime`, `ResultSeal`, `GlossaryTerm`.

---

### Task 1: Stats cards + charts (overview)

**Files:**
- Modify: `frontend/src/components/admin/AdminStatsCards.tsx`
- Modify: `frontend/src/components/admin/AdminCharts.tsx`

**Interfaces:**
- Consumes: `users`, `issuers`, `verifications` arrays; `isLoading` prop.
- Produces: overview components used by `AdminLanding`.

- [ ] **Step 1: Rebuild on new tokens**

Stats cards: four cards (Total Users, Total Institutions, Pending Approvals, Total Checks) with icons, counts (tabular numerals), subtle trends. Loading: skeleton placeholders with `aria-busy`. Charts: user growth + verification volume (reuse existing chart lib if any, else simple bars). No em dashes. No hardcoded colors (CSS vars). Gold accent for "Pending Approvals" count.

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit -p tsconfig.app.json && npm run build` in `frontend/`
Expected: both PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/admin/AdminStatsCards.tsx frontend/src/components/admin/AdminCharts.tsx
git commit -m "feat: rebuild admin overview stats and charts on registry design system"
```

---

### Task 2: Issuers table (verify action)

**Files:**
- Modify: `frontend/src/components/admin/IssuersTable.tsx`

**Interfaces:**
- Consumes: `adminApi.getIssuers`, `adminApi.promoteIssuer` (actually `verifyIssuer` — check api.ts); `AdminIssuerResponse` type; `onRefresh`, `isLoading` props.
- Produces: table used by `AdminLanding`.

- [ ] **Step 1: Rebuild on new tokens**

Columns: Name, Domain, Status (verified/unverified badge), Created (UTC), Actions. Action for unverified: "Approve" button calling `adminApi.verifyIssuer(issuerId)` (check api.ts for exact method name), loading state, `role="alert"` on failure, on success `onRefresh()`. Verified issuers show "Verified" badge, no action. Loading: `DataTable isLoading`. Empty: "No institutions waiting." No em dashes. Tabular numerals for dates.

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit -p tsconfig.app.json && npm run build` in `frontend/`
Expected: both PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/admin/IssuersTable.tsx
git commit -m "feat: rebuild issuers table with verify action on registry design system"
```

---

### Task 3: Users table (promote action)

**Files:**
- Modify: `frontend/src/components/admin/UsersTable.tsx`

**Interfaces:**
- Consumes: `adminApi.getUsers`, `adminApi.promoteIssuer`; `AdminUserResponse` type; `onRefresh`, `isLoading` props.
- Produces: table used by `AdminLanding`.

- [ ] **Step 1: Rebuild on new tokens**

Columns: Email, Full Name, Role (badge), Created (UTC), Actions. Action for non-ADMIN: "Promote to Issuer" button calling `adminApi.promoteIssuer(userId)`, loading state, `role="alert"` on failure, on success `onRefresh()`. ADMIN users show no action. Loading: `DataTable isLoading`. Empty: "No accounts match." No em dashes. Tabular numerals.

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit -p tsconfig.app.json && npm run build` in `frontend/`
Expected: both PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/admin/UsersTable.tsx
git commit -m "feat: rebuild users table with promote action on registry design system"
```

---

### Task 4: Verifications audit table

**Files:**
- Modify: `frontend/src/components/admin/VerificationsAuditTable.tsx`

**Interfaces:**
- Consumes: `adminApi.getVerifications`; `AdminVerificationResponse` type; `isLoading` prop.
- Produces: table used by `AdminLanding`.

- [ ] **Step 1: Rebuild on new tokens**

Columns: Credential Number, Result (seal chip via `ResultSeal`), Reason, Verified At (UTC). Filters: status select + date range (keep existing). Search: credential number + reason. Loading: `DataTable isLoading`. Empty: "No checks recorded yet." No em dashes. Tabular numerals. `ResultSeal` for result chips.

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit -p tsconfig.app.json && npm run build` in `frontend/`
Expected: both PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/admin/VerificationsAuditTable.tsx
git commit -m "feat: rebuild verifications audit table on registry design system"
```

---

### Task 5: Admin landing wiring

**Files:**
- Modify: `frontend/src/pages/AdminLanding.tsx`

**Interfaces:**
- Consumes: all admin components + `adminApi`; `AppShell`.
- Produces: `/admin` portal page.

- [ ] **Step 1: Rebuild on new tokens**

Header: "Platform Administration" (font-display), subtitle. Refresh button (skeleton while fetching). Stats cards + charts (overview tab). Tabs: Overview, Issuers, Users, Audit (URL-synced, already works). All on new tokens; no em dashes; no hardcoded colors.

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit -p tsconfig.app.json && npm run build` in `frontend/`
Expected: both PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/AdminLanding.tsx
git commit -m "feat: rebuild admin landing on registry design system"
```

---

### Task 6: Slice gate

**Files:** none (verification only).

- [ ] **Step 1: Copy gate**

Run: `rg -n " — | —|— | —" frontend/src/components/admin/ frontend/src/pages/AdminLanding.tsx; rg -n "localhost:6969|/api/|Bearer |ed25519|sha-256|SHA-256|ipfs\.io" frontend/src/components/admin/ frontend/src/pages/AdminLanding.tsx`
Expected: no user-facing matches.

- [ ] **Step 2: Live drive**

Sign in as admin seed. On `/admin`:
- Overview: stats cards + charts render with live data.
- Issuers tab: pending issuers listed, "Approve" works → issuer becomes verified, table updates.
- Users tab: non-admin users listed, "Promote to Issuer" works → role changes, table updates.
- Audit tab: verification records render with result seals, filters work.
Use reticle_* tools with declared `until`; only `reticle_act_and_wait`/`reticle_assert` produce verdicts; unknown/no-fault = not proved.

- [ ] **Step 3: Report verdicts with evidence to the coordinator (no commit).**

---

## Self-review

- Spec coverage: slice 4 screens → Tasks 1–5; §7 gate → Task 6.
- Placeholders: none; files, commands, messages exact.
- Type consistency: `AdminIssuerResponse`, `AdminUserResponse`, `AdminVerificationResponse` reused; `verifyIssuer` vs `promoteIssuer` method names checked against api.ts.