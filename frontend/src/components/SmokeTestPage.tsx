import { useState } from 'react'
import { smokeTestLedgerEnd } from '../ledger/auth'
import { ledgerConfig } from '../ledger/config'
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
        lead={
          <>
            Verifies <span className="font-mono text-ink-300">POST /api/token</span>{' '}
            → Bearer → <span className="font-mono text-ink-300">GET /v2/state/ledger-end</span>.
            Requires <span className="font-mono text-ink-300">npm run dev</span> so the
            token proxy is active. UI mode:{' '}
            <span className="font-medium text-ink-200">
              {ledgerConfig.useMocks ? 'mock data' : 'live DevNet'}
            </span>
            .
          </>
        }
      />

      <dl className="card mb-5 space-y-4 p-5 text-sm">
        <div>
          <dt className="label-muted">REST base</dt>
          <dd className="mt-1 font-mono text-sm text-ink-200">{ledgerConfig.baseUrl}</dd>
        </div>
        <div>
          <dt className="label-muted">Token proxy</dt>
          <dd className="mt-1 font-mono text-sm text-ink-200">POST /api/token</dd>
        </div>
      </dl>

      <button
        type="button"
        disabled={running}
        onClick={() => void run()}
        className="btn-primary"
      >
        {running ? 'Running…' : 'Run smoke test'}
      </button>

      {result ? (
        <pre
          className={[
            'card mt-5 overflow-x-auto p-5 font-mono text-xs leading-relaxed',
            result.startsWith('SUCCESS') ? 'text-positive' : 'text-negative',
          ].join(' ')}
        >
          {result}
        </pre>
      ) : null}
    </div>
  )
}
