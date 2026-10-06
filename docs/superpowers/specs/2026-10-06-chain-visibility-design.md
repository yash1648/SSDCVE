# Chain Visibility — Design Spec

**Date:** 2026-10-06
**Status:** Approved for implementation
**Scope:** Let users see the Anvil EVM chain their credentials are anchored to.

## 1. Problem

- Credentials are anchored to a local Anvil chain (31337) at issuance, and
  verification checks the anchor — but the rewritten UI shows nothing on-chain.
- The old UI's "Blockchain Anchor Proof" section was dropped in the rewrite.
- Anvil runs without a volume: any `compose down` wipes the chain while the
  credential DB survives, silently invalidating old anchors (`anchorVerified=false`).

## 2. Approach (chosen)

**Backend-proxy chain view.** New read-only backend endpoints serve chain data;
the browser never talks to `:8545` directly (no ports/RPC in UI, no CORS work).

Rejected:
- Browser-direct RPC to `:8545` — leaks infra into the UI, violates the
  no-backend-details rule.
- Blockscout/ots explorer container — heavy infra for a dev chain.

## 3. Backend (additive, no logic changes)

| Endpoint | Response | Access |
|----------|----------|--------|
| `GET /api/verifier/chain/status` | `{chainId, latestBlock, anchoredCount}` via `eth_blockNumber` RPC + anchor count | public (`permitAll`) |
| `GET /api/verifier/anchors/recent?limit=20` | `[{credentialNumber, issuerName, blockNumber, anchoredAt}]`, newest first, from `CredentialAnchor` + `Credential` (no RPC) | public (`permitAll`) |

- Reuse existing `GET /api/verifier/anchor/{credentialNumber}` for lookup.
- `CredentialAnchorRepository`: add `findTop20ByOrderByAnchoredAtDesc` (derived query).
- Clamp `limit` to 1–100 server-side.
- No rate-limiter change (filter is POST-only).
- Anchoring/verification logic untouched.

## 4. Frontend (public, no login)

- **Result card:** restore "Independently recorded" section when `anchorTxHash`
  is present — truncated reference + copy button, block number, link to `/chain`.
  Plain language only.
- **New `/chain` page:** status cards (network, latest block, anchored total);
  lookup-by-reference form (existing anchor endpoint); recent-anchors table
  (reference → anchor lookup on the same page, institution, block, date).
- **Navbar:** public "Chain" link next to "Verify".
- Copy rules: truncated hashes with copy buttons; no ports, RPC URLs, chain-id
  internals, or endpoint names.

## 5. Anvil persistence

```yaml
anvil:
  command: ["--host", "0.0.0.0", "--state", "/data/state.json"]
  volumes:
    - ssdcve_anvil_data:/data
```

- `--state` loads on boot (if present) and dumps on graceful exit.
- Caveat: `kill -9` can lose the tail — acceptable for a dev chain.

## 6. Testing

- Backend: unit tests for `recent` ordering/limit clamp and `status` shape
  (mock `BlockchainAnchorService` + repositories, pattern follows
  `VerificationServiceTest`).
- Frontend: `npm run build` + leak grep.
- Live: Reticle drive of `/chain` (status renders, lookup works) and a verify
  result showing the anchor section — needs an anchored credential issued
  after the current Anvil start.

## 7. Open risks

- Credentials anchored before the current Anvil boot will report
  `anchorVerified=false` (chain was wiped). Re-anchoring old credentials is
  out of scope.
- Anvil is a dev node, not decentralized availability (per design doc §10).
