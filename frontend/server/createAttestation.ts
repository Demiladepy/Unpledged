/**
 * Live DevNet — create UnpledgedAttestation via AttestationFactory.ProveUnpledged.
 *
 * Run: npm run create:attestation
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

async function main(): Promise<void> {
  requireParties()

  console.log('=== Unpledged create attestation (live DevNet) ===\n')
  console.log(`userId:   6`)
  console.log(`SME:      ${SME}`)
  console.log(`LenderA:  ${LENDER_A}\n`)

  console.log('Step 1: token exchange')
  const token = await getAccessToken()
  console.log(`  token: ${token.slice(0, 24)}…\n`)

  console.log('Step 2: query SME ACS for settled Invoices')
  const invoices = await queryAcsByTemplate(
    token,
    SME,
    TEMPLATE_QUERY_IDS.Invoice,
  )
  const settled = invoices.filter((inv) => {
    const settledOn = inv.createArgument?.settledOn
    return settledOn !== null && settledOn !== undefined
  })

  console.log(`  Invoices visible to SME: ${invoices.length}`)
  for (const inv of invoices) {
    console.log(
      `    ${inv.createArgument?.invoiceNumber}  cid=${inv.contractId.slice(0, 32)}…  settledOn=${JSON.stringify(inv.createArgument?.settledOn)}`,
    )
  }

  if (settled.length === 0) {
    console.error('\nNo settled invoices found for SME — run npm run create:invoice first.')
    process.exit(1)
  }

  const invoiceCids = settled.map((inv) => inv.contractId)
  console.log(`\n  Using ${invoiceCids.length} invoiceCid(s) for ProveUnpledged\n`)

  console.log(
    'Step 3: CreateAndExerciseCommand — AttestationFactory + ProveUnpledged (one atomic tx)',
  )
  console.log(
    '  (Cleaner than two submits: no need to read factory contractId between create and exercise)\n',
  )

  const proveResult = await submitAndWait(
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
            invoiceCids,
            periodStart: '2026-01-01',
            periodEnd: '2026-01-31',
          },
        },
      },
    ],
    'create-attestation',
  )

  if (proveResult.status < 200 || proveResult.status >= 300) {
    console.error('\nProveUnpledged FAILED.')
    process.exit(1)
  }

  console.log('\nStep 4: query UnpledgedAttestation ACS as SME')
  const attestations = await queryAcsByTemplate(
    token,
    SME,
    TEMPLATE_QUERY_IDS.UnpledgedAttestation,
  )
  const forLenderA = attestations.filter(
    (a) => a.createArgument?.lender === LENDER_A,
  )
  const latest = forLenderA.at(-1)

  if (!latest) {
    console.error('UnpledgedAttestation not found in SME ACS after submit.')
    process.exit(1)
  }

  const args = latest.createArgument ?? {}
  console.log('  UnpledgedAttestation created:')
  console.log(`    contractId:        ${latest.contractId}`)
  console.log(`    settledCount:      ${args.settledCount}`)
  console.log(`    settledTotal:      ${args.settledTotal}`)
  console.log(`    allSettledOnTime:  ${args.allSettledOnTime}`)
  console.log(`    periodStart:       ${args.periodStart}`)
  console.log(`    periodEnd:         ${args.periodEnd}`)

  console.log('\nStep 5: PRIVACY VERIFICATION — query ACS as LenderA')
  const lenderAttestations = await queryAcsByTemplate(
    token,
    LENDER_A,
    TEMPLATE_QUERY_IDS.UnpledgedAttestation,
  )
  const lenderInvoices = await queryAcsByTemplate(
    token,
    LENDER_A,
    TEMPLATE_QUERY_IDS.Invoice,
  )

  console.log(`  LenderA UnpledgedAttestation count: ${lenderAttestations.length}`)
  console.log(`  LenderA Invoice count:              ${lenderInvoices.length}`)

  if (lenderAttestations.length > 0) {
    const att = lenderAttestations.at(-1)!
    console.log('\n  Latest attestation visible to LenderA (summary only):')
    console.log(
      JSON.stringify(att.createArgument, null, 2),
    )
  }

  console.log('\n=== HEADLINE ===')
  if (lenderAttestations.length >= 1 && lenderInvoices.length === 0) {
    console.log('SUCCESS: LenderA ACS → 1+ attestation(s), 0 invoices.')
    console.log('Privacy claim verified on live DevNet.')
  } else {
    console.error(
      `FAILED privacy check: expected ≥1 attestation and 0 invoices, got ${lenderAttestations.length} attestation(s) and ${lenderInvoices.length} invoice(s).`,
    )
    process.exit(1)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
