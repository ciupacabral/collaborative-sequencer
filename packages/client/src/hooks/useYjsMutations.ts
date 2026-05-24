import { useMemo } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { useYjs } from '../context/YjsContext'
import {
  setTempo,
  setSessionName,
  addTrack,
  removeTrack,
  toggleDrumStep,
  setMelodicStep,
  setTrackParameter,
  setTrackMuted,
  setTrackName,
  setMelodicPreset,
  createDrumTrackYMap,
  createMelodicTrackYMap,
} from '../lib/yjsSchema'
import type { DrumInstrument } from '../types/sequencer'
import type { MelodicPreset } from '../lib/presets'

export function useYjsMutations() {
  const { ydoc } = useYjs()

  return useMemo(
    () => ({
      setTempo:         (bpm: number)                                                     => setTempo(ydoc, bpm),
      setSessionName:   (name: string)                                                    => setSessionName(ydoc, name),
      addDrumTrack:     (name = 'Drums')                                                  => addTrack(ydoc, createDrumTrackYMap(uuidv4(), name)),
      addMelodicTrack:  (name = 'Synth')                                                  => addTrack(ydoc, createMelodicTrackYMap(uuidv4(), name)),
      addBassTrack:     (name = 'Bass')                                                   => addTrack(ydoc, createMelodicTrackYMap(uuidv4(), name, 'fat-bass')),
      removeTrack:      (idx: number)                                                     => removeTrack(ydoc, idx),
      toggleDrumStep:   (idx: number, inst: DrumInstrument, step: number)                 => toggleDrumStep(ydoc, idx, inst, step),
      setMelodicStep:   (idx: number, step: number, note: string, active: boolean)        => setMelodicStep(ydoc, idx, step, note, active),
      setTrackParameter:(idx: number, key: string, value: number | string | boolean)      => setTrackParameter(ydoc, idx, key, value),
      setTrackMuted:    (idx: number, muted: boolean)                                     => setTrackMuted(ydoc, idx, muted),
      setTrackName:     (idx: number, name: string)                                       => setTrackName(ydoc, idx, name),
      setMelodicPreset: (idx: number, preset: MelodicPreset)                              => setMelodicPreset(ydoc, idx, preset),
    }),
    [ydoc],
  )
}
