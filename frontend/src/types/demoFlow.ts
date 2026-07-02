import type { FinancingOffer, Invoice, PledgeMarker, UnpledgedAttestation } from './ledger'

export interface DemoLedgerCommandResult {
  ok: boolean
  httpStatus: number
  commandId: string
  updateId?: string
  verbatimBody: string
  correlationId?: string
  traceId?: string
  reason?: string
}

export interface DemoPrivacyCheck {
  attestationCid: string
  lenderASeesAttestation: boolean
  lenderBSeesAttestation: boolean
  lenderAInvoiceCount: number
  lenderBAttestationCount: number
  lenderBInvoiceCount: number
}

export interface DemoFlowSession {
  invoiceNumber: string
  invoiceCid?: string
  attestationCid?: string
  settledCount?: number
  settledTotal?: number
  offerCid?: string
  pledgeMarkerCid?: string
  financingUpdateId?: string
}

export interface DemoStep1Result {
  invoice: Invoice
  result: DemoLedgerCommandResult
}

export interface DemoStep2Result {
  attestation: UnpledgedAttestation
  result: DemoLedgerCommandResult
  privacy: DemoPrivacyCheck
}

export interface DemoStep3Result {
  offer: FinancingOffer
  result: DemoLedgerCommandResult
}

export interface DemoStep4Result {
  marker: PledgeMarker
  result: DemoLedgerCommandResult
}

export interface DemoStep5Result {
  result: DemoLedgerCommandResult
  blocked: boolean
}
