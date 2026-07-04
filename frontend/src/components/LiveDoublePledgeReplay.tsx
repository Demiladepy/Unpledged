import { useCallback, useEffect, useRef, useState } from 'react'

import { attemptDoublePledgeLive, listPledgeMarkers } from '../ledger/api'
import { PARTIES } from '../ledger/parties'
import type {
  LiveDoublePledgeLogLine,
  LiveDoublePledgeResult,
} from '../types/ledger'

function formatTs(iso: string): string {
  try {
    return new Date(iso).toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, 'Z')
  } catch {
    return iso
  }
}

function lineClass(variant: LiveDoublePledgeLogLine['variant']): string {
  switch (variant) {
    case 'lime':
      return 'text-lime'
    case 'success':
      return 'text-lime'
    case 'error':
      return 'text-negative'
    case 'muted':
      return 'text-ink-dim'
    default:
      return 'text-ink-300'
  }
}

async function streamText(
  text: string,
  onChunk: (chunk: string) => void,
  chunkSize = 24,
  delayMs = 10,
): Promise<void> {
  for (let i = 0; i < text.length; i += chunkSize) {
    onChunk(text.slice(i, i + chunkSize))
    await new Promise((resolve) => setTimeout(resolve, delayMs))
  }
}

interface LiveDoublePledgeReplayProps {
  /** Tighter layout for home page embed */
  compact?: boolean
  className?: string
}

export function LiveDoublePledgeReplay({
  compact = false,
  className = '',
}: LiveDoublePledgeReplayProps) {
  const [markerCount, setMarkerCount] = useState<number | null>(null)
  const [lines, setLines] = useState<LiveDoublePledgeLogLine[]>([])
  const [streamedBody, setStreamedBody] = useState('')
  const [result, setResult] = useState<LiveDoublePledgeResult | null>(null)
  const [attempting, setAttempting] = useState(false)
  const [streamingBody, setStreamingBody] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const terminalRef = useRef<HTMLPreElement>(null)

  const refreshMarkerCount = useCallback(async () => {
    const markers = await listPledgeMarkers(PARTIES.LENDER_A)
    setMarkerCount(markers.length)
  }, [])

  useEffect(() => {
    void refreshMarkerCount().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : String(err))
    })
  }, [refreshMarkerCount])

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [lines, streamedBody, streamingBody])

  async function runLiveAttempt() {
    setAttempting(true)
    setError(null)
    setResult(null)
    setLines([])
    setStreamedBody('')
    setStreamingBody(false)

    const startedAt = new Date().toISOString()
    setLines([
      {
        timestamp: startedAt,
        text: '─── live ledger session ───',
        variant: 'lime',
      },
    ])

    try {
      const countBefore = markerCount
      const live = await attemptDoublePledgeLive((line) => {
        setLines((prev) => [...prev, line])
      })
      setResult(live)
      await refreshMarkerCount()

      setStreamingBody(true)
      setLines((prev) => [
        ...prev,
        {
          timestamp: new Date().toISOString(),
          text: '─── verbatim HTTP response body ───',
          variant: 'error',
        },
      ])
      await streamText(live.verbatimBody, (chunk) => {
        setStreamedBody((prev) => prev + chunk)
      })
      setStreamingBody(false)

      if (countBefore !== null && live.pledgeMarkerCountAfter !== countBefore) {
        setError(
          `Unexpected PledgeMarker count change: ${countBefore} → ${live.pledgeMarkerCountAfter}`,
        )
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setAttempting(false)
      setStreamingBody(false)
    }
  }

  const showTerminal = lines.length > 0 || streamedBody.length > 0

  return (
    <section className={['pane pane-interactive', className].filter(Boolean).join(' ')}>
      <div className="border-b border-white/10 px-4 py-4 sm:px-6">
        <p className="data-label">Live double-pledge replay</p>
        <p className="mt-2 text-sm text-ink-muted">
          {compact
            ? 'Re-submit CompleteFinancing on pledged INV-001 — ledger must refuse.'
            : 'Mirrors createFinancing.ts Part B: second FinancingOffer, then SME CompleteFinancing on the same invoice. Expect HTTP 400 from Canton DevNet.'}
        </p>
      </div>

      <div className="px-4 py-4 sm:px-6 sm:py-5">
        <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-sm">
          <span className="text-ink-muted">
            PledgeMarker count:{' '}
            <span className="text-lime">
              {markerCount === null ? '…' : markerCount}
            </span>
          </span>
          {result ? (
            <span className="text-ink-dim">
              after rejection:{' '}
              <span
                className={
                  result.pledgeMarkerCountAfter === result.pledgeMarkerCountBefore
                    ? 'text-lime'
                    : 'text-negative'
                }
              >
                {result.pledgeMarkerCountAfter}
              </span>
              {result.pledgeMarkerCountAfter === result.pledgeMarkerCountBefore
                ? ' — unchanged'
                : ' — UNEXPECTED'}
            </span>
          ) : null}
        </div>

        <button
          type="button"
          disabled={attempting || streamingBody}
          onClick={() => void runLiveAttempt()}
          className="btn-lime w-full justify-center sm:w-auto"
        >
          {attempting || streamingBody ? <span className="spinner" aria-hidden /> : null}
          {attempting
            ? 'Submitting to ledger…'
            : streamingBody
              ? 'Streaming response…'
              : 'Attempt second pledge (live)'}
        </button>

        {showTerminal ? (
          <div className="mt-5">
            <p className="data-label mb-2">
              Ledger session
              {result?.httpStatus ? ` · HTTP ${result.httpStatus}` : ''}
              {result?.blocked ? ' · REJECTED' : ''}
            </p>
            <pre
              ref={terminalRef}
              className="terminal-block max-h-[min(28rem,60vh)] overflow-y-auto"
            >
              {lines.map((line, index) => (
                <span
                  key={`${line.timestamp}-${index}`}
                  className="animate-fade block"
                >
                  <span className="text-ink-dim">{formatTs(line.timestamp)} </span>
                  <span className={lineClass(line.variant)}>{line.text}</span>
                </span>
              ))}
              {streamedBody ? (
                <span className="block text-negative">{streamedBody}</span>
              ) : null}
              {streamingBody ? (
                <span className="caret-blink ml-0.5 inline-block h-3 w-2 align-middle bg-lime" />
              ) : null}
            </pre>

            {result ? (
              <dl className="mt-4 grid gap-2 font-mono text-xs text-ink-dim sm:grid-cols-2">
                <div>
                  <dt className="data-label">commandId</dt>
                  <dd className="mt-1 break-all text-ink-muted">{result.commandId}</dd>
                </div>
                {result.correlationId ? (
                  <div>
                    <dt className="data-label">correlationId</dt>
                    <dd className="mt-1 break-all text-ink-muted">
                      {result.correlationId}
                    </dd>
                  </div>
                ) : null}
                {result.traceId ? (
                  <div>
                    <dt className="data-label">traceId</dt>
                    <dd className="mt-1 break-all text-ink-muted">{result.traceId}</dd>
                  </div>
                ) : null}
              </dl>
            ) : null}
          </div>
        ) : null}

        {error ? (
          <pre className="terminal-block mt-4 text-negative">{error}</pre>
        ) : null}
      </div>
    </section>
  )
}
