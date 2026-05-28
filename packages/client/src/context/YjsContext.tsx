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

// tipuri

export type SyncStatus = 'connecting' | 'connected' | 'disconnected'

interface YjsContextValue {
  ydoc:     Y.Doc
  status:   SyncStatus
  provider: WebsocketProvider | null
}

// context-ul + hook-ul de acces

const YjsContext = createContext<YjsContextValue | null>(null)

export function useYjs(): YjsContextValue {
  const ctx = useContext(YjsContext)
  if (!ctx) throw new Error('useYjs must be used inside <YjsProvider>')
  return ctx
}

// provider-ul: creeaza Y.Doc-ul si conexiunea websocket

interface Props {
  roomId:   string
  children: ReactNode
}

export function YjsProvider({ roomId, children }: Props) {
  // useRef creeaza Y.Doc-ul o singura data per mount.
  // schimbarea de camera e tratata de parinte prin key={roomId}, care forteaza
  // un ciclu complet unmount -> remount (Y.Doc nou, provider nou).
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

    // 'sync' se declanseaza dupa ce serverul a trimis toata starea documentului.
    // initSequencer e idempotent: seteaza doar cheile inexistente, asa ca un peer
    // care intra mai tarziu il sare si primeste starea deja existenta.
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
