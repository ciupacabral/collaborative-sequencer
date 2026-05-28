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

// yjs e netipat la runtime; alias-urile servesc doar la tiparea TS
export type YSequencerRoot = Y.Map<unknown>
export type YTrack         = Y.Map<unknown>
export type YLanes         = Y.Map<Y.Array<boolean>>
export type YSteps         = Y.Array<Y.Map<boolean>>
export type YParameters    = Y.Map<unknown>

// acces rapid la map-ul root si la lista de track-uri
export const getRoot = (ydoc: Y.Doc): YSequencerRoot =>
  ydoc.getMap('sequencer')

export const getYTracks = (ydoc: Y.Doc): Y.Array<YTrack> =>
  getRoot(ydoc).get('tracks') as Y.Array<YTrack>

// se apeleaza o singura data, dupa ce provider-ul raporteaza sincronizarea.
// guard-urile cu has() sunt necesare: un peer care intra mai tarziu nu trebuie sa suprascrie starea existenta
export function initSequencer(ydoc: Y.Doc, initialTempo = 120, sessionName = 'Untitled Session'): void {
  const root = getRoot(ydoc)
  ydoc.transact(() => {
    if (!root.has('tempo'))  root.set('tempo', initialTempo)
    if (!root.has('name'))   root.set('name', sessionName)
    if (!root.has('tracks')) root.set('tracks', new Y.Array<YTrack>())
  })
}

// construieste un track nou ca Y.Map; intai cel de tobe, melodic mai jos
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

export function createMelodicTrackYMap(id: string, name: string, presetOverride?: MelodicPreset): YTrack {
  const track = new Y.Map() as YTrack

  track.set('id',    id)
  track.set('type',  'melodic')
  track.set('name',  name)
  track.set('muted', false)

  const steps = new Y.Array<Y.Map<boolean>>()
  steps.insert(0, Array.from({ length: MAX_STEP_COUNT }, () => new Y.Map<boolean>()))
  track.set('steps', steps)

  const preset = presetOverride ?? 'sine-pad'
  const p      = MELODIC_PRESETS[preset]

  const params = new Y.Map() as YParameters
  params.set('oscillatorType', p.oscillator.type)
  params.set('attack',         p.envelope.attack)
  params.set('decay',          p.envelope.decay)
  params.set('sustain',        p.envelope.sustain)
  params.set('release',        p.envelope.release)
  params.set('volume',         0)
  params.set('preset',         preset)
  params.set('stepCount',      DEFAULT_STEP_COUNT)
  track.set('parameters', params)

  return track
}

// converteste Y.Doc-ul intr-un obiect JS simplu, comparabil de catre React.
// ruleaza in getSnapshot (useSyncExternalStore), deci trebuie sa fie pur si rapid
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
    // fiecare pas e un map nume_nota -> activ/inactiv
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

// tot ce urmeaza scrie prin transact(): un singur update pe retea
// si o singura notificare a observer-ului, nu una per operatie
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

export function duplicateTrack(ydoc: Y.Doc, trackIndex: number, newId: string): void {
  ydoc.transact(() => {
    const yTracks = getYTracks(ydoc)
    const source  = yTracks.get(trackIndex)
    if (!source) return

    const type = source.get('type') as string
    const copy = new Y.Map() as YTrack
    copy.set('id',    newId)
    copy.set('type',  type)
    copy.set('name',  `${source.get('name')} (copy)`)
    copy.set('muted', source.get('muted') as boolean)

    if (type === 'drum') {
      const srcLanes = source.get('lanes') as YLanes
      const newLanes = new Y.Map() as YLanes
      for (const inst of DRUM_INSTRUMENTS) {
        const srcLane = srcLanes.get(inst) as Y.Array<boolean>
        const newLane = new Y.Array<boolean>()
        newLane.insert(0, srcLane.toArray())
        newLanes.set(inst, newLane)
      }
      copy.set('lanes', newLanes)
    } else if (type === 'melodic') {
      const srcSteps = source.get('steps') as YSteps
      const newStepArr: Y.Map<boolean>[] = []
      srcSteps.forEach((srcStep) => {
        const newStep = new Y.Map<boolean>()
        srcStep.forEach((v, k) => newStep.set(k, v))
        newStepArr.push(newStep)
      })
      const newSteps = new Y.Array<Y.Map<boolean>>()
      newSteps.insert(0, newStepArr)
      copy.set('steps', newSteps)
    }

    const srcParams = source.get('parameters') as YParameters
    const newParams = new Y.Map() as YParameters
    srcParams.forEach((v, k) => newParams.set(k, v))
    copy.set('parameters', newParams)

    yTracks.push([copy])
  })
}

// comuta un singur pas de toba.
// atentie: Y.Array nu are .set(i, val), deci se sterge slotul si se insereaza valoarea noua.
// ambele in aceeasi tranzactie, altfel s-ar propaga momentan un array cu o celula lipsa
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

// adauga sau scoate o nota dintr-un pas melodic.
// pasul e un Y.Map<boolean> (nota -> activ); dezactivarea unei note sterge cheia.
// mai multe note pot sta pe acelasi pas, deci polifonia rezulta natural
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

// alegerea unui preset scrie si valorile de oscilator/anvelopa in yjs,
// ca slider-ele sa ramana sincronizate iar engine-ul audio sa citeasca doar numere
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
