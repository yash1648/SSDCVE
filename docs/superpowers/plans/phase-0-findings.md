# Phase 0 Findings (2026-10-07)

Contract baseline: schema regenerated with `npx openapi-typescript ../backend/api-docs.yaml -o src/lib/schema.ts` (note: the `gen:api` script resolves to the same command but `openapi-typescript` is not in `frontend/package.json` devDependencies, so plain `npm run gen:api` fails with "command not found" and npx fetched v7.13.0). `npx tsc --noEmit -p tsconfig.app.json` passes with zero errors. All backend evidence below is read-only; nothing under `backend/` was written.

1. Cookie transport: same-origin proxy (evidence: `frontend/vite.config.ts:16-22` proxies `/api` to the backend; `backend/src/main/java/com/ssdcve/security/SecurityConfig.java` contains no CORS configuration in all 144 lines, no `CorsConfigurationSource`, no `allowedOrigins`). Auth sends a Bearer header from an in-memory token plus `withCredentials: true` on same-origin requests (`frontend/src/lib/api.ts:79,92-93`).

2. Unverified issuer issue: blocked (evidence: `backend/src/main/java/com/ssdcve/service/IssuerService.java:154` routes `issueCredential` through `requireVerifiedIssuer`, which throws `SecurityException("Issuer is not verified")` at `IssuerService.java:455-458`; mapped to 403 by `backend/src/main/java/com/ssdcve/controller/GlobalExceptionHandler.java:45-52`).

3. Issue with no key: rejected with 400 and message "Issuer has no active signing key" (evidence: `backend/src/main/java/com/ssdcve/service/IssuerService.java:161-165` throws `IllegalArgumentException`; mapped to 400 by `backend/src/main/java/com/ssdcve/controller/GlobalExceptionHandler.java:36-43`).

4. Wallet-add ownership: checked (evidence: `backend/src/main/java/com/ssdcve/service/HolderService.java:107-116` compares `credential.getSubject().getId()` to the authenticated user id and throws 403 "This credential was issued to someone else" on mismatch; add is idempotent at `HolderService.java:121-136`). No bearer-secret link pattern exists, so no keep-or-drop decision is needed.

5. DTO drift: none (evidence: regenerated `frontend/src/lib/schema.ts` (1577 lines) compiles clean against the key-equality assertions in `frontend/src/lib/contract.ts:52-81`, including the newer `ChainStatusResponse`, `RecentAnchorResponse`, and `AnchorLookupResponse` schemas; `tsc` exit 0). Note: `frontend/` is untracked in git, so there is no committed schema to diff against; the `contract.ts` compile gate is the drift check and it passes.
