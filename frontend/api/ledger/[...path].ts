const LEDGER_REST_BASE =
  process.env.CANTON_LEDGER_REST_URL ??
  process.env.VITE_CANTON_LEDGER_URL ??
  'https://ledger-api.validator.devnet.sandbox.fivenorth.io'

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
    }
    setHeader: (name: string, value: string) => void
  },
): Promise<void> {
  const raw = req.query.path
  const segments = Array.isArray(raw) ? raw : raw ? [raw] : []
  const ledgerPath = segments.join('/')

  let search = ''
  if (req.url) {
    const q = req.url.indexOf('?')
    if (q >= 0) {
      search = req.url.slice(q)
    }
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
    res
      .status(502)
      .end(
        JSON.stringify({
          error: error instanceof Error ? error.message : String(error),
        }),
      )
  }
}
