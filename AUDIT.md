# Unpledged — Full audit report

**Date:** 20 July 2026  
**Network:** Canton DevNet (Five North)  
**Package:** `3a6372bf939532634aa41b2abf1e3ae1f26960bf21c4cc4549cea9a2c9dc236d` (unpledged-0.0.1, LF 2.1, SDK 3.4.11)  
**Live:** https://unpledged.vercel.app  

---

## Executive summary

| Area | Status | Notes |
|------|--------|-------|
| Daml contracts | ✅ Complete | Privacy + encumbrance + double-pledge assert |
| Live DevNet UI | ✅ Demo-ready | All core routes wired to `realApi` |
| Double-pledge UX | ✅ Fixed (Jul 2026) | HTTP 400 shown as **Fraud prevented**, not crash |
| Transaction tree | ✅ Verified | Invoice nodes = 0 in Lender A projection |
| Vercel proxy | ✅ Fixed | `ledger-proxy` + rewrite (not broken catch-all) |
| README / docs | ✅ Overhauled | Research citations, Excalidraw, demo guides |
| Last automated verify | ⚠️ Intermittent | DevNet auth timeout at audit time — re-run when online |

**Verdict:** Submission-ready. Re-run `grant:act-as` + `verify:all` before any live session.

---

## 1. On-ledger (Daml)

| Flow | Status | Evidence |
|------|--------|----------|
| `Invoice` create | ✅ | `create:invoice`, SME + Debtor signatories |
| `ProveUnpledged` | ✅ | Summary attestation; lender observer only |
| `PreparePledge` | ✅ | SME-only; absent from lender tree projection |
| `CompleteFinancing` | ✅ | Orchestrates offer + pledge path |
| `RecordPledge` / `PledgeMarker` | ✅ | Encumbrance on canonical `invoiceRef` |
| Double-pledge block | ✅ | `assertMsg "Invoice already pledged"` |
| `daml/Test.daml` | ✅ | Script tests for privacy + duplicate pledge |

**Privacy invariant:** Lender is never an `Invoice` stakeholder. `PreparePledge` informees exclude lenders.

---

## 2. Frontend routes

| Route | Component | Live ledger | Demo video |
|-------|-----------|-------------|------------|
| `/` | `SplitScreenComparison` | ACS ×2, replay, tree | **Required** — privacy |
| `/blocked` | `DoublePledgeBlocked` | Replay + tree + Lighthouse | **Required** — fraud + tree |
| `/demo` | `LiveDemoFlowPage` | 5-step fresh invoice | Optional / backup |
| `/lender` | `LenderViewPage` | Attestation + Fund | Optional 30s |
| `/sme` | `SmeView` | Request financing | Optional |
| `/smoke` | `SmokeTestPage` | Diagnostics | **Do not show** |

---

## 3. API layer (`frontend/src/ledger/`)

| Function | Real path | Used by |
|----------|-----------|---------|
| `getLenderView` | ACS parallel queries | `/`, `/lender` |
| `attemptDoublePledgeLive` | Part B replay | `/`, `/blocked` |
| `getLenderFinancingTree` | `transaction-tree-by-id` | Tree inspector |
| `demoStep1`–`demoStep5` | Full flow | `/demo` |
| `requestFinancing` / `fundFinancingOffer` | SME / lender actions | `/sme`, `/lender` |

**Conventions:** ACS filters `#unpledged:…`; commands use full package-id hash; browser uses `/api/ledger` proxy; `userId` 6.

---

## 4. Infrastructure

| Piece | Status |
|-------|--------|
| `POST /api/token` | ✅ Server-side OAuth |
| `/api/ledger/*` → proxy | ✅ Vite + Vercel `ledger-proxy` |
| `frontend/vercel.json` rewrites | ✅ |
| `frontend/.env.production` | ✅ `VITE_USE_MOCKS=false` + parties |
| Token cache + 401 retry | ✅ `client.ts`, tree, heartbeat |
| `verify:prod` | ✅ Hosted smoke script |

---

## 5. Demo video coverage (see DEMO_VIDEO_REPORT.md)

| Beat | Must pass |
|------|-----------|
| Privacy A vs B | Lender B = 0 contracts |
| Double pledge | Lime banner / Invoice already pledged |
| Tree | Invoice nodes = 0 |
| Lighthouse | Party URLs open |
| Live badge | Not Mock mode |

---

## 6. Known limitations (acceptable)

1. **INV-001 already pledged** on shared DevNet — use replay + tree, not re-fund INV-001.
2. **Double-pledge replay** creates orphan `FinancingOffer` (matches CLI Part B) — rejection is the point.
3. **Reuters bot wall** — README uses GTR + DOJ + Banking Dive screenshots; Reuters linked as primary source text.
4. **CanActAs expires** — run `npm run grant:act-as` morning-of.
5. **DevNet availability** — occasional connect timeouts; retry verify scripts.
6. **`ws.ts`** — implemented, unused in UI.
7. **No CI** — manual `verify:*` scripts.

---

## 7. Pre-flight command block

```bash
cd frontend
npm run grant:act-as
npm run smoke:ledger
npm run verify:all
npm run verify:prod    # if filming production URL
```

---

## 8. Files added / updated (Jul 2026 docs pass)

| Path | Purpose |
|------|---------|
| `README.md` | Full pitch + research + architecture |
| `docs/architecture/unpledged-architecture.excalidraw` | Editable system diagram |
| `docs/research/*.png` | GTR, DOJ, Banking Dive screenshots |
| `DEMO_VIDEO_REPORT.md` | Video + reliability guide |
| `LiveDoublePledgeReplay.tsx` | Fraud-prevented UX (not error wall) |

---

See [README.md](./README.md) for setup, [DEMO_SCRIPT.md](./DEMO_SCRIPT.md) for narration.
