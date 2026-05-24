import { useMemo } from 'react'
import { useYjsMutations } from './useYjsMutations'
import { useLocalFocus } from './useLocalFocus'
import { useSequencer } from './useSequencer'
import type { DrumInstrument } from '../types/sequencer'
import type { FocusAddress } from '../types/awareness'
import type { MelodicPreset } from '../lib/presets'

export function useSignaledMutations() {
  const m = useYjsMutations()
  const { signalEdit } = useLocalFocus()
  const { tracks } = useSequencer()

  return useMemo(() => {
    const trackIdOf = (idx: number): string | null => tracks[idx]?.id ?? null
    const fire = (addr: FocusAddress) => signalEdit(addr)

    return {
      setTempo: (bpm: number) => {
        m.setTempo(bpm)
        fire({ kind: 'bpm' })
      },
      setSessionName: (name: string) => {
        m.setSessionName(name)
        fire({ kind: 'sessionName' })
      },
      addDrumTrack:    m.addDrumTrack,
      addMelodicTrack: m.addMelodicTrack,
      addBassTrack:    m.addBassTrack,
      removeTrack:     m.removeTrack,
      duplicateTrack:  m.duplicateTrack,
      toggleDrumStep: (idx: number, inst: DrumInstrument, step: number) => {
        m.toggleDrumStep(idx, inst, step)
        const trackId = trackIdOf(idx)
        if (trackId) fire({ kind: 'drumStep', trackId, instrument: inst, step })
      },
      setMelodicStep: (idx: number, step: number, note: string, active: boolean) => {
        m.setMelodicStep(idx, step, note, active)
        if (!active) return
        const trackId = trackIdOf(idx)
        if (trackId) fire({ kind: 'melodicStep', trackId, step, note })
      },
      setTrackParameter: (idx: number, key: string, value: number | string | boolean) => {
        m.setTrackParameter(idx, key, value)
        const trackId = trackIdOf(idx)
        if (trackId) fire({ kind: 'param', trackId, key })
      },
      setTrackMuted: (idx: number, muted: boolean) => {
        m.setTrackMuted(idx, muted)
        const trackId = trackIdOf(idx)
        if (trackId) fire({ kind: 'param', trackId, key: 'muted' })
      },
      setTrackName: (idx: number, name: string) => {
        m.setTrackName(idx, name)
        const trackId = trackIdOf(idx)
        if (trackId) fire({ kind: 'trackName', trackId })
      },
      setMelodicPreset: (idx: number, preset: MelodicPreset) => {
        m.setMelodicPreset(idx, preset)
        const trackId = trackIdOf(idx)
        if (trackId) fire({ kind: 'param', trackId, key: 'preset' })
      },
    }
  }, [m, signalEdit, tracks])
}
