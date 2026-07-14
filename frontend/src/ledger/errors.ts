/**
 * Map live ledger / proxy failures to judge-readable messages.
 * Never return empty — every failure should look intentional.
 */

export function humanizeLedgerError(error: unknown): {
  title: string
  detail: string
  hint?: string
} {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : JSON.stringify(error)
  const lower = raw.toLowerCase()

  if (
    lower.includes('canton_client_secret') ||
    lower.includes('post /api/token') ||
    lower.includes('token exchange')
  ) {
    return {
      title: 'Cannot reach Canton auth',
      detail: raw,
      hint: 'Hosted token proxy failed. Confirm CANTON_CLIENT_SECRET is set on Vercel (server-side, not VITE_-prefixed), then redeploy.',
    }
  }

  if (lower.includes('401') || lower.includes('unauthorized')) {
    return {
      title: 'Ledger authorization failed',
      detail: raw,
      hint: 'Token was rejected. The UI will request a fresh token on the next action — retry once. If it persists, check server secrets and actAs grants.',
    }
  }

  if (
    lower.includes('403') ||
    lower.includes('permission') ||
    lower.includes('security-sensitive') ||
    lower.includes('canactas')
  ) {
    return {
      title: 'Missing actAs rights',
      detail: raw,
      hint: 'User 6 cannot act for one of the demo parties. On a machine with .env.server, run: npm run grant:act-as',
    }
  }

  if (
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('cors') ||
    lower.includes('network request failed')
  ) {
    return {
      title: 'Network / proxy unreachable',
      detail: raw,
      hint: 'Browser could not reach /api/ledger or /api/token. On Vercel, confirm Root Directory is frontend and serverless routes deploy.',
    }
  }

  if (
    lower.includes('parties not set') ||
    lower.includes('vite_party') ||
    (lower.includes('missing') && lower.includes('party'))
  ) {
    return {
      title: 'Party IDs not configured',
      detail: raw,
      hint: 'Rebuild with VITE_PARTY_* from .env.production, or set them in the Vercel dashboard and redeploy.',
    }
  }

  if (
    lower.includes('already pledged') ||
    lower.includes('daml_failure') ||
    lower.includes('assertionfailed')
  ) {
    return {
      title: 'Ledger rejected the command',
      detail: raw,
      hint: 'This is an on-ledger refusal (often expected for double-pledge). Verbatim response is shown below.',
    }
  }

  if (lower.includes('not found') || lower.includes('404')) {
    return {
      title: 'Ledger resource not found',
      detail: raw,
      hint: 'DevNet may have reset, or a contract/update ID is stale. Re-run allocate:parties / create:financing, or use /demo for a fresh invoice.',
    }
  }

  return {
    title: 'Ledger call failed',
    detail: raw,
    hint: 'Retry the action. If it persists, DevNet may have reset — re-run allocate:parties / grant:act-as / create:financing locally, update Vercel env, and redeploy.',
  }
}
