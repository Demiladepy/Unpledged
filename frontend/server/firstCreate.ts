/**
 * First real contract on DevNet — ONE Invoice only.
 *
 * Run: npm run create:invoice
 *
 * Uses POST /v2/commands/submit-and-wait, then queries ACS as SME.
 */

import { randomUUID } from 'node:crypto'
import { config as loadDotenv } from 'dotenv'
import { PACKAGE_ID, TEMPLATE_IDS } from '../src/ledger/packageId.js'
import {
  exchangeClientCredentials,
  loadTokenExchangeConfig,
} from './tokenProxy.js'

loadDotenv({ path: '.env' })
loadDotenv({ path: '.env.server', override: true })

const LEDGER_REST_BASE =
  process.env.CANTON_LEDGER_REST_URL ??
  'https://ledger-api.validator.devnet.sandbox.fivenorth.io'

const USER_ID = process.env.VITE_CANTON_USER_ID ?? 'ledger-api-user'
const SME = process.env.VITE_PARTY_SME
const DEBTOR = process.env.VITE_PARTY_DEBTOR

const FETCH_TIMEOUT_MS = 60_000

function requireEnv(): void {
  if (!SME || !DEBTOR) {
    throw new Error(
      'VITE_PARTY_SME and VITE_PARTY_DEBTOR must be set in .env (run npm run allocate:parties first).',
    )
  }
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
      throw new Error(`Request timed out after ${FETCH_TIMEOUT_MS}ms: ${url}`)
    }
    throw error
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Optional Date (top-level record field): Daml-LF JSON uses the value directly
 * for Some, null for None — NOT {tag, value} (that is Variant encoding).
 * @see https://docs.digitalasset.com/build/3.4/reference/json-api/lf-value-specification.html
 */
function invoiceCreateArguments() {
  return {
    owner: SME,
    debtor: DEBTOR,
    amount: '1000.00',
    dueDate: '2026-01-31',
    invoiceNumber: 'INV-001',
    settledOn: '2026-01-20',
  }
}

async function main(): Promise<void> {
  requireEnv()

  console.log('=== Unpledged first create: ONE Invoice ===\n')
  console.log(`packageId:  ${PACKAGE_ID}`)
  console.log(`templateId: ${TEMPLATE_IDS.Invoice}`)
  console.log(`owner:      ${SME}`)
  console.log(`debtor:     ${DEBTOR}`)
  console.log(`userId:     ${USER_ID}\n`)

  console.log('Step 1: client_credentials token exchange')
  const token = await exchangeClientCredentials(loadTokenExchangeConfig())
  console.log(`  token: ${token.access_token.slice(0, 24)}…\n`)

  const commandId = `unpledged-first-invoice-${randomUUID()}`
  const createArguments = invoiceCreateArguments()

  const jsCommands = {
    commandId,
    userId: USER_ID,
    actAs: [SME, DEBTOR],
    commands: [
      {
        CreateCommand: {
          templateId: TEMPLATE_IDS.Invoice,
          createArguments,
        },
      },
    ],
  }

  console.log('Step 2: POST /v2/commands/submit-and-wait')
  console.log('Request body:')
  console.log(JSON.stringify(jsCommands, null, 2))
  console.log()

  const submitRes = await ledgerFetch(ledgerUrl('/v2/commands/submit-and-wait'), {
    method: 'POST',
    headers: authHeaders(token.access_token),
    body: JSON.stringify(jsCommands),
  })

  const submitBodyText = await submitRes.text()
  console.log(`HTTP ${submitRes.status}`)
  console.log('Response body (verbatim):')
  console.log(submitBodyText)

  if (!submitRes.ok) {
    console.error('\nCreate FAILED. Full error body printed above — do not summarize.')
    process.exit(1)
  }

  let updateId: string | undefined
  let completionOffset: number | undefined
  try {
    const parsed = JSON.parse(submitBodyText) as {
      updateId?: string
      completionOffset?: number
    }
    updateId = parsed.updateId
    completionOffset = parsed.completionOffset
  } catch {
    // body already printed verbatim
  }

  console.log('\n--- extracted from submit-and-wait ---')
  console.log(`updateId:          ${updateId ?? '(not in response)'}`)
  console.log(`completionOffset:  ${completionOffset ?? '(not in response)'}`)
  console.log(
    'contractId:        (submit-and-wait does not return contractId — querying ACS next)',
  )

  console.log('\nStep 3: GET /v2/state/ledger-end')
  const ledgerEndRes = await ledgerFetch(ledgerUrl('/v2/state/ledger-end'), {
    headers: authHeaders(token.access_token),
  })
  const ledgerEndText = await ledgerEndRes.text()
  if (!ledgerEndRes.ok) {
    console.error(`ledger-end FAILED HTTP ${ledgerEndRes.status}:`)
    console.error(ledgerEndText)
    process.exit(1)
  }
  const ledgerEnd = JSON.parse(ledgerEndText) as { offset?: number }
  console.log(`  offset: ${ledgerEnd.offset ?? '(missing)'}`)

  console.log('\nStep 4: POST /v2/state/active-contracts (SME, Invoice template)')
  // ACS TemplateFilter expects package-name reference, not package-id hash.
  const invoiceTemplateForQuery = '#unpledged:Invoice:Invoice'
  const acsBody = {
    activeAtOffset: ledgerEnd.offset ?? 0,
    eventFormat: {
      filtersByParty: {
        [SME!]: {
          cumulative: [
            {
              identifierFilter: {
                TemplateFilter: {
                  value: { templateId: invoiceTemplateForQuery },
                },
              },
            },
          ],
        },
      },
      verbose: true,
    },
  }

  const acsRes = await ledgerFetch(ledgerUrl('/v2/state/active-contracts'), {
    method: 'POST',
    headers: authHeaders(token.access_token),
    body: JSON.stringify(acsBody),
  })
  const acsText = await acsRes.text()
  console.log(`HTTP ${acsRes.status}`)
  console.log('ACS response (verbatim):')
  console.log(acsText)

  if (!acsRes.ok) {
    console.error('\nACS query FAILED.')
    process.exit(1)
  }

  const acs = JSON.parse(acsText) as Array<{
    contractEntry?: {
      JsActiveContract?: {
        createdEvent?: {
          contractId?: string
          templateId?: string
          createArgument?: Record<string, unknown>
        }
      }
    }
  }>

  const invoices = acs
    .map((row) => row.contractEntry?.JsActiveContract?.createdEvent)
    .filter((e): e is NonNullable<typeof e> => e !== undefined)

  const inv001 = invoices.filter(
    (e) => e.createArgument?.invoiceNumber === 'INV-001',
  )

  console.log('\n--- ACS summary ---')
  console.log(`Invoice contracts visible to SME: ${invoices.length}`)
  if (inv001.length > 0) {
    console.log('INV-001 FOUND in ACS:')
    for (const inv of inv001) {
      console.log(`  contractId:  ${inv.contractId}`)
      console.log(`  templateId:  ${inv.templateId}`)
      console.log(
        `  createArgument: ${JSON.stringify(inv.createArgument, null, 2)}`,
      )
    }
    console.log('\nSUCCESS — first Invoice is on the live ledger and queryable.')
  } else {
    console.log(
      'INV-001 NOT FOUND in ACS yet. Create may have succeeded but contract not visible (PQS lag?) or encoding mismatch.',
    )
    process.exit(1)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
