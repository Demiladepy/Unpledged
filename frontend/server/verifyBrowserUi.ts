/**
 * Browser-path verification: token via Vite /api/token proxy (same as React),
 * then ACS queries + parsing matching realGetLenderView / SplitScreenComparison.
 *
 * Requires: npm run dev (default http://localhost:5173 or 5174)
 * Run: npx tsx server/verifyBrowserUi.ts [baseUrl]
 */

const DEV_BASE = process.argv[2] ?? 'http://localhost:5174'

const LEDGER_URL =
  process.env.VITE_CANTON_LEDGER_URL ??
  'https://ledger-api.validator.devnet.sandbox.fivenorth.io'

const LENDER_A =
  process.env.VITE_PARTY_LENDER_A ??
  'LenderA::1220a14ca128063b8dc9d1ebb0bd22633be9f2168500f4dbc1ecaeb1855b14e5acf8'
const LENDER_B =
  process.env.VITE_PARTY_LENDER_B ??
  'LenderB::1220a14ca128063b8dc9d1ebb0bd22633be9f2168500f4dbc1ecaeb1855b14e5acf8'

const TEMPLATE_QUERY_IDS = {
  Invoice: '#unpledged:Invoice:Invoice',
  UnpledgedAttestation: '#unpledged:Attestation:UnpledgedAttestation',
  PledgeMarker: '#unpledged:Financing:PledgeMarker',
  FinancingOffer: '#unpledged:Financing:FinancingOffer',
} as const

async function tokenFromViteProxy(): Promise<string> {
  const res = await fetch(`${DEV_BASE}/api/token`, { method: 'POST' })
  const body = (await res.json()) as { access_token?: string; error?: string }
  if (!res.ok || !body.access_token) {
    throw new Error(`POST /api/token failed: ${JSON.stringify(body)}`)
  }
  return body.access_token
}

async function ledgerGet(path: string, token: string): Promise<unknown> {
  const res = await fetch(`${LEDGER_URL.replace(/\/$/, '')}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`${path} → ${res.status}: ${text.slice(0, 300)}`)
  return JSON.parse(text)
}

async function queryAcs(
  token: string,
  party: string,
  templateId: string,
): Promise<unknown[]> {
  const end = (await ledgerGet('/v2/state/ledger-end', token)) as {
    offset?: number
  }
  const res = await fetch(
    `${LEDGER_URL.replace(/\/$/, '')}/v2/state/active-contracts`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        activeAtOffset: end.offset ?? 0,
        eventFormat: {
          filtersByParty: {
            [party]: {
              cumulative: [
                {
                  identifierFilter: {
                    TemplateFilter: {
                      value: { templateId },
                    },
                  },
                },
              ],
            },
          },
          verbose: true,
        },
      }),
    },
  )
  const text = await res.text()
  if (!res.ok) {
    throw new Error(`active-contracts → ${res.status}: ${text.slice(0, 300)}`)
  }
  return JSON.parse(text) as unknown[]
}

function extractCreated(row: unknown): { contractId: string; createArgument: Record<string, unknown> } | null {
  const entry = (row as { contractEntry?: Record<string, unknown> }).contractEntry
  if (!entry || !('JsActiveContract' in entry)) return null
  const created = (entry.JsActiveContract as { createdEvent: { contractId: string; createArgument: Record<string, unknown> } }).createdEvent
  return created
}

async function lenderView(token: string, party: string) {
  const [invoices, attestations] = await Promise.all([
    queryAcs(token, party, TEMPLATE_QUERY_IDS.Invoice),
    queryAcs(token, party, TEMPLATE_QUERY_IDS.UnpledgedAttestation),
  ])
  const att = attestations
    .map(extractCreated)
    .filter(Boolean)
    .filter((e) => e!.createArgument.lender === party || e!.createArgument.owner === party)
  return {
    invoiceCount: invoices.map(extractCreated).filter(Boolean).length,
    attestationCount: att.length,
    ui: att[0]
      ? {
          period: `${att[0].createArgument.periodStart} — ${att[0].createArgument.periodEnd}`,
          settledCount: att[0].createArgument.settledCount,
          settledTotal: att[0].createArgument.settledTotal,
          allSettledOnTime: att[0].createArgument.allSettledOnTime,
        }
      : null,
  }
}

async function main(): Promise<void> {
  console.log(`=== Browser-path UI verification (${DEV_BASE}) ===\n`)
  const token = await tokenFromViteProxy()
  console.log('Vite /api/token proxy: OK\n')

  const [a, b] = await Promise.all([
    lenderView(token, LENDER_A),
    lenderView(token, LENDER_B),
  ])

  console.log('LenderA panel would show:')
  console.log(`  Invoices in ACS: ${a.invoiceCount}`)
  console.log(`  Attestations:    ${a.attestationCount}`)
  if (a.ui) console.log(`  Card:            ${JSON.stringify(a.ui)}`)

  console.log('\nLenderB panel would show:')
  console.log(`  Footer line:     ${b.invoiceCount} invoices · ${b.attestationCount} attestations`)

  const pass =
    a.attestationCount >= 1 &&
    a.invoiceCount === 0 &&
    b.invoiceCount === 0 &&
    b.attestationCount === 0

  console.log(`\n=== ${pass ? 'PASS' : 'FAIL'} ===`)
  process.exit(pass ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
