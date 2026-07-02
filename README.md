# Unpledged

Confidential receivables financing on **Canton DevNet** (Five North). Prove an invoice is unpledged without disclosing the book; block double-pledge at commit; verify privacy via per-party transaction-tree projection.

## Architecture

```
Browser (React)
  ├─ POST /api/token          → OAuth client_credentials (secrets in .env.server)
  └─ /api/ledger/*            → Vite proxy → Five North JSON Ledger API v2

Daml (LF 2.1, SDK 3.4.11)
  Invoice · Attestation · FinancingCoordinator · PledgeRegistry · PledgeMarker
```

## Quick start (live DevNet)

```bash
cd frontend
cp .env.example .env
cp .env.server.example .env.server   # add CANTON_CLIENT_SECRET

npm install
npm run allocate:parties
npm run grant:act-as
npm run create:invoice
npm run create:attestation
npm run create:financing

# Set VITE_USE_MOCKS=false in .env (allocate:parties writes party IDs)
npm run dev
```

Open `http://localhost:5173`. See [DEMO_SCRIPT.md](./DEMO_SCRIPT.md) for the 3-minute demo flow. Full audit: [AUDIT.md](./AUDIT.md).

## Routes

| Path | Purpose |
|------|---------|
| `/` | Split-screen privacy (Lender A vs B ACS), live double-pledge replay, transaction-tree inspector |
| `/sme` | SME portfolio — **Request financing** creates `FinancingOffer` on ledger |
| `/lender` | Lender A — **Fund** runs SME `CompleteFinancing` |
| `/blocked` | Double-pledge narrative + live replay + tree inspector + Lighthouse |
| `/demo` | **Full happy-path flow** — fresh invoice create → attest → finance → block |
| `/smoke` | Token + ledger-end diagnostics |

## Verification

```bash
cd frontend
npm run smoke:ledger
npm run verify:demo-flow       # Full happy path on fresh invoice
npm run verify:all
npx tsx server/verifyBrowserUi.ts http://localhost:5173   # dev server must be running
```

## MCP (Cursor)

```bash
npm run mcp:verify   # from repo root
```

Enable **canton-dev** in Cursor MCP settings (`.cursor/mcp.json`).

## Deploy (Vercel)

1. Import repo · set **Root Directory** to `frontend`
2. Add env vars from [SUBMISSION.md](./SUBMISSION.md) checklist (`CANTON_CLIENT_SECRET` + `VITE_PARTY_*` + `VITE_USE_MOCKS=false`)
3. Deploy — serverless routes in `frontend/api/` proxy token + ledger
4. Verify hosted URL against checklist in SUBMISSION.md

