import { useEffect, useState } from 'react'
import { getDoublePledgeAttempt } from '../ledger/api'
import { PARTIES } from '../ledger/parties'
import type { DoublePledgeAttempt } from '../types/ledger'
import { CopyableId } from './CopyableId'
import { LiveDoublePledgeReplay } from './LiveDoublePledgeReplay'
import { PageHeader } from './PageHeader'
import { TransactionTreeInspector } from './TransactionTreeInspector'

const LIGHTHOUSE_BASE = 'https://lighthouse.devnet.cantonloop.com/party'

export function DoublePledgeBlocked() {
  const [attempt, setAttempt] = useState<DoublePledgeAttempt | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const data = await getDoublePledgeAttempt()
        if (!cancelled) {
          setAttempt(data)
          setLoading(false)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err))
          setLoading(false)
        }
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

      {loading ? (
        <p className="inline-flex items-center gap-2 text-sm text-ink-muted">
          <span className="spinner" aria-hidden />
          Loading…
        </p>
      ) : (
        <>
          {attempt ? (
            <div className="pane pane-interactive animate-rise-sm mb-6">
              <div className="border-b border-white/10 px-4 py-4 sm:px-6 sm:py-5">
                <p className="font-display text-sm font-semibold uppercase tracking-[0.1em] text-lime">
                  Fraud prevented on-chain
                </p>
                <p className="mt-2 text-sm text-ink-muted">
                  PledgeRegistry rejected duplicate pledge on canonical invoice ref
                </p>
              </div>
              <dl className="grid gap-0 px-4 sm:px-6 sm:grid-cols-2">
                <div className="data-row sm:col-span-1">
                  <dt className="data-label">Invoice</dt>
                  <dd className="font-mono text-sm text-ink-100">{attempt.invoiceNumber}</dd>
                </div>
                <div className="data-row sm:col-span-1">
                  <dt className="data-label">Status</dt>
                  <dd className="font-mono text-sm text-negative">BLOCKED</dd>
                </div>
                <div className="border-b border-white/[0.06] py-5 sm:col-span-2">
                  <CopyableId value={attempt.lender} label="Attempting lender" />
                </div>
                <div className="border-b border-white/[0.06] py-5 sm:col-span-2">
                  <CopyableId value={attempt.invoiceRef || '—'} label="Canonical ref" />
                </div>
              </dl>
            </div>
          ) : null}

          <LiveDoublePledgeReplay className="mb-6" />

          <TransactionTreeInspector className="mb-6" />

          <section className="pane pane-interactive">
            <div className="border-b border-white/10 px-4 py-4 sm:px-6">
              <p className="data-label">Independent verification</p>
              <p className="mt-2 text-sm text-ink-muted">
                Lighthouse explorer — verify party activity on Canton DevNet
              </p>
            </div>
            <ul className="divide-y divide-white/[0.06] px-4 py-2 sm:px-6">
              {[
                ['SME', PARTIES.SME],
                ['Lender A', PARTIES.LENDER_A],
                ['Lender B', PARTIES.LENDER_B],
              ].map(([label, party]) => (
                <li key={party} className="py-3">
                  <a
                    href={`${LIGHTHOUSE_BASE}/${encodeURIComponent(party)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-ink-200 underline decoration-white/20 underline-offset-2 hover:text-lime"
                  >
                    {label} on Lighthouse
                  </a>
                </li>
              ))}
            </ul>
          </section>

          {error ? (
            <pre className="terminal-block mt-4 text-negative">{error}</pre>
          ) : null}
        </>
      )}
    </div>
  )
}

