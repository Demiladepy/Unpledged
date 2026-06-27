import { useEffect, useState } from 'react'
import { listFinancingRequests, listInvoices } from '../ledger/api'
import { PARTIES } from '../ledger/mockData'
import type { FinancingRequest, Invoice } from '../types/ledger'
import { IconArrowRight, IconDocument } from './icons'

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
      <header className="mb-6">
        <p className="text-[10px] font-medium uppercase tracking-wider text-ink-500">
          Party view
        </p>
        <h2 className="text-xl font-semibold text-ink-100">
          SME — {PARTIES.SME}
        </h2>
        <p className="mt-1 text-sm text-ink-400">
          Receivables portfolio and financing requests.
        </p>
      </header>

      {loading ? (
        <p className="text-sm text-ink-500">Loading…</p>
      ) : (
        <div className="border border-surface-700">
          <div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-4 border-b border-surface-700 bg-surface-800 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-ink-500">
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
                className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] items-center gap-4 border-b border-surface-700 px-4 py-3 last:border-b-0"
              >
                <span className="font-mono text-sm text-ink-100">
                  {inv.invoiceNumber}
                </span>
                <span className="font-mono text-sm text-ink-400">
                  {inv.debtor}
                </span>
                <span className="font-mono text-sm tabular-nums text-ink-100">
                  {formatCurrency(inv.amount)}
                </span>
                <span className="font-mono text-sm text-ink-400">
                  {inv.dueDate}
                </span>
                <button
                  type="button"
                  disabled={funded}
                  className={[
                    'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium uppercase tracking-wider transition-colors',
                    funded
                      ? 'cursor-not-allowed bg-surface-700 text-ink-500'
                      : 'bg-accent text-ink-100 hover:bg-accent-muted',
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

      <div className="mt-4 flex items-start gap-2 text-xs text-ink-500">
        <IconDocument className="mt-0.5 h-3.5 w-3.5" />
        <p>
          Invoices are co-signed by debtor. Financing routes through
          attestation and pledge — lender never sees raw invoice data unless
          stakeholder.
        </p>
      </div>
    </div>
  )
}
