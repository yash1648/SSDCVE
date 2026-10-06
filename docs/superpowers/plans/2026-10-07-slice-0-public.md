# Slice 0 Public Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild all public screens on the new trust-blue/gold system, wired 1:1 to the verifier/chain endpoints.

**Architecture:** Shared result-seal + glossary primitives first, then landing, verify family, chain, then the slice gate. All data from the API; no mock content.

**Tech Stack:** Vite + React 18 + react-router-dom 7 + axios client (`verifierApi`) + Tailwind + shadcn + Lucide.

**Spec:** `docs/superpowers/specs/2026-10-07-frontend-rewrite-design.md` (§3 contract map verifier rows, §4 tokens, §5 PublicShell, §6 slice 0, §7 gate). Tokens: `frontend/DESIGN.md`.

## Global Constraints

- Backend frozen: never write under `backend/`.
- Endpoints for this slice (all permitAll, no token sent): `POST /verifier/verify`, `GET /verifier/verify/{id}`, `POST /verifier/verify/batch`, `POST /verifier/verify/batch/csv`, `GET /verifier/anchor/{n}`, `GET /verifier/chain/status`, `GET /verifier/anchors/recent`, all via `verifierApi` in `frontend/src/lib/api.ts` (already complete, do not rewrite it).
- No em dashes; no leak tokens in UI strings; secondary decorative-only; gold large/bold/accents only.
- Verification per task: `npx tsc --noEmit -p tsconfig.app.json` + `npm run build` in `frontend/`; slice closes with one live Reticle `verified:yes`.
- No new packages: the glossary hover card is CSS-only (`group-hover`), not Radix tooltip.

---

## File structure

- Create `frontend/src/components/verifier/ResultSeal.tsx`: status seal for the six `VerificationStatus` values (VALID, TAMPERED, REVOKED, EXPIRED, NOT_FOUND, UNAVAILABLE), each with plain-words headline + next action.
- Create `frontend/src/components/verifier/GlossaryTerm.tsx`: CSS-only hover card (`group relative` + `group-hover:visible`), props `term: string; children: React.ReactNode`.
- Rewrite `frontend/src/components/verifier/VerificationResultHero.tsx`: seal + six checks with glossary + hashes.
- Rewrite pages: `frontend/src/pages/LandingPage.tsx`, `PublicVerifyPage.tsx`, `BatchVerifyPage.tsx` (+ restyle `BatchVerifySection.tsx`, `BatchResultSideSheet.tsx`), `VerifyByIdPage.tsx`, `ChainPage.tsx` (+ restyle `ChainStatusCard.tsx`, `RecentAnchorsList.tsx`, `AnchorLookupSection.tsx`).

---

### Task 1: Result seal + glossary primitives

**Files:**
- Create: `frontend/src/components/verifier/ResultSeal.tsx`
- Create: `frontend/src/components/verifier/GlossaryTerm.tsx`

**Interfaces:**
- Consumes: `VerificationStatus` from `frontend/src/types/verifier.ts`.
- Produces: `<ResultSeal status reason />`, `<GlossaryTerm term>` used by Tasks 2–4.

- [ ] **Step 1: Create ResultSeal**

```tsx
import React from 'react';
import { ShieldCheck, ShieldAlert, ShieldX, Clock, FileQuestion, WifiOff } from 'lucide-react';
import type { VerificationStatus } from '../../types/verifier';

const SEAL: Record<VerificationStatus, { icon: React.ReactNode; title: string; tone: string; next: string }> = {
  VALID: { icon: <ShieldCheck className="w-8 h-8" />, title: 'Genuine certificate', tone: 'text-primary border-primary/30 bg-primary/5', next: 'You can rely on this record.' },
  TAMPERED: { icon: <ShieldAlert className="w-8 h-8" />, title: 'Changed since issue', tone: 'text-destructive border-destructive/30 bg-destructive/5', next: 'Ask the issuer for a fresh copy.' },
  REVOKED: { icon: <ShieldX className="w-8 h-8" />, title: 'Withdrawn by issuer', tone: 'text-destructive border-destructive/30 bg-destructive/5', next: 'Contact the issuing institution.' },
  EXPIRED: { icon: <Clock className="w-8 h-8" />, title: 'Past its validity', tone: 'text-accent border-accent/30 bg-accent/5', next: 'Ask whether a renewal exists.' },
  NOT_FOUND: { icon: <FileQuestion className="w-8 h-8" />, title: 'No matching record', tone: 'text-muted-foreground border-border bg-muted/40', next: 'Check the reference and try again.' },
  UNAVAILABLE: { icon: <WifiOff className="w-8 h-8" />, title: 'Check unavailable', tone: 'text-muted-foreground border-border bg-muted/40', next: 'Try again in a moment.' },
};

export const ResultSeal: React.FC<{ status: VerificationStatus; reason: string }> = ({ status, reason }) => {
  const s = SEAL[status];
  return (
    <div className={`rounded-xl border p-6 text-center space-y-2 ${s.tone}`}>
      <div className="flex justify-center">{s.icon}</div>
      <h2 className="font-display text-2xl font-bold tracking-tight">{s.title}</h2>
      <p className="text-sm">{reason}</p>
      <p className="text-sm font-semibold">{s.next}</p>
    </div>
  );
};
```

- [ ] **Step 2: Create GlossaryTerm (CSS-only)**

```tsx
import React from 'react';

export const GLOSSARY: Record<string, string> = {
  envelopeStructure: 'The file is shaped like a real certificate.',
  schemaConformance: 'Every required field is present and well formed.',
  issuerSignature: 'Signed by the institution named on the certificate.',
  onChainAnchor: 'Independently recorded where it cannot be altered.',
  revocationStatus: 'The issuer has not withdrawn this certificate.',
  ipfsIntegrity: 'The stored document matches the certificate exactly.',
  contentHash: 'A fingerprint of the certificate content. Any change alters it.',
  txHash: 'The reference of the recording transaction.',
};

export const GlossaryTerm: React.FC<{ term: keyof typeof GLOSSARY; children: React.ReactNode }> = ({ term, children }) => (
  <span className="group relative underline decoration-dotted underline-offset-2 cursor-help">
    {children}
    <span className="invisible group-hover:visible absolute z-10 bottom-full left-1/2 -translate-x-1/2 mb-1 w-52 rounded-lg border border-border bg-popover p-2 text-xs text-popover-foreground shadow-sm">
      {GLOSSARY[term]}
    </span>
  </span>
);
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit -p tsconfig.app.json` in `frontend/`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/verifier/ResultSeal.tsx frontend/src/components/verifier/GlossaryTerm.tsx
git commit -m "feat: result seal and glossary primitives for public slice"
```

---

### Task 2: Landing page

**Files:**
- Rewrite: `frontend/src/pages/LandingPage.tsx` (keep route `/`, keep PublicShell)

**Interfaces:**
- Consumes: `ResultSeal`? No. `verifierApi.getChainStatus`, `verifierApi.getRecentAnchors` (limit 5); primitives from Task 1 not needed here.
- Produces: landing with live record strip (nothing else depends on it).

- [ ] **Step 1: Rebuild sections on new tokens**

Hero (mission + credibility, `font-display`, primary CTA to `/verify`), live record strip (chain status + 5 recent anchors, tabular numerals, UTC-explicit dates), how-checking-works (3 steps), CTA. Fetch chain status + recent anchors on mount with skeleton placeholders while loading; on failure the strip hides and the page still stands (public content must never hard-fail on API).

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit -p tsconfig.app.json && npm run build` in `frontend/`
Expected: both PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/LandingPage.tsx
git commit -m "feat: rebuild landing on registry design system"
```

---

### Task 3: Verify single + by-ID + result hero

**Files:**
- Rewrite: `frontend/src/components/verifier/VerificationResultHero.tsx`
- Rewrite: `frontend/src/pages/PublicVerifyPage.tsx`, `frontend/src/pages/VerifyByIdPage.tsx`

**Interfaces:**
- Consumes: `ResultSeal`, `GlossaryTerm`, `verifierApi.verifyFile`, `verifierApi.verifyById`.
- Produces: result rendering used by nothing else (verifier portal slice reuses it later).

- [ ] **Step 1: Rebuild VerificationResultHero**

`ResultSeal` on top; six checks as rows with pass/fail Lucide icons wrapped in `GlossaryTerm`; content hash + tx hash via existing `HashDisplay` wrapped in `GlossaryTerm`; issuer line with verified marker; "Check another" reset button. Announce errors with `role="alert"`.

- [ ] **Step 2: Rebuild the two pages**

`PublicVerifyPage`: upload dropzone + by-reference card (keep current flow, new tokens, skeleton-free instant feedback, `role="alert"` on failures). `VerifyByIdPage`: fetch on mount from `:credentialId` param, skeleton while loading, hero on success, NOT_FOUND seal when the API 404s (not an error toast).

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit -p tsconfig.app.json && npm run build` in `frontend/`
Expected: both PASS.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/verifier/VerificationResultHero.tsx frontend/src/pages/PublicVerifyPage.tsx frontend/src/pages/VerifyByIdPage.tsx
git commit -m "feat: rebuild verify screens with seals and glossary"
```

---

### Task 4: Batch + CSV

**Files:**
- Modify: `frontend/src/pages/BatchVerifyPage.tsx`, `frontend/src/components/verifier/BatchVerifySection.tsx`, `frontend/src/components/verifier/BatchResultSideSheet.tsx`

**Interfaces:**
- Consumes: `ResultSeal`, `GlossaryTerm`, `verifierApi.verifyBatch`, `verifierApi.exportBatchCsv`.
- Produces: batch flow the verifier slice will reuse.

- [ ] **Step 1: Restyle batch flow + wire CSV download**

Keep the upload/results flow; apply new tokens; summary counts row (valid/tampered/revoked/expired/not-found from `BatchVerificationResponse`); per-file rows with status seal chips + glossary on checks; "Download CSV" button calling `verifierApi.exportBatchCsv(batchData)` with loading state, `role="alert"` on failure. Empty state guides to upload with an action.

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit -p tsconfig.app.json && npm run build` in `frontend/`
Expected: both PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/BatchVerifyPage.tsx frontend/src/components/verifier/BatchVerifySection.tsx frontend/src/components/verifier/BatchResultSideSheet.tsx
git commit -m "feat: rebuild batch verify with CSV download"
```

---

### Task 5: Chain page

**Files:**
- Modify: `frontend/src/pages/ChainPage.tsx`, `frontend/src/components/verifier/ChainStatusCard.tsx`, `frontend/src/components/verifier/RecentAnchorsList.tsx`, `frontend/src/components/verifier/AnchorLookupSection.tsx`

**Interfaces:**
- Consumes: `GlossaryTerm`, `HashDisplay`, `verifierApi.getChainStatus/getRecentAnchors/getAnchor`.
- Produces: nothing downstream.

- [ ] **Step 1: Rebuild chain sections**

Status card (chain id, latest block, anchored count, tabular numerals, skeleton while loading); recent anchors table (credential number, issuer, block, UTC-explicit time); lookup by credential number rendering `AnchorLookup` with `GlossaryTerm` on content hash + tx hash. Lookup miss shows the NOT_FOUND seal tone, not a bare error.

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit -p tsconfig.app.json && npm run build` in `frontend/`
Expected: both PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/ChainPage.tsx frontend/src/components/verifier/ChainStatusCard.tsx frontend/src/components/verifier/RecentAnchorsList.tsx frontend/src/components/verifier/AnchorLookupSection.tsx
git commit -m "feat: rebuild chain page on registry design system"
```

---

### Task 6: Slice gate

**Files:** none (verification only).

- [ ] **Step 1: Copy gate**

Run: `rg -n " — | —|— | —" frontend/src/pages/LandingPage.tsx frontend/src/pages/PublicVerifyPage.tsx frontend/src/pages/BatchVerifyPage.tsx frontend/src/pages/VerifyByIdPage.tsx frontend/src/pages/ChainPage.tsx frontend/src/components/verifier/ ; rg -n "localhost:6969|/api/|Bearer |ed25519|sha-256|SHA-256|ipfs\.io" frontend/src/pages/ frontend/src/components/verifier/`
Expected: no user-facing matches (code-internal API paths in `lib/api.ts` are allowed; prose strings are not).

- [ ] **Step 2: Live drive**

On the running app: open `/verify`, verify a real file or pick a credentialNumber from `/verifier/anchors/recent` and open `/verify/{id}`; assert the `ResultSeal` headline renders with `verified:yes`. Then open `/chain` and assert status numbers render. Unknown/no-fault = not proved; fix and re-drive.

- [ ] **Step 3: Commit the gate note (empty commit not allowed; record in session)**

Report the two verdicts with evidence to the coordinator instead of committing.

---

## Self-review

- Spec coverage: slice-0 screens (§6) → Tasks 2–5; seals/glossary rule → Task 1; exportCsv honest wiring → Task 4; gate (§7) → Task 6. `?add=`/return-to already done in Phase 0.
- Placeholders: none; code blocks inline; endpoint paths exact.
- Type consistency: `VerificationStatus` six values reused verbatim; `GlossaryTerm term` keys cover the six checks + two hashes.
