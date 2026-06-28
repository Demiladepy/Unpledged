import { useEffect, useState } from 'react'
import { listFinancingRequests, listInvoices } from '../ledger/api'
import { PARTIES, partyDisplayName } from '../ledger/parties'
import type { FinancingRequest, Invoice } from '../types/ledger'
import { IconArrowRight, IconDocument } from './icons'
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
        lead="Receivables portfolio and financing requests."
      />

      {loading ? (
        <p className="text-sm text-ink-500">Loading…</p>
      ) : (
        <div className="card overflow-hidden">
          <div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-4 border-b border-white/8 bg-surface-850/50 px-5 py-3 text-xs font-medium text-ink-500">
            <span>Invoice</span>
            <span>Debtor</span>
            <span>Amount</span>
            <span>Due</span>
            <span />
          </div>
          {invoices.map((inv) => {
            const req = requests.find((r) => r.invoiceNumber === inv.invoiceNumber)
            const funded = req?.status === 'funded'
            return (
              <div
                key={inv.contractId}
                className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] items-center gap-4 border-b border-white/6 px-5 py-3.5 last:border-b-0"
              >
                <span className="font-mono text-sm text-ink-100">{inv.invoiceNumber}</span>
                <span className="font-mono text-sm text-ink-400">{inv.debtor}</span>
                <span className="text-sm tabular-nums text-ink-100">
                  {formatCurrency(inv.amount)}
                </span>
                <span className="font-mono text-sm text-ink-400">{inv.dueDate}</span>
                <button
                  type="button"
                  disabled={funded}
                  className={[
                    'flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors',
                    funded
                      ? 'cursor-not-allowed bg-surface-700/80 text-ink-500'
                      : 'btn-primary',
                  ].join(' ')}
                >
                  {funded ? 'Financed' : 'Request financing'}
                  {!funded && <IconArrowRight className="h-3.5 w-3.5" />}
                </button>
              </div>
            )
          })}
        </div>
      )}

      <div className="mt-5 flex items-start gap-2 text-sm text-ink-500">
        <IconDocument className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Invoices are co-signed by debtor. Financing routes through attestation and
          pledge — lenders never see raw invoice data unless they are stakeholders.
        </p>
      </div>
    </div>
  )
}
