import { useEffect, useState } from 'react'
import { getDoublePledgeAttempt } from '../ledger/api'
import type { DoublePledgeAttempt } from '../types/ledger'
import { IconLock, IconX } from './icons'

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
      <header className="mb-6">
        <p className="text-[10px] font-medium uppercase tracking-wider text-ink-500">
          Encumbrance control
        </p>
        <h2 className="text-xl font-semibold text-ink-100">
          Double-pledge blocked
        </h2>
        <p className="mt-1 text-sm text-ink-400">
          Second financing attempt on an already-pledged invoice rejected at
          commit.
        </p>
      </header>

      {loading || !attempt ? (
        <p className="text-sm text-ink-500">Loading…</p>
      ) : (
        <div className="border border-negative/50 bg-surface-900">
          <div className="flex items-center gap-3 border-b border-negative/40 bg-negative/10 px-4 py-4">
            <div className="flex h-10 w-10 items-center justify-center border border-negative/50">
              <IconX className="h-5 w-5 text-negative" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-negative">
                Transaction rejected
              </p>
              <p className="text-lg font-semibold text-ink-100">
                Pledge blocked — duplicate contract key
              </p>
            </div>
          </div>

          <dl className="grid gap-4 px-4 py-4 sm:grid-cols-2">
            <div>
              <dt className="text-[10px] uppercase tracking-wider text-ink-500">
                Invoice
              </dt>
              <dd className="font-mono text-sm text-ink-100">
                {attempt.invoiceNumber}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-wider text-ink-500">
                Attempting lender
              </dt>
              <dd className="font-mono text-sm text-ink-100">
                {attempt.lender}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-[10px] uppercase tracking-wider text-ink-500">
                Canonical ref
              </dt>
              <dd className="mt-1 break-all font-mono text-[12px] leading-relaxed text-ink-400">
                {attempt.invoiceRef}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-[10px] uppercase tracking-wider text-ink-500">
                Reason
              </dt>
              <dd className="mt-1 text-sm text-ink-200">{attempt.reason}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-wider text-ink-500">
                Timestamp
              </dt>
              <dd className="font-mono text-sm text-ink-400">
                {attempt.attemptedAt}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-wider text-ink-500">
                Status
              </dt>
              <dd className="flex items-center gap-1.5 text-sm font-medium text-negative">
                <IconLock className="h-4 w-4" />
                {attempt.blocked ? 'Blocked' : 'Allowed'}
              </dd>
            </div>
          </dl>

          <p className="border-t border-surface-700 px-4 py-3 text-xs leading-relaxed text-ink-500">
            INV-001 was already pledged to LenderA. LenderB&apos;s second
            CompleteFinancing attempt produced the same canonical ref; the
            PledgeMarker key{' '}
            <code className="font-mono text-ink-400">(invoiceOwner, invoiceRef)</code>{' '}
            prevented a silent double encumbrance.
          </p>
        </div>
      )}
    </div>
  )
}
