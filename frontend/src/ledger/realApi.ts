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
  TransactionTreeNode,
  UnpledgedAttestation,
} from '../types/ledger'
import { ledgerClient, newCommandId } from './client'
import { getAccessToken } from './auth'
import { ledgerConfig } from './config'
import { PARTIES } from './parties'
import type {
  Command,
  CreatedEvent,
  GetActiveContractsRequest,
  JsGetActiveContractsResponse,
  SubmitAndWaitResponse,
} from './openapi-types'
import { CHOICE_NAMES, TEMPLATE_IDS, TEMPLATE_QUERY_IDS } from './packageId'

// ---------------------------------------------------------------------------
// Ledger helpers — ACS queries use #unpledged:… (package-name); commands use
// package-id hash (3a6372bf…). Proven on live DevNet via server/ scripts.
// ---------------------------------------------------------------------------

/** Reuse ledger-end across parallel ACS queries (avoids 8–10 redundant round trips). */
let cachedLedgerEnd: { offset: number; fetchedAt: number } | null = null
let ledgerEndInFlight: Promise<number> | null = null
const LEDGER_END_TTL_MS = 10_000

async function getLedgerEndOffset(): Promise<number> {
  const now = Date.now()
  if (cachedLedgerEnd && now - cachedLedgerEnd.fetchedAt < LEDGER_END_TTL_MS) {
    return cachedLedgerEnd.offset
  }

  if (!ledgerEndInFlight) {
    ledgerEndInFlight = (async () => {
      const { data, error } = await ledgerClient.GET('/v2/state/ledger-end')
      if (error) {
        throw new Error(
          `GET /v2/state/ledger-end failed: ${JSON.stringify(error)}`,
        )
      }
      const offset = data?.offset ?? 0
      cachedLedgerEnd = { offset, fetchedAt: Date.now() }
      return offset
    })().finally(() => {
      ledgerEndInFlight = null
    })
  }

  return ledgerEndInFlight
}

function templateFilter(
  templateIdForQuery: string,
): GetActiveContractsRequest['eventFormat']['filtersByParty'][string] {
  return {
    cumulative: [
      {
        identifierFilter: {
          TemplateFilter: {
            value: { templateId: templateIdForQuery },
          },
        },
      },
    ],
  }
}

async function queryActiveContracts(
  party: Party,
  templateIdForQuery: string,
): Promise<CreatedEvent[]> {
  const activeAtOffset = await getLedgerEndOffset()
  const body: GetActiveContractsRequest = {
    activeAtOffset,
    eventFormat: {
      filtersByParty: {
        [party]: templateFilter(templateIdForQuery),
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
// Daml JSON decoders (live DevNet encodings verified)
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
  const result = await submitAndWaitRaw(actAs, commands)
  if (!result.ok) {
    throw new Error(
      `POST /v2/commands/submit-and-wait failed (${result.status}): ${result.body}`,
    )
  }
  try {
    return JSON.parse(result.body) as SubmitAndWaitResponse
  } catch {
    return {}
  }
}

async function submitAndWaitRaw(
  actAs: Party[],
  commands: Command[],
  commandId?: string,
): Promise<{
  ok: boolean
  status: number
  body: string
  commandId: string
}> {
  const token = await getAccessToken()
  const id = commandId ?? newCommandId('unpledged')
  const url = `${ledgerConfig.baseUrl.replace(/\/$/, '')}/v2/commands/submit-and-wait`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      commandId: id,
      commands,
      actAs,
      userId: ledgerConfig.userId,
    }),
  })
  const body = await res.text()
  return { ok: res.ok, status: res.status, body, commandId: id }
}

function formatVerbatimBody(body: string): string {
  try {
    return JSON.stringify(JSON.parse(body) as unknown, null, 2)
  } catch {
    return body
  }
}

function parseLedgerErrorIds(body: string): {
  correlationId?: string
  traceId?: string
  reason: string
} {
  try {
    const parsed = JSON.parse(body) as {
      code?: string
      cause?: string
      message?: string
      correlationId?: string
      traceId?: string
    }
    return {
      correlationId: parsed.correlationId,
      traceId: parsed.traceId,
      reason:
        parsed.cause ??
        parsed.message ??
        parsed.code ??
        body,
    }
  } catch {
    return { reason: body }
  }
}

function templateLabel(templateId: unknown): string {
  if (typeof templateId !== 'string') return String(templateId)
  const parts = templateId.split(':')
  return parts.length >= 3 ? parts.slice(-2).join(':') : templateId
}

function isInvoiceTemplateId(templateId: unknown): boolean {
  return (
    typeof templateId === 'string' &&
    (templateId.endsWith(':Invoice:Invoice') ||
      templateId.includes('Invoice:Invoice'))
  )
}

function parseTransactionTreeNodes(
  tree: { transaction?: { eventsById?: Record<string, unknown> } },
  party: Party,
): TransactionTreeNode[] {
  const events = tree.transaction?.eventsById ?? {}
  const out: TransactionTreeNode[] = []

  for (const [nodeId, raw] of Object.entries(events)) {
    const event = raw as Record<string, unknown>
    if ('CreatedTreeEvent' in event) {
      const value = (event.CreatedTreeEvent as { value?: Record<string, unknown> })
        .value
      const witnesses = (value?.witnessParties as string[] | undefined) ?? []
      const templateId = value?.templateId
      out.push({
        nodeId,
        kind: 'Created',
        templateLabel: templateLabel(templateId),
        lenderVisible: witnesses.includes(party),
        isInvoiceTemplate: isInvoiceTemplateId(templateId),
      })
    } else if ('ExercisedTreeEvent' in event) {
      const value = (event.ExercisedTreeEvent as { value?: Record<string, unknown> })
        .value
      const witnesses = (value?.witnessParties as string[] | undefined) ?? []
      const templateId = value?.templateId
      out.push({
        nodeId,
        kind: 'Exercised',
        templateLabel: templateLabel(templateId),
        choice: value?.choice as string | undefined,
        lenderVisible: witnesses.includes(party),
        isInvoiceTemplate: isInvoiceTemplateId(templateId),
      })
    }
  }

  return out
}

function logProgress(
  onProgress: LiveDoublePledgeProgress | undefined,
  text: string,
  variant: LiveDoublePledgeLogLine['variant'] = 'info',
): void {
  onProgress?.({
    timestamp: new Date().toISOString(),
    text,
    variant,
  })
}

// ---------------------------------------------------------------------------
// Public real-API implementations
// ---------------------------------------------------------------------------

export async function realListInvoices(party: Party): Promise<Invoice[]> {
  const events = await queryActiveContracts(
    party,
    TEMPLATE_QUERY_IDS.Invoice,
  )
  return events.map(parseInvoice)
}

export async function realGetAttestation(
  party: Party,
  contractId?: string,
): Promise<UnpledgedAttestation | null> {
  const events = await queryActiveContracts(
    party,
    TEMPLATE_QUERY_IDS.UnpledgedAttestation,
  )
  const parsed = events.map(parseAttestation)
  const visible = parsed.filter(
    (a) => a.lender === party || a.owner === party,
  )
  if (contractId) {
    return visible.find((a) => a.contractId === contractId) ?? null
  }
  return visible.at(-1) ?? null
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
          advanceAmount: String(input.advanceAmount),
        },
      },
    },
  ])

  const offers = await queryActiveContracts(
    input.lender,
    TEMPLATE_QUERY_IDS.FinancingOffer,
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
  const offerEvent = await getContractById(input.offerCid, [PARTIES.SME])
  if (!offerEvent) {
    throw new Error(`FinancingOffer ${input.offerCid} not found`)
  }
  const offer = parseFinancingOffer(offerEvent)
  const sme = offer.sme

  const invoices = await queryActiveContracts(
    sme,
    TEMPLATE_QUERY_IDS.Invoice,
  )
  const invoice = invoices
    .map(parseInvoice)
    .find((inv) => inv.invoiceNumber === input.invoiceNumber)
  if (!invoice) {
    throw new Error(`Invoice ${input.invoiceNumber} not in ACS for ${sme}`)
  }

  const coordinators = await queryActiveContracts(
    sme,
    TEMPLATE_QUERY_IDS.FinancingCoordinator,
  )
  const coordinator = coordinators.at(-1)
  if (!coordinator) {
    throw new Error(`FinancingCoordinator not found for ${sme}`)
  }

  const registries = await queryActiveContracts(
    sme,
    TEMPLATE_QUERY_IDS.PledgeRegistry,
  )
  const registry = registries.at(-1)
  if (!registry) {
    throw new Error(`PledgeRegistry not found for ${sme}`)
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
          pledgeRegistryCid: registry.contractId,
        },
      },
    },
  ])

  const markers = await queryActiveContracts(
    sme,
    TEMPLATE_QUERY_IDS.PledgeMarker,
  )
  const latest = markers.at(-1)
  if (!latest) {
    throw new Error('PledgeMarker not found after CompleteFinancing')
  }
  return parsePledgeMarker(latest)
}

export async function realGetLenderView(party: Party): Promise<LenderView> {
  const [invoices, attestations, pledgeMarkers, offerEvents] =
    await Promise.all([
      queryActiveContracts(party, TEMPLATE_QUERY_IDS.Invoice),
      queryActiveContracts(party, TEMPLATE_QUERY_IDS.UnpledgedAttestation),
      queryActiveContracts(party, TEMPLATE_QUERY_IDS.PledgeMarker),
      queryActiveContracts(party, TEMPLATE_QUERY_IDS.FinancingOffer),
    ])

  const offers = offerEvents.map(parseFinancingOffer)

  return {
    party,
    invoices: invoices.map(parseInvoice),
    attestations: attestations
      .map(parseAttestation)
      .filter((a) => a.lender === party || a.owner === party),
    pledgeMarkers: pledgeMarkers
      .map(parsePledgeMarker)
      .filter((m) => m.lender === party || m.invoiceOwner === party),
    pendingOffers: offers.filter(
      (o) => o.lender === party && o.status === 'pending',
    ),
  }
}

export async function realListFinancingRequests(
  party: Party,
): Promise<FinancingRequest[]> {
  const [invoices, markers] = await Promise.all([
    queryActiveContracts(party, TEMPLATE_QUERY_IDS.Invoice),
    queryActiveContracts(party, TEMPLATE_QUERY_IDS.PledgeMarker),
  ])
  const pledgedRefs = new Set(
    markers.map((m) => String(m.createArgument.invoiceRef)),
  )

  return invoices.map((inv, index) => {
    const parsed = parseInvoice(inv)
    const funded = [...pledgedRefs].some((ref) =>
      ref.includes(parsed.invoiceNumber),
    )
    return {
      id: `req-live-${index}`,
      sme: party,
      invoiceNumber: parsed.invoiceNumber,
      advanceAmount: parsed.amount * 0.9,
      status: funded ? 'funded' : 'pending',
    } satisfies FinancingRequest
  })
}

/** Live double-pledge rejection captured on DevNet (not re-submitted on page load). */
export async function realGetDoublePledgeAttempt(): Promise<DoublePledgeAttempt> {
  const markers = await queryActiveContracts(
    PARTIES.LENDER_A,
    TEMPLATE_QUERY_IDS.PledgeMarker,
  )
  const marker = markers.at(-1)
  const invoiceRef = marker
    ? String(marker.createArgument.invoiceRef)
    : ''

  return {
    invoiceNumber: 'INV-001',
    invoiceRef,
    lender: PARTIES.LENDER_A,
    blocked: true,
    reason:
      'DAML_FAILURE: AssertionFailed: Invoice already pledged (PledgeRegistry:RecordPledge)',
    attemptedAt: '2026-06-28T08:14:17.983256Z',
  }
}

export async function realListPledgeMarkers(
  party: Party,
): Promise<PledgeMarker[]> {
  const events = await queryActiveContracts(
    party,
    TEMPLATE_QUERY_IDS.PledgeMarker,
  )
  return events
    .map(parsePledgeMarker)
    .filter((m) => m.lender === party || m.invoiceOwner === party)
}

/** Re-submit second pledge on INV-001 — mirrors server/createFinancing.ts Part B. */
export async function realAttemptDoublePledgeLive(
  onProgress?: LiveDoublePledgeProgress,
): Promise<LiveDoublePledgeResult> {
  const sme = PARTIES.SME
  const lender = PARTIES.LENDER_A
  const attemptedAt = new Date().toISOString()

  logProgress(onProgress, 'PART B — double-pledge replay (live DevNet)', 'lime')
  logProgress(onProgress, `actAs: SME · userId: ${ledgerConfig.userId}`, 'muted')

  const markersBefore = await queryActiveContracts(
    lender,
    TEMPLATE_QUERY_IDS.PledgeMarker,
  )
  const pledgeMarkerCountBefore = markersBefore.length
  logProgress(
    onProgress,
    `PledgeMarker count (Lender A ACS): ${pledgeMarkerCountBefore}`,
    'info',
  )

  logProgress(onProgress, 'B0: discover INV-001, attestation, coordinator, registry…')
  const [invoices, attestations, coordinators, registries] = await Promise.all([
    queryActiveContracts(sme, TEMPLATE_QUERY_IDS.Invoice),
    queryActiveContracts(sme, TEMPLATE_QUERY_IDS.UnpledgedAttestation),
    queryActiveContracts(sme, TEMPLATE_QUERY_IDS.FinancingCoordinator),
    queryActiveContracts(sme, TEMPLATE_QUERY_IDS.PledgeRegistry),
  ])

  const invoice = invoices
    .map(parseInvoice)
    .find((inv) => inv.invoiceNumber === 'INV-001')
  const attestation = attestations
    .map(parseAttestation)
    .filter((a) => a.lender === lender)
    .at(-1)
  const coordinator = coordinators.at(-1)
  let registryCid = registries.at(-1)?.contractId

  if (!invoice || !attestation || !coordinator || !registryCid) {
    throw new Error(
      'Missing INV-001, attestation, coordinator, or registry — run create:financing first',
    )
  }

  logProgress(onProgress, `  Invoice INV-001: ${invoice.contractId}`, 'muted')
  logProgress(onProgress, `  Coordinator:     ${coordinator.contractId}`, 'muted')

  logProgress(onProgress, 'B1: LenderA creates second FinancingOffer (advance 500.00)…')
  const offerCreate = await submitAndWaitRaw([lender], [
    {
      CreateCommand: {
        templateId: TEMPLATE_IDS.FinancingOffer,
        createArguments: {
          lender,
          sme,
          attestationCid: attestation.contractId,
          advanceAmount: '500.00',
        },
      },
    },
  ])
  if (!offerCreate.ok) {
    throw new Error(
      `FinancingOffer create failed (${offerCreate.status}): ${offerCreate.body}`,
    )
  }
  logProgress(onProgress, `  HTTP ${offerCreate.status} — offer created`, 'success')

  const offers = await queryActiveContracts(
    lender,
    TEMPLATE_QUERY_IDS.FinancingOffer,
  )
  const offer2 = offers.at(-1)
  if (!offer2) {
    throw new Error('Second FinancingOffer not found after create')
  }
  logProgress(onProgress, `  Second offer: ${offer2.contractId}`, 'muted')

  const registriesRefreshed = await queryActiveContracts(
    sme,
    TEMPLATE_QUERY_IDS.PledgeRegistry,
  )
  registryCid = registriesRefreshed.at(-1)?.contractId
  if (!registryCid) {
    throw new Error('PledgeRegistry missing before CompleteFinancing')
  }

  logProgress(
    onProgress,
    'B2: SME → CompleteFinancing on SAME invoice (expect ledger rejection)…',
  )
  const dupCommandId = newCommandId('double-pledge')
  logProgress(onProgress, `  commandId: ${dupCommandId}`, 'muted')

  const dup = await submitAndWaitRaw(
    [sme],
    [
      {
        ExerciseCommand: {
          templateId: TEMPLATE_IDS.FinancingCoordinator,
          contractId: coordinator.contractId,
          choice: CHOICE_NAMES.CompleteFinancing,
          choiceArgument: {
            invoiceCid: invoice.contractId,
            offerCid: offer2.contractId,
            pledgeRegistryCid: registryCid,
          },
        },
      },
    ],
    dupCommandId,
  )

  const verbatimBody = formatVerbatimBody(dup.body)
  const { correlationId, traceId, reason } = parseLedgerErrorIds(dup.body)

  logProgress(onProgress, `HTTP ${dup.status}`, dup.ok ? 'error' : 'error')
  if (correlationId) {
    logProgress(onProgress, `correlationId: ${correlationId}`, 'muted')
  }
  if (traceId) {
    logProgress(onProgress, `traceId: ${traceId}`, 'muted')
  }

  const markersAfter = await queryActiveContracts(
    lender,
    TEMPLATE_QUERY_IDS.PledgeMarker,
  )
  const pledgeMarkerCountAfter = markersAfter.length
  logProgress(
    onProgress,
    `PledgeMarker count after rejection: ${pledgeMarkerCountAfter} (expected ${pledgeMarkerCountBefore})`,
    pledgeMarkerCountAfter === pledgeMarkerCountBefore ? 'lime' : 'error',
  )

  if (dup.ok) {
    return {
      blocked: false,
      httpStatus: dup.status,
      reason: `UNEXPECTED SUCCESS (HTTP ${dup.status})`,
      verbatimBody,
      correlationId,
      traceId,
      commandId: dup.commandId,
      attemptedAt,
      pledgeMarkerCountBefore,
      pledgeMarkerCountAfter,
    }
  }

  return {
    blocked: true,
    httpStatus: dup.status,
    reason,
    verbatimBody,
    correlationId,
    traceId,
    commandId: dup.commandId,
    attemptedAt,
    pledgeMarkerCountBefore,
    pledgeMarkerCountAfter,
  }
}

export async function realGetLenderFinancingTree(
  updateId: string = ledgerConfig.completeFinancingUpdateId,
  party: Party = PARTIES.LENDER_A,
): Promise<LenderTransactionTreeSummary> {
  const token = await getAccessToken()
  const params = new URLSearchParams()
  params.append('parties', party)
  const url = `${ledgerConfig.baseUrl.replace(/\/$/, '')}/v2/updates/transaction-tree-by-id/${encodeURIComponent(updateId)}?${params}`

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  })
  const text = await res.text()
  if (!res.ok) {
    throw new Error(`transaction-tree-by-id failed (${res.status}): ${text.slice(0, 400)}`)
  }

  const tree = JSON.parse(text) as {
    transaction?: { eventsById?: Record<string, unknown> }
  }
  const nodes = parseTransactionTreeNodes(tree, party)
  const lenderVisibleNodes = nodes.filter((n) => n.lenderVisible)
  const invoiceNodeCount = lenderVisibleNodes.filter((n) => n.isInvoiceTemplate).length

  return {
    updateId,
    party,
    nodes,
    invoiceNodeCount,
    lenderVisibleNodes,
  }
}
