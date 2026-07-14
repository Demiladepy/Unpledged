import { humanizeLedgerError } from '../ledger/errors'

interface LedgerCallErrorProps {
  error: unknown
  onRetry?: () => void
  className?: string
}

/**
 * Institutional failure panel — never a blank screen or raw unstyled throw.
 */
export function LedgerCallError({
  error,
  onRetry,
  className = '',
}: LedgerCallErrorProps) {
  const { title, detail, hint } = humanizeLedgerError(error)

  return (
    <div
      role="alert"
      className={['pane animate-rise-sm border-negative/25', className]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="border-b border-white/10 px-4 py-3 sm:px-5">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-negative">
          {title}
        </p>
        {hint ? (
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">{hint}</p>
        ) : null}
      </div>
      <pre className="terminal-block max-h-48 overflow-y-auto text-xs text-negative">
        {detail}
      </pre>
      {onRetry ? (
        <div className="border-t border-white/10 px-4 py-3 sm:px-5">
          <button type="button" onClick={onRetry} className="btn-lime">
            Retry
          </button>
        </div>
      ) : null}
    </div>
  )
}
