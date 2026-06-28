/**
 * One-off party allocation for Five North DevNet.
 *
 * Run: npm run allocate:parties
 *
 * Allocates SME, Debtor, LenderA, LenderB via POST /v2/parties,
 * verifies GET /v2/parties?filter-party=<hint> (isLocal),
 * probes act-as via active-contracts, then writes VITE_PARTY_* into .env.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { config as loadDotenv } from 'dotenv'
import {
  exchangeClientCredentials,
  loadTokenExchangeConfig,
} from './tokenProxy.js'

loadDotenv({ path: '.env.server', override: true })

const LEDGER_REST_BASE =
  process.env.CANTON_LEDGER_REST_URL ??
  'https://ledger-api.validator.devnet.sandbox.fivenorth.io'

const FETCH_TIMEOUT_MS = 30_000

const PARTY_HINTS = ['SME', 'Debtor', 'LenderA', 'LenderB'] as const
type PartyHint = (typeof PARTY_HINTS)[number]

const ENV_KEYS: Record<PartyHint, string> = {
  SME: 'VITE_PARTY_SME',
  Debtor: 'VITE_PARTY_DEBTOR',
  LenderA: 'VITE_PARTY_LENDER_A',
  LenderB: 'VITE_PARTY_LENDER_B',
}

interface PartyDetails {
  party: string
  isLocal?: boolean
  identityProviderId?: string
}

interface AllocatePartyResponse {
  partyDetails: PartyDetails
}

interface ListKnownPartiesResponse {
  partyDetails: PartyDetails[]
  nextPageToken?: string
}

interface CantonErrorBody {
  code?: string
  cause?: string
  message?: string
  context?: Record<string, unknown>
}

function ledgerUrl(path: string): string {
  return `${LEDGER_REST_BASE.replace(/\/$/, '')}${path}`
}

function authHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }
}

async function ledgerFetch(
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(
        `Request timed out after ${FETCH_TIMEOUT_MS}ms: ${url}`,
      )
    }
    throw error
  } finally {
    clearTimeout(timer)
  }
}

async function parseResponse<T>(
  response: Response,
): Promise<{ ok: true; data: T } | { ok: false; status: number; body: string }> {
  const body = await response.text()
  if (!response.ok) {
    return { ok: false, status: response.status, body }
  }
  return { ok: true, data: JSON.parse(body) as T }
}

function formatApiFailure(
  step: string,
  status: number,
  body: string,
): string {
  let detail = body
  try {
    const parsed = JSON.parse(body) as CantonErrorBody
    detail = JSON.stringify(parsed, null, 2)
  } catch {
    // keep raw text
  }
  return [`FAILED at ${step}`, `HTTP ${status}`, detail].join('\n')
}

function isPermissionError(status: number, body: string): boolean {
  if (status === 401 || status === 403) {
    return true
  }
  const lower = body.toLowerCase()
  return (
    lower.includes('permission') ||
    lower.includes('denied') ||
    lower.includes('unauthorized') ||
    lower.includes('forbidden') ||
    lower.includes('participantadmin')
  )
}

function printPermissionGuidance(step: string, status: number, body: string): void {
  console.error('\n=== PARTY ALLOCATION RESTRICTED ===')
  console.error(formatApiFailure(step, status, body))
  console.error(`
Your M2M token cannot ${step.toLowerCase()} on this sandbox.

This is NOT a code bug — Five North may require them to provision parties for you.

Ask Jatin on Discord:
  "Can my M2M user (validator-devnet-m2m) self-allocate parties via POST /v2/parties,
   or do you provision them? If provisioned, can I get 4 party IDs for
   SME / Debtor / LenderA / LenderB?"

You can keep working on everything else while waiting for party IDs.
`)
}

function findPartyByHint(
  parties: PartyDetails[],
  hint: PartyHint,
): PartyDetails | undefined {
  const prefix = `${hint}::`
  return parties.find((p) => p.party === hint || p.party.startsWith(prefix))
}

async function listPartiesForHint(
  token: string,
  hint: PartyHint,
): Promise<PartyDetails[]> {
  const params = new URLSearchParams({
    'filter-party': hint,
    pageSize: '50',
  })
  const url = ledgerUrl(`/v2/parties?${params}`)

  const response = await ledgerFetch(url, { headers: authHeaders(token) })
  const parsed = await parseResponse<ListKnownPartiesResponse>(response)

  if (!parsed.ok) {
    if (isPermissionError(parsed.status, parsed.body)) {
      printPermissionGuidance(
        `list parties for "${hint}" (GET /v2/parties?filter-party=${hint})`,
        parsed.status,
        parsed.body,
      )
      process.exit(2)
    }
    console.error(
      formatApiFailure(`GET /v2/parties?filter-party=${hint}`, parsed.status, parsed.body),
    )
    process.exit(1)
  }

  return parsed.data.partyDetails
}

async function allocateParty(
  token: string,
  hint: PartyHint,
): Promise<PartyDetails> {
  const response = await ledgerFetch(ledgerUrl('/v2/parties'), {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({
      partyIdHint: hint,
      identityProviderId: '',
    }),
  })

  const parsed = await parseResponse<AllocatePartyResponse>(response)
  if (!parsed.ok) {
    if (isPermissionError(parsed.status, parsed.body)) {
      printPermissionGuidance(
        `allocate party "${hint}" (POST /v2/parties)`,
        parsed.status,
        parsed.body,
      )
      process.exit(2)
    }
    console.error(
      formatApiFailure(`POST /v2/parties (${hint})`, parsed.status, parsed.body),
    )
    process.exit(1)
  }

  return parsed.data.partyDetails
}

async function verifyActAs(token: string, partyId: string): Promise<void> {
  const ledgerEndRes = await ledgerFetch(ledgerUrl('/v2/state/ledger-end'), {
    headers: authHeaders(token),
  })
  const ledgerEnd = await parseResponse<{ offset?: number }>(ledgerEndRes)
  if (!ledgerEnd.ok) {
    if (isPermissionError(ledgerEnd.status, ledgerEnd.body)) {
      printPermissionGuidance('read ledger-end', ledgerEnd.status, ledgerEnd.body)
      process.exit(2)
    }
    console.error(
      formatApiFailure('GET /v2/state/ledger-end', ledgerEnd.status, ledgerEnd.body),
    )
    process.exit(1)
  }

  const body = {
    activeAtOffset: ledgerEnd.data.offset ?? 0,
    eventFormat: {
      filtersByParty: {
        [partyId]: {
          cumulative: [
            {
              identifierFilter: {
                WildcardFilter: { value: { includeCreatedEventBlob: false } },
              },
            },
          ],
        },
      },
      verbose: false,
    },
  }

  const acsRes = await ledgerFetch(ledgerUrl('/v2/state/active-contracts'), {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(body),
  })

  if (!acsRes.ok) {
    const text = await acsRes.text()
    if (isPermissionError(acsRes.status, text)) {
      printPermissionGuidance(
        `act as party ${partyId} (POST /v2/state/active-contracts)`,
        acsRes.status,
        text,
      )
      process.exit(2)
    }
    console.error(
      formatApiFailure(
        `POST /v2/state/active-contracts (${partyId})`,
        acsRes.status,
        text,
      ),
    )
    process.exit(1)
  }
}

function writePartyEnvVars(allocated: Record<PartyHint, string>): void {
  const envPath = resolve(process.cwd(), '.env')
  let content = ''
  try {
    content = readFileSync(envPath, 'utf8')
  } catch {
    content = ''
  }

  const lines = content.length > 0 ? content.split(/\r?\n/) : []
  const keyToValue = new Map<string, string>()

  for (const line of lines) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (match) {
      keyToValue.set(match[1], match[2])
    }
  }

  for (const hint of PARTY_HINTS) {
    keyToValue.set(ENV_KEYS[hint], allocated[hint])
  }

  const preservedOrder = lines
    .map((line) => {
      const match = line.match(/^([A-Z0-9_]+)=/)
      return match ? match[1] : null
    })
    .filter((k): k is string => k !== null)

  const allKeys = new Set(preservedOrder)
  for (const key of Object.values(ENV_KEYS)) {
    if (!allKeys.has(key)) {
      preservedOrder.push(key)
    }
  }

  const otherLines = lines.filter(
    (line) => line.trim() !== '' && !line.match(/^[A-Z0-9_]+=/),
  )

  const out: string[] = []
  for (const key of preservedOrder) {
    if (keyToValue.has(key)) {
      out.push(`${key}=${keyToValue.get(key)}`)
    }
  }
  for (const line of otherLines) {
    if (!out.includes(line)) {
      out.push(line)
    }
  }

  writeFileSync(envPath, `${out.join('\n')}\n`, 'utf8')
  console.log(`\nWrote party IDs to ${envPath}`)
}

async function main(): Promise<void> {
  console.log('=== Unpledged party allocation ===\n')

  console.log('Step 1: client_credentials token exchange')
  const token = await exchangeClientCredentials(loadTokenExchangeConfig())
  console.log(`  token: ${token.access_token.slice(0, 24)}…\n`)

  const allocated: Record<PartyHint, string> = {} as Record<PartyHint, string>

  console.log('Step 2: allocate parties (POST /v2/parties)')
  for (const hint of PARTY_HINTS) {
    const existing = findPartyByHint(
      await listPartiesForHint(token.access_token, hint),
      hint,
    )
    if (existing) {
      console.log(`  ${hint}: already exists → ${existing.party}`)
      allocated[hint] = existing.party
      continue
    }

    console.log(`  ${hint}: allocating…`)
    const details = await allocateParty(token.access_token, hint)
    console.log(
      `  ${hint}: ${details.party} (isLocal: ${details.isLocal ?? '?'})`,
    )
    allocated[hint] = details.party
  }

  console.log('\nStep 3: verify on participant (GET /v2/parties?filter-party=…)')
  let allLocal = true

  for (const hint of PARTY_HINTS) {
    const details = findPartyByHint(
      await listPartiesForHint(token.access_token, hint),
      hint,
    )
    if (!details) {
      console.error(`  MISSING: no party found for hint "${hint}"`)
      allLocal = false
      continue
    }
    const local = details.isLocal === true
    console.log(
      `  ${hint}: ${details.party}  isLocal=${String(details.isLocal)}`,
    )
    if (!local) {
      allLocal = false
      console.error(`    WARNING: expected isLocal=true for ${hint}`)
    }
  }

  if (!allLocal) {
    console.error(
      '\nNot all parties are local. Your token may not be able to act as them.',
    )
    process.exit(1)
  }

  console.log('\nStep 4: verify act-as (POST /v2/state/active-contracts per party)')
  for (const hint of PARTY_HINTS) {
    await verifyActAs(token.access_token, allocated[hint])
    console.log(`  ${hint}: act-as OK`)
  }

  console.log('\n=== Allocated party IDs ===')
  for (const hint of PARTY_HINTS) {
    console.log(`  ${hint}: ${allocated[hint]}`)
  }

  writePartyEnvVars(allocated)
  console.log('\nDone. Restart `npm run dev` if running — Vite reads .env at startup.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
