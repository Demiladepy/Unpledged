/**
 * Shared CLI helpers for live DevNet scripts.
 */

import { randomUUID } from 'node:crypto'
import { config as loadDotenv } from 'dotenv'
import { PACKAGE_ID } from '../src/ledger/packageId.js'
import {
  exchangeClientCredentials,
  loadTokenExchangeConfig,
} from './tokenProxy.js'

loadDotenv({ path: '.env' })
loadDotenv({ path: '.env.server', override: true })

export const LEDGER_REST_BASE =
  process.env.CANTON_LEDGER_REST_URL ??
  'https://ledger-api.validator.devnet.sandbox.fivenorth.io'

export const USER_ID = process.env.VITE_CANTON_USER_ID ?? '6'
export const SME = process.env.VITE_PARTY_SME ?? ''
export const DEBTOR = process.env.VITE_PARTY_DEBTOR ?? ''
export const LENDER_A = process.env.VITE_PARTY_LENDER_A ?? ''
export const LENDER_B = process.env.VITE_PARTY_LENDER_B ?? ''

/** Commands (create/exercise): package-id hash format. */
export const TEMPLATE_IDS = {
  Invoice: `${PACKAGE_ID}:Invoice:Invoice`,
  AttestationFactory: `${PACKAGE_ID}:Attestation:AttestationFactory`,
  UnpledgedAttestation: `${PACKAGE_ID}:Attestation:UnpledgedAttestation`,
  FinancingOffer: `${PACKAGE_ID}:Financing:FinancingOffer`,
  FinancingCoordinator: `${PACKAGE_ID}:Financing:FinancingCoordinator`,
  PledgeRegistry: `${PACKAGE_ID}:Financing:PledgeRegistry`,
  PledgeMarker: `${PACKAGE_ID}:Financing:PledgeMarker`,
} as const

/** ACS TemplateFilter queries: package-name format (#unpledged:...). */
export const TEMPLATE_QUERY_IDS = {
  Invoice: '#unpledged:Invoice:Invoice',
  UnpledgedAttestation: '#unpledged:Attestation:UnpledgedAttestation',
  FinancingOffer: '#unpledged:Financing:FinancingOffer',
  FinancingCoordinator: '#unpledged:Financing:FinancingCoordinator',
  PledgeRegistry: '#unpledged:Financing:PledgeRegistry',
  PledgeMarker: '#unpledged:Financing:PledgeMarker',
} as const

const FETCH_TIMEOUT_MS = 60_000

export interface CreatedEventRow {
  contractId: string
  templateId?: string
  createArgument?: Record<string, unknown>
}

export function ledgerUrl(path: string): string {
  return `${LEDGER_REST_BASE.replace(/\/$/, '')}${path}`
}

export function authHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }
}

export async function ledgerFetch(
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

export async function getAccessToken(): Promise<string> {
  const token = await exchangeClientCredentials(loadTokenExchangeConfig())
  return token.access_token
}

export async function getLedgerEndOffset(token: string): Promise<number> {
  const res = await ledgerFetch(ledgerUrl('/v2/state/ledger-end'), {
    headers: authHeaders(token),
  })
  const text = await res.text()
  if (!res.ok) {
    throw new Error(`GET ledger-end failed (${res.status}): ${text}`)
  }
  const body = JSON.parse(text) as { offset?: number }
  return body.offset ?? 0
}

export async function queryAcsByTemplate(
  token: string,
  party: string,
  templateIdForQuery: string,
  activeAtOffset?: number,
): Promise<CreatedEventRow[]> {
  const offset =
    activeAtOffset ?? (await getLedgerEndOffset(token))

  const body = {
    activeAtOffset: offset,
    eventFormat: {
      filtersByParty: {
        [party]: {
          cumulative: [
            {
              identifierFilter: {
                TemplateFilter: {
                  value: { templateId: templateIdForQuery },
                },
              },
            },
          ],
        },
      },
      verbose: true,
    },
  }

  const res = await ledgerFetch(ledgerUrl('/v2/state/active-contracts'), {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(body),
  })
  const text = await res.text()
  if (!res.ok) {
    throw new Error(`ACS query failed (${res.status}): ${text}`)
  }

  const rows = JSON.parse(text) as Array<{
    contractEntry?: {
      JsActiveContract?: { createdEvent?: CreatedEventRow }
    }
  }>

  return rows
    .map((r) => r.contractEntry?.JsActiveContract?.createdEvent)
    .filter((e): e is CreatedEventRow => e !== undefined)
}

export async function submitAndWait(
  token: string,
  actAs: string[],
  commands: unknown[],
  label: string,
): Promise<{ status: number; body: string }> {
  const jsCommands = {
    commandId: `unpledged-${label}-${randomUUID()}`,
    userId: USER_ID,
    actAs,
    commands,
  }

  console.log('POST /v2/commands/submit-and-wait')
  console.log(JSON.stringify(jsCommands, null, 2))
  console.log()

  const res = await ledgerFetch(ledgerUrl('/v2/commands/submit-and-wait'), {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(jsCommands),
  })
  const body = await res.text()
  console.log(`HTTP ${res.status}`)
  console.log('Response body (verbatim):')
  console.log(body)
  return { status: res.status, body }
}

export function requireParties(): void {
  if (!SME || !DEBTOR || !LENDER_A || !LENDER_B) {
    throw new Error('All VITE_PARTY_* vars must be set in .env')
  }
}
