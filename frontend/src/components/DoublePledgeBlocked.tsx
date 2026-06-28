import { useEffect, useState } from 'react'
import { getDoublePledgeAttempt } from '../ledger/api'
import type { DoublePledgeAttempt } from '../types/ledger'
import { IconLock, IconX } from './icons'
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
        <p className="text-sm text-ink-500">Loading…</p>
      ) : (
        <div className="card overflow-hidden border-negative/25">
          <div className="flex items-center gap-4 border-b border-negative/20 bg-negative/10 px-5 py-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-negative/15 ring-1 ring-negative/25">
              <IconX className="h-5 w-5 text-negative" />
            </div>
            <div>
              <p className="label-muted text-negative">Transaction rejected</p>
              <p className="text-lg font-semibold text-ink-100">
                Pledge blocked — duplicate pledge
              </p>
            </div>
          </div>

          <dl className="grid gap-5 px-5 py-5 sm:grid-cols-2">
            <div>
              <dt className="label-muted">Invoice</dt>
              <dd className="mt-1 font-mono text-sm text-ink-100">{attempt.invoiceNumber}</dd>
            </div>
            <div>
              <dt className="label-muted">Attempting lender</dt>
              <dd className="mt-1 font-mono text-xs text-ink-200">{attempt.lender}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="label-muted">Canonical ref</dt>
              <dd className="mt-1 break-all font-mono text-xs leading-relaxed text-ink-400">
                {attempt.invoiceRef}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="label-muted">Reason</dt>
              <dd className="mt-1 text-sm text-ink-200">{attempt.reason}</dd>
            </div>
            <div>
              <dt className="label-muted">Timestamp</dt>
              <dd className="mt-1 font-mono text-sm text-ink-400">{attempt.attemptedAt}</dd>
            </div>
            <div>
              <dt className="label-muted">Status</dt>
              <dd className="mt-1 flex items-center gap-1.5 text-sm font-medium text-negative">
                <IconLock className="h-4 w-4" />
                {attempt.blocked ? 'Blocked' : 'Allowed'}
              </dd>
            </div>
          </dl>

          <p className="border-t border-white/6 px-5 py-4 text-sm leading-relaxed text-ink-500">
            PledgeRegistry rejected a second pledge on the same canonical ref; the on-ledger
            assertion was{' '}
            <code className="rounded bg-surface-800 px-1.5 py-0.5 font-mono text-xs text-ink-300">
              Invoice already pledged
            </code>
            .
          </p>
        </div>
      )}
    </div>
  )
}
