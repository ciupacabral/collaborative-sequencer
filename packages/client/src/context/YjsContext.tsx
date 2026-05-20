import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { initSequencer } from '../lib/yjsSchema'

// ─── Types ────────────────────────────────────────────────────────────────────

export type SyncStatus = 'connecting' | 'connected' | 'disconnected'

interface YjsContextValue {
  ydoc:     Y.Doc
  status:   SyncStatus
  provider: WebsocketProvider | null
}

// ─── Context ──────────────────────────────────────────────────────────────────

const YjsContext = createContext<YjsContextValue | null>(null)

export function useYjs(): YjsContextValue {
  const ctx = useContext(YjsContext)
  if (!ctx) throw new Error('useYjs must be used inside <YjsProvider>')
  return ctx
}

// ─── Provider ─────────────────────────────────────────────────────────────────

interface Props {
  roomId:   string
  children: ReactNode
}

export function YjsProvider({ roomId, children }: Props) {
  // useRef creates the Y.Doc once per component mount.
  // Room changes are handled by the parent passing key={roomId},
  // which forces a full unmount → remount cycle (new Y.Doc, new provider).
  const ydocRef = useRef(new Y.Doc())
  const [status,   setStatus]   = useState<SyncStatus>('connecting')
  const [provider, setProvider] = useState<WebsocketProvider | null>(null)

  useEffect(() => {
    const ydoc  = ydocRef.current
    const wsUrl = import.meta.env.VITE_WS_URL ?? 'ws://localhost:1234'

    const p = new WebsocketProvider(wsUrl, roomId, ydoc)
    setProvider(p)

    const handleStatus = ({ status }: { status: string }) =>
      setStatus(status as SyncStatus)

    // 'sync' fires once the server has sent us the full document state.
    // initSequencer is idempotent: only sets keys that don't yet exist,
    // so late-joining peers skip it and receive the existing state.
    const handleSync = (isSynced: boolean) => {
      if (isSynced) initSequencer(ydoc)
    }

    p.on('status', handleStatus)
    p.on('sync',   handleSync)

    return () => {
      p.off('status', handleStatus)
      p.off('sync',   handleSync)
      p.destroy()
      setProvider(null)
    }
  }, [roomId])

  return (
    <YjsContext.Provider value={{ ydoc: ydocRef.current, status, provider }}>
      {children}
    </YjsContext.Provider>
  )
}
