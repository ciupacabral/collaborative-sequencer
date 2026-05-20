import { useEffect, useMemo, useRef, useState } from 'react'
import { useYjs } from '../context/YjsContext'
import type { FocusAddress, RecentEdit } from '../types/awareness'
import { addrKey } from '../types/awareness'

const ADJECTIVES = ['Swift','Bold','Calm','Dark','Fast','Gold','Jade','Keen','Lime','Mute','Neat','Pink','Rosy','Sage','Teal','Warm','Wiry','Zany']
const ANIMALS    = ['Bear','Bird','Buck','Bull','Crab','Deer','Duck','Fawn','Frog','Hawk','Ibis','Kite','Lamb','Lynx','Mole','Moth','Newt','Puma','Rook','Swan','Toad','Wolf','Wren']
const COLORS     = ['#a78bfa','#34d399','#f87171','#60a5fa','#fbbf24','#e879f9','#2dd4bf','#fb923c']

const EDIT_DISPLAY_MS = 1200

export interface Peer {
  clientID: number
  name:     string
  color:    string
  self:     boolean
}

function peerFromId(id: number, selfId: number): Peer {
  return {
    clientID: id,
    name:  `${ADJECTIVES[id % ADJECTIVES.length]} ${ANIMALS[(id >> 4) % ANIMALS.length]}`,
    color: COLORS[id % COLORS.length],
    self:  id === selfId,
  }
}

interface AwarenessState {
  focus?:    FocusAddress | null
  lastEdit?: { addr: FocusAddress; at: number } | null
}

export interface PeerFocusContextValue {
  peers:       Peer[]
  byAddress:   (addr: FocusAddress) => Peer[]
  recentEdits: (addr: FocusAddress) => RecentEdit[]
}

export function usePeerFocusSource(): PeerFocusContextValue {
  const { provider } = useYjs()
  const [tick, setTick] = useState(0)

  const editsRef = useRef<Map<string, RecentEdit[]>>(new Map())
  const seenEditRef = useRef<Map<number, number>>(new Map())

  useEffect(() => {
    if (!provider) return
    const awareness = provider.awareness
    const bump = () => setTick((n) => n + 1)
    const onChange = () => {
      const states = awareness.getStates() as Map<number, AwarenessState>
      states.forEach((state, clientID) => {
        const le = state.lastEdit
        if (!le) return
        const prev = seenEditRef.current.get(clientID)
        if (prev === le.at) return
        seenEditRef.current.set(clientID, le.at)
        const key = addrKey(le.addr)
        const editId = `${clientID}-${le.at}`
        const entry: RecentEdit = { peerClientID: clientID, addr: le.addr, at: le.at, editId }
        const list = editsRef.current.get(key) ?? []
        list.push(entry)
        editsRef.current.set(key, list)
        window.setTimeout(() => {
          const cur = editsRef.current.get(key)
          if (!cur) return
          const next = cur.filter((e) => e.editId !== editId)
          if (next.length === 0) editsRef.current.delete(key)
          else                   editsRef.current.set(key, next)
          bump()
        }, EDIT_DISPLAY_MS)
      })
      bump()
    }
    awareness.on('change', onChange)
    onChange()
    return () => awareness.off('change', onChange)
  }, [provider])

  return useMemo<PeerFocusContextValue>(() => {
    void tick
    if (!provider) {
      return { peers: [], byAddress: () => [], recentEdits: () => [] }
    }
    const awareness = provider.awareness
    const selfId    = awareness.clientID
    const states    = awareness.getStates() as Map<number, AwarenessState>

    const peers: Peer[] = []
    const focusIndex = new Map<string, Peer[]>()
    states.forEach((state, id) => {
      const peer = peerFromId(id, selfId)
      peers.push(peer)
      if (peer.self) return
      const f = state.focus
      if (!f) return
      const key = addrKey(f)
      const arr = focusIndex.get(key) ?? []
      arr.push(peer)
      focusIndex.set(key, arr)
    })

    const byAddress = (addr: FocusAddress) => focusIndex.get(addrKey(addr)) ?? []

    const recentEdits = (addr: FocusAddress): RecentEdit[] => {
      const key = addrKey(addr)
      const raw = editsRef.current.get(key) ?? []
      return raw.filter((e) => e.peerClientID !== selfId)
    }

    return { peers, byAddress, recentEdits }
  }, [provider, tick])
}
