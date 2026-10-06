# SSDCVE Frontend Rewrite — Design Spec

Date: 2026-10-07
Status: approved (all 5 sections signed off in chat)
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
| /api/verifier/* (8) | verify, verify-by-id, batch, export-csv, anchor, chain-status, recent-anchors, history | 7 wired; **open: does exportCsv have UI?** Phase 0 resolves; no button ships without honest wiring |
| /api/admin/* (5) | issuers, verify-issuer, promote-issuer, users, verifications | wired |

Phase 0 audit confirms: exportCsv UI status; public-vs-auth for
verifier/chain endpoints (security config); DTO drift beyond contract.ts;
screens with no backend (delete candidates).

## 4. Design tokens

- Primary #0369A1, secondary #0EA5E9, accent gold #A16207, background
  #F0F9FF (never pure white), card #FFFFFF, ink #0C4A6E, muted #E7EFF5 /
  #475569 (4.5:1), border #BAE6FD, destructive #DC2626.
- Dark: navy bg #0A1826, sky #38BDFC, gold #D9A441, cards #10273A.
- Type: Inter UI/body (tracking-tight headings), Playfair Display for
  editorial moments only. Tabular numerals for data; mono for credential
  numbers and hashes.
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
   chain. 1. Verifier: workspace, batch (+exportCsv if honest), history.
2. Issuer: overview, issue (+holder lookup), credentials + revoke + keys +
   documents + activity. 3. Holder: wallet, add/remove, downloads,
   disclosure editor. 4. Admin: overview, institutions, accounts, audit.
- Cross-cutting: skeletons + aria-busy, role=alert errors, empties with next
  actions, UTC-explicit dates, no jargon, no em dashes.

## 7. Verification gate (per slice)

Contract check (each endpoint called once happy-path; tsc + build clean) →
copy gate (no em dashes, no leak tokens) → skill checklist (icons, hovers,
contrast, focus, reduced motion, 375px/1440px) → live Reticle verdict
(verified:yes or slice not done; unknown/no-fault = not proved).

## 8. Self-review

No TBDs. No contradictions (frozen backend vs full redesign reconciled:
redesign is visual + wiring, never backend). Scope fits one plan with 5
slices. "Honest wiring" defined: button ships only if endpoint serves it.
