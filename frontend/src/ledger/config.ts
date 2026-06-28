export const ledgerConfig = {
  /** When true (default), all api.ts entry points use mock data. */
  useMocks: import.meta.env.VITE_USE_MOCKS !== 'false',
  baseUrl:
    import.meta.env.VITE_CANTON_LEDGER_URL ??
    'https://ledger-api.validator.devnet.sandbox.fivenorth.io',
  wsBaseUrl:
    import.meta.env.VITE_CANTON_LEDGER_WS_URL ??
    'wss://ledger-api.validator.devnet.sandbox.fivenorth.io',
  userId: import.meta.env.VITE_CANTON_USER_ID ?? '6',
} as const
