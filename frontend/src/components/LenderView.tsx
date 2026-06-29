import { useEffect, useState } from 'react'
import { getAttestation, getLenderView } from '../ledger/api'
import { PARTIES, partyDisplayName } from '../ledger/parties'
import type { LenderView, UnpledgedAttestation } from '../types/ledger'
import { CopyableId } from './CopyableId'
import { PageHeader } from './PageHeader'

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function LenderViewPage() {
  const [view, setView] = useState<LenderView | null>(null)
  const [attestation, setAttestation] = useState<UnpledgedAttestation | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const lenderView = await getLenderView(PARTIES.LENDER_A)
      const att = await getAttestation(PARTIES.LENDER_A)
      if (!cancelled) {
        setView(lenderView)
        setAttestation(att)
        setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div>
      <PageHeader
        eyebrow="Party view"
        title={`Lender — ${partyDisplayName(PARTIES.LENDER_A)}`}
        lead="Financing decisions based on attestation summary only. No invoice line items, amounts per invoice, or debtor fields are disclosed."
      />

      <div className="mb-8">
        <CopyableId value={PARTIES.LENDER_A} label="Party ID" />
      </div>

      {loading || !view ? (
        <p className="text-sm text-ink-muted">Loading…</p>
      ) : (
        <div className="grid gap-px border border-white/10 bg-white/10 lg:grid-cols-2">
          <section className="bg-bg-pane">
            <div className="border-b border-white/10 px-6 py-4">
              <h3 className="text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                Pending offers
              </h3>
            </div>
            {view.pendingOffers.length === 0 ? (
              <p className="px-6 py-10 text-sm text-ink-muted">No pending financing offers.</p>
            ) : (
              view.pendingOffers.map((offer) => (
                <div
                  key={offer.contractId}
                  className="border-b border-white/[0.06] px-6 py-5 last:border-b-0"
                >
                  <CopyableId value={offer.contractId} label="Offer CID" />
                  <p className="mt-4 text-xs text-ink-muted">
                    Advance
                  </p>
                  <p className="font-mono text-lg text-lime">
                    {formatCurrency(offer.advanceAmount)}
                  </p>
                  <button type="button" className="btn-lime mt-5">
                    Fund
                  </button>
                </div>
              ))
            )}
          </section>

          <section className="bg-bg-pane">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <h3 className="text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                Unpledged attestation
              </h3>
              <span className="visibility-granted">Summary only</span>
            </div>
            {attestation ? (
              <dl className="px-6 py-2">
                <div className="data-row">
                  <dt className="data-label">Period</dt>
                  <dd className="font-mono text-sm text-ink-100">
                    {attestation.periodStart} — {attestation.periodEnd}
                  </dd>
                </div>
                <div className="data-row">
                  <dt className="data-label">Settled count</dt>
                  <dd className="font-mono text-sm text-ink-100">
                    {attestation.settledCount}
                  </dd>
                </div>
                <div className="data-row">
                  <dt className="data-label">Settled total</dt>
                  <dd className="font-mono text-sm text-lime">
                    {formatCurrency(attestation.settledTotal)}
                  </dd>
                </div>
                <div className="data-row">
                  <dt className="data-label">On time</dt>
                  <dd className="font-mono text-sm text-ink-100">
                    {attestation.allSettledOnTime ? 'TRUE' : 'FALSE'}
                  </dd>
                </div>
                <div className="border-t border-white/[0.06] py-5">
                  <CopyableId value={attestation.contractId} label="Attestation CID" />
                </div>
              </dl>
            ) : (
              <p className="px-6 py-10 text-sm text-ink-muted">No attestation on file.</p>
            )}
            <p className="border-t border-white/10 px-6 py-4 text-xs leading-relaxed text-ink-dim">
              Invoice fields not in scope for this party. Derived aggregate only.
            </p>
          </section>
        </div>
      )}
    </div>
  )
}
