export const ledgerConfig = {
  /** When true (default), all api.ts entry points use mock data. */
  useMocks: import.meta.env.VITE_USE_MOCKS !== 'false',
  baseUrl:
    import.meta.env.VITE_CANTON_LEDGER_URL ?? 'http://localhost:7575',
  token: import.meta.env.VITE_CANTON_TOKEN ?? '',
  userId: import.meta.env.VITE_CANTON_USER_ID ?? 'ledger-api-user',
} as const
