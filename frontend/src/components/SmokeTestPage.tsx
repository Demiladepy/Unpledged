import { useState } from 'react'
import { smokeTestLedgerEnd } from '../ledger/auth'
import { ledgerConfig } from '../ledger/config'
import { partiesConfigured } from '../ledger/parties'
import { LiveBadge } from './LiveBadge'
import { PageHeader } from './PageHeader'

export function SmokeTestPage() {
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  async function run() {
    setRunning(true)
    setResult(null)
    const out = await smokeTestLedgerEnd()
    if (out.ok) {
      setResult(`SUCCESS — ledger-end offset: ${out.offset}`)
    } else {
      setResult(
        `FAILED (HTTP ${out.status ?? 'n/a'}): ${out.error ?? 'unknown error'}`,
      )
    }
    setRunning(false)
  }

  return (
    <div className="max-w-2xl">
      <PageHeader
        eyebrow="Diagnostics"
        title="Ledger connection"
        aside={<LiveBadge />}
        lead={
          <>
            Verifies{' '}
            <span className="font-mono text-ink-300">POST /api/token</span> → Bearer →{' '}
            <span className="font-mono text-ink-300">GET /v2/state/ledger-end</span>.
            Requires{' '}
            <span className="font-mono text-ink-300">npm run dev</span>. UI mode:{' '}
            <span className="text-ink-200">
              {ledgerConfig.useMocks ? 'mock data' : 'live DevNet'}
            </span>
            .
          </>
        }
      />

      <dl className="pane mb-6 space-y-5 p-6 text-sm">
        <div>
          <dt className="data-label">Browser path</dt>
          <dd className="mt-2 font-mono text-xs text-ink-200">{ledgerConfig.baseUrl}</dd>
        </div>
        <div>
          <dt className="data-label">DevNet host</dt>
          <dd className="mt-2 font-mono text-xs text-ink-200">
            {ledgerConfig.remoteBaseUrl}
          </dd>
        </div>
        <div>
          <dt className="data-label">Token proxy</dt>
          <dd className="mt-2 font-mono text-xs text-ink-200">POST /api/token</dd>
        </div>
        <div>
          <dt className="data-label">Parties configured</dt>
          <dd className="mt-2 font-mono text-xs text-ink-200">
            {partiesConfigured() ? 'yes (VITE_PARTY_*)' : 'no — run npm run allocate:parties'}
          </dd>
        </div>
      </dl>

      <button
        type="button"
        disabled={running}
        onClick={() => void run()}
        className="btn-lime"
      >
        {running ? <span className="spinner" aria-hidden /> : null}
        {running ? 'Running…' : 'Run smoke test'}
      </button>

      {result ? (
        <pre
          className={[
            'terminal-block mt-6',
            result.startsWith('SUCCESS') ? 'text-lime' : 'text-negative',
          ].join(' ')}
        >
          {result}
        </pre>
      ) : null}
    </div>
  )
}
