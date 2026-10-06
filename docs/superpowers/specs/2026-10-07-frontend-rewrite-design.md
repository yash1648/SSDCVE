# SSDCVE Frontend Rewrite — Design Spec

Date: 2026-10-07
Status: revised after review (5 sections signed off in chat, review feedback folded in)
Path: brainstorming/architectural → writing-plans next

## 1. Background

The SSDCVE frontend (Vite + React + Tailwind + shadcn, `frontend/`) serves a
credential-verification registry: public proof pages plus four role portals
(issuer, holder, verifier, admin) backed by a Spring Boot API (`backend/`).
A prior redesign established a paper/serif/seal-green system; this rewrite
replaces it with a skill-derived system and aligns every screen 1:1 with the
backend contract. The earlier Next.js dashboard proposal is dropped: we stay
on Vite + React, and no mock/demo data ships — every number comes from the API.

## 2. Locked decisions

- **Scope:** contract fidelity + full redesign (not re-skin, not contract-only).
- **Backend frozen:** frontend adapts to the backend as-is; no backend edits.
  Disputed points pause for user decision, they do not trigger backend changes.
- **Approach:** map-then-slice. Phase 0 = endpoint inventory mapped to screens
  + new design system. Then vertical slices: public → verifier → issuer →
  holder → admin, each verified live before the next begins.
- **Skill:** ui-ux-pro-max. Verified matches: Trust & Authority + Swiss
  Minimalism; trust blue + achievement gold; Inter + Playfair Display;
  errors announced (High); skeleton + aria-busy loading (High).

## 3. Contract map (33 endpoints, 5 controllers)

| Backend | Endpoints | UI status |
|---|---|---|
| POST /api/auth/* (4) | register, login, refresh, logout | wired incl. silent refresh |
| /api/issuer/* (10) | register, holders lookup, me, keys, issue/list/get/revoke credential, verifications, attach-document | wired; holders lookup + attachDocument thinnest |
| /api/holder/* (6) | wallet, add, remove, download, certificate, disclosure get/set | wired incl. disclosure editor |
| /api/verifier/* (8) | verify, verify-by-id, batch, export-csv, anchor, chain-status, recent-anchors, history | All wired; exportCsv ships per resolution below |
| /api/admin/* (5) | issuers, verify-issuer, promote-issuer, users, verifications | wired |

Phase 0 audit confirms: DTO drift beyond contract.ts; screens with no
backend (delete candidates); unverified-issuer issue behavior; no-key
issue behavior.

Resolved during review (verified read-only, 2026-10-07):
- exportCsv ships: POST /api/verifier/verify/batch/csv takes the held
  BatchVerificationResponse JSON, returns text/csv for download.
- Public-vs-auth resolved in SecurityConfig: POST verify, verify/batch,
  verify/batch/csv and GET anchor/**, anchors/**, chain/**, verify/** are
  permitAll, so public proof and chain pages work logged-out. Only
  GET /api/verifier/history requires auth.
- Issue wizard fields are exactly subjectId, type, title, claims
  (CredentialIssueRequest); there is no expiry field, none is added.
- Binary types: download = application/json attachment, certificate =
  application/pdf attachment; filenames come from Content-Disposition.
- Gold #A16207 on bg #F0F9FF measures 4.62:1 (passes, near the line):
  gold is reserved for large/bold text, seals, and accents, never small
  body copy. Muted-fg on bg measures 7.03:1.
- Secondary #0EA5E9 measures 2.6:1 on bg (fails text and 3:1 component
  minimums): secondary is decorative-fill only (chart areas, illustration,
  large graphic blocks), never text, icons that carry meaning, or
  interactive boundaries. Primary #0369A1 (5.57:1) carries all text and
  interactive states.
- Destructive #DC2626 on bg measures 4.53:1 (passes, near the line):
  destructive text stays at standard sizes, never de-emphasized small print.
- Dark pairs all pass strongly: gold #D9A441 on navy 7.97 / on card 6.80;
  sky #38BDFC on navy 8.41 / on card 7.17.

## 3b. Auth and session foundations (Phase 0, before slice 0)

Single api client owns sessions: access token in memory only; on app load
one silent refresh attempt that fails quietly with no cookie; on 401 a
single retry through a request queue, then logout; logout calls
POST /api/auth/logout and clears state. Refresh cookie requires CORS with
credentials or same-origin deployment: Phase 0 records which is true and
the client is built for it. Even the public slice needs this foundation
(history link, saved sessions, logged-in nav state).
- Public routes never send stale tokens: the client skips the Authorization
  header on the permitAll list (verify POSTs, anchor/chain/verify GETs),
  because a JWT filter can 401 an expired bearer even where auth is not
  required. Fallback rule: on a 401 from those routes, retry once without
  the token. A 401 on a public route never triggers logout or redirect.
- 403 is not 401: history and role-gated routes may refuse an authenticated
  but wrong-role user. On 403 the UI shows "not authorized for your role"
  with a way back; it never refreshes, never logs out.

## 4. Design tokens

- Primary #0369A1, secondary #0EA5E9, accent gold #A16207, background
  #F0F9FF (never pure white), card #FFFFFF, ink #0C4A6E, muted #E7EFF5 /
  #475569 (4.5:1), border #BAE6FD, destructive #DC2626.
- Dark: navy bg #0A1826, sky #38BDFC, gold #D9A441, cards #10273A.
- Type: Inter UI/body (tracking-tight headings), Playfair Display for
  editorial moments only (landing hero, result seals, empty-state titles).
  Playfair is a serif by design: display use is intentional and stays out
  of body copy, tables, and forms, so the sans-driven Swiss system never
  drifts into editorial body text.
  Tabular numerals for data; mono for credential numbers and hashes.
- Radius xl cards / lg controls; custom soft shadows (no shadow-md);
  200–250ms ease-out hovers; skeleton shimmer is the only loop;
  prefers-reduced-motion honored. Lucide icons only, one stroke per surface.
- DESIGN.md rewritten to this system; paper/serif/seal retired.

## 5. Shells and navigation

- PublicShell: wordmark + Verify/Chain + Sign in/Create account; quiet footer.
  Auth = single centered card. No notification bell (no backend for it).
- AppShell: slim collapsible sidebar (Public links above role links; active =
  primary tint + left-border accent) + topbar (title, user chip, theme,
  avatar dropdown with sign out).
- No Cmd+K palette (no backend search endpoint); per-table filters instead.
- Routes unchanged; deep links keep working with URL-synced tabs.

## 6. Slices

0. Public: landing, verify (single/batch/by-ID seals with next actions),
   chain. 1. Verifier: workspace, batch + exportCsv, history.
2a. Issuer onboarding and issue: registration states (see below), keys
   (session-only: no list endpoint exists, so the UI shows keys created
   this session and says so), issue wizard (subjectId/type/title/claims).
2b. Issuer manage: list, detail, revoke with reason, documents, activity.
   3. Holder: wallet, add/remove, downloads,
   disclosure editor. 4. Admin: overview, institutions, accounts, audit.
- Cross-cutting: skeletons + aria-busy, role=alert errors, empties with next
  actions, UTC-explicit dates, no jargon, no em dashes.
- Glossary rule: verifier pages must show content hash, tx hash, and the six
  check names, so plain language does not delete technical fields. Each gets
  a short tooltip in plain words (what it is, why it matters); prose around
  them stays jargon-free.
- Issuer state machine: /me 404 means "not registered" and routes to
  registration, never an error screen. States are unregistered,
  registered-but-unverified, verified. Phase 0 audits whether an
  unverified issuer can issue and what happens with no key yet; the UI
  handles both answers without inventing states.
- Holder discovery: there is no "issued to me" endpoint, so the wallet fills
  only by pasting a credential ID. The issue-success screen offers copy-ID
  plus a shareable wallet link, and the wallet accepts ?add=<id> to prefill
  the add form. Decided: no backend change, link format is frontend-only.
  Return-to: a logged-out holder opening ?add=<id> is sent through login
  with the destination and add param preserved, lands back, and finds the
  form prefilled. The add is never auto-submitted; it requires a click.
- Phase 0 audit item (ownership): record whether
  POST /api/holder/wallet/{credentialId} verifies the credential was issued
  to that holder. If not, the UUID is a bearer secret and the shareable
  link leaks it: finding goes to the user for a keep-with-warning vs
  drop-the-link decision. Backend stays frozen either way.

## 7. Verification gate (per slice)

Contract check (each endpoint called once happy-path; tsc + build clean) →
copy gate (no em dashes, no leak tokens) → skill checklist (icons, hovers,
contrast, focus, reduced motion, 375px/1440px) → live Reticle verdict
(verified:yes or slice not done; unknown/no-fault = not proved).

## 8. Self-review (after review feedback)

No TBDs. No contradictions (frozen backend vs full redesign reconciled:
redesign is visual + wiring, never backend). Scope fits one plan with 6
slices (2a/2b split keeps each gate meaningful). "Honest wiring" defined:
button ships only if endpoint serves it. Reticle gate stands as written;
unknown/no-fault verdicts are reported as not proved.
