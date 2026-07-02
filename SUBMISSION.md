# Unpledged — submission brief

Use this when writing your submission form, finale pitch, or judge follow-up.

---

## Live URL checklist (verify before submitting)

- [ ] Root directory on Vercel: **`frontend`**
- [ ] Build command: `npm run build` · Output: `dist`
- [ ] Environment variables set (Production):
  - `VITE_USE_MOCKS` = `false`
  - `VITE_CANTON_USER_ID` = `6`
  - `VITE_PARTY_SME`, `VITE_PARTY_DEBTOR`, `VITE_PARTY_LENDER_A`, `VITE_PARTY_LENDER_B`
  - `VITE_COMPLETE_FINANCING_UPDATE_ID` (optional — has default)
  - `CANTON_CLIENT_SECRET` (server — **required**)
  - `CANTON_AUTH_TOKEN_URL`, `CANTON_CLIENT_ID`, `CANTON_TOKEN_AUDIENCE`, `CANTON_TOKEN_SCOPE`
  - `CANTON_LEDGER_REST_URL` or `VITE_CANTON_LEDGER_URL`
- [ ] Open hosted URL → header shows **● LIVE on Canton DevNet** + **offset** heartbeat
- [ ] **View as** → Lender A shows attestation · Lender B shows **0 contracts**
- [ ] **Attempt second pledge (live)** → HTTP 400 `Invoice already pledged`
- [ ] Transaction tree → **Invoice nodes: 0**

Repo includes `frontend/vercel.json` + `frontend/api/token.ts` + `frontend/api/ledger/[...path].ts` for serverless proxy.

---

## The argument: why this is not "another nice demo"

Most teams in a Canton field will show **one** of these. You show **all five**, on **live DevNet**, on a **URL the judge can click**:

| What judges see elsewhere | What Unpledged does |
|---------------------------|---------------------|
| "We designed privacy" (slide) | Judge **switches party** — Lender B's ACS goes empty on their click |
| "Double-pledge would be blocked" (architecture diagram) | Judge clicks **Attempt second pledge** — ledger returns HTTP 400 **while they watch** |
| "Lender doesn't see the invoice" (claim) | **Transaction-tree inspector** — 0 Invoice nodes in Lender A's commit projection, live query by updateId |
| Screen recording of localhost | **Hosted URL** + heartbeat showing real ledger offset |
| Mock data / canned screenshots | Same code path as CLI scripts — `verify:all` passes on DevNet |

**The structural insight you own:** First Brands / Tricolor failed because lenders couldn't see each other's books. Every legacy fix needs a central data honeypot. Canton offers a third path — **prove unpledged without disclosing the book** — and you've **shipped it on the network that's judging you**.

---

## The 10-second judge test

Glance at the hero for 3 seconds:

1. **Left:** `1 attestation` (lime)
2. **Right:** `0 contracts` (denied)
3. **Badge:** LIVE on Canton DevNet + ledger offset

If they get "same ledger, different party, real privacy" without reading — the UI is done.

Then hand them the URL: **"Switch to Lender B yourself."** That moment is the finale.

---

## Demo arc (all on-screen, all real)

| Beat | Screen | Proof type |
|------|--------|------------|
| Privacy | `/` party switcher + split | ACS per party |
| Fraud blocked | Live double-pledge replay | Command rejection |
| Commit privacy | Transaction-tree inspector | Informee model |
| Independent verify | Lighthouse links | Third-party explorer |
| Close | "Public verifiability for private transactions" | Canton roadmap alignment |

Script: [DEMO_SCRIPT.md](./DEMO_SCRIPT.md)

---

## What NOT to apologize for

- Orphan `FinancingOffer`s after replay — matches CLI Part B; rejection is the point
- No CI / `ws.ts` unused — irrelevant to judges
- INV-001 already pledged on shared DevNet — use replay + tree, not re-fund

---

## One-line pitch

**Unpledged: confidential receivables financing on Canton DevNet — per-party privacy you can click, double-pledge fraud the ledger refuses live, and commit-model privacy verified in the transaction tree. Not a mock. Here's the URL.**
