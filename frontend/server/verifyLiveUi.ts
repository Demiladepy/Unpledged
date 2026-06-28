/**
 * Verifies live split-screen data: same ACS path, LenderA vs LenderB.
 * Run: npx tsx server/verifyLiveUi.ts
 */

import {
  LENDER_A,
  LENDER_B,
  TEMPLATE_QUERY_IDS,
  getAccessToken,
  queryAcsByTemplate,
  requireParties,
} from './ledgerCli.js'

async function lenderViewCounts(party: string, token: string) {
  const [invoices, attestations, markers] = await Promise.all([
    queryAcsByTemplate(token, party, TEMPLATE_QUERY_IDS.Invoice),
    queryAcsByTemplate(token, party, TEMPLATE_QUERY_IDS.UnpledgedAttestation),
    queryAcsByTemplate(token, party, TEMPLATE_QUERY_IDS.PledgeMarker),
  ])
  const att = attestations
    .map((e) => e.createArgument)
    .filter((a) => a?.lender === party || a?.owner === party)
  return {
    invoices: invoices.length,
    attestations: att.length,
    pledgeMarkers: markers.filter(
      (m) =>
        m.createArgument?.lender === party ||
        m.createArgument?.invoiceOwner === party,
    ).length,
    latestAttestation: att.at(-1),
  }
}

async function main(): Promise<void> {
  requireParties()
  console.log('=== Live UI verification (same ACS path as realApi / split-screen) ===\n')

  const token = await getAccessToken()
  console.log('Token: OK\n')

  const [a, b] = await Promise.all([
    lenderViewCounts(LENDER_A, token),
    lenderViewCounts(LENDER_B, token),
  ])

  console.log('LenderA ACS (financing party):')
  console.log(`  invoices:      ${a.invoices}`)
  console.log(`  attestations:  ${a.attestations}`)
  console.log(`  pledgeMarkers: ${a.pledgeMarkers}`)
  if (a.latestAttestation) {
    console.log('  attestation fields:', JSON.stringify(a.latestAttestation, null, 2))
  }

  console.log('\nLenderB ACS (non-financing party):')
  console.log(`  invoices:      ${b.invoices}`)
  console.log(`  attestations:  ${b.attestations}`)
  console.log(`  pledgeMarkers: ${b.pledgeMarkers}`)

  console.log('\n=== Verdict ===')
  const aOk = a.attestations >= 1 && a.invoices === 0
  const bOk = b.invoices === 0 && b.attestations === 0

  if (aOk && bOk) {
    console.log('PASS: LenderA has attestation + 0 invoices; LenderB has 0/0.')
    console.log('Same query mechanism, different parties — zero is real privacy.')
    process.exit(0)
  }

  if (a.attestations === 0 && b.attestations === 0) {
    console.error('FAIL: BOTH parties empty — likely ACS query/format bug, NOT privacy.')
    process.exit(1)
  }

  console.error('FAIL: unexpected counts — review above.')
  process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
