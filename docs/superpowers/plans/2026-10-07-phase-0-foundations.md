# Phase 0 Foundations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the frozen-contract foundations the six slice plans build on: answered audit, session-safe api client, new design tokens, and new shells.

**Architecture:** Read-only audit first (findings committed), then client policy, then tokens, then shells. No screen rewrites; slices do those.

**Tech Stack:** Vite + React 18 + react-router-dom 7 + axios 1.x + Tailwind 3.4 + shadcn (HSL CSS vars).

**Spec:** `docs/superpowers/specs/2026-10-07-frontend-rewrite-design.md` (§3 contract map, §3b auth foundations, §4 tokens, §5 shells).

## Global Constraints

- Backend frozen: no file under `backend/` is touched, read-only greps only.
- Every number on screen comes from the API; no mock data, ever.
- No em dashes in any added prose; no leak tokens (UUIDs, ports, `/api/` paths, status codes, hashes, crypto jargon) in user-facing strings.
- Secondary #0EA5E9 is decorative-fill only (2.6:1); primary #0369A1 (5.57:1) carries text and interactive states; gold #A16207 (4.62:1) large/bold/accents only; destructive #DC2626 (4.53:1) standard sizes only.
- This repo has no unit-test runner: verification is `npx tsc --noEmit -p tsconfig.app.json`, `npm run build`, and a live Reticle verdict per the spec gate. Do not add a test framework in this plan.
- One slice-level Reticle verdict closes this plan (skeleton-free foundation drive: login → admin landing renders).

---

## File structure

- `docs/superpowers/plans/phase-0-findings.md` (new): the five audit answers, committed.
- `frontend/src/lib/api.ts` (modify ~lines 85–173): public no-token list, 401-without-token retry, 403 marker error.
- `frontend/src/index.css` (rewrite `:root`/`.dark` + fonts): trust-blue/gold tokens, Inter + Playfair Display import.
- `frontend/tailwind.config.js` (modify): `font-sans` Inter, `font-display` Playfair Display.
- `frontend/DESIGN.md` (rewrite): new system as source of truth.
- `frontend/src/components/layout/PublicShell.tsx`, `AppShell.tsx`, `Sidebar.tsx`, `Topbar.tsx` (modify): §5 shells; login return-to support.
- `frontend/src/pages/LoginPage.tsx` (modify): preserve `?next` through login.

---

### Task 1: Phase 0 audit findings

**Files:**
- Read: `backend/src/main/java/com/ssdcve/security/SecurityConfig.java` (cors), `backend/src/main/java/com/ssdcve/service/IssuerService.java` (unverified-issue + no-key guards), `backend/src/main/java/com/ssdcve/service/HolderService.java` (wallet-add ownership), `frontend/src/lib/schema.ts` + `contract.ts` (drift baseline).
- Create: `docs/superpowers/plans/phase-0-findings.md`
- Run: `npm run gen:api` in `frontend/` (regenerates schema; verify no diff surprises)

**Interfaces:**
- Consumes: spec §3/§3b open items.
- Produces: findings file with exactly five answers (CORS mode, unverified-issue behavior, no-key behavior, wallet-add ownership verdict, DTO drift list) that Tasks 2–4 argue from.

- [ ] **Step 1: Run the contract baseline**

Run: `npm run gen:api && npx tsc --noEmit -p tsconfig.app.json` in `frontend/`
Expected: PASS; record any schema diff in the findings file.

- [ ] **Step 2: Answer the five audit questions (read-only)**

```bash
grep -n "cors\|CorsConfiguration\|allowedOrigins" backend/src/main/java/com/ssdcve/security/SecurityConfig.java
grep -n "verif\|VERIFIED\|status" backend/src/main/java/com/ssdcve/service/IssuerService.java | head -20
grep -n "subject\|owner\|holder" backend/src/main/java/com/ssdcve/service/HolderService.java | head -20
```

Record: (1) CORS-with-credentials or same-origin-via-proxy, (2) can unverified issuer issue, (3) issue with no key behavior, (4) wallet-add ownership check yes/no, (5) drift list from Step 1.

- [ ] **Step 3: Write the findings file**

Create `docs/superpowers/plans/phase-0-findings.md`:

```markdown
# Phase 0 Findings (date)

1. Cookie transport: {CORS with credentials | same-origin proxy} (evidence: file:line)
2. Unverified issuer issue: {allowed | blocked} (evidence)
3. Issue with no key: {behavior} (evidence)
4. Wallet-add ownership: {checked | NOT checked -> UUID is bearer secret; decision needed: keep link with warning vs drop link}
5. DTO drift: {none | list}
```

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/plans/phase-0-findings.md
git commit -m "docs: phase 0 audit findings"
```

---

### Task 2: Session-safe api client

**Files:**
- Modify: `frontend/src/lib/api.ts:85-173` (request + response interceptors)

**Interfaces:**
- Consumes: findings Task 1 (cookie transport mode; ownership does not change client code).
- Produces: `PUBLIC_NO_TOKEN_PREFIXES` export; 403 errors carry `error.isForbidden === true`; public-route 401s never call `authFailureCallback`.

- [ ] **Step 1: Add the public no-token list to the request interceptor**

```typescript
export const PUBLIC_NO_TOKEN_PREFIXES = [
  '/verifier/verify',
  '/verifier/anchor',
  '/verifier/anchors',
  '/verifier/chain',
];

const isPublicRoute = (url?: string) =>
  !!url && PUBLIC_NO_TOKEN_PREFIXES.some((p) => url.includes(p));
```

In the request interceptor, skip `Authorization` when `isPublicRoute(config.url)` is true (in addition to the existing login/register exclusion).

- [ ] **Step 2: Public 401 retries without token, never logs out**

In the response interceptor, before the refresh block, add:

```typescript
if (error.response?.status === 401 && isPublicRoute(originalRequest.url) && !originalRequest._retryPublic) {
  originalRequest._retryPublic = true;
  delete originalRequest.headers.Authorization;
  return apiClient(originalRequest);
}
```

A 401 on a public route must not reach `authFailureCallback`. (Extend the interceptor config type with `_retryPublic?: boolean`.)

- [ ] **Step 3: Mark 403s, never refresh them**

At the top of the error handler, add:

```typescript
if (error.response?.status === 403) {
  (error as AxiosError & { isForbidden?: boolean }).isForbidden = true;
  return Promise.reject(error);
}
```

Portals render "not authorized for your role" from `isForbidden`; no refresh, no logout.

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit -p tsconfig.app.json` in `frontend/`
Expected: PASS with no new errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/api.ts
git commit -m "feat: public-route token policy and 403 handling in api client"
```

---

### Task 3: Design tokens + DESIGN.md

**Files:**
- Modify: `frontend/src/index.css` (font import + `:root`/`.dark` values)
- Modify: `frontend/tailwind.config.js` (font families)
- Rewrite: `frontend/DESIGN.md`

**Interfaces:**
- Consumes: measured pairs (primary 5.57, gold 4.62, secondary 2.6 decorative-only, destructive 4.53, muted-fg 7.03, dark pairs 6.8–8.4).
- Produces: `font-sans`/`font-display` utilities; CSS vars every slice uses.

- [ ] **Step 1: Import fonts and rewrite light tokens**

Top of `frontend/src/index.css`, before `@tailwind base`:

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,600;0,700;1,600&display=swap');
```

Replace `:root` with:

```css
:root {
  --background: 204 100% 97%;
  --foreground: 202 80% 24%;
  --card: 0 0% 100%;
  --card-foreground: 202 80% 24%;
  --popover: 0 0% 100%;
  --popover-foreground: 202 80% 24%;
  --primary: 201 96% 32%;
  --primary-foreground: 0 0% 100%;
  --secondary: 199 89% 48%;
  --secondary-foreground: 0 0% 100%;
  --muted: 206 41% 93%;
  --muted-foreground: 215 19% 35%;
  --accent: 35 92% 33%;
  --accent-foreground: 0 0% 100%;
  --destructive: 0 72% 51%;
  --destructive-foreground: 0 0% 100%;
  --border: 201 94% 86%;
  --input: 201 94% 86%;
  --ring: 201 96% 32%;
  --radius: 0.625rem;
}
```

- [ ] **Step 2: Rewrite dark tokens**

```css
.dark {
  --background: 210 58% 9%;
  --foreground: 204 100% 97%;
  --card: 207 57% 15%;
  --card-foreground: 204 100% 97%;
  --popover: 207 57% 15%;
  --popover-foreground: 204 100% 97%;
  --primary: 199 97% 60%;
  --primary-foreground: 210 58% 9%;
  --secondary: 199 89% 48%;
  --secondary-foreground: 0 0% 100%;
  --muted: 207 57% 15%;
  --muted-foreground: 206 41% 80%;
  --accent: 39 67% 55%;
  --accent-foreground: 210 58% 9%;
  --destructive: 0 72% 60%;
  --destructive-foreground: 0 0% 100%;
  --border: 207 57% 22%;
  --input: 207 57% 22%;
  --ring: 199 97% 60%;
}
```

- [ ] **Step 3: Wire font families**

In `frontend/tailwind.config.js` `theme.extend`:

```js
fontFamily: {
  sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
  display: ['"Playfair Display"', 'Georgia', 'serif'],
},
```

- [ ] **Step 4: Rewrite DESIGN.md**

Replace the paper/serif/seal system with: palette table + measured ratios, font roles (Inter everywhere; Playfair display-only, never body/tables/forms), radius/shadow/motion tokens, Lucide-only rule, secondary-decorative-only and gold/destructive size rules, no-em-dash + no-leak copy rules.

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit -p tsconfig.app.json && npm run build` in `frontend/`
Expected: both PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/index.css frontend/tailwind.config.js frontend/DESIGN.md
git commit -m "feat: trust-blue/gold design tokens and font system"
```

---

### Task 4: Shells + login return-to

**Files:**
- Modify: `frontend/src/components/layout/PublicShell.tsx`, `AppShell.tsx`, `Sidebar.tsx`, `Topbar.tsx`
- Modify: `frontend/src/pages/LoginPage.tsx` (preserve `?next`)

**Interfaces:**
- Consumes: tokens Task 3; findings Task 1 (nothing shell-blocking expected).
- Produces: shells matching spec §5; `?next=/holder?add=<id>` survives login for the slice-3 plan to consume.

- [ ] **Step 1: PublicShell per spec**

Single navbar (wordmark, Verify, Chain, Sign in, Create account), quiet footer, centered-card auth layout. No second nav row; no notification bell anywhere.

- [ ] **Step 2: AppShell + Sidebar + Topbar per spec**

Slim collapsible sidebar, Public section above role links, active = primary tint + left-border accent. Topbar: title, user chip, theme toggle, avatar dropdown with sign out. No search palette, no bell.

- [ ] **Step 3: Preserve return-to through login**

In `LoginPage.tsx`, read `?next` from search params at mount; after successful login `navigate(next ?? getDashboardPath(), { replace: true })` instead of the bare dashboard path. Guards redirecting to login must append `?next=<pathname><search>`. Never auto-submit anything after redirect; the destination screen decides.

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit -p tsconfig.app.json && npm run build` in `frontend/`
Expected: both PASS.

- [ ] **Step 5: Live drive**

Drive: open `/login?next=/holder?add=demo`, sign in as a holder seed, assert landing on `/holder?add=demo` with the add form prefilled and NOT submitted. Reticle verdict `verified:yes` or fix and re-drive.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/layout frontend/src/pages/LoginPage.tsx
git commit -m "feat: spec shells and login return-to"
```

---

## Self-review

- Spec coverage: §3 map → Task 1 baseline; §3b client → Task 2 (+ return-to Task 4); §4 tokens → Task 3; §5 shells → Task 4; §7 gate → tsc/build/Reticle steps in Tasks 3–4. Slice screens are NOT in this plan; slice plans follow in build order (public, verifier, issuer-2a, issuer-2b, holder, admin).
- Placeholders: none; every step names files, values, or commands.
- Type consistency: `_retryPublic` added to the interceptor config type in Task 2 Step 2; `isForbidden` flag shape fixed in Step 3 for portals to consume.
