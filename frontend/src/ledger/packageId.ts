/**
 * Main package ID for unpledged-0.0.1 (LF 2.1, SDK 3.4.11).
 * Read via: daml damlc inspect-dar .daml/dist/unpledged-0.0.1.dar
 *
 * templateId format for JSON Ledger API v2: `${packageId}:${module}:${entity}`
 */

export const PACKAGE_ID =
  '3a6372bf939532634aa41b2abf1e3ae1f26960bf21c4cc4549cea9a2c9dc236d'

export const TEMPLATE_IDS = {
  Invoice: `${PACKAGE_ID}:Invoice:Invoice`,
  PledgeIntent: `${PACKAGE_ID}:Invoice:PledgeIntent`,
  UnpledgedAttestation: `${PACKAGE_ID}:Attestation:UnpledgedAttestation`,
  AttestationFactory: `${PACKAGE_ID}:Attestation:AttestationFactory`,
  PledgeMarker: `${PACKAGE_ID}:Financing:PledgeMarker`,
  PledgeRegistry: `${PACKAGE_ID}:Financing:PledgeRegistry`,
  FinancingOffer: `${PACKAGE_ID}:Financing:FinancingOffer`,
  FinancingCoordinator: `${PACKAGE_ID}:Financing:FinancingCoordinator`,
} as const

/** ACS TemplateFilter queries — package-NAME format (#unpledged:...). */
export const TEMPLATE_QUERY_IDS = {
  Invoice: '#unpledged:Invoice:Invoice',
  UnpledgedAttestation: '#unpledged:Attestation:UnpledgedAttestation',
  FinancingOffer: '#unpledged:Financing:FinancingOffer',
  FinancingCoordinator: '#unpledged:Financing:FinancingCoordinator',
  PledgeRegistry: '#unpledged:Financing:PledgeRegistry',
  PledgeMarker: '#unpledged:Financing:PledgeMarker',
} as const

export const CHOICE_NAMES = {
  ProveUnpledged: 'ProveUnpledged',
  PreparePledge: 'PreparePledge',
  AcceptFinancing: 'AcceptFinancing',
  CompleteFinancing: 'CompleteFinancing',
  RecordPledge: 'RecordPledge',
} as const
