# Slice 3 Holder Wallet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the holder wallet (credentials grid, add/remove, downloads, selective disclosure) on the new system with honest discovery flow.

**Architecture:** Wallet grid + add-by-ID bar + manage modal (downloads, disclosure, share). No "issued to me" endpoint — wallet fills only by pasting credential ID. `?add=<id>` prefill works (Phase 0 Task 4).

**Tech Stack:** Vite + React 18 + react-router-dom 7 + `@tanstack/react-query` + axios client (`holderApi`) + Tailwind + shadcn + Lucide.

**Spec:** `docs/superpowers/specs/2026-10-07-frontend-rewrite-design.md` (§3 holder rows, §4 tokens, §5 AppShell, §6 slice 3). Tokens: `frontend/DESIGN.md`. Phase 0: wallet-add ownership checked (403 on mismatch), so UUID is not a bearer secret; shareable link stands without warning.

## Global Constraints

- Backend frozen: never write under `backend/`.
- Endpoints for this slice: `GET /holder/wallet`, `POST /holder/wallet/{credentialId}`, `DELETE /holder/wallet/{credentialId}`, `GET /holder/credentials/{id}/download`, `GET /holder/credentials/{id}/certificate`, `GET /holder/credentials/{id}/disclosure`, `PUT /holder/credentials/{id}/disclosure`. All authenticated (HOLDER/ADMIN).
- Discovery: no "issued to me" endpoint; wallet fills only by pasting credential ID. `?add=<id>` prefill works (Phase 0). Return-to after login preserved (Phase 0 Task 4).
- Selective disclosure: `GET/PUT /holder/credentials/{id}/disclosure` with `hiddenClaims` array.
- Downloads: envelope = application/json attachment; certificate = application/pdf attachment; filenames from Content-Disposition.
- No em dashes; no leak tokens; secondary decorative-only; gold large/bold/accents only.
- Verification per task: `npx tsc --noEmit -p tsconfig.app.json` + `npm run build` in `frontend/`; slice closes with live Reticle `verified:yes`.
- No new packages; fetch-on-mount only, no polling.

---

## File structure

- Modify `frontend/src/components/holder/AddToWalletModal.tsx` (new tokens, `role="alert"` errors, UUID validation)
- Modify `frontend/src/components/holder/CredentialManageModal.tsx` (new tokens, disclosure with `GlossaryTerm`, downloads with loading, share tab with QR)
- Modify `frontend/src/pages/HolderLanding.tsx` (new tokens, skeleton loading, `?add=` prefill, empty state with action)
- Reuse: `DataTable` (not used here; grid cards), `HashDisplay`, `DateTime`, `StatusBadge`, `ResultSeal`, `GlossaryTerm`.

---

### Task 1: Add-to-wallet modal

**Files:**
- Modify: `frontend/src/components/holder/AddToWalletModal.tsx`

**Interfaces:**
- Consumes: `holderApi.addToWallet`; `open`, `onOpenChange`, `onSuccess` props.
- Produces: modal used by `HolderLanding`.

- [ ] **Step 1: Rebuild on new tokens**

Dialog header: wallet icon + "Add Credential to Wallet" (primary CTA). Body: UUID input (font-mono, text-xs), `role="alert"` inline error (not toast-only), UUID regex validation. Submit: disabled while submitting; on success toast "Credential added to your wallet." + `onSuccess()` + close. Cancel button. No em dashes. No hardcoded colors (use CSS vars).

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit -p tsconfig.app.json && npm run build` in `frontend/`
Expected: both PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/holder/AddToWalletModal.tsx
git commit -m "feat: rebuild add-to-wallet modal on registry design system"
```

---

### Task 2: Credential manage modal (downloads, disclosure, share)

**Files:**
- Modify: `frontend/src/components/holder/CredentialManageModal.tsx`

**Interfaces:**
- Consumes: `holderApi.downloadEnvelope`, `holderApi.downloadCertificate`, `holderApi.getDisclosure`, `holderApi.updateDisclosure`; `WalletCredential`, `DisclosureData` types; `credential`, `initialTab`, `onClose` props.
- Produces: modal used by `HolderLanding`.

- [ ] **Step 1: Rebuild three tabs on new tokens**

Downloads tab: two cards (certificate file + printable PDF) with download buttons, loading states, `role="alert"` on failure. Disclosure tab: load on mount; each claim row with key (font-mono), value (masked when hidden), toggle button (Eye/EyeOff) calling `updateDisclosure` with `hiddenClaims` array; "Verifier Will See / Won't See" summary panels; `GlossaryTerm` on claim keys if needed. Share tab: QR code for `/verify/{credentialId}` (public route), copy link + copy credential number buttons, open link. All dates UTC-explicit, tabular numerals. No em dashes. No hardcoded emerald/rose/amber colors (use CSS vars). `GlossaryTerm` on "Selective Disclosure" label if needed.

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit -p tsconfig.app.json && npm run build` in `frontend/`
Expected: both PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/holder/CredentialManageModal.tsx
git commit -m "feat: rebuild credential manage modal on registry design system"
```

---

### Task 3: Holder landing (wallet grid + add bar + wiring)

**Files:**
- Modify: `frontend/src/pages/HolderLanding.tsx`

**Interfaces:**
- Consumes: `AddToWalletModal`, `CredentialManageModal`, `holderApi.getWallet`, `holderApi.addToWallet`, `holderApi.removeFromWallet`; `WalletCredential` type.
- Produces: `/holder` portal page.

- [ ] **Step 1: Rebuild on new tokens**

Header: "My certificates" (font-display), subtitle. Refresh button (skeleton while fetching). Add-by-ID bar: input + "Add to Wallet" button (replaces modal; inline form, `role="alert"` errors, UUID validation). Filter bar: search + status select. Grid: skeleton cards while `isLoading`; empty state "No credentials yet. Ask your institution to issue one, or add it below with its credential ID." with action linking to add bar. Cards: credential number (mono), status badge, title, type, issuer, conferred date (UTC), record hash (`HashDisplay`), action buttons (Selective Disclosure, Share, Files → open `CredentialManageModal`), remove with confirm. `?add=` prefill from URL (already works). All on new tokens; no em dashes; no hardcoded colors.

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit -p tsconfig.app.json && npm run build` in `frontend/`
Expected: both PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/HolderLanding.tsx
git commit -m "feat: rebuild holder landing on registry design system"
```

---

### Task 4: Slice gate

**Files:** none (verification only).

- [ ] **Step 1: Copy gate**

Run: `rg -n " — | —|— | —" frontend/src/components/holder/AddToWalletModal.tsx frontend/src/components/holder/CredentialManageModal.tsx frontend/src/pages/HolderLanding.tsx; rg -n "localhost:6969|/api/|Bearer |ed25519|sha-256|SHA-256|ipfs\.io" frontend/src/components/holder/ frontend/src/pages/HolderLanding.tsx`
Expected: no user-facing matches.

- [ ] **Step 2: Live drive**

Sign in as holder seed. On `/holder`:
- Empty wallet: add-by-ID bar works → credential appears in grid.
- Card actions: Selective Disclosure toggle persists; Share tab QR + copy link; Downloads tab both files download.
- Remove: confirm → credential gone from grid.
- `?add=<id>` prefill: open `/holder?add=<valid-id>` logged out → login → lands on `/holder?add=<id>` with field prefilled, click adds it.
Use reticle_* tools with declared `until`; only `reticle_act_and_wait`/`reticle_assert` produce verdicts; unknown/no-fault = not proved.

- [ ] **Step 3: Report verdicts with evidence to the coordinator (no commit).**

---

## Self-review

- Spec coverage: slice 3 screens → Tasks 1–3; Phase 0 discovery/return-to → Task 3; §7 gate → Task 4.
- Placeholders: none; files, commands, messages exact.
- Type consistency: `WalletCredential` fields reused; `DisclosureData` + `DisclosureUpdateRequest` reused.