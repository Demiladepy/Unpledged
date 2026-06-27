import { useEffect, useState, type ReactNode } from 'react'
import { getLenderView, listPledgeMarkers } from '../ledger/api'
import { PARTIES } from '../ledger/mockData'
import type { Invoice } from '../types/ledger'
import { IconDocument, IconEyeOff } from './icons'

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount)
}

interface DataCellProps {
  label: string
  value: string
  mono?: boolean
}

function DataCell({ label, value, mono = false }: DataCellProps) {
  return (
    <div className="border-b border-surface-700 py-2.5 last:border-b-0">
      <dt className="text-[10px] font-medium uppercase tracking-wider text-ink-500">
        {label}
      </dt>
      <dd
        className={[
          'mt-0.5 text-sm text-ink-100',
          mono ? 'font-mono text-[13px]' : '',
        ].join(' ')}
      >
        {value}
      </dd>
    </div>
  )
}

interface InvoiceCardProps {
  invoiceNumber: string
  amount: number
  debtor: string
  dueDate: string
  status: string
  contractId: string
}

function InvoiceCard({
  invoiceNumber,
  amount,
  debtor,
  dueDate,
  status,
  contractId,
}: InvoiceCardProps) {
  return (
    <div className="border border-surface-600 bg-surface-800">
      <div className="flex items-center justify-between border-b border-surface-600 px-4 py-2">
        <span className="font-mono text-sm font-medium text-ink-100">
          {invoiceNumber}
        </span>
        <span className="bg-accent-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-100">
          {status}
        </span>
      </div>
      <dl className="px-4">
        <DataCell label="Amount" value={formatCurrency(amount)} mono />
        <DataCell label="Debtor" value={debtor} mono />
        <DataCell label="Due date" value={dueDate} mono />
        <DataCell label="Contract ID" value={contractId} mono />
      </dl>
    </div>
  )
}

interface NoVisibilityPanelProps {
  party: string
  invoiceRef: string
}

function NoVisibilityPanel({ party, invoiceRef }: NoVisibilityPanelProps) {
  return (
    <div className="flex h-full min-h-[320px] flex-col border-2 border-dashed border-negative/60 bg-surface-900">
      <div className="border-b border-negative/40 bg-negative/10 px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-negative">
          No visibility
        </p>
        <p className="mt-1 text-2xl font-semibold tabular-nums text-ink-100">
          0 invoices
        </p>
        <p className="text-xs text-ink-400">in {party}&apos;s ACS view</p>
      </div>
      <div className="flex flex-1 flex-col justify-center px-6 py-8 text-center">
        <p className="text-sm leading-relaxed text-ink-400">
          Invoice{' '}
          <span className="font-mono text-ink-200">INV-001</span> exists on the
          ledger and is financed by LenderA, but is{' '}
          <span className="font-medium text-ink-100">
            structurally invisible
          </span>{' '}
          to {party}.
        </p>
        <p className="mt-4 font-mono text-[11px] leading-relaxed text-ink-500">
          Pledge ref on ledger: {invoiceRef.slice(0, 48)}…
        </p>
        <p className="mt-2 text-[11px] text-ink-500">
          Not a stakeholder. Not divulged. Not in query results.
        </p>
      </div>
    </div>
  )
}

interface LenderPanelProps {
  title: string
  party: string
  accent: 'visible' | 'absent'
  children: ReactNode
}

function LenderPanel({ title, party, accent, children }: LenderPanelProps) {
  const borderColor =
    accent === 'visible' ? 'border-accent' : 'border-surface-600'
  const headerBg =
    accent === 'visible' ? 'bg-accent-muted/30' : 'bg-surface-800'

  return (
    <section
      className={[
        'flex flex-col border',
        borderColor,
        accent === 'absent' ? 'opacity-95' : '',
      ].join(' ')}
    >
      <header
        className={[
          'flex items-center justify-between border-b border-surface-600 px-4 py-3',
          headerBg,
        ].join(' ')}
      >
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-ink-500">
            {title}
          </p>
          <p className="font-mono text-base font-semibold text-ink-100">
            {party}
          </p>
        </div>
        {accent === 'visible' ? (
          <span className="text-[10px] font-semibold uppercase tracking-wider text-accent">
            Has visibility
          </span>
        ) : (
          <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">
            No visibility
          </span>
        )}
      </header>
      <div className="flex-1 p-4">{children}</div>
    </section>
  )
}

export function SplitScreenComparison() {
  const [lenderAInvoices, setLenderAInvoices] = useState<Invoice[]>([])
  const [pledgeRef, setPledgeRef] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const [viewA, markers] = await Promise.all([
        getLenderView(PARTIES.LENDER_A),
        listPledgeMarkers(PARTIES.LENDER_A),
      ])
      if (!cancelled) {
        setLenderAInvoices(viewA.invoices)
        setPledgeRef(markers[0]?.invoiceRef ?? '')
        setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const financedInvoice = lenderAInvoices[0]

  return (
    <div>
      <div className="mb-6 border-l-2 border-accent pl-4">
        <h2 className="text-xl font-semibold tracking-tight text-ink-100">
          Selective disclosure proof
        </h2>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-ink-400">
          The same receivable exists once on the Canton ledger. LenderA financed
          it and sees the invoice in its party view. LenderB has zero
          visibility — by design, not by omission.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-ink-500">Loading party views…</p>
      ) : (
        <div className="grid grid-cols-1 gap-0 lg:grid-cols-[1fr_auto_1fr]">
          <LenderPanel
            title="Financing party"
            party={PARTIES.LENDER_A}
            accent="visible"
          >
            {financedInvoice ? (
              <InvoiceCard
                invoiceNumber={financedInvoice.invoiceNumber}
                amount={financedInvoice.amount}
                debtor={financedInvoice.debtor}
                dueDate={financedInvoice.dueDate}
                status="FINANCED"
                contractId={financedInvoice.contractId}
              />
            ) : (
              <p className="text-sm text-ink-500">No invoices in view.</p>
            )}
          </LenderPanel>

          <div className="flex flex-col items-center justify-center border-y border-surface-700 bg-surface-950 px-4 py-6 lg:border-x lg:border-y-0 lg:px-6">
            <div className="flex h-10 w-10 items-center justify-center border border-surface-600 bg-surface-800">
              <IconDocument className="h-5 w-5 text-ink-400" />
            </div>
            <p className="mt-3 text-center font-mono text-xs font-medium text-ink-200">
              INV-001
            </p>
            <p className="mt-1 text-center text-[10px] uppercase tracking-wider text-ink-500">
              Single ledger contract
            </p>
            <div className="mt-4 hidden w-px flex-1 bg-surface-600 lg:block" />
            <p className="mt-4 max-w-[140px] text-center text-[11px] leading-snug text-ink-500">
              Same invoice. Different party projections.
            </p>
          </div>

          <LenderPanel
            title="Non-financing party"
            party={PARTIES.LENDER_B}
            accent="absent"
          >
            <NoVisibilityPanel
              party={PARTIES.LENDER_B}
              invoiceRef={pledgeRef}
            />
          </LenderPanel>
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-3 border border-surface-700 bg-surface-900 p-4 sm:grid-cols-2">
        <div className="flex items-start gap-3">
          <IconDocument className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
          <p className="text-xs leading-relaxed text-ink-400">
            <span className="font-medium text-ink-200">LenderA</span> is
            stakeholder on PledgeMarker and sees financed invoice INV-001 in
            its ACS.
          </p>
        </div>
        <div className="flex items-start gap-3">
          <IconEyeOff className="mt-0.5 h-4 w-4 shrink-0 text-ink-500" />
          <p className="text-xs leading-relaxed text-ink-400">
            <span className="font-medium text-ink-200">LenderB</span> has no
            Invoice contracts, no fetch witnesses, no divulged payload — only
            absence.
          </p>
        </div>
      </div>
    </div>
  )
}
