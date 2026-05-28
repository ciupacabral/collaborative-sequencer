import * as Tone from 'tone'
import * as Y from 'yjs'
import { DRUM_INSTRUMENTS, MAX_STEP_COUNT, DEFAULT_STEP_COUNT } from '../types/sequencer'
import type { YTrack, YLanes, YSteps } from './yjsSchema'
import {
  KICK_PRESETS, SNARE_PRESETS, HIHAT_PRESETS,
  type KickPreset, type SnarePreset, type HihatPreset,
} from './presets'
import type { AudioSample } from './measurements'

// tipuri interne

type DrumKit = {
  kick:  Tone.MembraneSynth
  snare: Tone.NoiseSynth
  hihat: Tone.MetalSynth
}

type Entry =
  | { type: 'drum';    kit:  DrumKit;        ch: Tone.Channel }
  | { type: 'melodic'; poly: Tone.PolySynth; ch: Tone.Channel }

// fabrici pentru instrumentele de tobe

const mkKick  = (p: KickPreset,  ch: Tone.Channel) => new Tone.MembraneSynth({ ...KICK_PRESETS[p]  }).connect(ch)
const mkSnare = (p: SnarePreset, ch: Tone.Channel) => new Tone.NoiseSynth({   ...SNARE_PRESETS[p] }).connect(ch)
const mkHihat = (p: HihatPreset, ch: Tone.Channel) => new Tone.MetalSynth({   ...HIHAT_PRESETS[p] }).connect(ch)

// motorul audio

export class AudioEngine {
  onStep?: (step: number) => void

  private ydoc:            Y.Doc
  private map            = new Map<string, Entry>()
  private seq:             Tone.Sequence<number>
  private observingTracks = false
  private measureSink:     ((s: AudioSample) => void) | null = null
  private prevTickTime:    number | null = null

  setMeasurementsSink(sink: ((s: AudioSample) => void) | null): void {
    this.measureSink = sink
    this.prevTickTime = null
  }

  constructor(ydoc: Y.Doc) {
    this.ydoc = ydoc
    ydoc.getMap('sequencer').observe(this.onRootChange)
    this.tryObserveTracks()
    // se programeaza mereu MAX_STEP_COUNT pasi; fiecare track isi ia propriul stepCount prin modulo
    this.seq = new Tone.Sequence(this.tick, [...Array(MAX_STEP_COUNT).keys()], '16n')
    this.seq.start(0)
  }

  // ciclul de viata al instrumentelor

  private tryObserveTracks() {
    const yTracks = this.ydoc.getMap('sequencer').get('tracks') as Y.Array<YTrack> | undefined
    if (yTracks && !this.observingTracks) {
      yTracks.observe(this.syncAll)
      this.observingTracks = true
      this.syncAll()
      const bpm = this.ydoc.getMap('sequencer').get('tempo') as number | undefined
      if (bpm) Tone.getTransport().bpm.value = bpm
    }
  }

  private syncAll = () => {
    const yTracks = this.ydoc.getMap('sequencer').get('tracks') as Y.Array<YTrack> | undefined
    if (!yTracks) return
    const live = new Set<string>()
    yTracks.forEach((t) => {
      const id = t.get('id') as string; const tp = t.get('type') as string
      live.add(id)
      if (!this.map.has(id)) {
        if (tp === 'drum')    this.addDrum(id, t)
        if (tp === 'melodic') this.addMelodic(id, t)
      }
    })
    this.map.forEach((e, id) => { if (!live.has(id)) { this.disposeEntry(e); this.map.delete(id) } })
  }

  private addDrum(id: string, t: YTrack) {
    const ch = new Tone.Channel().toDestination()
    const p  = t.get('parameters') as Y.Map<unknown> | undefined
    ch.volume.value = (p?.get('volume') as number) ?? 0

    const kp = ((p?.get('kickPreset')  as string) ?? 'punchy')  as KickPreset
    const sp = ((p?.get('snarePreset') as string) ?? 'snappy')  as SnarePreset
    const hp = ((p?.get('hihatPreset') as string) ?? 'closed')  as HihatPreset

    const kit: DrumKit = { kick: mkKick(kp, ch), snare: mkSnare(sp, ch), hihat: mkHihat(hp, ch) }
    this.map.set(id, { type: 'drum', kit, ch })

    let prevKP = kp, prevSP = sp, prevHP = hp
    p?.observe(() => {
      const entry = this.map.get(id); if (!entry || entry.type !== 'drum') return
      ch.volume.value = (p.get('volume') as number) ?? 0
      const nKP = ((p.get('kickPreset')  as string) ?? 'punchy')  as KickPreset
      const nSP = ((p.get('snarePreset') as string) ?? 'snappy')  as SnarePreset
      const nHP = ((p.get('hihatPreset') as string) ?? 'closed')  as HihatPreset
      if (nKP !== prevKP) { entry.kit.kick.dispose();  entry.kit.kick  = mkKick(nKP,  ch); prevKP = nKP }
      if (nSP !== prevSP) { entry.kit.snare.dispose(); entry.kit.snare = mkSnare(nSP, ch); prevSP = nSP }
      if (nHP !== prevHP) { entry.kit.hihat.dispose(); entry.kit.hihat = mkHihat(nHP, ch); prevHP = nHP }
    })
  }

  private addMelodic(id: string, t: YTrack) {
    const ch = new Tone.Channel().toDestination()
    const p  = t.get('parameters') as Y.Map<unknown> | undefined
    ch.volume.value = (p?.get('volume') as number) ?? 0

    const buildPoly = (oscType: string) => new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: oscType } as unknown as Tone.OmniOscillatorOptions,
      envelope: {
        attack:  (p?.get('attack')  as number) ?? 0.01,
        decay:   (p?.get('decay')   as number) ?? 0.1,
        sustain: (p?.get('sustain') as number) ?? 0.5,
        release: (p?.get('release') as number) ?? 0.5,
      },
    }).connect(ch)

    let prevOscType = (p?.get('oscillatorType') as string) ?? 'sine'
    const poly = buildPoly(prevOscType)
    this.map.set(id, { type: 'melodic', poly, ch })

    p?.observe(() => {
      const entry = this.map.get(id); if (!entry || entry.type !== 'melodic') return
      ch.volume.value = (p.get('volume') as number) ?? 0

      const newOscType = (p.get('oscillatorType') as string) ?? 'sine'
      if (newOscType !== prevOscType) {
        // recreaza PolySynth-ul; set() pe tipul de oscilator nu e de incredere
        entry.poly.releaseAll(); entry.poly.dispose()
        entry.poly = buildPoly(newOscType)
        prevOscType = newOscType
      }

      // anvelopa se poate sincroniza mereu cu set() (e sigur aici)
      entry.poly.set({ envelope: {
        attack:  (p.get('attack')  as number) ?? 0.01,
        decay:   (p.get('decay')   as number) ?? 0.1,
        sustain: (p.get('sustain') as number) ?? 0.5,
        release: (p.get('release') as number) ?? 0.5,
      }})
    })
  }

  // preview de nota (la click pe pian)

  previewNote(trackId: string, note: string) {
    const entry = this.map.get(trackId)
    if (!entry || entry.type !== 'melodic') return
    entry.poly.triggerAttackRelease(note, '8n')
  }

  // scheduler-ul: la fiecare tick citeste direct din Y.Doc

  private tick = (time: number, step: number) => {
    Tone.getDraw().schedule(() => this.onStep?.(step), time)

    const yTracks = this.ydoc.getMap('sequencer').get('tracks') as Y.Array<YTrack> | undefined
    yTracks?.forEach((t) => {
      const id        = t.get('id')    as string
      const muted     = t.get('muted') as boolean
      const type      = t.get('type')  as string
      const entry     = this.map.get(id)
      if (!entry || muted) return

      const p          = t.get('parameters') as Y.Map<unknown> | undefined
      const stepCount  = (p?.get('stepCount') as number) ?? DEFAULT_STEP_COUNT
      const localStep  = step % stepCount   // lungimea buclei per track, prin modulo

      if (type === 'drum' && entry.type === 'drum') {
        const lanes = t.get('lanes') as YLanes | undefined
        const decay = (p?.get('decay') as number) ?? 0.4
        DRUM_INSTRUMENTS.forEach((inst) => {
          if (!(lanes?.get(inst) as Y.Array<boolean> | undefined)?.get(localStep)) return
          if (inst === 'kick')  entry.kit.kick.triggerAttackRelease('C1', decay, time)
          if (inst === 'snare') entry.kit.snare.triggerAttackRelease(decay * 0.5, time)
          if (inst === 'hihat') entry.kit.hihat.triggerAttackRelease(decay * 0.4, time)
        })
      }

      if (type === 'melodic' && entry.type === 'melodic') {
        const steps = t.get('steps') as YSteps | undefined
        const yStep = steps?.get(localStep) as Y.Map<boolean> | undefined
        // polifonie: toate notele active in pasul asta pornesc simultan
        yStep?.forEach((active, note) => {
          if (active) entry.poly.triggerAttackRelease(note, '8n', time)
        })
      }
    })

    if (this.measureSink) {
      const prev = this.prevTickTime
      this.prevTickTime = time
      if (prev !== null) {
        const bpm        = Tone.getTransport().bpm.value
        const expected_s = 60 / bpm / 4
        const delta_s    = time - prev
        this.measureSink({
          tickIndex:   step,
          delta_ms:    delta_s * 1000,
          expected_ms: expected_s * 1000,
          jitter_ms:   Math.abs(delta_s - expected_s) * 1000,
          at:          Date.now(),
        })
      }
    }
  }

  // observer pe map-ul root (track-uri noi sau schimbare de tempo)

  private onRootChange = (event: Y.YMapEvent<unknown>) => {
    if (event.keysChanged.has('tracks')) this.tryObserveTracks()
    if (event.keysChanged.has('tempo')) {
      const bpm = this.ydoc.getMap('sequencer').get('tempo') as number | undefined
      if (bpm) Tone.getTransport().bpm.value = bpm
    }
  }

  // transport: play/stop, local pentru fiecare client

  async start() { await Tone.start(); Tone.getTransport().start() }
  stop()        { Tone.getTransport().stop(); Tone.getTransport().position = 0 }
  get playing() { return Tone.getTransport().state === 'started' }

  // curatenie la dispose

  private disposeEntry(e: Entry) {
    if (e.type === 'drum') { e.kit.kick.dispose(); e.kit.snare.dispose(); e.kit.hihat.dispose() }
    else                   { e.poly.releaseAll(); e.poly.dispose() }
    e.ch.dispose()
  }

  dispose() {
    const yTracks = this.ydoc.getMap('sequencer').get('tracks') as Y.Array<YTrack> | undefined
    if (this.observingTracks) yTracks?.unobserve(this.syncAll)
    this.ydoc.getMap('sequencer').unobserve(this.onRootChange)
    this.seq.dispose()
    this.map.forEach((e) => this.disposeEntry(e))
    this.map.clear()
    Tone.getTransport().stop()
    Tone.getTransport().position = 0
  }
}
