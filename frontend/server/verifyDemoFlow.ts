/**
 * Verify full demo flow on live DevNet (CLI).
 * Run: npm run verify:demo-flow
 */

import {
  LENDER_A,
  SME,
  TEMPLATE_IDS,
  TEMPLATE_QUERY_IDS,
  getAccessToken,
  queryAcsByTemplate,
  requireParties,
  submitAndWait,
} from './ledgerCli.js'

function newDemoInvoiceNumber(): string {
  return `INV-DEMO-${Date.now()}`
}

async function main(): Promise<void> {
  requireParties()
  const token = await getAccessToken()
  const invoiceNumber = newDemoInvoiceNumber()

  console.log('=== Live demo flow verification ===\n')
  console.log(`Invoice: ${invoiceNumber}\n`)

  console.log('Step 1 — create invoice')
  const s1 = await submitAndWait(
    token,
    [SME, process.env.VITE_PARTY_DEBTOR!],
    [
      {
        CreateCommand: {
          templateId: TEMPLATE_IDS.Invoice,
          createArguments: {
            owner: SME,
            debtor: process.env.VITE_PARTY_DEBTOR,
            amount: '1000.00',
            dueDate: '2026-01-31',
            invoiceNumber,
            settledOn: '2026-01-20',
          },
        },
      },
    ],
    'demo-inv',
  )
  if (s1.status < 200 || s1.status >= 300) {
    console.error(s1.body)
    process.exit(1)
  }
  const invoices = await queryAcsByTemplate(token, SME, TEMPLATE_QUERY_IDS.Invoice)
  const invoice = invoices.find((i) => i.createArgument?.invoiceNumber === invoiceNumber)
  if (!invoice) {
    console.error('Invoice not in ACS')
    process.exit(1)
  }
  console.log(`  cid: ${invoice.contractId}\n`)

  console.log('Step 2 — attestation')
  const s2 = await submitAndWait(
    token,
    [SME],
    [
      {
        CreateAndExerciseCommand: {
          templateId: TEMPLATE_IDS.AttestationFactory,
          createArguments: { owner: SME },
          choice: 'ProveUnpledged',
          choiceArgument: {
            lender: LENDER_A,
            invoiceCids: [invoice.contractId],
            periodStart: '2026-01-01',
            periodEnd: '2026-01-31',
          },
        },
      },
    ],
    'demo-att',
  )
  if (s2.status < 200 || s2.status >= 300) {
    console.error(s2.body)
    process.exit(1)
  }
  const attestations = await queryAcsByTemplate(
    token,
    SME,
    TEMPLATE_QUERY_IDS.UnpledgedAttestation,
  )
  const attestation = attestations.filter((a) => a.createArgument?.lender === LENDER_A).at(-1)
  if (!attestation) {
    process.exit(1)
  }
  const lenderAAtt = await queryAcsByTemplate(
    token,
    LENDER_A,
    TEMPLATE_QUERY_IDS.UnpledgedAttestation,
  )
  const lenderBAtt = await queryAcsByTemplate(
    token,
    process.env.VITE_PARTY_LENDER_B!,
    TEMPLATE_QUERY_IDS.UnpledgedAttestation,
  )
  const aSees = lenderAAtt.some((a) => a.contractId === attestation.contractId)
  const bSees = lenderBAtt.some((a) => a.contractId === attestation.contractId)
  console.log(`  Lender A sees: ${aSees}`)
  console.log(`  Lender B sees: ${bSees}\n`)

  console.log('Step 3 — offer')
  const s3 = await submitAndWait(
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
    'demo-offer',
  )
  if (s3.status < 200 || s3.status >= 300) {
    process.exit(1)
  }
  const offers = await queryAcsByTemplate(token, LENDER_A, TEMPLATE_QUERY_IDS.FinancingOffer)
  const offer = offers.at(-1)
  if (!offer) {
    process.exit(1)
  }

  let coordinators = await queryAcsByTemplate(
    token,
    SME,
    TEMPLATE_QUERY_IDS.FinancingCoordinator,
  )
  let registries = await queryAcsByTemplate(token, SME, TEMPLATE_QUERY_IDS.PledgeRegistry)
  let coordinatorCid = coordinators.at(-1)?.contractId
  let registryCid = registries.at(-1)?.contractId
  if (!coordinatorCid || !registryCid) {
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
      'demo-setup',
    )
    if (setup.status < 200 || setup.status >= 300) {
      process.exit(1)
    }
    coordinators = await queryAcsByTemplate(
      token,
      SME,
      TEMPLATE_QUERY_IDS.FinancingCoordinator,
    )
    registries = await queryAcsByTemplate(token, SME, TEMPLATE_QUERY_IDS.PledgeRegistry)
    coordinatorCid = coordinators.at(-1)?.contractId
    registryCid = registries.at(-1)?.contractId
  }

  console.log('Step 4 — finance')
  const s4 = await submitAndWait(
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
    'demo-finance',
  )
  if (s4.status < 200 || s4.status >= 300) {
    console.error(s4.body)
    process.exit(1)
  }

  const markersBefore = await queryAcsByTemplate(
    token,
    LENDER_A,
    TEMPLATE_QUERY_IDS.PledgeMarker,
  )

  console.log('Step 5 — double pledge')
  await submitAndWait(
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
    'demo-offer-2',
  )
  const offers2 = await queryAcsByTemplate(token, LENDER_A, TEMPLATE_QUERY_IDS.FinancingOffer)
  const offer2 = offers2.at(-1)
  registries = await queryAcsByTemplate(token, SME, TEMPLATE_QUERY_IDS.PledgeRegistry)
  registryCid = registries.at(-1)?.contractId

  const s5 = await submitAndWait(
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
            offerCid: offer2!.contractId,
            pledgeRegistryCid: registryCid,
          },
        },
      },
    ],
    'demo-dup',
  )

  const markersAfter = await queryAcsByTemplate(
    token,
    LENDER_A,
    TEMPLATE_QUERY_IDS.PledgeMarker,
  )

  const blocked = s5.status < 200 || s5.status >= 300
  console.log(`  HTTP ${s5.status} blocked=${blocked}`)
  console.log(`  markers: ${markersBefore.length} → ${markersAfter.length}`)

  if (aSees && !bSees && blocked && markersAfter.length === markersBefore.length) {
    console.log('\nPASS: create → attest → finance → block on fresh invoice.')
  } else {
    console.error('\nFAIL')
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
