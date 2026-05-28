import http from 'http'
import { WebSocketServer } from 'ws'
import { setupWSConnection } from 'y-websocket/bin/utils'

const HOST = process.env.HOST ?? '0.0.0.0'
const PORT = parseInt(process.env.PORT ?? '1234', 10)

// server http: Render are nevoie de un endpoint http pentru health, chiar daca serviciul e doar WS
const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' })
    res.end('OK')
    return
  }
  res.writeHead(404)
  res.end()
})

// server websocket
const wss = new WebSocketServer({ server })

wss.on('connection', (ws, req) => {
  // req.url e de forma "/<roomId>", ex. "/xyz-123".
  // y-websocket il foloseste ca nume de Y.Doc: un document izolat per camera.
  setupWSConnection(ws, req, {
    gc: true, // garbage collection pentru elementele sterse
  })

  ws.on('error', (err) => {
    // ignora erorile benigne de deconectare a clientului, ca sa nu pice serverul
    if (!['ECONNRESET', 'EPIPE'].includes(err.code ?? '')) {
      console.error('[ws error]', err)
    }
  })
})

// pornire
server.listen(PORT, HOST, () => {
  console.log(`[y-websocket] listening on ws://${HOST}:${PORT}`)
  console.log('[y-websocket] documents are stored in memory (ephemeral)')
})

// oprire curata
const shutdown = () => {
  console.log('[y-websocket] shutting down...')
  wss.close(() => server.close(() => process.exit(0)))
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
