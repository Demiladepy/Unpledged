# UNPLEDGED — 3-minute demo script

**Delivery notes:** calm, precise, institutional. You're not a hackathon kid showing a toy — you're showing capital-markets infrastructure. Let the live moments breathe. Don't rush the silences after the ledger refuses; that's when it lands.

---

## [0:00–0:15] — The hook: real money, real fraud, this year

> "In 2025, First Brands collapsed with 2.3 billion dollars in fabricated and double-pledged invoices. Weeks later, Tricolor — 800 million, the same fraud. JPMorgan alone took a 170 million dollar charge-off. The mechanism was identical in every case: the same invoice, pledged to multiple lenders who couldn't see each other's books."

**On screen:** dark slide, three figures — $2.3B, $800M, $170M — appearing in lime as you say them. No stock photos. Just the numbers.

---

## [0:15–0:35] — The gap nobody can close

> "Lenders can't share their books — it's confidential, they're competitors. So no one can verify whether an invoice is already financed. Every existing solution needs a central party to hold everyone's data. On Canton, there's a third option: prove an invoice is unpledged without anyone ever seeing the book. This is Unpledged."

**On screen:** transition to your app's hero. The live badge **● LIVE on Canton DevNet** visible.

---

## [0:35–1:20] — The live proof (this is the heart — 45 seconds, let it run)

> "Here's one invoice on Canton DevNet — real, live, right now. An SME owns it with its debtor. It seeks financing from two competing lenders, A and B."

> "Lender A receives a proof: this invoice is unpledged — one settled receivable, a thousand dollars, January 2026. A summary. Not the invoice."

> "Lender B is looking at the same invoice on the same ledger — and sees nothing. Zero contracts. This isn't the UI hiding it. This is the same query, run as each lender, against the real ledger."

**On screen:** `/` split-screen. Lender A populated, Lender B **NO VISIBILITY · 0 contracts**. Footer: same query path, different party.

> "Same query. Different party. Different reality. That's Canton's privacy, on-chain."

---

## [1:20–1:50] — The wow: live fraud rejection (30 seconds — the fearless moment)

> "Now watch the fraud attempt. Lender A has financed this invoice. I'll now try — live — to pledge the exact same invoice a second time."

**Action:** Navigate to `/blocked` → click **Attempt second pledge (live)**. Pause. Wait for the lime **Fraud prevented on-chain · Ledger refused · Invoice already pledged** banner (HTTP 400 is the win). **Do not talk over it. Do not treat this as an error.**

> "The ledger refused it. Not my app — the ledger. The double-pledge that cost First Brands 2.3 billion dollars is structurally impossible here. That rejection just happened, live, on Canton."

Full beat sheet + pre-flight: [DEMO_VIDEO_REPORT.md](./DEMO_VIDEO_REPORT.md).

---

## [1:50–2:20] — The knockout: the commit-model privacy (for the judges who know Daml)

> "And here's what makes this Canton-native, not a UI trick. This is Lender A's actual view of the financing transaction — the transaction tree, pulled from the ledger."

**On screen:** `/blocked` transaction tree panel. Highlight: AcceptFinancing, RecordPledge, PledgeMarker — **Invoice nodes: 0**.

> "Lender A sees the financing mechanics. What Lender A does not see — anywhere in this transaction — is the invoice. Zero invoice nodes. The step that touches it runs under the SME's authority alone. The privacy isn't in the interface. It's in the commit model."

---

## [2:20–2:45] — Independent verification (the credibility close)

> "You don't have to trust my screen. Every contract is on Canton DevNet, visible in the Lighthouse explorer. Here are the links — verify the privacy contrast yourself."

**On screen:** `/blocked` Lighthouse links (SME, Lender A, Lender B).

---

## [2:45–3:00] — The close (tie it to Canton's own words)

> "Canton's public roadmap names one goal: public verifiability for private transactions. Confidential receivables financing, with fraud made structurally impossible. Nobody has shipped it. We did — live, on DevNet, today. This is Unpledged."

---

## Pre-flight checklist

- [ ] `cd frontend && npm run dev` — note the port (5173 or 5174)
- [ ] Hard refresh `/` — Lender A shows attestation, Lender B shows 0
- [ ] `/blocked` — tree loads with **Invoice nodes: 0**
- [ ] Test **Attempt second pledge (live)** once before recording
- [ ] Lighthouse links open in a tab for the close
