import type { Awareness } from 'y-protocols/awareness'

const ROUND_TRIPS_AT_START = 5
const PROBE_SPACING_MS     = 200
const REFRESH_INTERVAL_MS  = 30_000

export interface PeerOffset {
  offset_ms:     number
  rtt_ms:        number
  samples:       number[]
  lastRefreshAt: number
}

type Probe = { id: number; target: number; t1: number }
type Reply = { id: number; requester: number; t1: number; t2: number; t3: number }

export class ClockSync {
  readonly offsets = new Map<number, PeerOffset>()

  private awareness:    Awareness
  private myClientID:   number
  private probeCounter = 0
  private inflight     = new Map<number, { target: number; t1: number; resolve: (rttOffset: { rtt: number; offset: number }) => void }>()
  private syncing      = new Set<number>()
  private refreshTimer: number | null = null
  private observers    = new Set<() => void>()

  constructor(awareness: Awareness) {
    this.awareness  = awareness
    this.myClientID = awareness.clientID
  }

  start(): void {
    this.awareness.on('change', this.onAwarenessChange)
    this.refreshTimer = window.setInterval(() => this.refreshAll(), REFRESH_INTERVAL_MS)
    void this.syncAllPeers()
  }

  stop(): void {
    this.awareness.off('change', this.onAwarenessChange)
    if (this.refreshTimer !== null) clearInterval(this.refreshTimer)
    this.refreshTimer = null
    this.awareness.setLocalStateField('clockProbe', null)
    this.awareness.setLocalStateField('clockReply', null)
  }

  subscribe(fn: () => void): () => void {
    this.observers.add(fn)
    return () => { this.observers.delete(fn) }
  }

  private notify() { this.observers.forEach((fn) => fn()) }

  private remotePeerIDs(): number[] {
    const ids: number[] = []
    this.awareness.getStates().forEach((_, id) => { if (id !== this.myClientID) ids.push(id) })
    return ids
  }

  private async syncAllPeers(): Promise<void> {
    for (const peer of this.remotePeerIDs()) await this.syncPeer(peer)
  }

  private async refreshAll(): Promise<void> {
    for (const peer of this.remotePeerIDs()) await this.singleProbe(peer).catch(() => null)
  }

  private async syncPeer(peer: number): Promise<void> {
    if (this.syncing.has(peer)) return
    this.syncing.add(peer)
    try {
      const samples: { rtt: number; offset: number }[] = []
      for (let i = 0; i < ROUND_TRIPS_AT_START; i++) {
        try {
          samples.push(await this.singleProbe(peer))
        } catch { return }
        await new Promise((r) => setTimeout(r, PROBE_SPACING_MS))
      }
      if (samples.length === 0) return
      const sorted = [...samples].sort((a, b) => a.offset - b.offset)
      const median = sorted[Math.floor(sorted.length / 2)]
      this.offsets.set(peer, {
        offset_ms:     median.offset,
        rtt_ms:        median.rtt,
        samples:       sorted.map((s) => s.offset),
        lastRefreshAt: Date.now(),
      })
      this.notify()
    } finally {
      this.syncing.delete(peer)
    }
  }

  private singleProbe(peer: number): Promise<{ rtt: number; offset: number }> {
    return new Promise((resolve, reject) => {
      const id = ++this.probeCounter
      const t1 = Date.now()
      this.inflight.set(id, { target: peer, t1, resolve })
      this.awareness.setLocalStateField('clockProbe', { id, target: peer, t1 } as Probe)
      window.setTimeout(() => {
        if (this.inflight.has(id)) {
          this.inflight.delete(id)
          reject(new Error('timeout'))
        }
      }, 3000)
    })
  }

  private onAwarenessChange = () => {
    const states = this.awareness.getStates()
    states.forEach((state, fromID) => {
      if (fromID === this.myClientID) return
      const probe = state.clockProbe as Probe | undefined | null
      if (probe && probe.target === this.myClientID) {
        const t2 = Date.now()
        const t3 = Date.now()
        const reply: Reply = { id: probe.id, requester: fromID, t1: probe.t1, t2, t3 }
        this.awareness.setLocalStateField('clockReply', reply)
        return
      }
      const reply = state.clockReply as Reply | undefined | null
      if (reply && reply.requester === this.myClientID) {
        const pending = this.inflight.get(reply.id)
        if (!pending) return
        const t4     = Date.now()
        const rtt    = (t4 - reply.t1) - (reply.t3 - reply.t2)
        const offset = ((reply.t2 - reply.t1) + (reply.t3 - t4)) / 2
        this.inflight.delete(reply.id)
        pending.resolve({ rtt, offset })
      }
    })

    for (const peer of this.remotePeerIDs()) {
      if (!this.offsets.has(peer)) void this.syncPeer(peer)
    }
  }
}

export function adjustedNow(offset_ms: number): number {
  return Date.now() + offset_ms
}
