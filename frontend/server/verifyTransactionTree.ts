/**
 * Verify transaction-tree inspector data path (same as realGetLenderFinancingTree).
 * Run: npx tsx server/verifyTransactionTree.ts
 */

import { config as loadDotenv } from 'dotenv'
import { getAccessToken, authHeaders, ledgerUrl, ledgerFetch } from './ledgerCli.js'

loadDotenv({ path: '.env' })
loadDotenv({ path: '.env.server', override: true })

const UPDATE_ID =
  process.env.VITE_COMPLETE_FINANCING_UPDATE_ID ??
  '1220fe6c57bd55c9ba1af597df2369c5de82243fabc0ae67dc6f11f7aa5a73d55399'
const LENDER_A = process.env.VITE_PARTY_LENDER_A ?? ''

function isInvoiceTemplate(templateId: unknown): boolean {
  return (
    typeof templateId === 'string' &&
    (templateId.endsWith(':Invoice:Invoice') ||
      templateId.includes('Invoice:Invoice'))
  )
}

async function main(): Promise<void> {
  if (!LENDER_A) {
    throw new Error('VITE_PARTY_LENDER_A not set')
  }

  const token = await getAccessToken()
  const params = new URLSearchParams()
  params.append('parties', LENDER_A)
  const url = `${ledgerUrl(`/v2/updates/transaction-tree-by-id/${encodeURIComponent(UPDATE_ID)}`)}?${params}`

  console.log('GET', url)
  const res = await ledgerFetch(url, { headers: authHeaders(token) })
  const text = await res.text()
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 400)}`)
  }

  const tree = JSON.parse(text) as {
    transaction?: { eventsById?: Record<string, unknown> }
  }
  const events = tree.transaction?.eventsById ?? {}
  let lenderVisible = 0
  let invoiceInLenderView = 0
  let invoiceInFullTree = 0

  for (const [nodeId, raw] of Object.entries(events)) {
    const event = raw as Record<string, unknown>
    let witnesses: string[] = []
    let templateId: unknown
    let choice: string | undefined
    let kind = ''

    if ('CreatedTreeEvent' in event) {
      kind = 'Created'
      const value = (event.CreatedTreeEvent as { value?: Record<string, unknown> }).value
      witnesses = (value?.witnessParties as string[] | undefined) ?? []
      templateId = value?.templateId
    } else if ('ExercisedTreeEvent' in event) {
      kind = 'Exercised'
      const value = (event.ExercisedTreeEvent as { value?: Record<string, unknown> }).value
      witnesses = (value?.witnessParties as string[] | undefined) ?? []
      templateId = value?.templateId
      choice = value?.choice as string | undefined
    }

    if (isInvoiceTemplate(templateId)) {
      invoiceInFullTree++
    }

    if (witnesses.includes(LENDER_A)) {
      lenderVisible++
      console.log(
        `  [${nodeId}] ${kind} ${String(templateId).split(':').slice(-2).join(':')}${choice ? ` · ${choice}` : ''}`,
      )
      if (isInvoiceTemplate(templateId)) {
        invoiceInLenderView++
      }
    }
  }

  console.log('\n=== Verdict ===')
  console.log(`Lender A witness nodes: ${lenderVisible}`)
  console.log(`Invoice nodes in Lender A view: ${invoiceInLenderView}`)
  console.log(`Invoice nodes in full tree: ${invoiceInFullTree}`)

  if (invoiceInLenderView === 0) {
    console.log('PASS: zero Invoice nodes in Lender A projection (live DevNet).')
  } else {
    console.error('FAIL: Invoice visible to Lender A')
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
