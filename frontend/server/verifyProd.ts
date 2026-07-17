/**
 * Verify the DEPLOYED Vercel URL end-to-end (token proxy → ledger proxy → ACS → tree).
 *
 * Usage:
 *   npx tsx server/verifyProd.ts https://your-app.vercel.app
 *   PROD_URL=https://your-app.vercel.app npm run verify:prod
 */

import { config as loadDotenv } from 'dotenv'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

loadDotenv({ path: '.env' })
loadDotenv({ path: '.env.production' })

const PROD_URL = (
  process.argv[2] ??
  process.env.PROD_URL ??
  ''
).replace(/\/$/, '')

const LENDER_A =
  process.env.VITE_PARTY_LENDER_A ??
  'LenderA::1220a14ca128063b8dc9d1ebb0bd22633be9f2168500f4dbc1ecaeb1855b14e5acf8'
const LENDER_B =
  process.env.VITE_PARTY_LENDER_B ??
  'LenderB::1220a14ca128063b8dc9d1ebb0bd22633be9f2168500f4dbc1ecaeb1855b14e5acf8'

const UPDATE_ID =
  process.env.VITE_COMPLETE_FINANCING_UPDATE_ID ??
  readDefaultUpdateId()

function readDefaultUpdateId(): string {
  try {
    const src = readFileSync(resolve('src/ledger/config.ts'), 'utf8')
    const m = src.match(/'1220[a-f0-9]{60,}'/)
    return m?.[0]?.slice(1, -1) ?? ''
  } catch {
    return '1220fe6c57bd55c9ba1af597df2369c5de82243fabc0ae67dc6f11f7aa5a73d55399'
  }
}

const TEMPLATE = {
  Invoice: '#unpledged:Invoice:Invoice',
  UnpledgedAttestation: '#unpledged:Attestation:UnpledgedAttestation',
} as const

type CheckResult = { name: string; pass: boolean; detail: string }

function printCheck(c: CheckResult): void {
  console.log(`${c.pass ? 'PASS' : 'FAIL'} — ${c.name}`)
  console.log(`  ${c.detail}`)
  console.log('')
}

async function checkToken(): Promise<{ check: CheckResult; token?: string }> {
  const name = '1. POST /api/token'
  try {
    const res = await fetch(`${PROD_URL}/api/token`, { method: 'POST' })
    const text = await res.text()
    let body: { access_token?: string; expires_in?: number; error?: string }
    try {
      body = JSON.parse(text) as typeof body
    } catch {
      return {
        check: {
          name,
          pass: false,
          detail: `HTTP ${res.status} non-JSON: ${text.slice(0, 300)}`,
        },
      }
    }
    if (!res.ok || !body.access_token) {
      return {
        check: {
          name,
          pass: false,
          detail: `HTTP ${res.status}: ${text.slice(0, 400)}`,
        },
      }
    }
    return {
      check: {
        name,
        pass: true,
        detail: `HTTP 200 · expires_in=${body.expires_in ?? '?'}s · token ${body.access_token.slice(0, 18)}…`,
      },
      token: body.access_token,
    }
  } catch (err) {
    return {
      check: {
        name,
        pass: false,
        detail: err instanceof Error ? err.message : String(err),
      },
    }
  }
}

async function checkLedgerEnd(token: string): Promise<CheckResult> {
  const name = '2. GET /api/ledger/v2/state/ledger-end'
  try {
    const res = await fetch(`${PROD_URL}/api/ledger/v2/state/ledger-end`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    })
    const text = await res.text()
    if (!res.ok) {
      return {
        name,
        pass: false,
        detail: `HTTP ${res.status}: ${text.slice(0, 400)}`,
      }
    }
    const data = JSON.parse(text) as { offset?: number }
    if (typeof data.offset !== 'number') {
      return { name, pass: false, detail: `No offset in body: ${text.slice(0, 200)}` }
    }
    return {
      name,
      pass: true,
      detail: `HTTP 200 · offset=${data.offset.toLocaleString()}`,
    }
  } catch (err) {
    return {
      name,
      pass: false,
      detail: err instanceof Error ? err.message : String(err),
    }
  }
}

async function queryAcs(
  token: string,
  party: string,
  templateId: string,
  offset: number,
): Promise<unknown[]> {
  const res = await fetch(`${PROD_URL}/api/ledger/v2/state/active-contracts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      activeAtOffset: offset,
      eventFormat: {
        filtersByParty: {
          [party]: {
            cumulative: [
              {
                identifierFilter: {
                  TemplateFilter: { value: { templateId } },
                },
              },
            ],
          },
        },
        verbose: true,
      },
    }),
  })
  const text = await res.text()
  if (!res.ok) {
    throw new Error(`active-contracts HTTP ${res.status}: ${text.slice(0, 300)}`)
  }
  return JSON.parse(text) as unknown[]
}

function countCreated(rows: unknown[]): number {
  return rows.filter((row) => {
    const entry = (row as { contractEntry?: Record<string, unknown> }).contractEntry
    return entry && 'JsActiveContract' in entry
  }).length
}

async function checkAcs(
  token: string,
  offset: number,
): Promise<[CheckResult, CheckResult]> {
  try {
    const [aInv, aAtt, bInv, bAtt] = await Promise.all([
      queryAcs(token, LENDER_A, TEMPLATE.Invoice, offset),
      queryAcs(token, LENDER_A, TEMPLATE.UnpledgedAttestation, offset),
      queryAcs(token, LENDER_B, TEMPLATE.Invoice, offset),
      queryAcs(token, LENDER_B, TEMPLATE.UnpledgedAttestation, offset),
    ])
    const aI = countCreated(aInv)
    const aA = countCreated(aAtt)
    const bI = countCreated(bInv)
    const bA = countCreated(bAtt)

    const aPass = aA >= 1 && aI === 0
    const bPass = bI === 0 && bA === 0

    return [
      {
        name: '3. ACS Lender A (attestation ≥1, invoices = 0)',
        pass: aPass,
        detail: `attestations=${aA} invoices=${aI}`,
      },
      {
        name: '4. ACS Lender B (0, 0)',
        pass: bPass,
        detail: `attestations=${bA} invoices=${bI}`,
      },
    ]
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return [
      { name: '3. ACS Lender A', pass: false, detail: msg },
      { name: '4. ACS Lender B', pass: false, detail: msg },
    ]
  }
}

async function checkTree(token: string): Promise<CheckResult> {
  const name = '5. Transaction tree · Invoice nodes for Lender A = 0'
  if (!UPDATE_ID) {
    return { name, pass: false, detail: 'No updateId configured' }
  }
  try {
    const params = new URLSearchParams()
    params.append('parties', LENDER_A)
    const url = `${PROD_URL}/api/ledger/v2/updates/transaction-tree-by-id/${encodeURIComponent(UPDATE_ID)}?${params}`
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    })
    const text = await res.text()
    if (!res.ok) {
      return {
        name,
        pass: false,
        detail: `HTTP ${res.status}: ${text.slice(0, 400)}`,
      }
    }
    const tree = JSON.parse(text) as {
      transaction?: { eventsById?: Record<string, unknown> }
    }
    const events = tree.transaction?.eventsById ?? {}
    let invoiceInLenderView = 0
    for (const raw of Object.values(events)) {
      const event = raw as Record<string, unknown>
      let witnesses: string[] = []
      let templateId = ''
      if ('CreatedTreeEvent' in event) {
        const value = (event.CreatedTreeEvent as { value?: Record<string, unknown> }).value
        witnesses = (value?.witnessParties as string[] | undefined) ?? []
        templateId = String(value?.templateId ?? '')
      } else if ('ExercisedTreeEvent' in event) {
        const value = (event.ExercisedTreeEvent as { value?: Record<string, unknown> }).value
        witnesses = (value?.witnessParties as string[] | undefined) ?? []
        templateId = String(value?.templateId ?? '')
      }
      if (
        witnesses.includes(LENDER_A) &&
        (templateId.endsWith(':Invoice:Invoice') || templateId.includes('Invoice:Invoice'))
      ) {
        invoiceInLenderView++
      }
    }
    return {
      name,
      pass: invoiceInLenderView === 0,
      detail: `updateId=${UPDATE_ID.slice(0, 20)}… · Invoice nodes in Lender A view=${invoiceInLenderView}`,
    }
  } catch (err) {
    return {
      name,
      pass: false,
      detail: err instanceof Error ? err.message : String(err),
    }
  }
}

async function main(): Promise<void> {
  if (!PROD_URL) {
    console.error(
      'Usage: npx tsx server/verifyProd.ts https://your-app.vercel.app\n   or: PROD_URL=https://… npm run verify:prod',
    )
    process.exit(1)
  }

  console.log(`=== verify:prod against ${PROD_URL} ===\n`)

  const { check: tokenCheck, token } = await checkToken()
  printCheck(tokenCheck)
  if (!token) {
    console.error('ABORT: cannot continue without token')
    process.exit(1)
  }

  const ledgerCheck = await checkLedgerEnd(token)
  printCheck(ledgerCheck)
  if (!ledgerCheck.pass) {
    console.error('ABORT: ledger proxy broken — fix vercel rewrite / redeploy')
    process.exit(1)
  }

  const offsetMatch = ledgerCheck.detail.match(/offset=([\d,]+)/)
  const offset = offsetMatch
    ? Number(offsetMatch[1].replace(/,/g, ''))
    : 0

  const [aCheck, bCheck] = await checkAcs(token, offset)
  printCheck(aCheck)
  printCheck(bCheck)

  const treeCheck = await checkTree(token)
  printCheck(treeCheck)

  const all = [tokenCheck, ledgerCheck, aCheck, bCheck, treeCheck]
  const failed = all.filter((c) => !c.pass)
  console.log('=== Summary ===')
  console.log(
    failed.length === 0
      ? 'ALL PASS — hosted site is live end-to-end on Canton DevNet.'
      : `${failed.length} FAIL — see above.`,
  )
  process.exit(failed.length === 0 ? 0 : 1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
