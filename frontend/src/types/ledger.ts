export type Party = string

export interface Invoice {
  contractId: string
  owner: Party
  debtor: Party
  amount: number
  dueDate: string
  invoiceNumber: string
  settledOn: string | null
}

export interface UnpledgedAttestation {
  contractId: string
  owner: Party
  lender: Party
  periodStart: string
  periodEnd: string
  settledCount: number
  settledTotal: number
  allSettledOnTime: boolean
}

export interface PledgeMarker {
  contractId: string
  invoiceOwner: Party
  lender: Party
  invoiceRef: string
}

export interface FinancingOffer {
  contractId: string
  lender: Party
  sme: Party
  attestationCid: string
  advanceAmount: number
  status: 'pending' | 'accepted' | 'rejected'
}

export interface FinancingRequest {
  id: string
  sme: Party
  invoiceNumber: string
  advanceAmount: number
  status: 'pending' | 'funded' | 'blocked'
}

export interface LenderView {
  party: Party
  invoices: Invoice[]
  attestations: UnpledgedAttestation[]
  pledgeMarkers: PledgeMarker[]
  pendingOffers: FinancingOffer[]
}

export interface DoublePledgeAttempt {
  invoiceNumber: string
  invoiceRef: string
  lender: Party
  blocked: boolean
  reason: string
  attemptedAt: string
}

export interface LiveDoublePledgeLogLine {
  timestamp: string
  text: string
  variant?: 'info' | 'success' | 'error' | 'muted' | 'lime'
}

export type LiveDoublePledgeProgress = (line: LiveDoublePledgeLogLine) => void

export interface LiveDoublePledgeResult {
  blocked: boolean
  httpStatus?: number
  /** Short summary (e.g. DAML_FAILURE cause) */
  reason: string
  /** Full HTTP response body from submit-and-wait */
  verbatimBody: string
  correlationId?: string
  traceId?: string
  commandId: string
  attemptedAt: string
  pledgeMarkerCountBefore: number
  pledgeMarkerCountAfter: number
}

export interface TransactionTreeNode {
  nodeId: string
  kind: 'Created' | 'Exercised'
  templateLabel: string
  choice?: string
  lenderVisible: boolean
  isInvoiceTemplate: boolean
}

export interface LenderTransactionTreeSummary {
  updateId: string
  party: Party
  nodes: TransactionTreeNode[]
  invoiceNodeCount: number
  lenderVisibleNodes: TransactionTreeNode[]
}

export interface CreateFinancingOfferInput {
  lender: Party
  sme: Party
  attestationCid: string
  advanceAmount: number
}

export interface AcceptFinancingInput {
  offerCid: string
  invoiceNumber: string
}
