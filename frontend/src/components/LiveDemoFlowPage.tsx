import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

import {
  demoStep1CreateInvoice,
  demoStep2Attestation,
  demoStep3Offer,
  demoStep4Finance,
  demoStep5DoublePledge,
  newDemoInvoiceNumber,
} from '../ledger/api'
import { ledgerConfig } from '../ledger/config'
import type { DemoFlowSession, DemoLedgerCommandResult } from '../types/demoFlow'
import { CopyableId } from './CopyableId'
import { LedgerCallError } from './LedgerCallError'
import { LiveBadge } from './LiveBadge'
import { PageHeader } from './PageHeader'

type StepStatus = 'pending' | 'running' | 'done' | 'error'

function CommandTerminal({ result }: { result: DemoLedgerCommandResult }) {
  return (
    <div className="animate-rise-sm mt-4">
      <p className="data-label mb-2">
        Ledger response · HTTP {result.httpStatus}
        {result.ok ? ' · OK' : ' · REJECTED'}
      </p>
      <dl className="mb-3 grid gap-2 font-mono text-xs text-ink-dim sm:grid-cols-2">
        <div>
          <dt className="data-label">commandId</dt>
          <dd className="mt-1 break-all text-ink-muted">{result.commandId}</dd>
        </div>
        {result.updateId ? (
          <div>
            <dt className="data-label">updateId</dt>
            <dd className="mt-1 break-all text-ink-muted">{result.updateId}</dd>
          </div>
        ) : null}
        {result.correlationId ? (
          <div>
            <dt className="data-label">correlationId</dt>
            <dd className="mt-1 break-all text-ink-muted">{result.correlationId}</dd>
          </div>
        ) : null}
      </dl>
      <pre
        className={[
          'terminal-block text-xs',
          result.ok ? 'text-lime' : 'text-negative',
        ].join(' ')}
      >
        {result.verbatimBody}
      </pre>
    </div>
  )
}

interface StepPanelProps {
  step: number
  title: string
  description: string
  status: StepStatus
  disabled: boolean
  runningLabel?: string
  idleLabel?: string
  onRun: () => void
  children?: ReactNode
}

function StepPanel({
  step,
  title,
  description,
  status,
  disabled,
  runningLabel = 'Submitting to ledger…',
  idleLabel,
  onRun,
  children,
}: StepPanelProps) {
  const active = status === 'running' || status === 'done'
  const canRun = !disabled && status !== 'running'
  return (
    <section
      style={{ ['--stagger' as string]: step - 1 }}
      className={[
        'stagger-item pane pane-interactive transition-colors duration-300',
        active ? 'projection-pane-active' : '',
        status === 'error' ? 'border-negative/30' : '',
      ].join(' ')}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 px-4 py-4 sm:px-6">
        <div className="min-w-0">
          <p className="data-label">Step {step}</p>
          <h3 className="mt-1 font-display text-base font-semibold text-ink-100 sm:text-lg">
            {title}
          </h3>
          <p className="mt-2 text-sm text-ink-muted">{description}</p>
        </div>
        <span
          className={[
            'inline-flex shrink-0 items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider',
            status === 'done'
              ? 'text-lime'
              : status === 'error'
                ? 'text-negative'
                : status === 'running'
                  ? 'text-ink-muted'
                  : 'text-ink-dim',
          ].join(' ')}
        >
          {status === 'running' ? <span className="spinner" aria-hidden /> : null}
          {status === 'done' ? (
            <span className="h-1.5 w-1.5 rounded-full bg-lime" aria-hidden />
          ) : null}
          {status === 'running'
            ? 'Submitting…'
            : status === 'done'
              ? 'Complete'
              : status === 'error'
                ? 'Failed — retry'
                : 'Pending'}
        </span>
      </div>
      <div className="px-4 py-4 sm:px-6 sm:py-5">
        <button
          type="button"
          disabled={!canRun}
          onClick={() => void onRun()}
          className="btn-lime w-full justify-center sm:w-auto"
        >
          {status === 'running' ? (
            <>
              <span className="spinner" aria-hidden />
              {runningLabel}
            </>
          ) : status === 'error' ? (
            `Retry step ${step}`
          ) : status === 'done' ? (
            `Re-run step ${step}`
          ) : (
            idleLabel ?? `Run step ${step}`
          )}
        </button>
        {children}
      </div>
    </section>
  )
}

function emptyStatuses(): StepStatus[] {
  return ['pending', 'pending', 'pending', 'pending', 'pending']
}

export function LiveDemoFlowPage() {
  const [invoiceNumber, setInvoiceNumber] = useState(() => newDemoInvoiceNumber())
  const [session, setSession] = useState<DemoFlowSession>({ invoiceNumber })
  const [statuses, setStatuses] = useState<StepStatus[]>(emptyStatuses)
  const [stepError, setStepError] = useState<string | null>(null)
  const [failedStep, setFailedStep] = useState<number | null>(null)

  const [step1Result, setStep1Result] = useState<DemoLedgerCommandResult | null>(null)
  const [step2Result, setStep2Result] = useState<DemoLedgerCommandResult | null>(null)
  const [step2Privacy, setStep2Privacy] = useState<
    import('../types/demoFlow').DemoPrivacyCheck | null
  >(null)
  const [step3Result, setStep3Result] = useState<DemoLedgerCommandResult | null>(null)
  const [step4Result, setStep4Result] = useState<DemoLedgerCommandResult | null>(null)
  const [step5Result, setStep5Result] = useState<DemoLedgerCommandResult | null>(null)

  function setStatus(index: number, status: StepStatus) {
    setStatuses((prev) => {
      const next = [...prev]
      next[index] = status
      return next
    })
  }

  function startFreshRun() {
    const next = newDemoInvoiceNumber()
    setInvoiceNumber(next)
    setSession({ invoiceNumber: next })
    setStatuses(emptyStatuses())
    setStepError(null)
    setFailedStep(null)
    setStep1Result(null)
    setStep2Result(null)
    setStep2Privacy(null)
    setStep3Result(null)
    setStep4Result(null)
    setStep5Result(null)
  }

  async function runStep1() {
    setStepError(null)
    setFailedStep(null)
    setStatus(0, 'running')
    try {
      const out = await demoStep1CreateInvoice(invoiceNumber)
      setStep1Result(out.result)
      setSession((s) => ({
        ...s,
        invoiceCid: out.invoice.contractId,
      }))
      setStatus(0, 'done')
    } catch (err) {
      setStepError(err instanceof Error ? err.message : String(err))
      setFailedStep(1)
      setStatus(0, 'error')
    }
  }

  async function runStep2() {
    if (!session.invoiceCid) return
    setStepError(null)
    setFailedStep(null)
    setStatus(1, 'running')
    try {
      const out = await demoStep2Attestation(session.invoiceCid)
      setStep2Result(out.result)
      setStep2Privacy(out.privacy)
      setSession((s) => ({
        ...s,
        attestationCid: out.attestation.contractId,
        settledCount: out.attestation.settledCount,
        settledTotal: out.attestation.settledTotal,
      }))
      setStatus(1, 'done')
    } catch (err) {
      setStepError(err instanceof Error ? err.message : String(err))
      setFailedStep(2)
      setStatus(1, 'error')
    }
  }

  async function runStep3() {
    if (!session.attestationCid) return
    setStepError(null)
    setFailedStep(null)
    setStatus(2, 'running')
    try {
      const out = await demoStep3Offer(session.attestationCid)
      setStep3Result(out.result)
      setSession((s) => ({ ...s, offerCid: out.offer.contractId }))
      setStatus(2, 'done')
    } catch (err) {
      setStepError(err instanceof Error ? err.message : String(err))
      setFailedStep(3)
      setStatus(2, 'error')
    }
  }

  async function runStep4() {
    if (!session.invoiceCid || !session.offerCid) return
    setStepError(null)
    setFailedStep(null)
    setStatus(3, 'running')
    try {
      const out = await demoStep4Finance(session.invoiceCid, session.offerCid)
      setStep4Result(out.result)
      setSession((s) => ({
        ...s,
        pledgeMarkerCid: out.marker.contractId,
        financingUpdateId: out.result.updateId,
      }))
      setStatus(3, 'done')
    } catch (err) {
      setStepError(err instanceof Error ? err.message : String(err))
      setFailedStep(4)
      setStatus(3, 'error')
    }
  }

  async function runStep5() {
    if (!session.invoiceCid || !session.attestationCid) return
    setStepError(null)
    setFailedStep(null)
    setStatus(4, 'running')
    try {
      const out = await demoStep5DoublePledge(session.invoiceCid, session.attestationCid)
      setStep5Result(out.result)
      setStatus(4, out.blocked ? 'done' : 'error')
      if (!out.blocked) {
        setStepError('Expected ledger rejection — double pledge was not blocked')
        setFailedStep(5)
      }
    } catch (err) {
      setStepError(err instanceof Error ? err.message : String(err))
      setFailedStep(5)
      setStatus(4, 'error')
    }
  }

  const step1Done = statuses[0] === 'done'
  const step2Done = statuses[1] === 'done'
  const step3Done = statuses[2] === 'done'
  const step4Done = statuses[3] === 'done'
  const allDone = statuses.every((s) => s === 'done')

  const retryFailed = () => {
    if (failedStep === 1) void runStep1()
    else if (failedStep === 2) void runStep2()
    else if (failedStep === 3) void runStep3()
    else if (failedStep === 4) void runStep4()
    else if (failedStep === 5) void runStep5()
  }

  return (
    <div>
      <PageHeader
        eyebrow="Happy path"
        title="Run the full flow live"
        aside={<LiveBadge />}
        lead="Five real DevNet commands on a fresh invoice — create, attest, finance, then watch the ledger refuse a second pledge. Unique invoice number every run."
      />

      {ledgerConfig.useMocks ? (
        <div className="mb-6">
          <LedgerCallError
            error="Mock mode is on — live financing writes are disabled."
          />
          <p className="mt-3 text-sm text-ink-muted">
            Set <code className="font-mono text-ink-300">VITE_USE_MOCKS=false</code> and
            redeploy so judges see real Canton DevNet commands.
          </p>
        </div>
      ) : null}

      <div className="pane mb-8 px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="data-label">Session invoice</p>
            <p className="mt-2 font-mono text-lg text-lime">{invoiceNumber}</p>
            <p className="mt-2 text-xs text-ink-muted">
              Fresh identifier — never pre-pledged on DevNet
            </p>
          </div>
          <button
            type="button"
            onClick={startFreshRun}
            className="border border-white/10 px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-ink-muted transition-colors hover:border-white/20 hover:text-lime"
          >
            Start fresh run
          </button>
        </div>
        {session.invoiceCid ? (
          <div className="mt-4">
            <CopyableId value={session.invoiceCid} label="Invoice CID" />
          </div>
        ) : null}
      </div>

      {allDone ? (
        <div className="animate-rise-sm mb-8 border border-lime/30 bg-lime/[0.04] px-4 py-5 sm:px-6">
          <p className="font-display text-sm font-semibold uppercase tracking-[0.12em] text-lime">
            Full cycle complete on this invoice
          </p>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            Created → attested → financed → second pledge blocked — all live on Canton
            DevNet. Compare party views on{' '}
            <Link to="/" className="text-lime underline decoration-lime/30 underline-offset-2">
              Privacy
            </Link>
            .
          </p>
          {session.financingUpdateId ? (
            <div className="mt-4">
              <CopyableId value={session.financingUpdateId} label="Financing updateId" />
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-6">
        <StepPanel
          step={1}
          title="SME creates a fresh invoice"
          description="On-ledger Create Invoice · actAs SME + Debtor · unique invoiceNumber"
          status={statuses[0]}
          disabled={false}
          idleLabel="Create invoice on DevNet"
          onRun={runStep1}
        >
          {step1Result ? <CommandTerminal result={step1Result} /> : null}
        </StepPanel>

        <StepPanel
          step={2}
          title="SME proves unpledged for Lender A"
          description="ProveUnpledged attestation · then live ACS check: Lender A sees it, Lender B does not"
          status={statuses[1]}
          disabled={!step1Done}
          idleLabel="Generate attestation"
          onRun={runStep2}
        >
          {session.settledCount !== undefined ? (
            <p className="mt-4 font-mono text-sm text-ink-200">
              Attestation summary · settledCount {session.settledCount} · total{' '}
              {session.settledTotal}
            </p>
          ) : null}
          {session.attestationCid ? (
            <div className="mt-3">
              <CopyableId value={session.attestationCid} label="Attestation CID" />
            </div>
          ) : null}
          {step2Privacy ? (
            <div className="mt-4 border border-white/[0.06] px-4 py-3 font-mono text-xs">
              <p className="data-label mb-3">Live privacy check (ACS)</p>
              <p className={step2Privacy.lenderASeesAttestation ? 'text-lime' : 'text-negative'}>
                Lender A sees this attestation:{' '}
                {step2Privacy.lenderASeesAttestation ? 'YES' : 'NO'}
              </p>
              <p
                className={
                  !step2Privacy.lenderBSeesAttestation ? 'mt-2 text-lime' : 'mt-2 text-negative'
                }
              >
                Lender B sees this attestation:{' '}
                {step2Privacy.lenderBSeesAttestation ? 'YES' : 'NO'}
              </p>
              <p className="mt-2 text-ink-dim">
                Lender A invoices in ACS: {step2Privacy.lenderAInvoiceCount} · Lender B
                attestations: {step2Privacy.lenderBAttestationCount}
              </p>
              <p className="mt-3 text-ink-muted">
                Or confirm interactively on{' '}
                <Link
                  to="/"
                  className="text-ink-200 underline decoration-white/20 underline-offset-2 hover:text-lime"
                >
                  Privacy → View as
                </Link>
                .
              </p>
            </div>
          ) : null}
          {step2Result ? <CommandTerminal result={step2Result} /> : null}
        </StepPanel>

        <StepPanel
          step={3}
          title="Lender A creates a financing offer"
          description="FinancingOffer · advance 900.00 · Lender A only"
          status={statuses[2]}
          disabled={!step2Done}
          idleLabel="Create financing offer"
          onRun={runStep3}
        >
          {session.offerCid ? (
            <div className="mt-4">
              <CopyableId value={session.offerCid} label="Offer CID" />
            </div>
          ) : null}
          {step3Result ? <CommandTerminal result={step3Result} /> : null}
        </StepPanel>

        <StepPanel
          step={4}
          title="SME completes financing"
          description="CompleteFinancing → PledgeMarker · funding succeeds on this fresh invoice"
          status={statuses[3]}
          disabled={!step3Done}
          idleLabel="Complete financing"
          onRun={runStep4}
        >
          {session.pledgeMarkerCid ? (
            <div className="animate-rise-sm mt-4">
              <p className="animate-pop mb-2 font-display text-sm font-semibold uppercase tracking-wider text-lime">
                Funding succeeded
              </p>
              <CopyableId value={session.pledgeMarkerCid} label="PledgeMarker CID" />
            </div>
          ) : null}
          {step4Result ? <CommandTerminal result={step4Result} /> : null}
        </StepPanel>

        <StepPanel
          step={5}
          title="Second pledge on the same invoice"
          description="Same invoice · expect live HTTP 400 from Canton — fraud blocked"
          status={statuses[4]}
          disabled={!step4Done}
          idleLabel="Attempt second pledge"
          onRun={runStep5}
        >
          {step5Result ? (
            <>
              {step5Result.ok ? (
                <p className="mt-4 text-sm text-negative">
                  Unexpected success — double pledge should have been blocked
                </p>
              ) : (
                <p className="animate-pop mt-4 font-display text-sm font-semibold uppercase tracking-wider text-lime">
                  Fraud blocked on invoice you just financed
                </p>
              )}
              <CommandTerminal result={step5Result} />
            </>
          ) : null}
        </StepPanel>
      </div>

      {stepError ? (
        <div className="mt-6">
          <LedgerCallError error={stepError} onRetry={retryFailed} />
        </div>
      ) : null}
    </div>
  )
}
