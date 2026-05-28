import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// StrictMode e omis intentionat.
// WebsocketProvider din y-websocket nu e idempotent: deschide un WebSocket
// la construire si nu supravietuieste dublu-mount-ului din modul development.
// e o constrangere de integrare a resurselor imperative (audio/retea) in React.
createRoot(document.getElementById('root')!).render(<App />)
