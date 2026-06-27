import createClient from 'openapi-fetch'
import { ledgerConfig } from './config'
import type { paths } from './openapi-types'

/**
 * openapi-fetch client for Canton JSON Ledger API v2.
 * @see https://docs.canton.network/sdks-tools/api-reference/json-api
 */
export const ledgerClient = createClient<paths>({
  baseUrl: ledgerConfig.baseUrl,
  headers: ledgerConfig.token
    ? { Authorization: `Bearer ${ledgerConfig.token}` }
    : undefined,
})

export function newCommandId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`
}
