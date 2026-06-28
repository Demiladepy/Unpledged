import { ledgerConfig } from './config'

interface CachedToken {
  accessToken: string
  /** epoch ms when token should be treated as expired */
  expiresAt: number
}

let cache: CachedToken | null = null
let inFlight: Promise<string> | null = null

/** Refresh ~1 hour before the 8-hour expiry (or when expires_in is shorter). */
function refreshSkewMs(expiresInSeconds: number): number {
  const oneHour = 60 * 60 * 1000
  const ttlMs = expiresInSeconds * 1000
  return Math.min(oneHour, Math.max(60_000, ttlMs * 0.125))
}

function isCacheValid(): boolean {
  if (!cache) {
    return false
  }
  return Date.now() < cache.expiresAt
}

async function fetchTokenFromProxy(): Promise<CachedToken> {
  const response = await fetch('/api/token', { method: 'POST' })
  const payload = (await response.json()) as {
    access_token?: string
    expires_in?: number
    error?: string
  }

  if (!response.ok || !payload.access_token) {
    throw new Error(
      payload.error ??
        `POST /api/token failed (${response.status}): ${JSON.stringify(payload)}`,
    )
  }

  const expiresIn = payload.expires_in ?? 28_800
  const skew = refreshSkewMs(expiresIn)

  return {
    accessToken: payload.access_token,
    expiresAt: Date.now() + expiresIn * 1000 - skew,
  }
}

/** Invalidate cached token (e.g. after 401). */
export function invalidateAccessToken(): void {
  cache = null
}

/**
 * Returns a valid bearer token via the server-side proxy.
 * Auto-refreshes before expiry (~7h on an 8h token).
 */
export async function getAccessToken(): Promise<string> {
  if (isCacheValid() && cache) {
    return cache.accessToken
  }

  if (!inFlight) {
    inFlight = (async () => {
      const next = await fetchTokenFromProxy()
      cache = next
      return next.accessToken
    })().finally(() => {
      inFlight = null
    })
  }

  return inFlight
}

export interface SmokeTestResult {
  ok: boolean
  offset?: number
  status?: number
  error?: string
}

/**
 * Browser smoke test: GET /v2/state/ledger-end with a live token.
 * Call from /smoke route while `npm run dev` is running.
 */
export async function smokeTestLedgerEnd(): Promise<SmokeTestResult> {
  try {
    const token = await getAccessToken()
    const url = `${ledgerConfig.baseUrl.replace(/\/$/, '')}/v2/state/ledger-end`
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    })

    const text = await response.text()
    if (!response.ok) {
      if (response.status === 401) {
        invalidateAccessToken()
      }
      return {
        ok: false,
        status: response.status,
        error: text.slice(0, 500),
      }
    }

    const data = JSON.parse(text) as { offset?: number }
    return { ok: true, status: response.status, offset: data.offset }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}
