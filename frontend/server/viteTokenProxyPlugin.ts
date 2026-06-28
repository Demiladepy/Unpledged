import type { Connect, Plugin } from 'vite'
import { config as loadDotenv } from 'dotenv'
import { exchangeClientCredentials, loadTokenExchangeConfig } from './tokenProxy.js'

function tokenProxyMiddleware(): Connect.NextHandleFunction {
  return async (req, res) => {
    if (req.method !== 'POST') {
      res.statusCode = 405
      res.setHeader('Allow', 'POST')
      res.end('Method Not Allowed')
      return
    }

    try {
      const token = await exchangeClientCredentials(loadTokenExchangeConfig())
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json')
      res.end(
        JSON.stringify({
          access_token: token.access_token,
          expires_in: token.expires_in,
        }),
      )
    } catch (error) {
      res.statusCode = 500
      res.setHeader('Content-Type', 'application/json')
      res.end(
        JSON.stringify({
          error: error instanceof Error ? error.message : String(error),
        }),
      )
    }
  }
}

/**
 * Vite dev/preview middleware: POST /api/token
 * Returns { access_token, expires_in } — never the client_secret.
 */
export function viteTokenProxyPlugin(): Plugin {
  const attach = (server: { middlewares: Connect.Server }) => {
    loadDotenv({ path: '.env.server', override: true })
    server.middlewares.use('/api/token', tokenProxyMiddleware())
  }

  return {
    name: 'canton-token-proxy',
    configureServer: attach,
    configurePreviewServer: attach,
  }
}
