import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { spawn } from 'node:child_process'

const root = process.cwd()
const mcpConfig = join(root, '.cursor', 'mcp.json')
const entry = join(
  root,
  'node_modules',
  '@canton-network-devs',
  'canton-mcp-server',
  'index.js',
)

const checks = [
  ['.cursor/mcp.json', existsSync(mcpConfig)],
  ['@canton-network-devs/canton-mcp-server', existsSync(entry)],
]

let failed = false
for (const [label, ok] of checks) {
  console.log(ok ? `OK  ${label}` : `FAIL ${label}`)
  if (!ok) failed = true
}

if (failed) {
  console.error('\nRun: npm install')
  process.exit(1)
}

const child = spawn(process.execPath, [entry], {
  stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env },
})

let stderr = ''
child.stderr.on('data', (chunk) => {
  stderr += chunk.toString()
})

const timeout = setTimeout(() => {
  child.kill()
}, 8000)

child.on('exit', (code) => {
  clearTimeout(timeout)
  const running = stderr.includes('Server running on stdio')
  const kb = stderr.includes('KB fetched') || stderr.includes('KB source')
  if (running && kb) {
    console.log('OK  MCP server starts (stdio + knowledge base)')
    process.exit(0)
  }
  console.error('FAIL MCP server did not start correctly')
  if (stderr) console.error(stderr.trim())
  process.exit(code && code !== 0 ? code : 1)
})
