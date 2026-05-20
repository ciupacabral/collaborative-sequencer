import { useEffect, useState, type ReactNode } from 'react'
import { usePeerFocus } from '../context/PeerFocusContext'
import type { FocusAddress } from '../types/awareness'

const CHIP_DEBOUNCE_MS = 200
const MAX_CHIPS        = 2

interface Props {
  addr:     FocusAddress
  children: ReactNode
  className?: string
}

export function PeerOverlay({ addr, children, className }: Props) {
  const { peers, byAddress, recentEdits } = usePeerFocus()
  const focusedPeers = byAddress(addr)
  const edits        = recentEdits(addr)

  const [chipVisible, setChipVisible] = useState(false)
  useEffect(() => {
    if (focusedPeers.length === 0) { setChipVisible(false); return }
    const t = window.setTimeout(() => setChipVisible(true), CHIP_DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [focusedPeers.length, focusedPeers.map((p) => p.clientID).join(',')])

  return (
    <span className={`relative inline-block ${className ?? ''}`}>
      {children}

      {focusedPeers.map((p, i) => (
        <span
          key={p.clientID}
          aria-hidden
          className="absolute inset-0 rounded-[inherit] pointer-events-none transition-[outline] duration-75"
          style={{
            outline:       `2px solid ${p.color}`,
            outlineOffset: `${i * 2}px`,
          }}
        />
      ))}

      {edits.map((e) => {
        const peer = peers.find((p) => p.clientID === e.peerClientID)
        const color = peer?.color ?? '#a78bfa'
        return (
          <span
            key={e.editId}
            aria-hidden
            className="peer-edit-pulse absolute inset-0 rounded-[inherit]"
            style={{ boxShadow: `0 0 0 3px ${color}` }}
          />
        )
      })}

      {chipVisible && focusedPeers.length > 0 && (
        <span className="absolute -top-2 -right-2 flex gap-0.5 pointer-events-none z-10">
          {focusedPeers.slice(0, MAX_CHIPS).map((p) => (
            <span
              key={p.clientID}
              className="text-[10px] leading-none px-1 py-0.5 rounded text-white whitespace-nowrap shadow"
              style={{ backgroundColor: p.color }}
            >
              {p.name}
            </span>
          ))}
          {focusedPeers.length > MAX_CHIPS && (
            <span className="text-[10px] leading-none px-1 py-0.5 rounded bg-zinc-800 text-zinc-200">
              +{focusedPeers.length - MAX_CHIPS}
            </span>
          )}
        </span>
      )}
    </span>
  )
}
