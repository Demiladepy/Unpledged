import { useCallback, useEffect, useState } from 'react'

import { getLenderFinancingTree } from '../ledger/api'
import { ledgerConfig } from '../ledger/config'
import { PARTIES, partyDisplayName } from '../ledger/parties'
import type {
  LenderTransactionTreeSummary,
  TransactionTreeNode,
} from '../types/ledger'
import { CopyableId } from './CopyableId'

function formatNodeLabel(node: TransactionTreeNode): string {
  if (node.kind === 'Exercised' && node.choice) {
    return node.choice
  }
  if (node.kind === 'Created') {
    const entity = node.templateLabel.split(':').pop() ?? node.templateLabel
    return `${entity} created`
  }
  return node.templateLabel
}

function formatFetchedAt(iso: string): string {
  try {
    return new Date(iso).toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, 'Z')
  } catch {
    return iso
  }
}

interface TransactionTreeInspectorProps {
  compact?: boolean
  className?: string
}

export function TransactionTreeInspector({
  compact = false,
  className = '',
}: TransactionTreeInspectorProps) {
  const [tree, setTree] = useState<LenderTransactionTreeSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadTree = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    setError(null)
    try {
      setTree(await getLenderFinancingTree())
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void loadTree()
  }, [loadTree])

  const partyLabel = partyDisplayName(PARTIES.LENDER_A)
  const endpointPath = `/v2/updates/transaction-tree-by-id/${ledgerConfig.completeFinancingUpdateId}?parties=${encodeURIComponent(PARTIES.LENDER_A)}`

  return (
    <section
      className={['pane inspector-panel', className].filter(Boolean).join(' ')}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 px-4 py-4 sm:px-6">
        <div className="min-w-0 flex-1">
          <p className="data-label">Transaction tree inspector</p>
          <p className="mt-2 text-sm text-ink-muted">
            {compact
              ? 'Informee-level privacy — Lender A projection of CompleteFinancing'
              : 'Commit-model privacy proof — nodes Lender A witnessed in the live financing transaction'}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span
            className={
              ledgerConfig.useMocks ? 'inspector-stamp-mock' : 'inspector-stamp'
            }
          >
            {ledgerConfig.useMocks ? 'Mock projection' : 'Verified against DevNet'}
          </span>
          <button
            type="button"
            disabled={loading || refreshing}
            onClick={() => void loadTree(true)}
            className="border border-white/10 px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-ink-muted hover:text-lime disabled:opacity-50"
          >
            {refreshing ? 'Querying…' : 'Refresh from ledger'}
          </button>
        </div>
      </div>

      <div className="px-4 py-4 sm:px-6 sm:py-5">
        {loading ? (
          <p className="font-mono text-sm text-ink-muted">
            GET transaction-tree-by-id… projecting for {partyLabel}
          </p>
        ) : error ? (
          <pre className="terminal-block text-negative">{error}</pre>
        ) : tree ? (
          <>
            <CopyableId value={tree.updateId} label="CompleteFinancing update ID" />
            <p className="mt-3 font-mono text-[10px] leading-relaxed text-ink-dim">
              Live query · {endpointPath}
            </p>
            {tree.fetchedAt ? (
              <p className="mt-2 text-xs text-ink-dim">
                Fetched {formatFetchedAt(tree.fetchedAt)} · not hardcoded
              </p>
            ) : null}

            <div
              className={[
                'inspector-verdict mt-6 border px-4 py-5 sm:px-6',
                tree.invoiceNodeCount === 0
                  ? 'border-lime/30 bg-lime/[0.04]'
                  : 'border-negative/30 bg-negative/[0.04]',
              ].join(' ')}
            >
              <p className="font-display text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
                Privacy verdict
              </p>
              <p className="mt-3 font-mono text-sm text-ink-200 sm:text-base">
                Invoice nodes in {partyLabel}&apos;s view:{' '}
                <span
                  className={[
                    'font-display text-3xl font-semibold sm:text-4xl',
                    tree.invoiceNodeCount === 0 ? 'text-lime' : 'text-negative',
                  ].join(' ')}
                >
                  {tree.invoiceNodeCount}
                </span>
              </p>
              <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                <span className="text-ink-200">Invoice:Invoice</span> appears nowhere
                in this projection.
                {tree.fullTreeInvoiceNodeCount > 0 ? (
                  <>
                    {' '}
                    ({tree.fullTreeInvoiceNodeCount} Invoice node
                    {tree.fullTreeInvoiceNodeCount === 1 ? '' : 's'} exist in the
                    full transaction but are not disclosed to {partyLabel}.)
                  </>
                ) : null}
              </p>
              <p className="mt-3 border-t border-white/[0.06] pt-3 text-sm leading-relaxed text-ink-dim">
                PreparePledge runs under SME-only informees — absent from{' '}
                {partyLabel}&apos;s projection.
              </p>
            </div>

            <div className="mt-6">
              <p className="data-label mb-3">
                {partyLabel} witness nodes ({tree.lenderVisibleNodes.length})
              </p>
              <ul className="inspector-node-list border border-white/[0.06]">
                {tree.lenderVisibleNodes.length === 0 ? (
                  <li className="px-4 py-3 font-mono text-sm text-ink-muted">
                    No nodes in party projection
                  </li>
                ) : (
                  tree.lenderVisibleNodes.map((node) => (
                    <li key={node.nodeId} className="inspector-node-row">
                      <span className="text-ink-dim">[{node.nodeId}]</span>
                      <span className="text-ink-muted">{node.kind}</span>
                      <span className="text-ink-100">{formatNodeLabel(node)}</span>
                      <span className="hidden text-ink-dim sm:inline">
                        {node.templateLabel}
                      </span>
                      {node.isInvoiceTemplate ? (
                        <span className="text-negative">INVOICE</span>
                      ) : null}
                    </li>
                  ))
                )}
              </ul>
            </div>
          </>
        ) : (
          <p className="text-sm text-ink-muted">Tree not loaded</p>
        )}
      </div>
    </section>
  )
}
