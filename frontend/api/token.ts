import {
  exchangeClientCredentials,
  loadTokenExchangeConfig,
} from '../server/tokenProxy.js'

export default async function handler(
  req: { method?: string },
  res: {
    status: (code: number) => { end: (body: string) => void; json: (body: unknown) => void }
    setHeader: (name: string, value: string) => void
  },
): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    res.status(405).end('Method Not Allowed')
    return
  }

  try {
    const token = await exchangeClientCredentials(loadTokenExchangeConfig())
    res.setHeader('Content-Type', 'application/json')
    res.status(200).json({
      access_token: token.access_token,
      expires_in: token.expires_in,
    })
  } catch (error) {
    res.setHeader('Content-Type', 'application/json')
    res.status(500).json({
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
