import { useCallback, useEffect, useState, type ReactNode } from 'react'

import { getLenderView, listPledgeMarkers } from '../ledger/api'
import { PARTIES, partyDisplayName } from '../ledger/parties'
import type { LenderView, UnpledgedAttestation } from '../types/ledger'
import { CopyableId } from './CopyableId'
import { LiveBadge } from './LiveBadge'
import { LiveDoublePledgeReplay } from './LiveDoublePledgeReplay'
import { TransactionTreeInspector } from './TransactionTreeInspector'

type ViewAsId = 'lender_a' | 'lender_b' | 'sme'

const VIEW_AS_OPTIONS: { id: ViewAsId; label: string; party: string }[] = [
  { id: 'lender_a', label: 'Lender A', party: PARTIES.LENDER_A },
  { id: 'lender_b', label: 'Lender B', party: PARTIES.LENDER_B },
  { id: 'sme', label: 'SME', party: PARTIES.SME },
]

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatFetchError(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes('failed to fetch') || lower.includes('cors')) {
    return [
      "Couldn't reach the ledger API from the browser.",
      '',
      'Ensure npm run dev is running and reload this page.',
      'Ledger calls are proxied via /api/ledger to avoid CORS.',
    ].join('\n')
  }
  return message
}

function contractCount(view: LenderView): number {
  return view.invoices.length + view.attestations.length + view.pledgeMarkers.length
}

function DataRow({
  label,
  value,
  highlight,
}: {
  label: string
  value: ReactNode
  highlight?: boolean
}) {
  return (
    <div className="data-row">
      <dt className="data-label">{label}</dt>
      <dd
        className={[
          'font-mono text-sm sm:text-right',
          highlight ? 'text-lime' : 'text-ink-100',
        ].join(' ')}
      >
        {value}
      </dd>
    </div>
  )
}

function AttestationRows({ attestation }: { attestation: UnpledgedAttestation }) {
  return (
    <dl>
      <DataRow
        label="Period"
        value={`${attestation.periodStart} — ${attestation.periodEnd}`}
      />
      <DataRow label="Settled count" value={attestation.settledCount} />
      <DataRow
        label="Settled total"
        value={formatCurrency(attestation.settledTotal)}
        highlight
      />
      <DataRow
        label="All settled on time"
        value={attestation.allSettledOnTime ? 'TRUE' : 'FALSE'}
      />
      <DataRow label="Invoices in ACS" value="0" />
    </dl>
  )
}

function PartyProjectionBody({
  view,
  pledgeRef,
}: {
  view: LenderView
  pledgeRef: string
}) {
  const party = view.party
  const count = contractCount(view)
  const attestation = view.attestations[0]

  if (party === PARTIES.LENDER_A && attestation) {
    return (
      <>
        <p className="mb-4 text-xs text-ink-muted">
          Unpledged attestation · summary fields only
        </p>
        <AttestationRows attestation={attestation} />
        <div className="mt-auto border-t border-white/10 pt-5">
          <CopyableId value={attestation.contractId} label="Attestation CID" />
        </div>
      </>
    )
  }

  if (party === PARTIES.LENDER_B && count === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center border border-white/[0.06] px-4 py-12 text-center sm:px-8 sm:py-16">
        <p className="font-display text-xl font-semibold uppercase tracking-[0.06em] text-ink-300 sm:text-2xl lg:text-3xl">
          No visibility
        </p>
        <p className="mt-4 font-mono text-sm text-denied">
          · {count} contracts in your ledger view
        </p>
        <p className="mt-6 max-w-sm text-sm leading-relaxed text-ink-muted">
          INV-001 exists on the ledger. Lender B is not a stakeholder and receives
          no attestation, invoice, or pledge data in ACS queries.
        </p>
        {pledgeRef ? (
          <p className="mt-4 text-xs text-ink-dim">
            Lender A pledge ref not disclosed to this party
          </p>
        ) : null}
      </div>
    )
  }

  if (party === PARTIES.SME && view.invoices.length > 0) {
    const inv = view.invoices.find((i) => i.invoiceNumber === 'INV-001') ?? view.invoices[0]
    return (
      <>
        <p className="mb-4 text-xs text-ink-muted">
          Stakeholder view · full invoice visible in ACS
        </p>
        <dl>
          <DataRow label="Invoice" value={inv.invoiceNumber} highlight />
          <DataRow label="Amount" value={formatCurrency(inv.amount)} />
          <DataRow label="Due date" value={inv.dueDate} />
          <DataRow label="Settled on" value={inv.settledOn ?? '—'} />
          <DataRow label="Debtor" value={partyDisplayName(inv.debtor)} />
        </dl>
        <div className="mt-auto border-t border-white/10 pt-5">
          <CopyableId value={inv.contractId} label="Invoice CID" />
        </div>
      </>
    )
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
      <p className="font-mono text-sm text-ink-muted">
        {count} contract{count === 1 ? '' : 's'} in ACS
      </p>
      <p className="mt-4 text-sm text-ink-dim">
        No attestation or invoice data matched the expected demo projection.
      </p>
    </div>
  )
}

function LenderPane({
  side,
  partyId,
  visibility,
  highlighted,
  children,
}: {
  side: 'A' | 'B'
  partyId: string
  visibility: 'granted' | 'none'
  highlighted?: boolean
  children: ReactNode
}) {
  return (
    <section
      className={[
        'pane flex min-h-0 flex-col sm:min-h-[420px] lg:min-h-[480px]',
        highlighted ? 'projection-pane-active' : '',
      ].join(' ')}
    >
      <header className="pane-header flex-col items-stretch gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0">
          <h3 className="pane-title">Lender {side}</h3>
          <div className="mt-3">
            <CopyableId value={partyId} label="Party ID" />
          </div>
        </div>
        <span
          className={[
            'shrink-0 self-start',
            visibility === 'granted' ? 'visibility-granted' : 'visibility-none',
          ].join(' ')}
        >
          Visibility: {visibility === 'granted' ? 'Granted' : 'None'}
        </span>
      </header>
      <div className="pane-body flex flex-1 flex-col">{children}</div>
    </section>
  )
}

export function SplitScreenComparison() {
  const [viewAs, setViewAs] = useState<ViewAsId>('lender_a')
  const [activeView, setActiveView] = useState<LenderView | null>(null)
  const [viewA, setViewA] = useState<LenderView | null>(null)
  const [viewB, setViewB] = useState<LenderView | null>(null)
  const [pledgeRef, setPledgeRef] = useState('')
  const [initialLoading, setInitialLoading] = useState(true)
  const [switching, setSwitching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const activeOption = VIEW_AS_OPTIONS.find((o) => o.id === viewAs) ?? VIEW_AS_OPTIONS[0]

  const queryAsParty = useCallback(async (party: string) => {
    return getLenderView(party)
  }, [])

  useEffect(() => {
    let cancelled = false
    async function loadSplit() {
      setInitialLoading(true)
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
          setInitialLoading(false)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err))
          setInitialLoading(false)
        }
      }
    }
    void loadSplit()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function loadActive() {
      setSwitching(true)
      setError(null)
      try {
        const view = await queryAsParty(activeOption.party)
        if (!cancelled) {
          setActiveView(view)
          setSwitching(false)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err))
          setSwitching(false)
        }
      }
    }
    void loadActive()
    return () => {
      cancelled = true
    }
  }, [viewAs, activeOption.party, queryAsParty])

  const attestationA = viewA?.attestations[0]
  const invoiceCountB = viewB?.invoices.length ?? 0
  const attestationCountB = viewB?.attestations.length ?? 0
  const contractCountB = invoiceCountB + attestationCountB

  const visibilityForActive =
    activeView && contractCount(activeView) > 0 && activeView.party !== PARTIES.LENDER_B
      ? 'granted'
      : activeView?.party === PARTIES.LENDER_B
        ? 'none'
        : activeView?.attestations.length
          ? 'granted'
          : 'none'

  return (
    <div className="home-hero -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="home-hero-bg" aria-hidden />
      <div className="home-hero-fade" aria-hidden />

      <div className="relative z-10">
        <div className="mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl">
            <p className="page-eyebrow">Selective disclosure</p>
            <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-ink-100 sm:text-3xl lg:text-4xl">
              Per-party ledger view
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-ink-muted sm:text-base">
              Live ACS queries on Canton DevNet — switch party to re-query the ledger
              yourself.
            </p>
          </div>
          <LiveBadge />
        </div>

        <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div>
            <p className="data-label mb-3">View as</p>
            <div className="party-switcher" role="tablist" aria-label="View as party">
              {VIEW_AS_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  role="tab"
                  aria-selected={viewAs === option.id}
                  disabled={switching && viewAs === option.id}
                  onClick={() => setViewAs(option.id)}
                  className={[
                    'party-switcher-btn',
                    viewAs === option.id ? 'party-switcher-btn-active' : '',
                  ].join(' ')}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          {switching ? (
            <p className="font-mono text-xs text-ink-muted animate-pulse">
              Querying ledger as {partyDisplayName(activeOption.party)}…
            </p>
          ) : activeView ? (
            <p className="font-mono text-xs text-ink-dim">
              ACS result · {contractCount(activeView)} contract
              {contractCount(activeView) === 1 ? '' : 's'} ·{' '}
              {partyDisplayName(activeView.party)}
            </p>
          ) : null}
        </div>

        <div className="pane mb-6 border-white/15 bg-bg/80 px-4 py-3 backdrop-blur-sm sm:mb-8 sm:px-5">
          <CopyableId value="INV-001" label="Invoice context" />
          <p className="mt-2 text-xs text-ink-muted">
            On-ledger receivable · visible to SME and Debtor stakeholders only
          </p>
        </div>

        {initialLoading && !activeView ? (
          <div className="pane projection-pane-active mb-6 bg-bg/90 px-5 py-8 backdrop-blur-sm">
            <p className="font-mono text-sm text-ink-muted">
              Querying ledger as {partyDisplayName(activeOption.party)}…
            </p>
          </div>
        ) : error ? (
          <div className="pane bg-bg/90 backdrop-blur-sm">
            <div className="border-b border-white/10 px-5 py-3 sm:px-6">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-negative">
                Ledger connection failed
              </p>
            </div>
            <pre className="terminal-block">{formatFetchError(error)}</pre>
          </div>
        ) : (
          <>
            <section className="pane projection-pane-active mb-8 flex min-h-[320px] flex-col sm:min-h-[380px]">
              <header className="pane-header flex-col items-stretch gap-3 sm:flex-row sm:items-start">
                <div className="min-w-0">
                  <h3 className="pane-title">
                    Live projection · {partyDisplayName(activeOption.party)}
                  </h3>
                  <div className="mt-3">
                    <CopyableId value={activeOption.party} label="Querying as" />
                  </div>
                </div>
                <span
                  className={[
                    'shrink-0 self-start',
                    visibilityForActive === 'granted'
                      ? 'visibility-granted'
                      : 'visibility-none',
                  ].join(' ')}
                >
                  {switching
                    ? 'Querying…'
                    : `Visibility: ${visibilityForActive === 'granted' ? 'Granted' : 'None'}`}
                </span>
              </header>
              <div
                className={[
                  'pane-body flex flex-1 flex-col transition-opacity duration-150',
                  switching ? 'opacity-40' : 'opacity-100',
                ].join(' ')}
              >
                {activeView ? (
                  <PartyProjectionBody view={activeView} pledgeRef={pledgeRef} />
                ) : (
                  <p className="text-sm text-ink-muted">Waiting for ledger…</p>
                )}
              </div>
            </section>

            <p className="data-label mb-3">Side-by-side comparison</p>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-px lg:border lg:border-white/10 lg:bg-white/10">
              <LenderPane
                side="A"
                partyId={PARTIES.LENDER_A}
                visibility="granted"
                highlighted={viewAs === 'lender_a'}
              >
                {attestationA ? (
                  <>
                    <p className="mb-4 text-xs text-ink-muted">
                      Unpledged attestation · summary fields only
                    </p>
                    <AttestationRows attestation={attestationA} />
                    {attestationA.contractId ? (
                      <div className="mt-auto border-t border-white/10 pt-5">
                        <CopyableId
                          value={attestationA.contractId}
                          label="Attestation CID"
                        />
                      </div>
                    ) : null}
                  </>
                ) : (
                  <p className="text-sm text-ink-muted">No attestation in ACS.</p>
                )}
              </LenderPane>

              <LenderPane
                side="B"
                partyId={PARTIES.LENDER_B}
                visibility="none"
                highlighted={viewAs === 'lender_b'}
              >
                <div className="flex flex-1 flex-col items-center justify-center border border-white/[0.06] px-4 py-12 text-center sm:px-8 sm:py-16">
                  <p className="font-display text-xl font-semibold uppercase tracking-[0.06em] text-ink-300 sm:text-2xl lg:text-3xl">
                    No visibility
                  </p>
                  <p className="mt-4 font-mono text-sm text-denied">
                    · {contractCountB} contracts in your ledger view
                  </p>
                  <p className="mt-6 max-w-sm text-sm leading-relaxed text-ink-muted">
                    INV-001 exists on the ledger. Lender B is not a stakeholder and
                    receives no attestation, invoice, or pledge data in ACS queries.
                  </p>
                  {pledgeRef ? (
                    <p className="mt-4 text-xs text-ink-dim">
                      Lender A pledge ref not disclosed to this party
                    </p>
                  ) : null}
                </div>
              </LenderPane>
            </div>

            <p className="mt-8 text-center font-display text-base font-medium tracking-tight text-ink-200 sm:mt-10 sm:text-lg lg:text-xl">
              Same invoice. Same ledger. Switch party — the ACS changes.
            </p>

            <div className="mt-6 grid grid-cols-1 gap-3 sm:mt-8 sm:grid-cols-2 sm:gap-px sm:border sm:border-white/10 sm:bg-white/10">
              <div className="pane bg-bg/90 px-4 py-3 text-sm text-ink-muted sm:border-0 sm:bg-bg-pane sm:px-6 sm:py-4">
                <span className="text-ink-200">Lender A</span> ·{' '}
                {viewA?.attestations.length ?? 0} attestation ·{' '}
                {viewA?.invoices.length ?? 0} invoices in ACS
              </div>
              <div className="pane bg-bg/90 px-4 py-3 text-sm text-ink-muted sm:border-0 sm:bg-bg-pane sm:px-6 sm:py-4">
                <span className="text-ink-200">Lender B</span> · {invoiceCountB}{' '}
                invoices · {attestationCountB} attestations
              </div>
            </div>

            <LiveDoublePledgeReplay compact className="mt-8 bg-bg/90 backdrop-blur-sm" />

            <TransactionTreeInspector
              compact
              className="mt-6 bg-bg/90 backdrop-blur-sm"
            />
          </>
        )}
      </div>
    </div>
  )
}
