import createClient from 'openapi-fetch'
import { getAccessToken, invalidateAccessToken } from './auth'
import { ledgerConfig } from './config'
import type { paths } from './openapi-types'

/**
 * openapi-fetch client for Canton JSON Ledger API v2.
 * Authorization is injected per-request from the token manager (via /api/token proxy).
 * On 401, invalidates cache and retries once with a fresh token — critical for
 * hosted judging sessions that span the 8h OAuth expiry.
 */
export const ledgerClient = createClient<paths>({
  baseUrl: ledgerConfig.baseUrl,
})

ledgerClient.use({
  async onRequest({ request }) {
    const token = await getAccessToken()
    request.headers.set('Authorization', `Bearer ${token}`)
    return request
  },
  async onResponse({ request, response }) {
    if (response.status !== 401) {
      return response
    }
    if (request.headers.get('X-Unpledged-Token-Retry') === '1') {
      return response
    }

    invalidateAccessToken()
    const token = await getAccessToken()
    const headers = new Headers(request.headers)
    headers.set('Authorization', `Bearer ${token}`)
    headers.set('X-Unpledged-Token-Retry', '1')
    return fetch(new Request(request, { headers }))
  },
})

export function newCommandId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`
}
