# Unpledged — Demo Video & Reliability Report

**Audience:** Claude (or any agent) preparing / recording / babysitting the demo video.  
**Product:** Confidential receivables financing on Canton DevNet (Five North).  
**Live app:** https://unpledged.vercel.app  
**Repo:** https://github.com/Demiladepy/Unpledged.git  
**Local:** `cd frontend && npm run dev` → http://localhost:5173  

**Goal of the video:** Prove three things live (not slides):  
1. Per-party privacy (ACS)  
2. Double-pledge refused by the ledger  
3. Commit-model privacy (transaction tree · Invoice nodes = 0)  

---

## 0. Critical: what looks like failure is often success

| What you see | Meaning | Action |
|--------------|---------|--------|
| HTTP **400** + `Invoice already pledged` after **Attempt second pledge** | **SUCCESS** — fraud blocked on-chain | Pause. Narrate: “The ledger refused it.” |
| Lime banner **Fraud prevented on-chain** | Correct UI after local fix | Keep filming |
| Giant red JSON dump of `DAML_FAILURE` | Old UI (or unexpected path) | Prefer lime banner UI; if only JSON, still narrate as win if cause is “Invoice already pledged” |
| Lender B = **0 contracts** | **SUCCESS** — privacy | Do not “fix” visibility |
| Tree: **Invoice nodes: 0** | **SUCCESS** — informee privacy | Highlight the 0 |
| `Mock mode` badge | **FAIL for recording** | Set `VITE_USE_MOCKS=false`, restart/redeploy |
| HTTP **403** / `PERMISSION_DENIED` / actAs | **Real fail** | Run `npm run grant:act-as` |
| Ledger **404** / proxy errors on Vercel | **Real fail** | Confirm `vercel.json` rewrite → `ledger-proxy`; env secrets set |

---

## 1. Demo video beat sheet (≤ 3 minutes)

Record on **production** if judges get the URL; otherwise localhost with **● LIVE on Canton DevNet** visible.

### Beat A — Hook (0:00–0:20) · optional slide
- Numbers: **$2.3B** First Brands · **$800M** Tricolor · **~$170M** JPM charge-off  
- Line: same invoice, multiple lenders, books they cannot share  

### Beat B — Product + live badge (0:20–0:35)
- Open **`/`** (or hosted root)  
- Must show: **● LIVE on Canton DevNet** + ledger heartbeat / offset  
- One line: prove unpledged without disclosing the book — on Canton  

### Beat C — Privacy (0:35–1:20) · REQUIRED
**URL:** `/`  

| Action | Expected |
|--------|----------|
| View as **Lender A** | Attestation / contracts visible (INV-001 context) |
| View as **Lender B** | **0 contracts** · no visibility |
| Optional: click switcher live on camera | ACS re-query as new party |

**Line:** “Same query. Different party. Different reality. Privacy is on the ledger.”

### Beat D — Live fraud rejection (1:20–1:55) · REQUIRED
**URL:** `/blocked` (or home embed of replay)  

1. Click **Attempt second pledge (live)**  
2. Wait for completion (do not talk over the wait)  
3. **Expected win state:**  
   - Lime: **Fraud prevented on-chain**  
   - **Ledger refused · Invoice already pledged**  
   - HTTP 400 · **BLOCKED (expected)**  
   - PledgeMarker count **unchanged**  
4. **Line:** “Not my app — the ledger. Double-pledge is structurally impossible here.”

**Do not** treat this as a bug. Do not retry endlessly on camera.

### Beat E — Transaction tree (1:55–2:25) · REQUIRED (Daml judges)
**URL:** `/blocked` → **Transaction tree inspector**  

| Check | Expected |
|-------|----------|
| Stamp | **Verified against DevNet** (not Mock) |
| Invoice nodes in Lender A’s view | Giant **0** |
| Visible nodes | AcceptFinancing / RecordPledge / PledgeMarker (financing mechanics) |
| Line | “The privacy isn’t in the interface. It’s in the commit model.” |

Click **Refresh from ledger** once before the shot if timestamp should look fresh.

### Beat F — Independent verify (2:25–2:45)
**URL:** `/blocked` Lighthouse links  

Open (or show) party pages:

- Lender A: https://lighthouse.devnet.cantonloop.com/party/LenderA%3A%3A1220a14ca128063b8dc9d1ebb0bd22633be9f2168500f4dbc1ecaeb1855b14e5acf8  
- SME: https://lighthouse.devnet.cantonloop.com/party/SME%3A%3A1220a14ca128063b8dc9d1ebb0bd22633be9f2168500f4dbc1ecaeb1855b14e5acf8  
- Lender B: https://lighthouse.devnet.cantonloop.com/party/LenderB%3A%3A1220a14ca128063b8dc9d1ebb0bd22633be9f2168500f4dbc1ecaeb1855b14e5acf8  

**Line:** “Don’t trust the screen. Check the ledger.”

### Beat G — Close (2:45–3:00)
- Canton roadmap: **public verifiability for private transactions**  
- End card: **https://unpledged.vercel.app** + repo  

### Optional (only if time / backup)
- **`/demo`** — full create → attest → finance → block on a **fresh** `INV-DEMO-*` invoice (longer; use if INV-001 path is broken)  
- Do **not** rely on `/sme` Fund of INV-001 again — already pledged  

---

## 2. Routes map (what exists)

| Path | Role in video |
|------|----------------|
| `/` | Privacy switcher + ACS · replay + tree (compact) |
| `/blocked` | **Primary deep dive:** replay + full tree + Lighthouse |
| `/demo` | Fresh happy path (backup / thorough) |
| `/sme` · `/lender` | Optional workflow; not required for core 3-min |
| `/smoke` | Diagnostics only — **do not show in video** |

---

## 3. Pre-flight — must pass before Record

Run from `frontend/` with `.env` (`VITE_USE_MOCKS=false`, party IDs) and `.env.server` (`CANTON_CLIENT_SECRET`).

### 3.1 Morning-of / pre-record commands

```bash
cd frontend

# 1) Restore CanActAs for user 6 (vanishes on DevNet — #1 real demo killer)
npm run grant:act-as

# 2) Token + basic ledger
npm run smoke:ledger

# 3) Privacy ACS + tree (core video proofs)
npm run verify:all
# = verify:live-ui && verify:tree
# Expect: Lender A has data, Lender B empty; Invoice nodes in Lender A view: 0

# 4) Optional full happy path on FRESH invoice
npm run verify:demo-flow

# 5) Production URL (if filming hosted)
npm run verify:prod
```

### 3.2 Manual UI checklist (hard refresh)

- [ ] Badge: **● LIVE on Canton DevNet** (not Mock)  
- [ ] `/` Lender A: attestation present  
- [ ] `/` Lender B: **0 contracts**  
- [ ] `/blocked` → Attempt second pledge → **Fraud prevented** / Invoice already pledged  
- [ ] Tree: **Invoice nodes: 0** · stamp **Verified against DevNet**  
- [ ] Lighthouse Lender A opens in a tab  

### 3.3 Production / Vercel

- Root Directory: **`frontend`**  
- `VITE_USE_MOCKS=false`  
- `VITE_PARTY_*` for SME, Debtor, LenderA, LenderB  
- Server: `CANTON_CLIENT_SECRET` (+ auth URL / client id / audience / scope)  
- Proxy: `/api/ledger/(.*)` → `ledger-proxy` (not broken catch-all)  
- After UI fixes (lime fraud banner): **redeploy** before filming production  

---

## 4. Failure modes & recovery

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| 403 / cannot act as party | `CanActAs` expired for user `6` | `npm run grant:act-as` |
| Mock mode / fake data | `VITE_USE_MOCKS` not false | Set false; restart `npm run dev` / rebuild Vercel |
| Token / 500 on `/api/token` | Missing `CANTON_CLIENT_SECRET` | Fill `.env.server` or Vercel secrets |
| LEDGER CALL FAILED / NOT_FOUND nested paths | Old Vercel catch-all API | Confirm `api/ledger-proxy.ts` + `vercel.json` rewrite |
| Tree error / wrong update | Bad `VITE_COMPLETE_FINANCING_UPDATE_ID` | Use default in `config.ts` or set a known CompleteFinancing updateId |
| Fund INV-001 fails | Already pledged | Expected — use **double-pledge replay**, not re-fund |
| Double-pledge “UNEXPECTED SUCCESS” | Registry / invoice state wrong | Re-run `create:financing` Part A or use `/demo` fresh invoice |
| Orphan FinancingOffers after replay | By design (Part B creates offer then fails CompleteFinancing) | Ignore; do not apologize on camera |
| Privacy: Lender B sees data | Wrong party IDs or mock | Check `VITE_PARTY_LENDER_B`; re-verify ACS |
| Dev server wrong port | 5173 in use | Use printed Vite URL; update bookmarks |

---

## 5. What Claude must NOT do during video prep

1. **Do not** “fix” HTTP 400 `Invoice already pledged` — that is the product.  
2. **Do not** change Daml / package ID mid-demo day without re-verifying everything.  
3. **Do not** film `/smoke` or Diag.  
4. **Do not** use mock mode for the recorded take.  
5. **Do not** spend video time creating INV-001 from scratch unless `/` privacy is broken — prefer replay + tree.  
6. **Do not** push from agent shell if user rules say user-terminal-only for push (user credentials).  

---

## 6. Narration cheat sheet (copy for voiceover)

1. Hook — First Brands / Tricolor / same invoice, invisible books.  
2. Gap — Canton: prove unpledged without the honeypot.  
3. Privacy — Lender A sees attestation; Lender B sees zero. Same ACS query, different party.  
4. Fraud — Attempt second pledge live → ledger refuses → Invoice already pledged.  
5. Tree — Lender A’s CompleteFinancing projection: **0 Invoice nodes**. Commit model, not UI.  
6. Verify — Lighthouse / live URL.  
7. Close — Public verifiability for private transactions. Unpledged. Live URL.  

---

## 7. On-ledger architecture (why the demos work)

- **Parties:** SME, Debtor, LenderA, LenderB (`VITE_PARTY_*`)  
- **Package ID:** `3a6372bf…` (`frontend/src/ledger/packageId.ts`)  
- **ProveUnpledged** → attestation summary to lender (not full invoice)  
- **CompleteFinancing** → AcceptFinancing → **RecordPledge** → PledgeMarker  
- **RecordPledge** asserts invoice not already pledged → second attempt = `AssertionFailed`  
- Lender is **not** Invoice stakeholder → tree projection omits Invoice nodes  

---

## 8. Pass / fail scoreboard for “everything doesn’t fail”

Before pressing Record, all of these must be green:

| # | Check | Pass criteria |
|---|--------|----------------|
| 1 | `grant:act-as` | Completes without error |
| 2 | `smoke:ledger` | Token + ledger-end OK |
| 3 | `verify:live-ui` | A has visibility, B empty |
| 4 | `verify:tree` | Invoice nodes in Lender A view: **0** |
| 5 | UI badge | LIVE on Canton DevNet |
| 6 | Double-pledge click | Blocked / Invoice already pledged (lime or clear HTTP 400 cause) |
| 7 | Hosted (if used) | `verify:prod` ALL PASS · same UI checks |

If 1–6 pass, the **core video cannot fail** for product reasons. Remaining risk is only narration timing and network blips — mitigate by one dry-run click of double-pledge 2 minutes before Record.

---

## 9. Related docs in repo

- [DEMO_SCRIPT.md](./DEMO_SCRIPT.md) — timed spoken script  
- [SUBMISSION.md](./SUBMISSION.md) — judge / form brief  
- [AUDIT.md](./AUDIT.md) — codebase status  
- [README.md](./README.md) — setup  

---

## 10. One-line instruction for Claude

**Film `/` privacy (A vs B = 0) → `/blocked` live second pledge (expect ledger refuse / Invoice already pledged — celebrate it) → tree Invoice nodes = 0 → Lighthouse + live URL. Pre-flight: `grant:act-as` then `verify:all`. Never treat the double-pledge HTTP 400 as a bug.**
