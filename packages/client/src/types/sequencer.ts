// ─── Constants ────────────────────────────────────────────────────────────────

/** Maximum steps stored in Y.js arrays — always allocate this many. */
export const MAX_STEP_COUNT = 32 as const
/** Default visible/playback step count for new tracks. */
export const DEFAULT_STEP_COUNT = 16 as const
/** Kept for backward-compat references; prefer the two above. */
export const STEP_COUNT = MAX_STEP_COUNT

export const STEP_COUNT_OPTIONS = [4, 8, 12, 16, 24, 32] as const

export const DRUM_INSTRUMENTS = ['kick', 'snare', 'hihat'] as const
export type DrumInstrument = (typeof DRUM_INSTRUMENTS)[number]

export const OSC_TYPES = ['sine', 'square', 'sawtooth', 'triangle'] as const
export type OscillatorType = (typeof OSC_TYPES)[number]

// ─── Parameters ───────────────────────────────────────────────────────────────

export interface DrumParameters {
  decay:       number  // 0.05–2.0 s
  volume:      number  // -40–6 dB
  kickPreset:  string
  snarePreset: string
  hihatPreset: string
  stepCount:   number  // 4–32
}

export interface MelodicParameters {
  oscillatorType: OscillatorType
  attack:    number  // 0.001–2.0 s
  decay:     number  // 0.001–2.0 s
  sustain:   number  // 0.0–1.0
  release:   number  // 0.001–5.0 s
  volume:    number  // -40–6 dB
  preset:    string
  stepCount: number  // 4–32
}

// ─── Steps ────────────────────────────────────────────────────────────────────

/**
 * Each step is a map of note → active.
 * Multiple notes can be active simultaneously (polyphony per step).
 * Stored in Y.js as Y.Map<string, boolean>.
 */
export type MelodicStep = Record<string, boolean>

// ─── Tracks ───────────────────────────────────────────────────────────────────

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

// ─── Root snapshot ────────────────────────────────────────────────────────────

export interface SequencerSnapshot {
  tempo:  number
  name:   string   // session display name, synced via Y.js
  tracks: Track[]
}

// ─── Type guards ──────────────────────────────────────────────────────────────

export const isDrumTrack    = (t: Track): t is DrumTrack    => t.type === 'drum'
export const isMelodicTrack = (t: Track): t is MelodicTrack => t.type === 'melodic'
