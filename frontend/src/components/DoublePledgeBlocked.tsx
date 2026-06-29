import { useEffect, useState } from 'react'
import { getDoublePledgeAttempt } from '../ledger/api'
import type { DoublePledgeAttempt } from '../types/ledger'
import { CopyableId } from './CopyableId'
import { PageHeader } from './PageHeader'

export function DoublePledgeBlocked() {
  const [attempt, setAttempt] = useState<DoublePledgeAttempt | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const data = await getDoublePledgeAttempt()
      if (!cancelled) {
        setAttempt(data)
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
        eyebrow="Encumbrance control"
        title="Double-pledge blocked"
        lead="Second financing attempt on an already-pledged invoice rejected at commit."
      />

      {loading || !attempt ? (
        <p className="text-sm text-ink-muted">Loading…</p>
      ) : (
        <div className="pane">
          <div className="border-b border-white/10 px-6 py-5">
            <p className="font-display text-sm font-semibold uppercase tracking-[0.1em] text-lime">
              Fraud prevented on-chain
            </p>
            <p className="mt-2 text-sm text-ink-muted">
              PledgeRegistry rejected duplicate pledge on canonical invoice ref
            </p>
          </div>

          <dl className="grid gap-0 px-6 sm:grid-cols-2">
            <div className="data-row sm:col-span-1">
              <dt className="data-label">Invoice</dt>
              <dd className="font-mono text-sm text-ink-100">{attempt.invoiceNumber}</dd>
            </div>
            <div className="data-row sm:col-span-1">
              <dt className="data-label">Status</dt>
              <dd className="font-mono text-sm text-negative">
                {attempt.blocked ? 'BLOCKED' : 'ALLOWED'}
              </dd>
            </div>
            <div className="border-b border-white/[0.06] py-5 sm:col-span-2">
              <CopyableId value={attempt.lender} label="Attempting lender" />
            </div>
            <div className="border-b border-white/[0.06] py-5 sm:col-span-2">
              <p className="data-label mb-2">Canonical ref</p>
              <CopyableId value={attempt.invoiceRef || '—'} />
            </div>
            <div className="data-row sm:col-span-1">
              <dt className="data-label">Timestamp</dt>
              <dd className="font-mono text-xs text-ink-muted">{attempt.attemptedAt}</dd>
            </div>
          </dl>

          <div className="border-t border-white/10 px-6 py-5">
            <p className="data-label mb-1">On-chain rejection (expected)</p>
            <p className="mb-3 text-xs text-ink-dim">
              Recorded when a second pledge was attempted on DevNet — the ledger
              correctly refused it. This is the demo proof, not an app error.
            </p>
            <pre className="terminal-block text-negative">{attempt.reason}</pre>
          </div>
        </div>
      )}
    </div>
  )
}
