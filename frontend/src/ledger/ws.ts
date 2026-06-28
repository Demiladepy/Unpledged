import { getAccessToken } from './auth'
import { ledgerConfig } from './config'

/**
 * Canton JSON Ledger API WebSocket with JWT subprotocol auth.
 *
 * CRITICAL — subprotocol order is load-bearing (fails silently if wrong):
 *   1. `jwt.token.<ACCESS_TOKEN>`
 *   2. `daml.ws.auth`
 *
 * @see Five North sandbox docs — ordering must not be reversed.
 */
export async function createAuthenticatedLedgerWebSocket(
  path: string,
): Promise<WebSocket> {
  const token = await getAccessToken()
  const base = ledgerConfig.wsBaseUrl.replace(/\/$/, '')
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const url = `${base}${normalizedPath}`

  // ORDER MATTERS — do not reorder these subprotocols.
  const subprotocols = [`jwt.token.${token}`, 'daml.ws.auth']

  return new WebSocket(url, subprotocols)
}
