// ─── Drum presets ─────────────────────────────────────────────────────────────

export const KICK_PRESETS = {
  punchy: { pitchDecay: 0.05, octaves: 6, envelope: { attack: 0.001, decay: 0.3,  sustain: 0, release: 0.1  } },
  deep:   { pitchDecay: 0.1,  octaves: 8, envelope: { attack: 0.001, decay: 0.6,  sustain: 0, release: 0.2  } },
  tight:  { pitchDecay: 0.02, octaves: 4, envelope: { attack: 0.001, decay: 0.12, sustain: 0, release: 0.05 } },
}

export const SNARE_PRESETS = {
  snappy:  { noise: { type: 'white' as const }, envelope: { attack: 0.001, decay: 0.15, sustain: 0,   release: 0.03 } },
  fat:     { noise: { type: 'pink'  as const }, envelope: { attack: 0.005, decay: 0.3,  sustain: 0.1, release: 0.1  } },
  rimshot: { noise: { type: 'brown' as const }, envelope: { attack: 0.001, decay: 0.06, sustain: 0,   release: 0.02 } },
}

export const HIHAT_PRESETS = {
  closed: { frequency: 120, harmonicity: 3.1, modulationIndex: 12, resonance: 1200, octaves: 0.5, envelope: { attack: 0.001, decay: 0.06, release: 0.01 } },
  open:   { frequency: 120, harmonicity: 3.1, modulationIndex: 12, resonance: 1200, octaves: 0.5, envelope: { attack: 0.001, decay: 0.45, release: 0.1  } },
  crispy: { frequency: 160, harmonicity: 4.5, modulationIndex: 20, resonance: 2000, octaves: 0.8, envelope: { attack: 0.001, decay: 0.09, release: 0.02 } },
}

// ─── Melodic presets ──────────────────────────────────────────────────────────

export const MELODIC_PRESETS = {
  'sine-pad':    { oscillator: { type: 'sine'        }, envelope: { attack: 0.1,   decay: 0.2, sustain: 0.8, release: 1.0 } },
  'square-lead': { oscillator: { type: 'square'      }, envelope: { attack: 0.005, decay: 0.1, sustain: 0.6, release: 0.3 } },
  'saw-bass':    { oscillator: { type: 'sawtooth'    }, envelope: { attack: 0.01,  decay: 0.2, sustain: 0.4, release: 0.2 } },
  'tri-bell':    { oscillator: { type: 'triangle'    }, envelope: { attack: 0.001, decay: 0.5, sustain: 0,   release: 0.5 } },
  'fat-saw':     { oscillator: { type: 'fatsawtooth' }, envelope: { attack: 0.02,  decay: 0.3, sustain: 0.5, release: 0.4 } },
}

// ─── Types & keys ─────────────────────────────────────────────────────────────

export type KickPreset    = keyof typeof KICK_PRESETS
export type SnarePreset   = keyof typeof SNARE_PRESETS
export type HihatPreset   = keyof typeof HIHAT_PRESETS
export type MelodicPreset = keyof typeof MELODIC_PRESETS

export const KICK_PRESET_KEYS:    KickPreset[]    = Object.keys(KICK_PRESETS)    as KickPreset[]
export const SNARE_PRESET_KEYS:   SnarePreset[]   = Object.keys(SNARE_PRESETS)   as SnarePreset[]
export const HIHAT_PRESET_KEYS:   HihatPreset[]   = Object.keys(HIHAT_PRESETS)   as HihatPreset[]
export const MELODIC_PRESET_KEYS: MelodicPreset[] = Object.keys(MELODIC_PRESETS) as MelodicPreset[]
