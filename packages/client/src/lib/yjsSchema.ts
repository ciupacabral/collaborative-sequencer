import * as Y from 'yjs'
import {
  MAX_STEP_COUNT,
  DEFAULT_STEP_COUNT,
  DRUM_INSTRUMENTS,
  type DrumInstrument,
  type DrumParameters,
  type MelodicParameters,
  type MelodicStep,
  type DrumTrack,
  type Track,
  type SequencerSnapshot,
} from '../types/sequencer'
import { MELODIC_PRESETS, type MelodicPreset } from './presets'

// ─── Y.js type aliases (documentation only — Y.js is dynamically typed) ───────

export type YSequencerRoot = Y.Map<unknown>
export type YTrack         = Y.Map<unknown>
export type YLanes         = Y.Map<Y.Array<boolean>>
export type YSteps         = Y.Array<Y.Map<boolean>>
export type YParameters    = Y.Map<unknown>

// ─── Root accessor ────────────────────────────────────────────────────────────

export const getRoot = (ydoc: Y.Doc): YSequencerRoot =>
  ydoc.getMap('sequencer')

export const getYTracks = (ydoc: Y.Doc): Y.Array<YTrack> =>
  getRoot(ydoc).get('tracks') as Y.Array<YTrack>

// ─── Initialization ───────────────────────────────────────────────────────────
// Called once the WebSocket provider reports sync=true.
// Idempotent: only sets keys that don't yet exist, so late-joining peers skip it.

export function initSequencer(ydoc: Y.Doc, initialTempo = 120, sessionName = 'Untitled Session'): void {
  const root = getRoot(ydoc)
  ydoc.transact(() => {
    if (!root.has('tempo'))  root.set('tempo', initialTempo)
    if (!root.has('name'))   root.set('name', sessionName)
    if (!root.has('tracks')) root.set('tracks', new Y.Array<YTrack>())
  })
}

// ─── Track factories ──────────────────────────────────────────────────────────

export function createDrumTrackYMap(id: string, name: string): YTrack {
  const track = new Y.Map() as YTrack

  track.set('id',    id)
  track.set('type',  'drum')
  track.set('name',  name)
  track.set('muted', false)

  const lanes = new Y.Map() as YLanes
  for (const instrument of DRUM_INSTRUMENTS) {
    const lane = new Y.Array<boolean>()
    lane.insert(0, new Array<boolean>(MAX_STEP_COUNT).fill(false))
    lanes.set(instrument, lane)
  }
  track.set('lanes', lanes)

  const params = new Y.Map() as YParameters
  params.set('decay',       0.5)
  params.set('volume',      0)
  params.set('kickPreset',  'punchy')
  params.set('snarePreset', 'snappy')
  params.set('hihatPreset', 'closed')
  params.set('stepCount',   DEFAULT_STEP_COUNT)
  track.set('parameters', params)

  return track
}

export function createMelodicTrackYMap(id: string, name: string): YTrack {
  const track = new Y.Map() as YTrack

  track.set('id',    id)
  track.set('type',  'melodic')
  track.set('name',  name)
  track.set('muted', false)

  // Each step is an empty Y.Map<boolean> — keys are note names, values are active flags.
  // Polyphony is free: multiple keys can be set in the same step map.
  const steps = new Y.Array<Y.Map<boolean>>()
  steps.insert(0, Array.from({ length: MAX_STEP_COUNT }, () => new Y.Map<boolean>()))
  track.set('steps', steps)

  const params = new Y.Map() as YParameters
  params.set('oscillatorType', 'sine')
  params.set('attack',         0.01)
  params.set('decay',          0.1)
  params.set('sustain',        0.5)
  params.set('release',        0.5)
  params.set('volume',         0)
  params.set('preset',         'sine-pad')
  params.set('stepCount',      DEFAULT_STEP_COUNT)
  track.set('parameters', params)

  return track
}

// ─── Snapshot: Y.js → plain JS ────────────────────────────────────────────────
// Produces a new immutable object tree for React to diff.
// Called inside useSyncExternalStore's getSnapshot — must be pure and fast.

export function snapshotSequencer(ydoc: Y.Doc): SequencerSnapshot {
  const root    = getRoot(ydoc)
  const tempo   = (root.get('tempo') as number | undefined) ?? 120
  const name    = (root.get('name')  as string | undefined) ?? 'Untitled Session'
  const yTracks = root.get('tracks') as Y.Array<YTrack> | undefined

  const tracks: Track[] = []
  yTracks?.forEach((yTrack) => {
    const t = snapshotTrack(yTrack)
    if (t) tracks.push(t)
  })

  return { tempo, name, tracks }
}

function snapshotTrack(yTrack: YTrack): Track | null {
  const type = yTrack.get('type') as string
  const base = {
    id:    yTrack.get('id')    as string,
    name:  yTrack.get('name')  as string,
    muted: yTrack.get('muted') as boolean,
  }

  if (type === 'drum') {
    const yLanes = yTrack.get('lanes') as YLanes
    const lanes  = Object.fromEntries(
      DRUM_INSTRUMENTS.map((inst) => [
        inst,
        (yLanes.get(inst) as Y.Array<boolean>).toArray(),
      ]),
    ) as DrumTrack['lanes']

    const yParams    = yTrack.get('parameters') as YParameters
    const parameters: DrumParameters = {
      decay:       (yParams.get('decay')       as number) ?? 0.5,
      volume:      (yParams.get('volume')      as number) ?? 0,
      kickPreset:  (yParams.get('kickPreset')  as string) ?? 'punchy',
      snarePreset: (yParams.get('snarePreset') as string) ?? 'snappy',
      hihatPreset: (yParams.get('hihatPreset') as string) ?? 'closed',
      stepCount:   (yParams.get('stepCount')   as number) ?? DEFAULT_STEP_COUNT,
    }
    return { ...base, type: 'drum', lanes, parameters }
  }

  if (type === 'melodic') {
    const ySteps = yTrack.get('steps') as YSteps
    // Each step is a Y.Map<boolean> where keys = note names, values = active.
    const steps: MelodicStep[] = ySteps.map((yStep) =>
      Object.fromEntries(yStep.entries()) as MelodicStep
    )

    const yParams    = yTrack.get('parameters') as YParameters
    const parameters: MelodicParameters = {
      oscillatorType: (yParams.get('oscillatorType') as MelodicParameters['oscillatorType']) ?? 'sine',
      attack:    (yParams.get('attack')    as number) ?? 0.01,
      decay:     (yParams.get('decay')     as number) ?? 0.1,
      sustain:   (yParams.get('sustain')   as number) ?? 0.5,
      release:   (yParams.get('release')   as number) ?? 0.5,
      volume:    (yParams.get('volume')    as number) ?? 0,
      preset:    (yParams.get('preset')    as string) ?? 'sine-pad',
      stepCount: (yParams.get('stepCount') as number) ?? DEFAULT_STEP_COUNT,
    }
    return { ...base, type: 'melodic', steps, parameters }
  }

  return null
}

// ─── Mutation helpers ─────────────────────────────────────────────────────────
// All mutations are wrapped in ydoc.transact() — batches ops into one network
// message and one observer notification.

export function setTempo(ydoc: Y.Doc, bpm: number): void {
  ydoc.transact(() => getRoot(ydoc).set('tempo', bpm))
}

export function setSessionName(ydoc: Y.Doc, name: string): void {
  ydoc.transact(() => getRoot(ydoc).set('name', name))
}

export function addTrack(ydoc: Y.Doc, yTrack: YTrack): void {
  ydoc.transact(() => getYTracks(ydoc).push([yTrack]))
}

export function removeTrack(ydoc: Y.Doc, trackIndex: number): void {
  ydoc.transact(() => getYTracks(ydoc).delete(trackIndex, 1))
}

/**
 * Toggle a single drum step.
 * Y.Array has no .set(index, val) — the correct pattern is delete + re-insert.
 * Wrapped in a transaction so it is atomic across the network.
 */
export function toggleDrumStep(
  ydoc:        Y.Doc,
  trackIndex:  number,
  instrument:  DrumInstrument,
  stepIndex:   number,
): void {
  ydoc.transact(() => {
    const yTrack  = getYTracks(ydoc).get(trackIndex)
    const yLanes  = yTrack.get('lanes') as YLanes
    const yLane   = yLanes.get(instrument) as Y.Array<boolean>
    const current = yLane.get(stepIndex)
    yLane.delete(stepIndex, 1)
    yLane.insert(stepIndex, [!current])
  })
}

/**
 * Toggle a note in a melodic step.
 * The step is a Y.Map<boolean> (note → active). Setting active=false removes the key.
 * Multiple notes per step are fully supported — polyphony is a free consequence.
 */
export function setMelodicStep(
  ydoc:       Y.Doc,
  trackIndex: number,
  stepIndex:  number,
  note:       string,
  active:     boolean,
): void {
  ydoc.transact(() => {
    const yTrack = getYTracks(ydoc).get(trackIndex)
    const ySteps = yTrack.get('steps') as YSteps
    const yStep  = ySteps.get(stepIndex)
    if (active) yStep.set(note, true)
    else        yStep.delete(note)
  })
}

export function setTrackParameter(
  ydoc:       Y.Doc,
  trackIndex: number,
  key:        string,
  value:      number | string | boolean,
): void {
  ydoc.transact(() => {
    const yTrack  = getYTracks(ydoc).get(trackIndex)
    const yParams = yTrack.get('parameters') as YParameters
    yParams.set(key, value)
  })
}

export function setTrackMuted(ydoc: Y.Doc, trackIndex: number, muted: boolean): void {
  ydoc.transact(() => {
    getYTracks(ydoc).get(trackIndex).set('muted', muted)
  })
}

export function setTrackName(ydoc: Y.Doc, trackIndex: number, name: string): void {
  ydoc.transact(() => {
    getYTracks(ydoc).get(trackIndex).set('name', name)
  })
}

/** Sets the melodic preset AND cascades its envelope/oscillator values into Y.js,
 *  so individual sliders stay in sync and the audio engine only watches scalar params. */
export function setMelodicPreset(ydoc: Y.Doc, trackIndex: number, preset: MelodicPreset): void {
  const p = MELODIC_PRESETS[preset]
  ydoc.transact(() => {
    const yParams = getYTracks(ydoc).get(trackIndex).get('parameters') as YParameters
    yParams.set('preset',         preset)
    yParams.set('oscillatorType', p.oscillator.type)
    yParams.set('attack',         p.envelope.attack)
    yParams.set('decay',          p.envelope.decay)
    yParams.set('sustain',        p.envelope.sustain)
    yParams.set('release',        p.envelope.release)
  })
}
