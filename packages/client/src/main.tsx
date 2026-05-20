import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// StrictMode is intentionally omitted.
// y-websocket's WebsocketProvider is a non-idempotent resource:
// it opens a WebSocket on construction and cannot survive React's
// development-mode double-mount. This is an architectural constraint
// of integrating imperative audio/network resources into React.
createRoot(document.getElementById('root')!).render(<App />)
