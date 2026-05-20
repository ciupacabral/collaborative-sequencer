import { createContext, useContext, type ReactNode } from 'react'
import { usePeerFocusSource, type PeerFocusContextValue } from '../hooks/usePeerFocus'

const PeerFocusCtx = createContext<PeerFocusContextValue | null>(null)

export function PeerFocusProvider({ children }: { children: ReactNode }) {
  const value = usePeerFocusSource()
  return <PeerFocusCtx.Provider value={value}>{children}</PeerFocusCtx.Provider>
}

export function usePeerFocus(): PeerFocusContextValue {
  const ctx = useContext(PeerFocusCtx)
  if (!ctx) throw new Error('usePeerFocus must be used inside <PeerFocusProvider>')
  return ctx
}
