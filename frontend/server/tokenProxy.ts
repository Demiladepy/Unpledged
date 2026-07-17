/// <reference types="node" />

/**
 * Server-side OAuth2 client_credentials exchange.
 * NEVER import this from browser code — client_secret stays here only.
 */

export interface TokenExchangeConfig {
  tokenUrl: string
  clientId: string
  clientSecret: string
  audience: string
  scope: string
}

export interface TokenResponse {
  access_token: string
  expires_in: number
  token_type?: string
}

export function loadTokenExchangeConfig(
  env: NodeJS.ProcessEnv = process.env,
): TokenExchangeConfig {
  const clientSecret = env.CANTON_CLIENT_SECRET
  if (!clientSecret) {
    throw new Error(
      'CANTON_CLIENT_SECRET is missing. Copy .env.server.example to .env.server.',
    )
  }

  return {
    tokenUrl:
      env.CANTON_AUTH_TOKEN_URL ??
      'https://auth.sandbox.fivenorth.io/application/o/token/',
    clientId: env.CANTON_CLIENT_ID ?? 'validator-devnet-m2m',
    clientSecret,
    // audience equals client_id on this sandbox — use exactly as specified.
    audience: env.CANTON_TOKEN_AUDIENCE ?? 'validator-devnet-m2m',
    scope: env.CANTON_TOKEN_SCOPE ?? 'daml_ledger_api',
  }
}

export async function exchangeClientCredentials(
  config: TokenExchangeConfig,
): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: config.clientId,
    client_secret: config.clientSecret,
    audience: config.audience,
    scope: config.scope,
  })

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(
      `Token exchange failed (${response.status}): ${text.slice(0, 500)}`,
    )
  }

  const data = (await response.json()) as TokenResponse
  if (!data.access_token) {
    throw new Error('Token exchange response missing access_token')
  }
  return data
}
