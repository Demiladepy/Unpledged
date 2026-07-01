import { useEffect, useState } from 'react'
import {
  attemptDoublePledgeLive,
  getDoublePledgeAttempt,
  getLenderFinancingTree,
} from '../ledger/api'
import { PARTIES } from '../ledger/parties'
import type {
  DoublePledgeAttempt,
  LenderTransactionTreeSummary,
  LiveDoublePledgeResult,
} from '../types/ledger'
import { CopyableId } from './CopyableId'
import { PageHeader } from './PageHeader'

const LIGHTHOUSE_BASE = 'https://lighthouse.devnet.cantonloop.com/party'

export function DoublePledgeBlocked() {
  const [attempt, setAttempt] = useState<DoublePledgeAttempt | null>(null)
  const [tree, setTree] = useState<LenderTransactionTreeSummary | null>(null)
  const [liveResult, setLiveResult] = useState<LiveDoublePledgeResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [attempting, setAttempting] = useState(false)
  const [treeLoading, setTreeLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [data, treeData] = await Promise.all([
          getDoublePledgeAttempt(),
          getLenderFinancingTree(),
        ])
        if (!cancelled) {
          setAttempt(data)
          setTree(treeData)
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

  async function runLiveAttempt() {
    setAttempting(true)
    setError(null)
    try {
      const result = await attemptDoublePledgeLive()
      setLiveResult(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setAttempting(false)
    }
  }

  async function refreshTree() {
    setTreeLoading(true)
    setError(null)
    try {
      setTree(await getLenderFinancingTree())
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setTreeLoading(false)
    }
  }

  const rejectionText =
    liveResult?.reason ?? attempt?.reason ?? 'Loading recorded rejection…'

  return (
    <div>
      <PageHeader
        eyebrow="Encumbrance control"
        title="Double-pledge blocked"
        lead="Second financing attempt on an already-pledged invoice rejected at commit."
      />

      {loading ? (
        <p className="text-sm text-ink-muted">Loading…</p>
      ) : (
        <>
          {attempt ? (
            <div className="pane mb-6">
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

          <section className="pane mb-6">
            <div className="border-b border-white/10 px-4 py-4 sm:px-6">
              <p className="data-label">Live fraud attempt</p>
              <p className="mt-2 text-sm text-ink-muted">
                Re-submit a second pledge on INV-001. The ledger must refuse it.
              </p>
            </div>
            <div className="px-4 py-4 sm:px-6 sm:py-5">
              <button
                type="button"
                disabled={attempting}
                onClick={() => void runLiveAttempt()}
                className="btn-lime w-full justify-center sm:w-auto"
              >
                {attempting ? 'Submitting to ledger…' : 'Attempt second pledge (live)'}
              </button>
              {(liveResult || attempt) && (
                <div className="mt-5">
                  <p className="data-label mb-2">
                    Ledger rejection
                    {liveResult?.httpStatus ? ` · HTTP ${liveResult.httpStatus}` : ''}
                  </p>
                  <pre className="terminal-block text-negative">{rejectionText}</pre>
                  {liveResult?.blocked ? (
                    <p className="mt-3 text-xs text-lime">
                      Blocked live at {liveResult.attemptedAt}
                    </p>
                  ) : null}
                </div>
              )}
            </div>
          </section>

          <section className="pane mb-6">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 px-4 py-4 sm:px-6">
              <div>
                <p className="data-label">Transaction tree · Lender A projection</p>
                <p className="mt-2 text-sm text-ink-muted">
                  Commit-model privacy — what Lender A actually saw in CompleteFinancing
                </p>
              </div>
              <button
                type="button"
                disabled={treeLoading}
                onClick={() => void refreshTree()}
                className="border border-white/10 px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-ink-muted hover:text-lime"
              >
                Refresh
              </button>
            </div>
            <div className="px-4 py-4 sm:px-6 sm:py-5">
              {tree ? (
                <>
                  <CopyableId value={tree.updateId} label="Update ID" />
                  <p className="mt-4 font-mono text-sm text-ink-200">
                    Invoice nodes visible to Lender A:{' '}
                    <span
                      className={
                        tree.invoiceNodeCount === 0 ? 'text-lime' : 'text-negative'
                      }
                    >
                      {tree.invoiceNodeCount}
                    </span>
                  </p>
                  <ul className="mt-4 space-y-2 border border-white/[0.06]">
                    {tree.lenderVisibleNodes.length === 0 ? (
                      <li className="px-4 py-3 text-sm text-ink-muted">No nodes in projection</li>
                    ) : (
                      tree.lenderVisibleNodes.map((node) => (
                        <li
                          key={node.nodeId}
                          className="border-b border-white/[0.06] px-4 py-3 font-mono text-xs last:border-b-0"
                        >
                          <span className="text-ink-muted">[{node.nodeId}]</span>{' '}
                          <span className="text-ink-200">{node.kind}</span>{' '}
                          <span className="text-ink-100">{node.templateLabel}</span>
                          {node.choice ? (
                            <span className="text-ink-muted"> · {node.choice}</span>
                          ) : null}
                          {node.isInvoiceTemplate ? (
                            <span className="ml-2 text-negative">INVOICE</span>
                          ) : null}
                        </li>
                      ))
                    )}
                  </ul>
                  <p className="mt-4 text-xs text-ink-dim">
                    PreparePledge on Invoice is absent — SME-only informees. Privacy is in
                    the commit model, not the UI.
                  </p>
                </>
              ) : (
                <p className="text-sm text-ink-muted">Tree not loaded</p>
              )}
            </div>
          </section>

          <section className="pane">
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
