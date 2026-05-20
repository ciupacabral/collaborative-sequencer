import type { DrumInstrument } from './sequencer'

export type FocusAddress =
  | { kind: 'drumStep';    trackId: string; instrument: DrumInstrument; step: number }
  | { kind: 'melodicStep'; trackId: string; step: number; note: string }
  | { kind: 'param';       trackId: string; key: string }
  | { kind: 'trackName';   trackId: string }
  | { kind: 'sessionName' }
  | { kind: 'bpm' }

export type RecentEdit = {
  peerClientID: number
  addr:         FocusAddress
  at:           number
  editId:       string
}

export function sameAddress(a: FocusAddress, b: FocusAddress): boolean {
  if (a.kind !== b.kind) return false
  switch (a.kind) {
    case 'drumStep':
      return a.trackId === (b as typeof a).trackId
          && a.instrument === (b as typeof a).instrument
          && a.step === (b as typeof a).step
    case 'melodicStep':
      return a.trackId === (b as typeof a).trackId
          && a.step === (b as typeof a).step
          && a.note === (b as typeof a).note
    case 'param':
      return a.trackId === (b as typeof a).trackId
          && a.key === (b as typeof a).key
    case 'trackName':
      return a.trackId === (b as typeof a).trackId
    case 'sessionName':
    case 'bpm':
      return true
  }
}

export function addrKey(a: FocusAddress): string {
  switch (a.kind) {
    case 'drumStep':    return `ds:${a.trackId}:${a.instrument}:${a.step}`
    case 'melodicStep': return `ms:${a.trackId}:${a.step}:${a.note}`
    case 'param':       return `p:${a.trackId}:${a.key}`
    case 'trackName':   return `tn:${a.trackId}`
    case 'sessionName': return `sn`
    case 'bpm':         return `bpm`
  }
}
