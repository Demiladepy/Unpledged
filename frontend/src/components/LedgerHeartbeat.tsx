import { useEffect, useState } from 'react'

import { smokeTestLedgerEnd } from '../ledger/auth'
import { ledgerConfig } from '../ledger/config'

const POLL_MS = 30_000

function formatAgo(syncedAt: Date): string {
  const seconds = Math.floor((Date.now() - syncedAt.getTime()) / 1000)
  if (seconds < 5) return 'just now'
  if (seconds < 60) return `${seconds}s ago`
  return `${Math.floor(seconds / 60)}m ago`
}

export function LedgerHeartbeat() {
  const [offset, setOffset] = useState<number | null>(null)
  const [syncedAt, setSyncedAt] = useState<Date | null>(null)
  const [tick, setTick] = useState(0)
  const [stale, setStale] = useState(false)

  useEffect(() => {
    if (ledgerConfig.useMocks) {
      return
    }

    let cancelled = false

    async function pulse() {
      const result = await smokeTestLedgerEnd()
      if (cancelled) {
        return
      }
      if (result.ok && result.offset !== undefined) {
        setOffset(result.offset)
        setSyncedAt(new Date())
        setStale(false)
      } else {
        setStale(true)
      }
    }

    void pulse()
    const poll = setInterval(() => void pulse(), POLL_MS)
    const clock = setInterval(() => setTick((t) => t + 1), 5000)

    return () => {
      cancelled = true
      clearInterval(poll)
      clearInterval(clock)
    }
  }, [])

  if (ledgerConfig.useMocks) {
    return null
  }

  void tick

  if (stale && offset === null) {
    return (
      <span className="hidden font-mono text-[10px] uppercase tracking-wider text-negative sm:inline">
        DevNet unreachable
      </span>
    )
  }

  if (offset === null) {
    return (
      <span className="hidden font-mono text-[10px] uppercase tracking-wider text-ink-dim sm:inline">
        Syncing DevNet…
      </span>
    )
  }

  return (
    <span
      className="hidden font-mono text-[10px] tracking-wide text-ink-dim sm:inline"
      title="Live ledger-end from Canton DevNet"
    >
      <span className="text-ink-muted">offset</span>{' '}
      <span className="text-ink-200">{offset.toLocaleString()}</span>
      {syncedAt ? (
        <>
          {' '}
          <span className="text-ink-dim">· {formatAgo(syncedAt)}</span>
        </>
      ) : null}
    </span>
  )
}
