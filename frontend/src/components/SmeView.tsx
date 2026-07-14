import { useCallback, useEffect, useState } from 'react'
import {
  listFinancingRequests,
  listInvoices,
  requestFinancing,
} from '../ledger/api'
import { PARTIES, partyDisplayName } from '../ledger/parties'
import type { FinancingRequest, Invoice } from '../types/ledger'
import { CopyableId } from './CopyableId'
import { IconArrowRight } from './icons'
import { LedgerCallError } from './LedgerCallError'
import { PageHeader } from './PageHeader'

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function SmeView() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [requests, setRequests] = useState<FinancingRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [actingOn, setActingOn] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const reload = useCallback(async () => {
    const [inv, req] = await Promise.all([
      listInvoices(PARTIES.SME),
      listFinancingRequests(PARTIES.SME),
    ])
    setInvoices(inv)
    setRequests(req)
    setLoading(false)
  }, [])

  useEffect(() => {
    void reload().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : String(err))
      setLoading(false)
    })
  }, [reload])

  async function handleRequestFinancing(invoice: Invoice) {
    setActingOn(invoice.contractId)
    setError(null)
    setSuccess(null)
    try {
      const offer = await requestFinancing(invoice)
      setSuccess(
        `FinancingOffer created for ${invoice.invoiceNumber} — advance ${formatCurrency(offer.advanceAmount)}. Lender A can fund on /lender.`,
      )
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setActingOn(null)
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Party view"
        title={`SME — ${partyDisplayName(PARTIES.SME)}`}
        lead="Receivables portfolio. Request financing creates a Lender A FinancingOffer on Canton — lenders never see raw invoice fields unless stakeholder."
      />

      <div className="mb-6">
        <CopyableId value={PARTIES.SME} label="Party ID" />
      </div>

      {error ? (
        <div className="mb-4">
          <LedgerCallError
            error={error}
            onRetry={() => {
              setError(null)
              void reload().catch((err: unknown) => {
                setError(err instanceof Error ? err.message : String(err))
              })
            }}
          />
        </div>
      ) : null}
      {success ? (
        <p className="animate-rise-sm mb-4 border border-lime/25 bg-lime/[0.04] px-4 py-3 text-sm text-lime">
          {success}
        </p>
      ) : null}

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="pane p-4">
              <div className="skeleton mb-3 h-4 w-32" />
              <div className="skeleton mb-2 h-3 w-full" />
              <div className="skeleton h-3 w-2/3" />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {invoices.map((inv, i) => {
              const req = requests.find((r) => r.invoiceNumber === inv.invoiceNumber)
              const funded = req?.status === 'funded'
              const busy = actingOn === inv.contractId
              return (
                <article
                  key={inv.contractId}
                  style={{ ['--stagger' as string]: i }}
                  className="stagger-item pane pane-interactive p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="data-label">Invoice</p>
                      <p className="mt-1 font-mono text-base text-ink-100">
                        {inv.invoiceNumber}
                      </p>
                    </div>
                    <span
                      className={[
                        'badge-status shrink-0',
                        funded ? 'badge-financed' : 'badge-outstanding',
                      ].join(' ')}
                    >
                      {funded ? 'Financed' : 'Outstanding'}
                    </span>
                  </div>
                  <dl className="mt-4 space-y-3 border-t border-white/[0.06] pt-4">
                    <div>
                      <dt className="data-label">Amount</dt>
                      <dd className="mt-1 font-mono text-lime">
                        {formatCurrency(inv.amount)}
                      </dd>
                    </div>
                    <div>
                      <dt className="data-label">Due</dt>
                      <dd className="mt-1 font-mono text-sm text-ink-muted">{inv.dueDate}</dd>
                    </div>
                    <div>
                      <dt className="data-label">Contract</dt>
                      <dd className="mt-1">
                        <CopyableId value={inv.contractId} />
                      </dd>
                    </div>
                  </dl>
                  <button
                    type="button"
                    disabled={funded || busy}
                    onClick={() => void handleRequestFinancing(inv)}
                    className="btn-lime mt-4 w-full justify-center"
                  >
                    {busy ? <span className="spinner" aria-hidden /> : null}
                    {busy ? 'Submitting…' : 'Request financing'}
                    {!funded && !busy && <IconArrowRight className="h-3.5 w-3.5" />}
                  </button>
                </article>
              )
            })}
          </div>

          <div className="pane hidden overflow-x-auto md:block">
            <div className="data-table-head min-w-[720px] grid-cols-[1.2fr_1.5fr_1fr_1fr_0.8fr_auto]">
              <span>Invoice</span>
              <span>Contract</span>
              <span>Amount</span>
              <span>Due</span>
              <span>Status</span>
              <span />
            </div>
            {invoices.map((inv, i) => {
              const req = requests.find((r) => r.invoiceNumber === inv.invoiceNumber)
              const funded = req?.status === 'funded'
              const busy = actingOn === inv.contractId
              return (
                <div
                  key={inv.contractId}
                  style={{ ['--stagger' as string]: i }}
                  className="stagger-item data-table-row min-w-[720px] grid-cols-[1.2fr_1.5fr_1fr_1fr_0.8fr_auto]"
                >
                  <span className="font-mono text-sm text-ink-100">{inv.invoiceNumber}</span>
                  <span className="font-mono text-xs text-ink-muted" title={inv.contractId}>
                    {inv.contractId.slice(0, 14)}…
                  </span>
                  <span className="font-mono text-sm tabular-nums text-ink-100">
                    {formatCurrency(inv.amount)}
                  </span>
                  <span className="font-mono text-sm text-ink-muted">{inv.dueDate}</span>
                  <span
                    className={[
                      'badge-status w-fit',
                      funded ? 'badge-financed' : 'badge-outstanding',
                    ].join(' ')}
                  >
                    {funded ? 'Financed' : 'Outstanding'}
                  </span>
                  <button
                    type="button"
                    disabled={funded || busy}
                    onClick={() => void handleRequestFinancing(inv)}
                    className="btn-lime"
                  >
                    {busy ? <span className="spinner" aria-hidden /> : null}
                    {busy ? 'Submitting' : 'Request financing'}
                    {!funded && !busy && <IconArrowRight className="h-3.5 w-3.5" />}
                  </button>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
