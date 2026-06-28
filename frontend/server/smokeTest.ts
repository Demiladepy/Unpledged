/**
 * CLI smoke test — verifies auth + ledger reachability without flipping mocks.
 *
 * Uses the same server-side token exchange as POST /api/token (not the browser).
 * Run: npm run smoke:ledger
 */

import { config as loadDotenv } from 'dotenv'
import {
  exchangeClientCredentials,
  loadTokenExchangeConfig,
} from './tokenProxy.js'

loadDotenv({ path: '.env.server', override: true })

const LEDGER_REST_BASE =
  process.env.CANTON_LEDGER_REST_URL ??
  'https://ledger-api.validator.devnet.sandbox.fivenorth.io'

async function main(): Promise<void> {
  console.log('=== Unpledged ledger smoke test ===')
  console.log('Step 1: client_credentials token exchange (server-side)')

  const token = await exchangeClientCredentials(loadTokenExchangeConfig())
  console.log(`  access_token: ${token.access_token.slice(0, 24)}…`)
  console.log(`  expires_in:   ${token.expires_in}s (~${token.expires_in / 3600}h)`)

  const ledgerEndUrl = `${LEDGER_REST_BASE.replace(/\/$/, '')}/v2/state/ledger-end`
  console.log(`\nStep 2: GET ${ledgerEndUrl}`)

  const response = await fetch(ledgerEndUrl, {
    headers: {
      Authorization: `Bearer ${token.access_token}`,
      Accept: 'application/json',
    },
  })

  const bodyText = await response.text()
  if (!response.ok) {
    console.error(`  FAILED (${response.status}): ${bodyText}`)
    process.exit(1)
  }

  const body = JSON.parse(bodyText) as { offset?: number }
  console.log('  SUCCESS')
  console.log(`  ledger-end offset: ${body.offset ?? '(missing)'}`)
  console.log('\nAuth chain verified. You can wire real API calls next.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
