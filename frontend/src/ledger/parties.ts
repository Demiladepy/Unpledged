import type { Party } from '../types/ledger'

/**
 * Logical demo parties. When VITE_PARTY_* are set (after allocate:parties),
 * values are full Canton party IDs (e.g. SME::1220…). Mock mode still works
 * with short-name fallbacks when env vars are unset.
 */
export const PARTIES = {
  SME: (import.meta.env.VITE_PARTY_SME as string | undefined) || 'SME',
  DEBTOR: (import.meta.env.VITE_PARTY_DEBTOR as string | undefined) || 'Debtor',
  LENDER_A:
    (import.meta.env.VITE_PARTY_LENDER_A as string | undefined) || 'LenderA',
  LENDER_B:
    (import.meta.env.VITE_PARTY_LENDER_B as string | undefined) || 'LenderB',
} as const satisfies Record<string, Party>

/** Short label for UI (prefix before ::). */
export function partyDisplayName(party: Party): string {
  const idx = party.indexOf('::')
  return idx >= 0 ? party.slice(0, idx) : party
}

export function partiesConfigured(): boolean {
  return Boolean(
    import.meta.env.VITE_PARTY_SME &&
      import.meta.env.VITE_PARTY_DEBTOR &&
      import.meta.env.VITE_PARTY_LENDER_A &&
      import.meta.env.VITE_PARTY_LENDER_B,
  )
}
