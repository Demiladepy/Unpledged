/**
 * TODO: Fill in after deploying unpledged-0.0.1.dar to your Canton participant.
 *
 * Read packageId from upload response or:
 *   daml damlc inspect-dar .daml/dist/unpledged-0.0.1.dar
 *
 * templateId format for JSON Ledger API v2: `${packageId}:${module}:${entity}`
 * (package-id reference format per OpenAPI TemplateFilter / CreateCommand).
 */

/** Replace with deployed package hash, e.g. "abc123def456..." */
export const PACKAGE_ID = 'TODO_PACKAGE_ID'

export const TEMPLATE_IDS = {
  Invoice: `${PACKAGE_ID}:Invoice:Invoice`,
  UnpledgedAttestation: `${PACKAGE_ID}:Attestation:UnpledgedAttestation`,
  PledgeMarker: `${PACKAGE_ID}:Financing:PledgeMarker`,
  PledgeIntent: `${PACKAGE_ID}:Invoice:PledgeIntent`,
  FinancingOffer: `${PACKAGE_ID}:Financing:FinancingOffer`,
  FinancingCoordinator: `${PACKAGE_ID}:Financing:FinancingCoordinator`,
  AttestationFactory: `${PACKAGE_ID}:Attestation:AttestationFactory`,
} as const

export const CHOICE_NAMES = {
  ProveUnpledged: 'ProveUnpledged',
  PreparePledge: 'PreparePledge',
  AcceptFinancing: 'AcceptFinancing',
  CompleteFinancing: 'CompleteFinancing',
} as const
