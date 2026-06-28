/**
 * Auth diagnostic for first-create PERMISSION_DENIED.
 * Run: npx tsx server/diagnoseAuth.ts
 */

import { randomUUID } from 'node:crypto'
import { config as loadDotenv } from 'dotenv'
import { TEMPLATE_IDS } from '../src/ledger/packageId.js'
import {
  exchangeClientCredentials,
  loadTokenExchangeConfig,
} from './tokenProxy.js'

loadDotenv({ path: '.env' })
loadDotenv({ path: '.env.server', override: true })

const LEDGER_REST_BASE =
  process.env.CANTON_LEDGER_REST_URL ??
  'https://ledger-api.validator.devnet.sandbox.fivenorth.io'

const OLD_USER_ID = process.env.VITE_CANTON_USER_ID ?? 'ledger-api-user'
const SME = process.env.VITE_PARTY_SME!
const DEBTOR = process.env.VITE_PARTY_DEBTOR!

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

function decodeJwtPayload(accessToken: string): Record<string, unknown> {
  const parts = accessToken.split('.')
  if (parts.length < 2) {
    throw new Error('Not a JWT')
  }
  const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/')
  const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4)
  return JSON.parse(Buffer.from(padded, 'base64').toString('utf8')) as Record<
    string,
    unknown
  >
}

function pickUserIdFromClaims(claims: Record<string, unknown>): string {
  const candidates = [
    claims.sub,
    claims.user_id,
    claims.userId,
    claims.preferred_username,
    claims.client_id,
    claims.azp,
  ]
  for (const c of candidates) {
    if (typeof c === 'string' && c.length > 0) {
      return c
    }
  }
  throw new Error('Could not determine userId from JWT claims')
}

async function submitInvoice(
  accessToken: string,
  userId: string,
): Promise<{ status: number; body: string }> {
  const jsCommands = {
    commandId: `unpledged-first-invoice-${randomUUID()}`,
    userId,
    actAs: [SME, DEBTOR],
    commands: [
      {
        CreateCommand: {
          templateId: TEMPLATE_IDS.Invoice,
          createArguments: {
            owner: SME,
            debtor: DEBTOR,
            amount: '1000.00',
            dueDate: '2026-01-31',
            invoiceNumber: 'INV-001',
            settledOn: '2026-01-20',
          },
        },
      },
    ],
  }

  const res = await fetch(ledgerUrl('/v2/commands/submit-and-wait'), {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify(jsCommands),
  })
  return { status: res.status, body: await res.text() }
}

async function listUserRights(
  accessToken: string,
  userId: string,
): Promise<{ status: number; body: string }> {
  const res = await fetch(
    ledgerUrl(`/v2/users/${encodeURIComponent(userId)}/rights`),
    { headers: authHeaders(accessToken) },
  )
  return { status: res.status, body: await res.text() }
}

async function main(): Promise<void> {
  console.log('=== Auth diagnostic (ordered) ===\n')

  const token = await exchangeClientCredentials(loadTokenExchangeConfig())
  const claims = decodeJwtPayload(token.access_token)

  console.log('STEP 1 — JWT payload (no signature):')
  console.log(JSON.stringify(claims, null, 2))
  console.log()
  console.log('Key claims:')
  console.log(`  sub:              ${String(claims.sub ?? '(missing)')}`)
  console.log(`  scope:            ${String(claims.scope ?? '(missing)')}`)
  console.log(`  client_id / azp:  ${String(claims.client_id ?? claims.azp ?? '(missing)')}`)
  console.log(`  actAs claim:      ${JSON.stringify(claims.actAs ?? claims.act_as ?? '(missing)')}`)
  console.log(`  readAs claim:     ${JSON.stringify(claims.readAs ?? claims.read_as ?? '(missing)')}`)
  console.log()

  const tokenUserId = pickUserIdFromClaims(claims)
  console.log('STEP 2 — userId for JsCommands:')
  console.log(`  VITE_CANTON_USER_ID (old):  ${OLD_USER_ID}`)
  console.log(`  JWT-derived userId:         ${tokenUserId}`)
  console.log(
    tokenUserId === OLD_USER_ID
      ? '  → same value; mismatch is NOT the issue'
      : '  → MISMATCH — retrying create with JWT-derived userId',
  )
  console.log()

  if (tokenUserId !== OLD_USER_ID) {
    console.log(`Retrying POST /v2/commands/submit-and-wait with userId="${tokenUserId}"`)
    const retry = await submitInvoice(token.access_token, tokenUserId)
    console.log(`HTTP ${retry.status}`)
    console.log('Response body (verbatim):')
    console.log(retry.body)

    if (retry.status >= 200 && retry.status < 300) {
      console.log('\nSUCCESS on retry — userId fix worked.')
      return
    }
    console.log('\nRetry still failed — escalating to step 3.\n')
  } else {
    console.log('Skipping retry (userId already matches JWT). Probing create with token userId anyway:')
    const probe = await submitInvoice(token.access_token, tokenUserId)
    console.log(`HTTP ${probe.status}`)
    console.log(probe.body)
    if (probe.status >= 200 && probe.status < 300) {
      console.log('\nSUCCESS')
      return
    }
    console.log('\nCreate failed — escalating to step 3.\n')
  }

  console.log('STEP 3 — GET /v2/users/{userId}/rights (read only, no grants)')
  for (const uid of [tokenUserId, OLD_USER_ID]) {
    console.log(`\n--- rights for userId: ${uid} ---`)
    const rights = await listUserRights(token.access_token, uid)
    console.log(`HTTP ${rights.status}`)
    console.log(rights.body)
  }

  console.log('\nIf CanActAs is missing for SME/Debtor, grant via:')
  console.log('  POST /v2/users/{userId}/rights')
  console.log('  body: { "rights": [ { "kind": { "CanActAs": { "value": { "party": "<partyId>" } } } } ] }')
  console.log('(Do not call until confirmed — report above first.)')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
