import type {
  AcceptFinancingInput,
  CreateFinancingOfferInput,
  DoublePledgeAttempt,
  FinancingOffer,
  FinancingRequest,
  Invoice,
  LenderView,
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
  return MOCK_PLEDGE_MARKERS.filter(
    (m) => m.lender === party || m.invoiceOwner === party,
  )
}

function offersForParty(party: Party): FinancingOffer[] {
  return MOCK_FINANCING_OFFERS.filter(
    (o) => o.lender === party || o.sme === party,
  )
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
  return {
    contractId: `#3:${MOCK_FINANCING_OFFERS.length}`,
    ...input,
    status: 'pending',
  }
}

export async function mockAcceptFinancing(
  _input: AcceptFinancingInput,
): Promise<PledgeMarker> {
  await delay()
  return MOCK_PLEDGE_MARKERS[0]
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
