import type { PeerOffset } from './clockSync'

export interface SyncSample {
  counter:     number
  sender:      number
  latency_ms:  number
  scenario:    string
  at:          number
}

export interface AudioSample {
  tickIndex:   number
  delta_ms:    number
  expected_ms: number
  jitter_ms:   number
  at:          number
}

const RING_LIMIT = 2000

class Ring<T> {
  private buf: T[] = []
  push(v: T) {
    this.buf.push(v)
    if (this.buf.length > RING_LIMIT) this.buf.shift()
  }
  snapshot(): T[] { return this.buf.slice() }
  clear() { this.buf = [] }
  get size() { return this.buf.length }
}

export class MeasurementsStore {
  readonly syncRing  = new Ring<SyncSample>()
  readonly audioRing = new Ring<AudioSample>()

  scenario:           string = 'default'
  readonly sessionStartedAt = Date.now()
  readonly roomId:    string
  readonly myClientID: number

  private observers = new Set<() => void>()

  constructor(roomId: string, myClientID: number) {
    this.roomId      = roomId
    this.myClientID  = myClientID
  }

  pushSync(sample: SyncSample)   { this.syncRing.push(sample);  this.notify() }
  pushAudio(sample: AudioSample) { this.audioRing.push(sample); this.notify() }

  reset() {
    this.syncRing.clear()
    this.audioRing.clear()
    this.notify()
  }

  setScenario(tag: string) {
    this.scenario = tag.trim() || 'default'
    this.notify()
  }

  subscribe(fn: () => void): () => void {
    this.observers.add(fn)
    return () => { this.observers.delete(fn) }
  }
  private notify() { this.observers.forEach((fn) => fn()) }

  exportJson(clockOffsets: Map<number, PeerOffset>): string {
    const payload = {
      sessionStartedAt: this.sessionStartedAt,
      exportedAt:       Date.now(),
      roomId:           this.roomId,
      myClientID:       this.myClientID,
      userAgent:        navigator.userAgent,
      clockOffsets:     Array.from(clockOffsets.entries()).map(([peer, info]) => ({ peer, ...info })),
      syncSamples:      this.syncRing.snapshot(),
      audioSamples:     this.audioRing.snapshot(),
    }
    return JSON.stringify(payload, null, 2)
  }
}

export function percentile(samples: number[], p: number): number | null {
  if (samples.length === 0) return null
  const sorted = [...samples].sort((a, b) => a - b)
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))
  return sorted[idx]
}

export function stdev(samples: number[]): number | null {
  if (samples.length < 2) return null
  const mean = samples.reduce((a, b) => a + b, 0) / samples.length
  const variance = samples.reduce((acc, v) => acc + (v - mean) ** 2, 0) / samples.length
  return Math.sqrt(variance)
}

export function downloadJson(content: string, filename: string) {
  const blob = new Blob([content], { type: 'application/json' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
