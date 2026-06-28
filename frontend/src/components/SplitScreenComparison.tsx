import { useEffect, useState, type ReactNode } from 'react'

import { getLenderView, listPledgeMarkers } from '../ledger/api'
import { PARTIES, partyDisplayName } from '../ledger/parties'
import type { UnpledgedAttestation } from '../types/ledger'
import { IconDocument, IconEyeOff } from './icons'
import { PageHeader } from './PageHeader'

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatFetchError(message: string): string {
  if (message.toLowerCase().includes('failed to fetch')) {
    return [
      "Couldn't reach the ledger API.",
      '',
      'Run npm run dev (not preview) so the /api/token proxy is active,',
      'then reload this page.',
    ].join('\n')
  }
  return message
}

function AttestationCard({ attestation }: { attestation: UnpledgedAttestation }) {
  return (
    <div className="card card-accent overflow-hidden">
      <div className="border-b border-white/8 bg-accent-soft/40 px-5 py-3">
        <p className="text-sm font-medium text-accent-bright">
          Unpledged attestation
        </p>
        <p className="mt-0.5 text-xs text-ink-400">Summary only — no invoice fields</p>
      </div>
      <dl className="divide-y divide-white/6 px-5">
        <div className="py-3.5">
          <dt className="label-muted">Period</dt>
          <dd className="mt-1 font-mono text-sm text-ink-100">
            {attestation.periodStart} — {attestation.periodEnd}
          </dd>
        </div>
        <div className="py-3.5">
          <dt className="label-muted">Settled</dt>
          <dd className="mt-1 text-sm tabular-nums text-ink-100">
            {attestation.settledCount} invoice{attestation.settledCount === 1 ? '' : 's'}{' '}
            · {formatCurrency(attestation.settledTotal)}
          </dd>
        </div>
        <div className="py-3.5">
          <dt className="label-muted">On time</dt>
          <dd className="mt-1 text-sm font-medium text-positive">
            {attestation.allSettledOnTime ? 'Yes' : 'No'}
          </dd>
        </div>
      </dl>
    </div>
  )
}

function NoVisibilityPanel({
  partyLabel,
  invoiceCount,
  attestationCount,
  pledgeRef,
}: {
  partyLabel: string
  invoiceCount: number
  attestationCount: number
  pledgeRef: string
}) {
  return (
    <div className="card flex min-h-[320px] flex-col overflow-hidden border-dashed border-negative/30">
      <div className="border-b border-negative/20 bg-negative/8 px-5 py-4">
        <p className="text-sm font-medium text-negative">No visibility</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums text-ink-100">
          {invoiceCount} invoices · {attestationCount} attestations
        </p>
        <p className="text-xs text-ink-400">in {partyLabel}&apos;s ACS view</p>
      </div>
      <div className="flex flex-1 flex-col justify-center px-6 py-8 text-center">
        <p className="text-sm leading-relaxed text-ink-400">
          SME receivables for{' '}
          <span className="font-mono text-ink-200">INV-001</span> exist on the
          ledger, but are{' '}
          <span className="font-medium text-ink-100">structurally invisible</span>{' '}
          to {partyLabel}.
        </p>
        {pledgeRef ? (
          <p className="mt-4 font-mono text-[11px] leading-relaxed text-ink-500">
            LenderA pledge ref (not visible here): {pledgeRef.slice(0, 48)}…
          </p>
        ) : null}
        <p className="mt-2 text-xs text-ink-500">
          Not a stakeholder. Not divulged. Not in query results.
        </p>
      </div>
    </div>
  )
}

function LenderPanel({
  title,
  party,
  accent,
  children,
}: {
  title: string
  party: string
  accent: 'visible' | 'absent'
  children: ReactNode
}) {
  return (
    <section
      className={[
        'card flex flex-col overflow-hidden',
        accent === 'visible' ? 'card-accent' : '',
      ].join(' ')}
    >
      <header className="flex items-center justify-between border-b border-white/8 px-5 py-4">
        <div>
          <p className="label-muted">{title}</p>
          <p className="mt-0.5 font-mono text-base font-semibold text-ink-100">
            {party}
          </p>
        </div>
        <span
          className={[
            'rounded-full px-2.5 py-1 text-[11px] font-semibold',
            accent === 'visible'
              ? 'bg-accent-soft text-accent-bright ring-1 ring-accent/30'
              : 'bg-surface-700/80 text-ink-400 ring-1 ring-white/6',
          ].join(' ')}
        >
          {accent === 'visible' ? 'Has attestation' : 'No visibility'}
        </span>
      </header>
      <div className="flex-1 p-5">{children}</div>
    </section>
  )
}

export function SplitScreenComparison() {
  const [viewA, setViewA] = useState<Awaited<ReturnType<typeof getLenderView>> | null>(
    null,
  )
  const [viewB, setViewB] = useState<Awaited<ReturnType<typeof getLenderView>> | null>(
    null,
  )
  const [pledgeRef, setPledgeRef] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [a, b, markers] = await Promise.all([
          getLenderView(PARTIES.LENDER_A),
          getLenderView(PARTIES.LENDER_B),
          listPledgeMarkers(PARTIES.LENDER_A),
        ])
        if (!cancelled) {
          setViewA(a)
          setViewB(b)
          setPledgeRef(markers[0]?.invoiceRef ?? '')
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

  const attestationA = viewA?.attestations[0]

  return (
    <div>
      <PageHeader
        eyebrow="Selective disclosure"
        title="Privacy proof"
        lead="Live per-party ACS on DevNet. LenderA sees the unpledged attestation summary only — zero invoices. LenderB sees nothing for this SME receivable."
      />

      {loading ? (
        <div className="card flex items-center gap-3 px-5 py-4">
          <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
          <p className="text-sm text-ink-400">Loading party views from ledger…</p>
        </div>
      ) : error ? (
        <div className="card overflow-hidden border-negative/30">
          <div className="border-b border-negative/20 bg-negative/10 px-5 py-3">
            <p className="text-sm font-medium text-negative">Ledger connection failed</p>
          </div>
          <pre className="overflow-x-auto px-5 py-4 font-mono text-xs leading-relaxed whitespace-pre-wrap text-ink-300">
            {formatFetchError(error)}
          </pre>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_auto_1fr] lg:gap-6">
          <LenderPanel
            title="Financing party"
            party={partyDisplayName(PARTIES.LENDER_A)}
            accent="visible"
          >
            {attestationA ? (
              <AttestationCard attestation={attestationA} />
            ) : (
              <p className="text-sm text-ink-500">No attestation in ACS.</p>
            )}
            <p className="mt-4 text-xs text-ink-500">
              Invoices in ACS:{' '}
              <span className="font-mono text-ink-300">{viewA?.invoices.length ?? 0}</span>
            </p>
          </LenderPanel>

          <div className="flex flex-col items-center justify-center px-2 py-4 lg:px-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-800 ring-1 ring-white/10">
              <IconDocument className="h-6 w-6 text-accent-bright" />
            </div>
            <p className="mt-3 text-center font-mono text-sm font-medium text-ink-100">
              INV-001
            </p>
            <p className="mt-1 text-center text-xs text-ink-500">
              On ledger (SME + Debtor only)
            </p>
            <p className="mt-4 max-w-[10rem] text-center text-xs leading-snug text-ink-500">
              Same invoice. Different party projections.
            </p>
          </div>

          <LenderPanel
            title="Non-financing party"
            party={partyDisplayName(PARTIES.LENDER_B)}
            accent="absent"
          >
            <NoVisibilityPanel
              partyLabel={partyDisplayName(PARTIES.LENDER_B)}
              invoiceCount={viewB?.invoices.length ?? 0}
              attestationCount={viewB?.attestations.length ?? 0}
              pledgeRef={pledgeRef}
            />
          </LenderPanel>
        </div>
      )}

      {!loading && !error ? (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="card flex items-start gap-3 px-5 py-4">
            <IconDocument className="mt-0.5 h-4 w-4 shrink-0 text-accent-bright" />
            <p className="text-sm leading-relaxed text-ink-400">
              <span className="font-medium text-ink-200">LenderA</span> observes the
              attestation summary ({viewA?.attestations.length ?? 0}) and pledge marker —
              not the underlying invoice ({viewA?.invoices.length ?? 0} in ACS).
            </p>
          </div>
          <div className="card flex items-start gap-3 px-5 py-4">
            <IconEyeOff className="mt-0.5 h-4 w-4 shrink-0 text-ink-500" />
            <p className="text-sm leading-relaxed text-ink-400">
              <span className="font-medium text-ink-200">LenderB</span>:{' '}
              {viewB?.invoices.length ?? 0} invoices, {viewB?.attestations.length ?? 0}{' '}
              attestations — genuine absence from the ledger query.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  )
}
