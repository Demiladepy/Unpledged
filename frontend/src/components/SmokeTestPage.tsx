import { useState } from 'react'
import { smokeTestLedgerEnd } from '../ledger/auth'
import { ledgerConfig } from '../ledger/config'

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
      <header className="mb-6 border-l-2 border-accent pl-4">
        <h2 className="text-xl font-semibold text-ink-100">Ledger smoke test</h2>
        <p className="mt-1 text-sm text-ink-400">
          Verifies POST /api/token → Bearer → GET /v2/state/ledger-end. Run with{' '}
          <code className="font-mono text-ink-300">npm run dev</code> so the
          token proxy is active. UI still uses mocks until{' '}
          <code className="font-mono text-ink-300">VITE_USE_MOCKS=false</code>.
        </p>
      </header>

      <dl className="mb-4 space-y-2 border border-surface-700 bg-surface-900 p-4 text-sm">
        <div>
          <dt className="text-[10px] uppercase tracking-wider text-ink-500">
            REST base
          </dt>
          <dd className="font-mono text-ink-200">{ledgerConfig.baseUrl}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wider text-ink-500">
            Token proxy
          </dt>
          <dd className="font-mono text-ink-200">POST /api/token</dd>
        </div>
      </dl>

      <button
        type="button"
        disabled={running}
        onClick={() => void run()}
        className="bg-accent px-4 py-2 text-xs font-semibold uppercase tracking-wider text-ink-100 hover:bg-accent-muted disabled:opacity-50"
      >
        {running ? 'Running…' : 'Run ledger-end smoke test'}
      </button>

      {result && (
        <pre className="mt-4 border border-surface-600 bg-surface-800 p-4 font-mono text-xs text-ink-200">
          {result}
        </pre>
      )}
    </div>
  )
}
