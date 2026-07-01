/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_USE_MOCKS: string
  readonly VITE_CANTON_LEDGER_URL: string
  readonly VITE_CANTON_LEDGER_WS_URL: string
  readonly VITE_CANTON_USER_ID: string
  readonly VITE_COMPLETE_FINANCING_UPDATE_ID?: string
  readonly VITE_LEDGER_PROXY?: string
  readonly VITE_PARTY_SME?: string
  readonly VITE_PARTY_DEBTOR?: string
  readonly VITE_PARTY_LENDER_A?: string
  readonly VITE_PARTY_LENDER_B?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
