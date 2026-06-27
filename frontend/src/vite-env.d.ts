/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_USE_MOCKS: string
  readonly VITE_CANTON_LEDGER_URL: string
  readonly VITE_CANTON_TOKEN: string
  readonly VITE_CANTON_USER_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
