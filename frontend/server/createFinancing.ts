/**
 * Live DevNet — financing flow, double-pledge block, LenderA transaction-tree privacy.
 *
 * Run: npm run create:financing
 */

import {
  LENDER_A,
  SME,
  TEMPLATE_IDS,
  TEMPLATE_QUERY_IDS,
  authHeaders,
  getAccessToken,
  ledgerUrl,
  ledgerFetch,
  queryAcsByTemplate,
  requireParties,
  submitAndWait,
} from './ledgerCli.js'

const INVOICE_FIELD_NAMES = [
  'debtor',
  'amount',
  'dueDate',
  'invoiceNumber',
  'settledOn',
] as const

function pickLatestForLender(
  rows: Array<{ contractId: string; createArgument?: Record<string, unknown> }>,
  lender: string,
): { contractId: string; createArgument?: Record<string, unknown> } | undefined {
  const matches = rows.filter((r) => r.createArgument?.lender === lender)
  return matches.at(-1)
}

function pickInv001(
  rows: Array<{ contractId: string; createArgument?: Record<string, unknown> }>,
) {
  return rows.find((r) => r.createArgument?.invoiceNumber === 'INV-001')
}

function parseUpdateId(body: string): string | undefined {
  try {
    return (JSON.parse(body) as { updateId?: string }).updateId
  } catch {
    return undefined
  }
}

async function fetchLenderTransactionTree(
  token: string,
  updateId: string,
): Promise<unknown> {
  const params = new URLSearchParams()
  params.append('parties', LENDER_A)
  const url = `${ledgerUrl(`/v2/updates/transaction-tree-by-id/${encodeURIComponent(updateId)}`)}?${params}`

  console.log(`GET ${url}`)
  const res = await ledgerFetch(url, { headers: authHeaders(token) })
  const text = await res.text()
  console.log(`HTTP ${res.status}`)
  if (!res.ok) {
    throw new Error(`transaction-tree-by-id failed: ${text}`)
  }
  return JSON.parse(text)
}

function templateLabel(templateId: unknown): string {
  if (typeof templateId !== 'string') {
    return String(templateId)
  }
  const parts = templateId.split(':')
  return parts.length >= 3 ? parts.slice(-2).join(':') : templateId
}

function isInvoiceTemplate(templateId: unknown): boolean {
  return (
    typeof templateId === 'string' &&
    (templateId.endsWith(':Invoice:Invoice') ||
      templateId.includes('Invoice:Invoice'))
  )
}

interface TreeNodeReport {
  nodeId: string
  kind: string
  templateId?: string
  choice?: string
  witnessParties?: string[]
  lenderVisible: boolean
}

function collectTreeNodes(tree: {
  transaction?: { eventsById?: Record<string, unknown> }
}): TreeNodeReport[] {
  const events = tree.transaction?.eventsById ?? {}
  const out: TreeNodeReport[] = []

  for (const [nodeId, raw] of Object.entries(events)) {
    const event = raw as Record<string, unknown>
    if ('CreatedTreeEvent' in event) {
      const value = (event.CreatedTreeEvent as { value?: Record<string, unknown> })
        .value
      const witnesses = (value?.witnessParties as string[] | undefined) ?? []
      out.push({
        nodeId,
        kind: 'Created',
        templateId: value?.templateId as string | undefined,
        witnessParties: witnesses,
        lenderVisible: witnesses.includes(LENDER_A),
      })
    } else if ('ExercisedTreeEvent' in event) {
      const value = (event.ExercisedTreeEvent as { value?: Record<string, unknown> })
        .value
      const witnesses = (value?.witnessParties as string[] | undefined) ?? []
      out.push({
        nodeId,
        kind: 'Exercised',
        templateId: value?.templateId as string | undefined,
        choice: value?.choice as string | undefined,
        witnessParties: witnesses,
        lenderVisible: witnesses.includes(LENDER_A),
      })
    }
  }

  return out
}

function findInvoiceLeaks(obj: unknown, path = ''): string[] {
  const leaks: string[] = []
  if (obj === null || obj === undefined) {
    return leaks
  }
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      leaks.push(...findInvoiceLeaks(obj[i], `${path}[${i}]`))
    }
    return leaks
  }
  if (typeof obj === 'object') {
    const record = obj as Record<string, unknown>
    for (const key of Object.keys(record)) {
      const nextPath = path ? `${path}.${key}` : key
      if (INVOICE_FIELD_NAMES.includes(key as (typeof INVOICE_FIELD_NAMES)[number])) {
        leaks.push(`${nextPath}=${JSON.stringify(record[key])}`)
      }
      leaks.push(...findInvoiceLeaks(record[key], nextPath))
    }
  }
  return leaks
}

async function main(): Promise<void> {
  requireParties()

  console.log('=== Live DevNet financing + privacy tree check ===\n')
  const token = await getAccessToken()

  // ── PART A ────────────────────────────────────────────────────────────────
  console.log('PART A — Financing flow\n')

  console.log('A1: discover live contracts (ACS as SME / LenderA)')
  const [invoices, attestations, coordinators, registries] = await Promise.all([
    queryAcsByTemplate(token, SME, TEMPLATE_QUERY_IDS.Invoice),
    queryAcsByTemplate(token, SME, TEMPLATE_QUERY_IDS.UnpledgedAttestation),
    queryAcsByTemplate(token, SME, TEMPLATE_QUERY_IDS.FinancingCoordinator),
    queryAcsByTemplate(token, SME, TEMPLATE_QUERY_IDS.PledgeRegistry),
  ])

  const invoice = pickInv001(invoices)
  const attestation = pickLatestForLender(attestations, LENDER_A)

  if (!invoice) {
    throw new Error('INV-001 not found — run create:invoice first')
  }
  if (!attestation) {
    throw new Error('UnpledgedAttestation for LenderA not found — run create:attestation first')
  }

  console.log(`  Invoice INV-001:     ${invoice.contractId}`)
  console.log(`  Attestation:         ${attestation.contractId}`)

  let coordinatorCid = coordinators.at(-1)?.contractId
  let registryCid = registries.at(-1)?.contractId

  if (!coordinatorCid || !registryCid) {
    console.log('\nA2: create FinancingCoordinator + PledgeRegistry (missing on ledger)')
    const setup = await submitAndWait(
      token,
      [SME],
      [
        {
          CreateCommand: {
            templateId: TEMPLATE_IDS.FinancingCoordinator,
            createArguments: { sme: SME },
          },
        },
        {
          CreateCommand: {
            templateId: TEMPLATE_IDS.PledgeRegistry,
            createArguments: { owner: SME, pledgedRefs: [] },
          },
        },
      ],
      'setup-financing',
    )
    if (setup.status < 200 || setup.status >= 300) {
      process.exit(1)
    }
    const [coordsAfter, regsAfter] = await Promise.all([
      queryAcsByTemplate(token, SME, TEMPLATE_QUERY_IDS.FinancingCoordinator),
      queryAcsByTemplate(token, SME, TEMPLATE_QUERY_IDS.PledgeRegistry),
    ])
    coordinatorCid = coordsAfter.at(-1)?.contractId
    registryCid = regsAfter.at(-1)?.contractId
  } else {
    console.log(`  Coordinator:         ${coordinatorCid}`)
    console.log(`  PledgeRegistry:      ${registryCid}`)
  }

  if (!coordinatorCid || !registryCid) {
    throw new Error('Could not resolve coordinator/registry contractIds')
  }

  console.log('\nA3: LenderA creates FinancingOffer')
  const offerResult = await submitAndWait(
    token,
    [LENDER_A],
    [
      {
        CreateCommand: {
          templateId: TEMPLATE_IDS.FinancingOffer,
          createArguments: {
            lender: LENDER_A,
            sme: SME,
            attestationCid: attestation.contractId,
            advanceAmount: '900.00',
          },
        },
      },
    ],
    'financing-offer',
  )
  if (offerResult.status < 200 || offerResult.status >= 300) {
    process.exit(1)
  }

  const offers = await queryAcsByTemplate(
    token,
    LENDER_A,
    TEMPLATE_QUERY_IDS.FinancingOffer,
  )
  const offer = pickLatestForLender(offers, LENDER_A)
  if (!offer) {
    throw new Error('FinancingOffer not found after create')
  }
  console.log(`  FinancingOffer:      ${offer.contractId}`)

  console.log('\nA4: SME CompleteFinancing (PreparePledge → AcceptFinancing)')
  const financeResult = await submitAndWait(
    token,
    [SME],
    [
      {
        ExerciseCommand: {
          templateId: TEMPLATE_IDS.FinancingCoordinator,
          contractId: coordinatorCid,
          choice: 'CompleteFinancing',
          choiceArgument: {
            invoiceCid: invoice.contractId,
            offerCid: offer.contractId,
            pledgeRegistryCid: registryCid,
          },
        },
      },
    ],
    'complete-financing',
  )
  if (financeResult.status < 200 || financeResult.status >= 300) {
    process.exit(1)
  }

  const completeFinancingUpdateId = parseUpdateId(financeResult.body)
  console.log(`\n  CompleteFinancing updateId: ${completeFinancingUpdateId ?? '(missing)'}`)

  const markers = await queryAcsByTemplate(
    token,
    LENDER_A,
    TEMPLATE_QUERY_IDS.PledgeMarker,
  )
  const marker = markers.at(-1)
  if (!marker) {
    console.error('PledgeMarker not found in LenderA ACS after financing')
    process.exit(1)
  }

  console.log('\nA5: PledgeMarker confirmed')
  console.log(`  contractId:  ${marker.contractId}`)
  console.log(`  invoiceRef:  ${marker.createArgument?.invoiceRef}`)
  console.log(`  invoiceOwner:${marker.createArgument?.invoiceOwner}`)
  console.log(`  lender:      ${marker.createArgument?.lender}`)

  // Refresh registry for double-pledge attempt
  const registriesAfter = await queryAcsByTemplate(
    token,
    SME,
    TEMPLATE_QUERY_IDS.PledgeRegistry,
  )
  registryCid = registriesAfter.at(-1)?.contractId
  if (!registryCid) {
    throw new Error('PledgeRegistry missing after first pledge')
  }

  // ── PART B ────────────────────────────────────────────────────────────────
  console.log('\nPART B — Double-pledge prevention\n')

  console.log('B1: LenderA creates second FinancingOffer (same attestation)')
  const offer2Result = await submitAndWait(
    token,
    [LENDER_A],
    [
      {
        CreateCommand: {
          templateId: TEMPLATE_IDS.FinancingOffer,
          createArguments: {
            lender: LENDER_A,
            sme: SME,
            attestationCid: attestation.contractId,
            advanceAmount: '500.00',
          },
        },
      },
    ],
    'financing-offer-2',
  )
  if (offer2Result.status < 200 || offer2Result.status >= 300) {
    process.exit(1)
  }

  const offers2 = await queryAcsByTemplate(
    token,
    LENDER_A,
    TEMPLATE_QUERY_IDS.FinancingOffer,
  )
  const offer2 = offers2.at(-1)
  if (!offer2 || offer2.contractId === offer.contractId) {
    throw new Error('Second FinancingOffer not found')
  }
  console.log(`  Second offer: ${offer2.contractId}`)

  console.log('\nB2: SME retries CompleteFinancing on SAME invoice (expect rejection)')
  const dupResult = await submitAndWait(
    token,
    [SME],
    [
      {
        ExerciseCommand: {
          templateId: TEMPLATE_IDS.FinancingCoordinator,
          contractId: coordinatorCid,
          choice: 'CompleteFinancing',
          choiceArgument: {
            invoiceCid: invoice.contractId,
            offerCid: offer2.contractId,
            pledgeRegistryCid: registryCid,
          },
        },
      },
    ],
    'double-pledge-attempt',
  )

  if (dupResult.status >= 200 && dupResult.status < 300) {
    console.error('\nUNEXPECTED SUCCESS — double pledge should have been rejected!')
    process.exit(1)
  }

  console.log('\n  Double-pledge correctly REJECTED.')
  console.log('  Verbatim error body:')
  console.log(dupResult.body)

  const markersAfter = await queryAcsByTemplate(
    token,
    LENDER_A,
    TEMPLATE_QUERY_IDS.PledgeMarker,
  )
  console.log(`\n  PledgeMarker count (LenderA ACS): ${markersAfter.length} (expected 1)`)

  // ── PART C ────────────────────────────────────────────────────────────────
  console.log('\nPART C — LenderA transaction-tree privacy check\n')

  if (!completeFinancingUpdateId) {
    throw new Error('No updateId from CompleteFinancing — cannot fetch tree')
  }

  const treeResponse = await fetchLenderTransactionTree(
    token,
    completeFinancingUpdateId,
  )
  console.log('\nTransaction tree response (verbatim):')
  console.log(JSON.stringify(treeResponse, null, 2))

  const nodes = collectTreeNodes(
    treeResponse as { transaction?: { eventsById?: Record<string, unknown> } },
  )

  console.log('\nC1: nodes in LenderA projection')
  for (const node of nodes) {
    if (!node.lenderVisible) {
      continue
    }
    console.log(
      `  [${node.nodeId}] ${node.kind} ${templateLabel(node.templateId)}` +
        (node.choice ? ` choice=${node.choice}` : ''),
    )
  }

  const invoiceNodes = nodes.filter(
    (n) => n.lenderVisible && isInvoiceTemplate(n.templateId),
  )

  const fieldLeaks = findInvoiceLeaks(treeResponse)

  console.log('\nC2: Invoice template nodes visible to LenderA:', invoiceNodes.length)
  for (const n of invoiceNodes) {
    console.log(`  NODE ${n.nodeId}: ${n.kind} ${n.templateId}`)
  }

  console.log('\nC3: Invoice field values anywhere in tree JSON:', fieldLeaks.length)
  for (const leak of fieldLeaks) {
    console.log(`  ${leak}`)
  }

  console.log('\n=== HEADLINE VERDICT ===')
  const pledgeOk = Boolean(marker?.contractId)
  const dupBlocked = dupResult.status < 200 || dupResult.status >= 300
  const treeClean = invoiceNodes.length === 0 && fieldLeaks.length === 0

  console.log(`PledgeMarker created:        ${pledgeOk ? 'YES' : 'NO'}`)
  console.log(`Second pledge rejected:      ${dupBlocked ? 'YES' : 'NO'}`)
  console.log(
    `LenderA tree has Invoice node: ${invoiceNodes.length === 0 ? 'NO (clean)' : `YES (${invoiceNodes.length}) — DIVULGENCE`}`,
  )
  console.log(
    `Invoice field values in tree: ${fieldLeaks.length === 0 ? 'NONE (clean)' : `${fieldLeaks.length} leak(s)`}`,
  )

  if (pledgeOk && dupBlocked && treeClean) {
    console.log(
      '\nSUCCESS: PledgeMarker created, double-pledge blocked, LenderA tree has ZERO Invoice nodes.',
    )
    console.log('Privacy claim empirically locked on live DevNet.')
  } else {
    process.exit(1)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
