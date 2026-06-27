/**
 * Minimal OpenAPI path types for openapi-fetch.
 * Full spec: https://docs.digitalasset.com/build/3.4/reference/json-api/openapi.html
 *
 * Only endpoints used by src/ledger/realApi.ts are typed here.
 */

/** POST /v2/state/active-contracts — GetActiveContractsRequest */
export interface GetActiveContractsRequest {
  activeAtOffset: number
  eventFormat: {
    filtersByParty: Record<string, Filters>
    verbose?: boolean
  }
}

export interface Filters {
  cumulative?: CumulativeFilter[]
}

export interface CumulativeFilter {
  identifierFilter: {
    TemplateFilter: {
      value: {
        templateId: string
        includeCreatedEventBlob?: boolean
      }
    }
  }
}

/** Response item — JsGetActiveContractsResponse */
export interface JsGetActiveContractsResponse {
  workflowId?: string
  contractEntry?: JsContractEntry
}

export type JsContractEntry = {
  JsActiveContract: {
    createdEvent: CreatedEvent
    synchronizerId: string
    reassignmentCounter: number
  }
}

export interface CreatedEvent {
  contractId: string
  templateId: string
  createArgument: Record<string, unknown>
  signatories?: string[]
  observers?: string[]
}

/** GET /v2/state/ledger-end — GetLedgerEndResponse */
export interface GetLedgerEndResponse {
  offset?: number
}

/** POST /v2/commands/submit-and-wait — JsCommands */
export interface JsCommands {
  commandId: string
  commands: Command[]
  actAs: string[]
  userId?: string
  readAs?: string[]
  workflowId?: string
}

export type Command =
  | { CreateCommand: CreateCommand }
  | { ExerciseCommand: ExerciseCommand }
  | { CreateAndExerciseCommand: CreateAndExerciseCommand }

export interface CreateCommand {
  templateId: string
  createArguments: Record<string, unknown>
}

export interface ExerciseCommand {
  templateId: string
  contractId: string
  choice: string
  choiceArgument: Record<string, unknown>
}

export interface CreateAndExerciseCommand {
  templateId: string
  createArguments: Record<string, unknown>
  choice: string
  choiceArgument: Record<string, unknown>
}

/** SubmitAndWaitResponse */
export interface SubmitAndWaitResponse {
  updateId?: string
  completionOffset?: number
}

/** POST /v2/contracts/contract-by-id — GetContractRequest (experimental) */
export interface GetContractRequest {
  contractId: string
  queryingParties?: string[]
}

export interface GetContractResponse {
  createdEvent: CreatedEvent
}

export interface paths {
  '/v2/state/ledger-end': {
    get: {
      responses: {
        200: {
          content: {
            'application/json': GetLedgerEndResponse
          }
        }
      }
    }
  }
  '/v2/state/active-contracts': {
    post: {
      requestBody: {
        content: {
          'application/json': GetActiveContractsRequest
        }
      }
      responses: {
        200: {
          content: {
            'application/json': JsGetActiveContractsResponse[]
          }
        }
      }
    }
  }
  '/v2/commands/submit-and-wait': {
    post: {
      requestBody: {
        content: {
          'application/json': JsCommands
        }
      }
      responses: {
        200: {
          content: {
            'application/json': SubmitAndWaitResponse
          }
        }
      }
    }
  }
  '/v2/contracts/contract-by-id': {
    post: {
      requestBody: {
        content: {
          'application/json': GetContractRequest
        }
      }
      responses: {
        200: {
          content: {
            'application/json': GetContractResponse
          }
        }
      }
    }
  }
}
