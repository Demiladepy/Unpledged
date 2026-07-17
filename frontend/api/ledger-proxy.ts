/**
 * Vercel serverless proxy for Canton JSON Ledger API.
 *
 * IMPORTANT: Non-Next.js Vercel projects do NOT support [...path] catch-alls.
 * Nested paths like /api/ledger/v2/state/ledger-end must be rewritten in
 * vercel.json to this single-segment function with ?path=...
 */

/// <reference types="node" />

/**
 * Vercel serverless proxy for Canton JSON Ledger API.
 *
 * IMPORTANT: Non-Next.js Vercel projects do NOT support [...path] catch-alls.
 * Nested paths like /api/ledger/v2/state/ledger-end must be rewritten in
 * vercel.json to this single-segment function with ?path=...
 */

const LEDGER_REST_BASE =
  process.env.CANTON_LEDGER_REST_URL ??
  process.env.VITE_CANTON_LEDGER_URL ??
  'https://ledger-api.validator.devnet.sandbox.fivenorth.io'

function extractLedgerPath(req: {
  query: { path?: string | string[] }
  url?: string
}): { ledgerPath: string; search: string } {
  const raw = req.query.path
  let ledgerPath = Array.isArray(raw) ? raw.join('/') : raw ?? ''

  // Some Vercel runtimes leave path encoded or empty; fall back to URL parse.
  if (!ledgerPath && req.url) {
    try {
      const u = new URL(req.url, 'http://localhost')
      const fromQuery = u.searchParams.get('path')
      if (fromQuery) {
        ledgerPath = fromQuery
      }
    } catch {
      /* ignore */
    }
  }

  ledgerPath = decodeURIComponent(ledgerPath).replace(/^\/+/, '')

  let search = ''
  if (req.url) {
    const q = req.url.indexOf('?')
    if (q >= 0) {
      const params = new URLSearchParams(req.url.slice(q + 1))
      params.delete('path')
      const rest = params.toString()
      if (rest) {
        search = `?${rest}`
      }
    }
  }

  return { ledgerPath, search }
}

export default async function handler(
  req: {
    method?: string
    headers: Record<string, string | string[] | undefined>
    body?: unknown
    query: { path?: string | string[] }
    url?: string
  },
  res: {
    status: (code: number) => {
      setHeader: (name: string, value: string) => void
      end: (body: string) => void
      json?: (body: unknown) => void
    }
    setHeader: (name: string, value: string) => void
  },
): Promise<void> {
  const { ledgerPath, search } = extractLedgerPath(req)

  if (!ledgerPath) {
    res.setHeader('Content-Type', 'application/json')
    res.status(400).end(
      JSON.stringify({
        error:
          'Missing ledger path. Expected rewrite /api/ledger/<path> → /api/ledger-proxy?path=<path>',
      }),
    )
    return
  }

  const target = `${LEDGER_REST_BASE.replace(/\/$/, '')}/${ledgerPath}${search}`

  const headers: Record<string, string> = { Accept: 'application/json' }
  const auth = req.headers.authorization
  if (typeof auth === 'string') {
    headers.Authorization = auth
  }
  const contentType = req.headers['content-type']
  if (typeof contentType === 'string') {
    headers['Content-Type'] = contentType
  }

  const method = req.method ?? 'GET'
  const init: RequestInit = { method, headers }

  if (method !== 'GET' && method !== 'HEAD' && req.body !== undefined) {
    init.body =
      typeof req.body === 'string' ? req.body : JSON.stringify(req.body)
  }

  try {
    const upstream = await fetch(target, init)
    const body = await upstream.text()

    res.setHeader('Content-Type', 'application/json')
    res.status(upstream.status).end(body)
  } catch (error) {
    res.setHeader('Content-Type', 'application/json')
    res.status(502).end(
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
        target,
      }),
    )
  }
}
