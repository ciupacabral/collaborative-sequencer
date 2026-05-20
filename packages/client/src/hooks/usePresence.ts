import { useEffect, useState } from 'react'
import { useYjs } from '../context/YjsContext'

const ADJECTIVES = ['Swift','Bold','Calm','Dark','Fast','Gold','Jade','Keen','Lime','Mute','Neat','Pink','Rosy','Sage','Teal','Warm','Wiry','Zany']
const ANIMALS    = ['Bear','Bird','Buck','Bull','Crab','Deer','Duck','Fawn','Frog','Hawk','Ibis','Kite','Lamb','Lynx','Mole','Moth','Newt','Puma','Rook','Swan','Toad','Wolf','Wren']
const COLORS     = ['#a78bfa','#34d399','#f87171','#60a5fa','#fbbf24','#e879f9','#2dd4bf','#fb923c']

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

export function usePresence(): Peer[] {
  const { provider } = useYjs()
  const [peers, setPeers] = useState<Peer[]>([])

  useEffect(() => {
    if (!provider) return
    const awareness = provider.awareness

    const update = () => {
      const list: Peer[] = []
      awareness.getStates().forEach((_, id) => list.push(peerFromId(id, awareness.clientID)))
      setPeers(list)
    }

    awareness.on('change', update)
    update()
    return () => awareness.off('change', update)
  }, [provider])

  return peers
}
