# Unpledged — codebase audit

**Date:** June 2026 · **Network:** Canton DevNet (Five North) · **Package:** `3a6372bf939532634aa41b2abf1e3ae1f26960bf21c4cc4549cea9a2c9dc236d`

## Executive summary

The project is **demo-ready on live DevNet**. Core privacy, financing, and double-pledge proofs are implemented on-ledger and surfaced in the UI. This audit documents what is complete, what was wired in the latest pass, and remaining limitations.

---

## 1. Daml / on-ledger

| Template / flow | Status | Evidence |
|-----------------|--------|----------|
| `Invoice` + `PreparePledge` | Live | `create:invoice`, SME stakeholder only on prepare |
| `UnpledgedAttestation` | Live | `create:attestation`, summary fields only |
| `FinancingCoordinator.CompleteFinancing` | Live | `create:financing` Part A |
| `PledgeMarker` | Live | Lender A ACS after financing |
| `PledgeRegistry` duplicate block | Live | Part B + `attemptDoublePledgeLive` |
| Lender A tx-tree privacy | Live | `verify:tree` — 0 Invoice nodes in projection |
| `daml/Test.daml` | Present | Script-level privacy + double-pledge tests |

**Privacy model:** Lender is never an `Invoice` stakeholder. `PreparePledge` runs under SME-only informees and is absent from Lender A's transaction-tree projection.

---

## 2. Frontend routes

| Route | Component | Ledger calls | Demo role |
|-------|-----------|--------------|-----------|
| `/` | `SplitScreenComparison` | `getLenderView` ×2, `listPledgeMarkers` | Privacy proof |
| `/` | `LiveDoublePledgeReplay` | `attemptDoublePledgeLive`, `listPledgeMarkers` | Live fraud rejection |
| `/` | `TransactionTreeInspector` | `getLenderFinancingTree` | Commit-model privacy |
| `/sme` | `SmeView` | `listInvoices`, `listFinancingRequests`, **`requestFinancing`** | SME workflow |
| `/lender` | `LenderViewPage` | `getLenderView`, `getAttestation`, **`fundFinancingOffer`** | Lender workflow |
| `/blocked` | `DoublePledgeBlocked` | Replay + tree + Lighthouse | Deep-dive page |
| `/smoke` | `SmokeTestPage` | `smokeTestLedgerEnd` | Diagnostics |

---

## 3. Ledger API layer (`frontend/src/ledger/api.ts`)

All exports support **mock** (`VITE_USE_MOCKS=true`) and **real** (`false`) paths.

| Function | Real implementation | UI wired |
|----------|---------------------|----------|
| `listInvoices` | ACS `#unpledged:Invoice:Invoice` | `/sme` |
| `getAttestation` | ACS attestation | `/lender` |
| `createFinancingOffer` | `submit-and-wait` package-id | via `requestFinancing` |
| `acceptFinancing` | `CompleteFinancing` actAs SME | via `fundFinancingOffer` |
| `requestFinancing` | High-level SME → offer | `/sme` button |
| `fundFinancingOffer` | High-level lender → pledge | `/lender` button |
| `getLenderView` | Parallel ACS queries | `/`, `/lender` |
| `listFinancingRequests` | Invoices + pledge markers | `/sme` |
| `attemptDoublePledgeLive` | Part B replay with progress | Replay component |
| `getLenderFinancingTree` | `transaction-tree-by-id` | Inspector |
| `getDoublePledgeAttempt` | Metadata from live markers | `/blocked` context card |

**Conventions (do not break):**
- ACS queries: `#unpledged:Module:Template`
- Commands: full package-id hash
- Browser: `/api/ledger` proxy (CORS)
- `userId`: `6`

---

## 4. Infrastructure

| Piece | Status |
|-------|--------|
| Vite token proxy (`POST /api/token`) | Working |
| Vite ledger proxy (`/api/ledger`) | Working |
| Ledger-end cache (10s TTL) | In `realApi.ts` |
| Party allocation CLI | `allocate:parties` |
| Act-as grant | `grant:act-as` |
| Canton MCP (Cursor) | `.cursor/mcp.json`, `npm run mcp:verify` |

---

## 5. Gaps closed (latest wiring pass)

| Gap | Resolution |
|-----|------------|
| SME "Request financing" button inert | Wired to `requestFinancing` |
| Lender "Fund" button inert | Wired to `fundFinancingOffer` |
| Missing `home-bg.png` (broken import) | CSS gradient hero background |
| `partiesConfigured()` unused | `LiveBadge` + `/smoke` diagnostics |
| Inspector stamp in mock mode misleading | "Mock projection" vs "Verified against DevNet" |
| Verify scripts without npm aliases | `verify:live-ui`, `verify:tree`, `verify:all` |
| No root README | `README.md` + this audit |
| `vite-env.d.ts` incomplete | All `VITE_PARTY_*` typed |

---

## 6. Remaining limitations

1. **Shared DevNet state** — INV-001 is already financed; funding it again fails (expected). Double-pledge replay is the intended live demo for INV-001.
2. **`ws.ts`** — implemented, not used in UI.
3. **No CI** — verification is manual via npm scripts.
4. **No DAR deploy docs** — package ID is pinned; redeploy requires `daml build` + upload + refresh `packageId.ts`.
5. **Each double-pledge replay** creates an orphan `FinancingOffer` (matches CLI Part B).

---

## 7. Pre-demo checklist

- [ ] `frontend/.env` — `VITE_USE_MOCKS=false`, all `VITE_PARTY_*` set
- [ ] `frontend/.env.server` — `CANTON_CLIENT_SECRET` set
- [ ] `npm run dev` running
- [ ] `npm run verify:all` passes
- [ ] Hard refresh `/` — Lender A attestation, Lender B empty
- [ ] Test double-pledge button once before recording
- [ ] Transaction tree shows **Invoice nodes: 0**

See [DEMO_SCRIPT.md](./DEMO_SCRIPT.md) for narration and timing.
