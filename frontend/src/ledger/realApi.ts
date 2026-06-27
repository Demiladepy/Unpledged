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
import { ledgerClient, newCommandId } from './client'
import { ledgerConfig } from './config'
import type {
  Command,
  CreatedEvent,
  GetActiveContractsRequest,
  JsGetActiveContractsResponse,
  SubmitAndWaitResponse,
} from './openapi-types'
import { CHOICE_NAMES, TEMPLATE_IDS } from './packageId'

// ---------------------------------------------------------------------------
// Ledger helpers
// GET  /v2/state/ledger-end
// POST /v2/state/active-contracts  (operationId: postV2StateActive-contracts)
// POST /v2/contracts/contract-by-id (experimental; operationId: postV2ContractsContract-by-id)
// ---------------------------------------------------------------------------

async function getLedgerEndOffset(): Promise<number> {
  const { data, error } = await ledgerClient.GET('/v2/state/ledger-end')
  if (error) {
    throw new Error(`GET /v2/state/ledger-end failed: ${JSON.stringify(error)}`)
  }
  return data?.offset ?? 0
}

function templateFilter(
  templateId: string,
): GetActiveContractsRequest['eventFormat']['filtersByParty'][string] {
  return {
    cumulative: [
      {
        identifierFilter: {
          TemplateFilter: {
            value: { templateId },
          },
        },
      },
    ],
  }
}

async function queryActiveContracts(
  party: Party,
  templateId: string,
): Promise<CreatedEvent[]> {
  const activeAtOffset = await getLedgerEndOffset()
  const body: GetActiveContractsRequest = {
    activeAtOffset,
    eventFormat: {
      filtersByParty: {
        [party]: templateFilter(templateId),
      },
      verbose: true,
    },
  }

  const { data, error } = await ledgerClient.POST('/v2/state/active-contracts', {
    body,
  })

  if (error) {
    throw new Error(
      `POST /v2/state/active-contracts failed: ${JSON.stringify(error)}`,
    )
  }

  return (data ?? [])
    .map(extractCreatedEvent)
    .filter((e): e is CreatedEvent => e !== null)
}

async function getContractById(
  contractId: string,
  queryingParties: Party[],
): Promise<CreatedEvent | null> {
  const { data, error } = await ledgerClient.POST(
    '/v2/contracts/contract-by-id',
    {
      body: { contractId, queryingParties },
    },
  )
  if (error) {
    throw new Error(
      `POST /v2/contracts/contract-by-id failed: ${JSON.stringify(error)}`,
    )
  }
  return data?.createdEvent ?? null
}

function extractCreatedEvent(
  row: JsGetActiveContractsResponse,
): CreatedEvent | null {
  const entry = row.contractEntry
  if (!entry || !('JsActiveContract' in entry)) {
    return null
  }
  return entry.JsActiveContract.createdEvent
}

// ---------------------------------------------------------------------------
// Daml JSON decoders — TODO: verify encodings on live participant
// ---------------------------------------------------------------------------

function asParty(value: unknown): Party {
  return String(value)
}

function asDecimal(value: unknown): number {
  return typeof value === 'number' ? value : Number(String(value))
}

function asDate(value: unknown): string {
  if (typeof value === 'string') {
    return value
  }
  return String(value)
}

function asOptionalDate(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null
  }
  // TODO: Optional Date may encode as { tag: 'Some', value: ... } on live ledger
  if (typeof value === 'object' && value !== null && 'value' in value) {
    return asDate((value as { value: unknown }).value)
  }
  return asDate(value)
}

function parseInvoice(event: CreatedEvent): Invoice {
  const a = event.createArgument
  return {
    contractId: event.contractId,
    owner: asParty(a.owner),
    debtor: asParty(a.debtor),
    amount: asDecimal(a.amount),
    dueDate: asDate(a.dueDate),
    invoiceNumber: String(a.invoiceNumber),
    settledOn: asOptionalDate(a.settledOn),
  }
}

function parseAttestation(event: CreatedEvent): UnpledgedAttestation {
  const a = event.createArgument
  return {
    contractId: event.contractId,
    owner: asParty(a.owner),
    lender: asParty(a.lender),
    periodStart: asDate(a.periodStart),
    periodEnd: asDate(a.periodEnd),
    settledCount: Number(a.settledCount),
    settledTotal: asDecimal(a.settledTotal),
    allSettledOnTime: Boolean(a.allSettledOnTime),
  }
}

function parsePledgeMarker(event: CreatedEvent): PledgeMarker {
  const a = event.createArgument
  return {
    contractId: event.contractId,
    invoiceOwner: asParty(a.invoiceOwner),
    lender: asParty(a.lender),
    invoiceRef: String(a.invoiceRef),
  }
}

function parseFinancingOffer(event: CreatedEvent): FinancingOffer {
  const a = event.createArgument
  return {
    contractId: event.contractId,
    lender: asParty(a.lender),
    sme: asParty(a.sme),
    attestationCid: String(a.attestationCid),
    advanceAmount: asDecimal(a.advanceAmount),
    status: 'pending',
  }
}

// ---------------------------------------------------------------------------
// POST /v2/commands/submit-and-wait (JsCommands)
// ---------------------------------------------------------------------------

async function submitAndWait(
  actAs: Party[],
  commands: Command[],
): Promise<SubmitAndWaitResponse> {
  const { data, error } = await ledgerClient.POST(
    '/v2/commands/submit-and-wait',
    {
      body: {
        commandId: newCommandId('unpledged'),
        commands,
        actAs,
        userId: ledgerConfig.userId,
      },
    },
  )
  if (error) {
    throw new Error(
      `POST /v2/commands/submit-and-wait failed: ${JSON.stringify(error)}`,
    )
  }
  return data ?? {}
}

// ---------------------------------------------------------------------------
// Public real-API implementations
// ---------------------------------------------------------------------------

export async function realListInvoices(party: Party): Promise<Invoice[]> {
  const events = await queryActiveContracts(party, TEMPLATE_IDS.Invoice)
  return events.map(parseInvoice)
}

export async function realGetAttestation(
  party: Party,
  contractId?: string,
): Promise<UnpledgedAttestation | null> {
  const events = await queryActiveContracts(
    party,
    TEMPLATE_IDS.UnpledgedAttestation,
  )
  const parsed = events.map(parseAttestation)
  if (contractId) {
    return parsed.find((a) => a.contractId === contractId) ?? null
  }
  return parsed[0] ?? null
}

export async function realCreateFinancingOffer(
  input: CreateFinancingOfferInput,
): Promise<FinancingOffer> {
  await submitAndWait([input.lender], [
    {
      CreateCommand: {
        templateId: TEMPLATE_IDS.FinancingOffer,
        createArguments: {
          lender: input.lender,
          sme: input.sme,
          attestationCid: input.attestationCid,
          // TODO: Decimal encoding — confirm string vs numeric on live ledger
          advanceAmount: String(input.advanceAmount),
        },
      },
    },
  ])

  // TODO: use POST /v2/commands/submit-and-wait-for-transaction to read created contractId
  const offers = await queryActiveContracts(
    input.lender,
    TEMPLATE_IDS.FinancingOffer,
  )
  const latest = offers.at(-1)
  if (!latest) {
    throw new Error('FinancingOffer not found after create')
  }
  return parseFinancingOffer(latest)
}

export async function realAcceptFinancing(
  input: AcceptFinancingInput,
): Promise<PledgeMarker> {
  const offerEvent = await getContractById(input.offerCid, [])
  if (!offerEvent) {
    throw new Error(`FinancingOffer ${input.offerCid} not found`)
  }
  const offer = parseFinancingOffer(offerEvent)
  const sme = offer.sme

  const invoices = await queryActiveContracts(sme, TEMPLATE_IDS.Invoice)
  const invoice = invoices
    .map(parseInvoice)
    .find((inv) => inv.invoiceNumber === input.invoiceNumber)
  if (!invoice) {
    throw new Error(`Invoice ${input.invoiceNumber} not in ACS for ${sme}`)
  }

  const coordinators = await queryActiveContracts(
    sme,
    TEMPLATE_IDS.FinancingCoordinator,
  )
  const coordinator = coordinators.at(-1)
  if (!coordinator) {
    throw new Error(`FinancingCoordinator not found for ${sme}`)
  }

  await submitAndWait([sme], [
    {
      ExerciseCommand: {
        templateId: TEMPLATE_IDS.FinancingCoordinator,
        contractId: coordinator.contractId,
        choice: CHOICE_NAMES.CompleteFinancing,
        choiceArgument: {
          invoiceCid: invoice.contractId,
          offerCid: input.offerCid,
        },
      },
    },
  ])

  const markers = await queryActiveContracts(sme, TEMPLATE_IDS.PledgeMarker)
  const latest = markers.at(-1)
  if (!latest) {
    throw new Error('PledgeMarker not found after CompleteFinancing')
  }
  return parsePledgeMarker(latest)
}

export async function realGetLenderView(party: Party): Promise<LenderView> {
  const [invoices, attestations, pledgeMarkers, offerEvents] =
    await Promise.all([
      queryActiveContracts(party, TEMPLATE_IDS.Invoice),
      queryActiveContracts(party, TEMPLATE_IDS.UnpledgedAttestation),
      queryActiveContracts(party, TEMPLATE_IDS.PledgeMarker),
      queryActiveContracts(party, TEMPLATE_IDS.FinancingOffer),
    ])

  const offers = offerEvents.map(parseFinancingOffer)

  return {
    party,
    invoices: invoices.map(parseInvoice),
    attestations: attestations.map(parseAttestation),
    pledgeMarkers: pledgeMarkers.map(parsePledgeMarker),
    pendingOffers: offers.filter((o) => o.status === 'pending'),
  }
}

export async function realListFinancingRequests(
  _party: Party,
): Promise<FinancingRequest[]> {
  // TODO: derive from FinancingOffer ACS or add on-ledger FinancingRequest template
  return []
}

export async function realGetDoublePledgeAttempt(): Promise<DoublePledgeAttempt> {
  // TODO: parse JsCantonError / completion stream from failed submit-and-wait
  throw new Error(
    'getDoublePledgeAttempt: wire to command completion error stream',
  )
}

export async function realListPledgeMarkers(
  party: Party,
): Promise<PledgeMarker[]> {
  const events = await queryActiveContracts(party, TEMPLATE_IDS.PledgeMarker)
  return events.map(parsePledgeMarker)
}
