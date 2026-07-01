import type {
  AcceptFinancingInput,
  CreateFinancingOfferInput,
  DoublePledgeAttempt,
  FinancingOffer,
  FinancingRequest,
  Invoice,
  LenderTransactionTreeSummary,
  LenderView,
  LiveDoublePledgeProgress,
  LiveDoublePledgeResult,
  Party,
  PledgeMarker,
  UnpledgedAttestation,
} from '../types/ledger'
import { ledgerConfig } from './config'
import * as mock from './mockApi'
import * as real from './realApi'

export async function listInvoices(party: Party): Promise<Invoice[]> {
  return ledgerConfig.useMocks
    ? mock.mockListInvoices(party)
    : real.realListInvoices(party)
}

export async function getAttestation(
  party: Party,
  contractId?: string,
): Promise<UnpledgedAttestation | null> {
  return ledgerConfig.useMocks
    ? mock.mockGetAttestation(party, contractId)
    : real.realGetAttestation(party, contractId)
}

export async function createFinancingOffer(
  input: CreateFinancingOfferInput,
): Promise<FinancingOffer> {
  return ledgerConfig.useMocks
    ? mock.mockCreateFinancingOffer(input)
    : real.realCreateFinancingOffer(input)
}

export async function acceptFinancing(
  input: AcceptFinancingInput,
): Promise<PledgeMarker> {
  return ledgerConfig.useMocks
    ? mock.mockAcceptFinancing(input)
    : real.realAcceptFinancing(input)
}

export async function getLenderView(party: Party): Promise<LenderView> {
  return ledgerConfig.useMocks
    ? mock.mockGetLenderView(party)
    : real.realGetLenderView(party)
}

export async function listFinancingRequests(
  party: Party,
): Promise<FinancingRequest[]> {
  return ledgerConfig.useMocks
    ? mock.mockListFinancingRequests(party)
    : real.realListFinancingRequests(party)
}

export async function getDoublePledgeAttempt(): Promise<DoublePledgeAttempt> {
  return ledgerConfig.useMocks
    ? mock.mockGetDoublePledgeAttempt()
    : real.realGetDoublePledgeAttempt()
}

export async function listPledgeMarkers(
  party: Party,
): Promise<PledgeMarker[]> {
  return ledgerConfig.useMocks
    ? mock.mockListPledgeMarkers(party)
    : real.realListPledgeMarkers(party)
}

export type { LiveDoublePledgeLogLine, LiveDoublePledgeProgress } from '../types/ledger'

export async function attemptDoublePledgeLive(
  onProgress?: LiveDoublePledgeProgress,
): Promise<LiveDoublePledgeResult> {
  return ledgerConfig.useMocks
    ? mock.mockAttemptDoublePledgeLive(onProgress)
    : real.realAttemptDoublePledgeLive(onProgress)
}

export async function getLenderFinancingTree(): Promise<LenderTransactionTreeSummary> {
  return ledgerConfig.useMocks
    ? mock.mockGetLenderFinancingTree()
    : real.realGetLenderFinancingTree()
}
