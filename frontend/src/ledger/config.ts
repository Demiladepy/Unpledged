export const ledgerConfig = {
  /** When true (default), all api.ts entry points use mock data. */
  useMocks: import.meta.env.VITE_USE_MOCKS !== 'false',
  /**
   * Browser ledger base URL. Routed through Vite `/api/ledger` proxy so the
   * browser never hits Five North DevNet directly (CORS blocks preflight).
   */
  baseUrl:
    import.meta.env.VITE_LEDGER_PROXY === 'false'
      ? (import.meta.env.VITE_CANTON_LEDGER_URL ??
        'https://ledger-api.validator.devnet.sandbox.fivenorth.io')
      : '/api/ledger',
  /** Remote DevNet host (for display; CLI scripts use this directly). */
  remoteBaseUrl:
    import.meta.env.VITE_CANTON_LEDGER_URL ??
    'https://ledger-api.validator.devnet.sandbox.fivenorth.io',
  wsBaseUrl:
    import.meta.env.VITE_CANTON_LEDGER_WS_URL ??
    'wss://ledger-api.validator.devnet.sandbox.fivenorth.io',
  userId: import.meta.env.VITE_CANTON_USER_ID ?? '6',
} as const
