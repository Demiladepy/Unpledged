/**
 * Grant CanActAs for all four demo parties to the M2M ledger user.
 * Run: npm run grant:act-as
 */

import { config as loadDotenv } from 'dotenv'
import {
  exchangeClientCredentials,
  loadTokenExchangeConfig,
} from './tokenProxy.js'

loadDotenv({ path: '.env' })
loadDotenv({ path: '.env.server', override: true })

const LEDGER_REST_BASE =
  process.env.CANTON_LEDGER_REST_URL ??
  'https://ledger-api.validator.devnet.sandbox.fivenorth.io'

const USER_ID = process.env.VITE_CANTON_USER_ID ?? '6'

const PARTIES = {
  SME: process.env.VITE_PARTY_SME,
  DEBTOR: process.env.VITE_PARTY_DEBTOR,
  LENDER_A: process.env.VITE_PARTY_LENDER_A,
  LENDER_B: process.env.VITE_PARTY_LENDER_B,
} as const

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

function canActAsRight(party: string) {
  return { kind: { CanActAs: { value: { party } } } }
}

function partyFromCanActAs(
  right: { kind?: Record<string, { value?: { party?: string } }> },
): string | undefined {
  return right.kind?.CanActAs?.value?.party
}

async function main(): Promise<void> {
  const partyIds = Object.values(PARTIES)
  if (partyIds.some((p) => !p)) {
    throw new Error('All VITE_PARTY_* vars must be set in .env')
  }

  console.log('=== Grant CanActAs for demo parties ===\n')
  console.log(`userId: ${USER_ID}`)
  for (const [name, id] of Object.entries(PARTIES)) {
    console.log(`  ${name}: ${id}`)
  }
  console.log()

  const token = await exchangeClientCredentials(loadTokenExchangeConfig())

  const grantBody = {
    userId: USER_ID,
    rights: partyIds.map((p) => canActAsRight(p!)),
  }

  console.log('POST /v2/users/6/rights')
  console.log('Request body:')
  console.log(JSON.stringify(grantBody, null, 2))
  console.log()

  const grantRes = await fetch(
    ledgerUrl(`/v2/users/${encodeURIComponent(USER_ID)}/rights`),
    {
      method: 'POST',
      headers: authHeaders(token.access_token),
      body: JSON.stringify(grantBody),
    },
  )
  const grantText = await grantRes.text()
  console.log(`HTTP ${grantRes.status}`)
  console.log('Response body (verbatim):')
  console.log(grantText)

  if (!grantRes.ok) {
    console.error('\nGrant FAILED.')
    process.exit(1)
  }

  console.log('\nGET /v2/users/6/rights (verify CanActAs for all 4)')
  const rightsRes = await fetch(
    ledgerUrl(`/v2/users/${encodeURIComponent(USER_ID)}/rights`),
    { headers: authHeaders(token.access_token) },
  )
  const rightsText = await rightsRes.text()
  if (!rightsRes.ok) {
    console.error(`Rights query FAILED HTTP ${rightsRes.status}: ${rightsText}`)
    process.exit(1)
  }

  const rights = JSON.parse(rightsText) as {
    rights?: Array<{ kind?: Record<string, { value?: { party?: string } }> }>
  }
  const actAsParties = new Set(
    (rights.rights ?? [])
      .map(partyFromCanActAs)
      .filter((p): p is string => Boolean(p)),
  )

  let allPresent = true
  for (const [name, id] of Object.entries(PARTIES)) {
    const present = actAsParties.has(id!)
    console.log(`  ${name}: CanActAs ${present ? 'YES' : 'MISSING'}`)
    if (!present) {
      allPresent = false
    }
  }

  if (!allPresent) {
    console.error(
      '\nGrant response succeeded but not all parties have CanActAs — check verbatim grant response above.',
    )
    process.exit(1)
  }

  console.log('\nAll four CanActAs rights confirmed.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
