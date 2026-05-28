// constante de baza

// numarul maxim de pasi alocati in array-urile yjs (mereu atatia)
export const MAX_STEP_COUNT = 32 as const
// cati pasi sunt vizibili/redati implicit la un track nou
export const DEFAULT_STEP_COUNT = 16 as const
// pastrat pentru compatibilitate; de folosit cele doua de mai sus
export const STEP_COUNT = MAX_STEP_COUNT

export const STEP_COUNT_OPTIONS = [4, 8, 12, 16, 24, 32] as const

export const DRUM_INSTRUMENTS = ['kick', 'snare', 'hihat'] as const
export type DrumInstrument = (typeof DRUM_INSTRUMENTS)[number]

export const OSC_TYPES = ['sine', 'square', 'sawtooth', 'triangle'] as const
export type OscillatorType = (typeof OSC_TYPES)[number]

// parametri per track

export interface DrumParameters {
  decay:       number  // 0.05-2.0 s
  volume:      number  // -40-6 dB
  kickPreset:  string
  snarePreset: string
  hihatPreset: string
  stepCount:   number  // 4-32
}

export interface MelodicParameters {
  oscillatorType: OscillatorType
  attack:    number  // 0.001-2.0 s
  decay:     number  // 0.001-2.0 s
  sustain:   number  // 0.0-1.0
  release:   number  // 0.001-5.0 s
  volume:    number  // -40-6 dB
  preset:    string
  stepCount: number  // 4-32
}

// un pas = un map nota -> activ.
// mai multe note pot fi active simultan (polifonie per pas).
// in yjs e stocat ca Y.Map<string, boolean>
export type MelodicStep = Record<string, boolean>

// tipurile de track-uri

interface BaseTrack {
  id: string
  name: string
  muted: boolean
}

export interface DrumTrack extends BaseTrack {
  type: 'drum'
  lanes: Record<DrumInstrument, boolean[]>
  parameters: DrumParameters
}

export interface MelodicTrack extends BaseTrack {
  type: 'melodic'
  steps: MelodicStep[]
  parameters: MelodicParameters
}

export type Track = DrumTrack | MelodicTrack

// snapshot-ul radacina

export interface SequencerSnapshot {
  tempo:  number
  name:   string   // numele sesiunii, sincronizat prin yjs
  tracks: Track[]
}

// type guards

export const isDrumTrack    = (t: Track): t is DrumTrack    => t.type === 'drum'
export const isMelodicTrack = (t: Track): t is MelodicTrack => t.type === 'melodic'
