import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteTokenProxyPlugin } from './server/viteTokenProxyPlugin.js'

const DEFAULT_LEDGER =
  'https://ledger-api.validator.devnet.sandbox.fivenorth.io'

function ledgerProxy(target: string) {
  return {
    '/api/ledger': {
      target,
      changeOrigin: true,
      secure: true,
      rewrite: (path: string) => path.replace(/^\/api\/ledger/, ''),
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const ledgerTarget = env.VITE_CANTON_LEDGER_URL || DEFAULT_LEDGER

  return {
    plugins: [react(), tailwindcss(), viteTokenProxyPlugin()],
    server: {
      proxy: ledgerProxy(ledgerTarget),
    },
    preview: {
      proxy: ledgerProxy(ledgerTarget),
    },
  }
})
