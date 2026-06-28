import type {
  DoublePledgeAttempt,
  FinancingOffer,
  FinancingRequest,
  Invoice,
  PledgeMarker,
  UnpledgedAttestation,
} from '../types/ledger'
import { PARTIES } from './parties'

export { PARTIES }

const CANONICAL_REF_INV001 =
  'INVREF-v1:SME|Debtor|100.0|2026-01-31|INV-001'

export const MOCK_INVOICES: Invoice[] = [
  {
    contractId: '#0:0',
    owner: PARTIES.SME,
    debtor: PARTIES.DEBTOR,
    amount: 100_000,
    dueDate: '2026-01-31',
    invoiceNumber: 'INV-001',
    settledOn: '2026-01-15',
  },
  {
    contractId: '#0:1',
    owner: PARTIES.SME,
    debtor: PARTIES.DEBTOR,
    amount: 200_000,
    dueDate: '2026-01-31',
    invoiceNumber: 'INV-002',
    settledOn: '2026-01-20',
  },
]

export const MOCK_ATTESTATIONS: UnpledgedAttestation[] = [
  {
    contractId: '#1:0',
    owner: PARTIES.SME,
    lender: PARTIES.LENDER_A,
    periodStart: '2026-01-01',
    periodEnd: '2026-01-31',
    settledCount: 2,
    settledTotal: 300_000,
    allSettledOnTime: true,
  },
]

export const MOCK_PLEDGE_MARKERS: PledgeMarker[] = [
  {
    contractId: '#2:0',
    invoiceOwner: PARTIES.SME,
    lender: PARTIES.LENDER_A,
    invoiceRef: CANONICAL_REF_INV001,
  },
]

export const MOCK_FINANCING_OFFERS: FinancingOffer[] = [
  {
    contractId: '#3:0',
    lender: PARTIES.LENDER_A,
    sme: PARTIES.SME,
    attestationCid: '#1:0',
    advanceAmount: 85_000,
    status: 'accepted',
  },
  {
    contractId: '#3:1',
    lender: PARTIES.LENDER_B,
    sme: PARTIES.SME,
    attestationCid: '#1:0',
    advanceAmount: 50_000,
    status: 'rejected',
  },
]

export const MOCK_FINANCING_REQUESTS: FinancingRequest[] = [
  {
    id: 'req-001',
    sme: PARTIES.SME,
    invoiceNumber: 'INV-001',
    advanceAmount: 85_000,
    status: 'funded',
  },
  {
    id: 'req-002',
    sme: PARTIES.SME,
    invoiceNumber: 'INV-002',
    advanceAmount: 120_000,
    status: 'pending',
  },
]

export const MOCK_DOUBLE_PLEDGE: DoublePledgeAttempt = {
  invoiceNumber: 'INV-001',
  invoiceRef: CANONICAL_REF_INV001,
  lender: PARTIES.LENDER_B,
  blocked: true,
  reason: 'Duplicate contract key on PledgeMarker (invoiceOwner, invoiceRef)',
  attemptedAt: '2026-01-22T14:32:00Z',
}
