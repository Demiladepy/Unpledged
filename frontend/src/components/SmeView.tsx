import { useEffect, useState } from 'react'
import { listFinancingRequests, listInvoices } from '../ledger/api'
import { PARTIES, partyDisplayName } from '../ledger/parties'
import type { FinancingRequest, Invoice } from '../types/ledger'
import { CopyableId } from './CopyableId'
import { IconArrowRight } from './icons'
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

  useEffect(() => {
    let cancelled = false
    async function load() {
      const [inv, req] = await Promise.all([
        listInvoices(PARTIES.SME),
        listFinancingRequests(PARTIES.SME),
      ])
      if (!cancelled) {
        setInvoices(inv)
        setRequests(req)
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
        title={`SME — ${partyDisplayName(PARTIES.SME)}`}
        lead="Receivables portfolio. Financing routes through attestation — lenders never see raw invoice fields unless stakeholder."
      />

      <div className="mb-6">
        <CopyableId value={PARTIES.SME} label="Party ID" />
      </div>

      {loading ? (
        <p className="text-sm text-ink-muted">Loading…</p>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {invoices.map((inv) => {
              const req = requests.find((r) => r.invoiceNumber === inv.invoiceNumber)
              const funded = req?.status === 'funded'
              return (
                <article key={inv.contractId} className="pane p-4">
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
                    disabled={funded}
                    className="btn-lime mt-4 w-full justify-center"
                  >
                    Request financing
                    {!funded && <IconArrowRight className="h-3.5 w-3.5" />}
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
            {invoices.map((inv) => {
              const req = requests.find((r) => r.invoiceNumber === inv.invoiceNumber)
              const funded = req?.status === 'funded'
              return (
                <div
                  key={inv.contractId}
                  className="data-table-row min-w-[720px] grid-cols-[1.2fr_1.5fr_1fr_1fr_0.8fr_auto]"
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
                  <button type="button" disabled={funded} className="btn-lime">
                    Request financing
                    {!funded && <IconArrowRight className="h-3.5 w-3.5" />}
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
