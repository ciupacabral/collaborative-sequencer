import http from 'http'
import { WebSocketServer } from 'ws'
import { setupWSConnection } from 'y-websocket/bin/utils'

const HOST = process.env.HOST ?? '0.0.0.0'
const PORT = parseInt(process.env.PORT ?? '1234', 10)

// ─── HTTP server ──────────────────────────────────────────────────────────────
// Render.com expects an HTTP server for health probes, even for WS-only services.
const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' })
    res.end('OK')
    return
  }
  res.writeHead(404)
  res.end()
})

// ─── WebSocket server ─────────────────────────────────────────────────────────
const wss = new WebSocketServer({ server })

wss.on('connection', (ws, req) => {
  // req.url will be "/<roomId>" e.g. "/xyz-123"
  // y-websocket uses this as the Y.Doc name — one isolated document per room.
  setupWSConnection(ws, req, {
    gc: true, // enable garbage collection for deleted items
  })

  ws.on('error', (err) => {
    // Swallow benign client-disconnect errors to prevent server crashes
    if (!['ECONNRESET', 'EPIPE'].includes(err.code ?? '')) {
      console.error('[ws error]', err)
    }
  })
})

// ─── Startup ──────────────────────────────────────────────────────────────────
server.listen(PORT, HOST, () => {
  console.log(`[y-websocket] listening on ws://${HOST}:${PORT}`)
  console.log('[y-websocket] documents are stored in memory (ephemeral)')
})

// ─── Graceful shutdown ────────────────────────────────────────────────────────
const shutdown = () => {
  console.log('[y-websocket] shutting down...')
  wss.close(() => server.close(() => process.exit(0)))
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
