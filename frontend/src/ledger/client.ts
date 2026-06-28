import createClient from 'openapi-fetch'
import { getAccessToken, invalidateAccessToken } from './auth'
import { ledgerConfig } from './config'
import type { paths } from './openapi-types'

/**
 * openapi-fetch client for Canton JSON Ledger API v2.
 * Authorization is injected per-request from the token manager (via /api/token proxy).
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
  onResponse({ response }) {
    if (response.status === 401) {
      invalidateAccessToken()
    }
    return response
  },
})

export function newCommandId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`
}
