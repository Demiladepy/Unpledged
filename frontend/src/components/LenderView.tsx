import { useEffect, useState } from 'react'
import { getAttestation, getLenderView } from '../ledger/api'
import { PARTIES, partyDisplayName } from '../ledger/parties'
import type { LenderView, UnpledgedAttestation } from '../types/ledger'
import { IconBuilding, IconCheck } from './icons'
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
        lead="Incoming requests funded against unpledged attestation summary only."
      />

      {loading || !view ? (
        <p className="text-sm text-ink-500">Loading…</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="card overflow-hidden">
            <div className="border-b border-white/8 px-5 py-3">
              <h3 className="text-sm font-medium text-ink-200">Pending offers</h3>
            </div>
            {view.pendingOffers.length === 0 ? (
              <p className="px-5 py-8 text-sm text-ink-500">No pending financing offers.</p>
            ) : (
              view.pendingOffers.map((offer) => (
                <div
                  key={offer.contractId}
                  className="border-b border-white/6 px-5 py-4 last:border-b-0"
                >
                  <p className="font-mono text-xs text-ink-300">{offer.contractId}</p>
                  <p className="mt-1 text-sm text-ink-400">
                    Advance:{' '}
                    <span className="tabular-nums text-ink-200">
                      {formatCurrency(offer.advanceAmount)}
                    </span>
                  </p>
                  <button type="button" className="btn-primary mt-3">
                    Fund
                  </button>
                </div>
              ))
            )}
          </section>

          <section className="card card-accent overflow-hidden">
            <div className="flex items-center gap-2 border-b border-white/8 bg-accent-soft/30 px-5 py-3">
              <IconBuilding className="h-4 w-4 text-accent-bright" />
              <h3 className="text-sm font-medium text-ink-100">Unpledged attestation</h3>
            </div>
            {attestation ? (
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4 px-5 py-5">
                <div>
                  <dt className="label-muted">Period</dt>
                  <dd className="mt-1 font-mono text-sm text-ink-100">
                    {attestation.periodStart} — {attestation.periodEnd}
                  </dd>
                </div>
                <div>
                  <dt className="label-muted">Settled count</dt>
                  <dd className="mt-1 text-sm tabular-nums text-ink-100">
                    {attestation.settledCount}
                  </dd>
                </div>
                <div>
                  <dt className="label-muted">Settled total</dt>
                  <dd className="mt-1 text-sm tabular-nums text-ink-100">
                    {formatCurrency(attestation.settledTotal)}
                  </dd>
                </div>
                <div>
                  <dt className="label-muted">On time</dt>
                  <dd className="mt-1 flex items-center gap-1 text-sm font-medium text-positive">
                    {attestation.allSettledOnTime && <IconCheck className="h-4 w-4" />}
                    {attestation.allSettledOnTime ? 'Yes' : 'No'}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="px-5 py-8 text-sm text-ink-500">No attestation on file.</p>
            )}
            <p className="border-t border-white/6 px-5 py-3 text-xs leading-relaxed text-ink-500">
              Underlying invoice fields are not disclosed. Lender sees derived summary only.
            </p>
          </section>
        </div>
      )}
    </div>
  )
}
