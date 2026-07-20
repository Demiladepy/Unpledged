import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'

const shots = [
  {
    url: 'https://www.reuters.com/world/us/first-brands-creditor-says-23-billion-simply-vanished-seeks-probe-2025-10-09/',
    out: 'docs/research/first-brands-reuters.png',
  },
  {
    url: 'https://www.justice.gov/usao-sdny/pr/ceo-cfo-coo-charged-connection-billion-dollar-collapse-tricolor-auto',
    out: 'docs/research/tricolor-doj.png',
  },
  {
    url: 'https://www.reuters.com/business/finance/jpmorgan-ceo-says-its-exposure-collapsed-auto-dealer-tricolor-not-our-finest-2025-10-14/',
    out: 'docs/research/jpm-tricolor-reuters.png',
  },
  {
    url: 'https://www.gtreview.com/news/americas/first-brands-accuses-founder-of-receivables-and-inventory-finance-fraud/',
    out: 'docs/research/first-brands-gtr.png',
  },
]

await mkdir('docs/research', { recursive: true })
const browser = await chromium.launch({ headless: true })

for (const s of shots) {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 2,
  })
  try {
    await page.goto(s.url, { waitUntil: 'domcontentloaded', timeout: 90000 })
    await page.waitForTimeout(3500)
    for (const sel of [
      '#onetrust-accept-btn-handler',
      'button:has-text("Accept all")',
      'button:has-text("Accept")',
      'button:has-text("I Agree")',
    ]) {
      try {
        const b = page.locator(sel).first()
        if (await b.isVisible({ timeout: 600 })) await b.click()
      } catch {
        /* ignore */
      }
    }
    await page.waitForTimeout(800)
    await page.screenshot({ path: s.out, fullPage: false })
    console.log('SAVED', s.out)
  } catch (e) {
    console.error('FAIL', s.url, e instanceof Error ? e.message : e)
  } finally {
    await page.close()
  }
}

await browser.close()
