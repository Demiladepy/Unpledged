import { useEffect, useState } from 'react'
import { getAttestation, getLenderView } from '../ledger/api'
import { PARTIES } from '../ledger/mockData'
import type { LenderView, UnpledgedAttestation } from '../types/ledger'
import { IconBuilding, IconCheck } from './icons'

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function LenderViewPage() {
  const [view, setView] = useState<LenderView | null>(null)
  const [attestation, setAttestation] = useState<UnpledgedAttestation | null>(
    null,
  )
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
      <header className="mb-6">
        <p className="text-[10px] font-medium uppercase tracking-wider text-ink-500">
          Party view
        </p>
        <h2 className="text-xl font-semibold text-ink-100">
          Lender — {PARTIES.LENDER_A}
        </h2>
        <p className="mt-1 text-sm text-ink-400">
          Incoming requests funded against unpledged attestation summary only.
        </p>
      </header>

      {loading || !view ? (
        <p className="text-sm text-ink-500">Loading…</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="border border-surface-700">
            <div className="border-b border-surface-700 bg-surface-800 px-4 py-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-400">
                Pending offers
              </h3>
            </div>
            {view.pendingOffers.length === 0 ? (
              <p className="px-4 py-6 text-sm text-ink-500">
                No pending financing offers.
              </p>
            ) : (
              view.pendingOffers.map((offer) => (
                <div
                  key={offer.contractId}
                  className="border-b border-surface-700 px-4 py-3 last:border-b-0"
                >
                  <p className="font-mono text-sm text-ink-100">
                    {offer.contractId}
                  </p>
                  <p className="mt-1 text-xs text-ink-400">
                    Advance:{' '}
                    <span className="font-mono tabular-nums text-ink-200">
                      {formatCurrency(offer.advanceAmount)}
                    </span>
                  </p>
                  <button
                    type="button"
                    className="mt-3 bg-accent px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-ink-100 hover:bg-accent-muted"
                  >
                    Fund
                  </button>
                </div>
              ))
            )}
          </section>

          <section className="border border-accent/40">
            <div className="flex items-center gap-2 border-b border-surface-700 bg-accent-muted/20 px-4 py-2">
              <IconBuilding className="h-4 w-4 text-accent" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-200">
                Unpledged attestation
              </h3>
            </div>
            {attestation ? (
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 px-4 py-4">
                <div>
                  <dt className="text-[10px] uppercase tracking-wider text-ink-500">
                    Period
                  </dt>
                  <dd className="font-mono text-sm text-ink-100">
                    {attestation.periodStart} — {attestation.periodEnd}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-wider text-ink-500">
                    Settled count
                  </dt>
                  <dd className="font-mono text-sm tabular-nums text-ink-100">
                    {attestation.settledCount}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-wider text-ink-500">
                    Settled total
                  </dt>
                  <dd className="font-mono text-sm tabular-nums text-ink-100">
                    {formatCurrency(attestation.settledTotal)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-wider text-ink-500">
                    On time
                  </dt>
                  <dd className="flex items-center gap-1 text-sm text-positive">
                    {attestation.allSettledOnTime && (
                      <IconCheck className="h-4 w-4" />
                    )}
                    {attestation.allSettledOnTime ? 'Yes' : 'No'}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="px-4 py-6 text-sm text-ink-500">
                No attestation on file.
              </p>
            )}
            <p className="border-t border-surface-700 px-4 py-3 text-[11px] leading-relaxed text-ink-500">
              Underlying invoice fields are not disclosed. Lender sees derived
              summary only.
            </p>
          </section>
        </div>
      )}
    </div>
  )
}
