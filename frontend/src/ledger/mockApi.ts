import type {
  AcceptFinancingInput,
  CreateFinancingOfferInput,
  DoublePledgeAttempt,
  FinancingOffer,
  FinancingRequest,
  Invoice,
  LenderTransactionTreeSummary,
  LenderView,
  LiveDoublePledgeLogLine,
  LiveDoublePledgeProgress,
  LiveDoublePledgeResult,
  Party,
  PledgeMarker,
  UnpledgedAttestation,
} from '../types/ledger'
import {
  MOCK_ATTESTATIONS,
  MOCK_DOUBLE_PLEDGE,
  MOCK_FINANCING_OFFERS,
  MOCK_FINANCING_REQUESTS,
  MOCK_INVOICES,
  MOCK_PLEDGE_MARKERS,
  PARTIES,
} from './mockData'

const delay = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms))

const liveMockOffers = [...MOCK_FINANCING_OFFERS]
const liveMockMarkers = [...MOCK_PLEDGE_MARKERS]

function invoicesVisibleToParty(party: Party): Invoice[] {
  if (party === PARTIES.SME || party === PARTIES.DEBTOR) {
    return MOCK_INVOICES
  }
  if (party === PARTIES.LENDER_A) {
    return MOCK_INVOICES.filter((inv) => inv.invoiceNumber === 'INV-001')
  }
  return []
}

function attestationsForParty(party: Party): UnpledgedAttestation[] {
  return MOCK_ATTESTATIONS.filter((a) => a.lender === party || a.owner === party)
}

function pledgeMarkersForParty(party: Party): PledgeMarker[] {
  return liveMockMarkers.filter(
    (m) => m.lender === party || m.invoiceOwner === party,
  )
}

function offersForParty(party: Party): FinancingOffer[] {
  return liveMockOffers.filter((o) => o.lender === party || o.sme === party)
}

export async function mockListInvoices(party: Party): Promise<Invoice[]> {
  await delay()
  return invoicesVisibleToParty(party)
}

export async function mockGetAttestation(
  party: Party,
  contractId?: string,
): Promise<UnpledgedAttestation | null> {
  await delay()
  const matches = attestationsForParty(party)
  if (contractId) {
    return matches.find((a) => a.contractId === contractId) ?? null
  }
  return matches[0] ?? null
}

export async function mockCreateFinancingOffer(
  input: CreateFinancingOfferInput,
): Promise<FinancingOffer> {
  await delay()
  const offer: FinancingOffer = {
    contractId: `#3:${liveMockOffers.length}`,
    ...input,
    status: 'pending',
  }
  liveMockOffers.push(offer)
  return offer
}

export async function mockAcceptFinancing(
  input: AcceptFinancingInput,
): Promise<PledgeMarker> {
  await delay()
  const offer = liveMockOffers.find((o) => o.contractId === input.offerCid)
  if (offer) {
    offer.status = 'accepted'
  }
  const marker = liveMockMarkers[0] ?? MOCK_PLEDGE_MARKERS[0]
  return marker
}

export async function mockGetLenderView(party: Party): Promise<LenderView> {
  await delay()
  return {
    party,
    invoices: invoicesVisibleToParty(party),
    attestations: attestationsForParty(party),
    pledgeMarkers: pledgeMarkersForParty(party),
    pendingOffers: offersForParty(party).filter((o) => o.status === 'pending'),
  }
}

export async function mockListFinancingRequests(
  party: Party,
): Promise<FinancingRequest[]> {
  await delay()
  if (party === PARTIES.SME) {
    return MOCK_FINANCING_REQUESTS
  }
  return MOCK_FINANCING_REQUESTS.filter((r) => r.status === 'pending')
}

export async function mockGetDoublePledgeAttempt(): Promise<DoublePledgeAttempt> {
  await delay()
  return MOCK_DOUBLE_PLEDGE
}

export async function mockListPledgeMarkers(
  party: Party,
): Promise<PledgeMarker[]> {
  await delay()
  return pledgeMarkersForParty(party)
}

export async function mockAttemptDoublePledgeLive(
  onProgress?: LiveDoublePledgeProgress,
): Promise<LiveDoublePledgeResult> {
  const lines: LiveDoublePledgeLogLine[] = [
    {
      timestamp: new Date().toISOString(),
      text: 'PART B — double-pledge replay (mock)',
      variant: 'lime',
    },
    {
      timestamp: new Date().toISOString(),
      text: 'PledgeMarker count (Lender A ACS): 1',
      variant: 'info',
    },
    {
      timestamp: new Date().toISOString(),
      text: 'B2: SME → CompleteFinancing on SAME invoice (expect ledger rejection)…',
    },
    {
      timestamp: new Date().toISOString(),
      text: 'HTTP 400',
      variant: 'error',
    },
  ]
  for (const line of lines) {
    onProgress?.(line)
    await delay(120)
  }

  const verbatimBody = JSON.stringify(
    {
      code: 'DAML_FAILURE',
      cause:
        'Interpretation error: Error: User failure: UNHANDLED_EXCEPTION/DA.Exception.AssertionFailed:AssertionFailed (error category 9): Invoice already pledged',
      correlationId: 'mock-correlation-id',
      traceId: 'mock-trace-id',
      context: {
        exercise_trace:
          '    in choice 3a6372bf:Financing:PledgeRegistry:RecordPledge on contract …\n    in choice 3a6372bf:Financing:FinancingCoordinator:CompleteFinancing on contract …\n',
      },
    },
    null,
    2,
  )

  return {
    blocked: true,
    httpStatus: 400,
    reason:
      'Interpretation error: Error: User failure: UNHANDLED_EXCEPTION/DA.Exception.AssertionFailed:AssertionFailed (error category 9): Invoice already pledged',
    verbatimBody,
    correlationId: 'mock-correlation-id',
    traceId: 'mock-trace-id',
    commandId: 'unpledged-double-pledge-mock',
    attemptedAt: new Date().toISOString(),
    pledgeMarkerCountBefore: 1,
    pledgeMarkerCountAfter: 1,
  }
}

export async function mockGetLenderFinancingTree(): Promise<LenderTransactionTreeSummary> {
  await delay()
  return {
    updateId: 'mock-update-id',
    party: PARTIES.LENDER_A,
    nodes: [],
    invoiceNodeCount: 0,
    fullTreeInvoiceNodeCount: 0,
    fetchedAt: new Date().toISOString(),
    lenderVisibleNodes: [
      {
        nodeId: '1',
        kind: 'Exercised',
        templateLabel: 'Financing:FinancingOffer',
        choice: 'AcceptFinancing',
        lenderVisible: true,
        isInvoiceTemplate: false,
      },
      {
        nodeId: '2',
        kind: 'Exercised',
        templateLabel: 'Financing:PledgeRegistry',
        choice: 'RecordPledge',
        lenderVisible: true,
        isInvoiceTemplate: false,
      },
      {
        nodeId: '3',
        kind: 'Created',
        templateLabel: 'Financing:PledgeMarker',
        lenderVisible: true,
        isInvoiceTemplate: false,
      },
    ],
  }
}
