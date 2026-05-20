import { useState, useEffect } from 'react'
import { useParams, Navigate, useNavigate } from 'react-router-dom'
import { YjsProvider, useYjs } from '../context/YjsContext'
import { useSequencer } from '../hooks/useSequencer'
import { useSignaledMutations } from '../hooks/useSignaledMutations'
import { useAudioEngine } from '../hooks/useAudioEngine'
import { PeerFocusProvider, usePeerFocus } from '../context/PeerFocusContext'
import { useLocalFocus } from '../hooks/useLocalFocus'
import { PeerOverlay } from '../components/PeerOverlay'
import type { FocusAddress } from '../types/awareness'
import { upsertSession, updateSessionName } from '../lib/localSessions'
import { STEP_COUNT_OPTIONS } from '../types/sequencer'
import type { DrumTrack, MelodicTrack } from '../types/sequencer'
import {
  KICK_PRESET_KEYS, SNARE_PRESET_KEYS, HIHAT_PRESET_KEYS, MELODIC_PRESET_KEYS,
  type MelodicPreset,
} from '../lib/presets'

// ─── Room entry ───────────────────────────────────────────────────────────────

export function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>()
  if (!roomId) return <Navigate to="/" replace />
  return (
    <YjsProvider key={roomId} roomId={roomId}>
      <PeerFocusProvider>
        <SequencerShell roomId={roomId} />
      </PeerFocusProvider>
    </YjsProvider>
  )
}

// ─── Shell ────────────────────────────────────────────────────────────────────

function SequencerShell({ roomId }: { roomId: string }) {
  const navigate                              = useNavigate()
  const { status }                            = useYjs()
  const state                                 = useSequencer()
  const mutations                             = useSignaledMutations()
  const { playing, currentStep, toggle, previewNote } = useAudioEngine()
  const { peers }                             = usePeerFocus()
  const { setFocus: setFocusShell }           = useLocalFocus()
  const [copied, setCopied]                   = useState(false)
  const [bpmInput, setBpmInput]               = useState<string>('')

  // Keep localStorage in sync with session name from Y.js
  useEffect(() => {
    upsertSession({ id: roomId, name: state.name, lastVisited: Date.now() })
    updateSessionName(roomId, state.name)
  }, [roomId, state.name])

  const copyUrl = async () => {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const dot = { connecting: 'bg-yellow-500', connected: 'bg-green-500', disconnected: 'bg-red-500' }[status]

  const handleBpmKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') commitBpm()
    if (e.key === 'Escape') setBpmInput('')
  }

  const commitBpm = () => {
    const n = parseInt(bpmInput, 10)
    if (!isNaN(n) && n >= 20 && n <= 280) mutations.setTempo(n)
    setBpmInput('')
  }

  return (
    <div className="min-h-screen bg-surface text-white font-mono p-6 space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => navigate('/')} className="text-zinc-500 hover:text-white transition-colors text-xs shrink-0">← Home</button>
          <PeerOverlay
            addr={{ kind: 'sessionName' }}
            onMouseEnter={() => setFocusShell({ kind: 'sessionName' })}
            onMouseLeave={() => setFocusShell(null)}
          >
            <SessionNameEditor name={state.name} onSave={mutations.setSessionName} />
          </PeerOverlay>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {/* Presence avatars */}
          <div className="flex items-center gap-1">
            {peers.map((p) => (
              <div key={p.clientID} title={p.name + (p.self ? ' (you)' : '')}
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ring-2 ring-surface"
                style={{ backgroundColor: p.color }}>
                {p.name[0]}
              </div>
            ))}
          </div>
          <span className={`w-2 h-2 rounded-full ${dot}`} />
          <span className="text-xs text-zinc-500">#{roomId}</span>
        </div>
      </div>

      {/* Transport */}
      <div className="bg-panel border border-border rounded-lg p-4 flex flex-wrap items-center gap-4">
        <button onClick={toggle} disabled={status !== 'connected'}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors shrink-0 ${
            playing ? 'bg-red-600 hover:bg-red-500' : 'bg-violet-600 hover:bg-violet-500 disabled:opacity-40'
          }`}>
          {playing
            ? <span className="w-3 h-3 bg-white rounded-sm" />
            : <span className="w-0 h-0 border-t-[7px] border-b-[7px] border-l-[12px] border-transparent border-l-white ml-0.5" />}
        </button>
        <label className="text-xs text-zinc-400">BPM</label>
        <PeerOverlay
          addr={{ kind: 'bpm' }}
          className="flex-1 min-w-32"
          onMouseEnter={() => setFocusShell({ kind: 'bpm' })}
          onMouseLeave={() => setFocusShell(null)}
        >
          <input type="range" min={20} max={280} value={state.tempo}
            onChange={(e) => mutations.setTempo(Number(e.target.value))}
            className="w-full accent-violet-500" />
        </PeerOverlay>
        <PeerOverlay
          addr={{ kind: 'bpm' }}
          onMouseEnter={() => setFocusShell({ kind: 'bpm' })}
          onMouseLeave={() => setFocusShell(null)}
        >
          <input
            type="number" min={20} max={280}
            value={bpmInput !== '' ? bpmInput : state.tempo}
            onChange={(e) => setBpmInput(e.target.value)}
            onBlur={commitBpm}
            onKeyDown={handleBpmKey}
            className="w-16 bg-zinc-800 text-right text-sm tabular-nums px-2 py-1 rounded border border-transparent focus:border-violet-500 outline-none"
          />
        </PeerOverlay>
        <button onClick={copyUrl} className="text-xs px-3 py-1.5 rounded bg-zinc-700 hover:bg-zinc-600 transition-colors">
          {copied ? 'Copied!' : 'Share'}
        </button>
        <div className="flex gap-2 ml-auto">
          <button onClick={() => mutations.addDrumTrack()}    className="text-xs px-3 py-1.5 rounded bg-zinc-700 hover:bg-zinc-600 transition-colors">+ Drum</button>
          <button onClick={() => mutations.addMelodicTrack()} className="text-xs px-3 py-1.5 rounded bg-zinc-700 hover:bg-zinc-600 transition-colors">+ Melodic</button>
        </div>
      </div>

      {/* Tracks */}
      <div className="space-y-4">
        {state.tracks.map((track, idx) => (
          <div key={track.id} className="bg-panel border border-border rounded-lg p-4">
            {/* Track header */}
            <div className="flex items-start gap-3 mb-4">
              <div className="flex flex-col shrink-0">
                <span className="text-xs uppercase tracking-widest text-zinc-600">{track.type}</span>
                <PeerOverlay
                  addr={{ kind: 'trackName', trackId: track.id }}
                  onMouseEnter={() => setFocusShell({ kind: 'trackName', trackId: track.id })}
                  onMouseLeave={() => setFocusShell(null)}
                >
                  <TrackNameEditor name={track.name} trackIdx={idx} />
                </PeerOverlay>
              </div>
              <div className="flex gap-2 ml-auto">
                <button onClick={() => mutations.setTrackMuted(idx, !track.muted)}
                  className={`text-xs px-2.5 py-1 rounded transition-colors ${track.muted ? 'bg-red-900 text-red-300' : 'bg-zinc-700 text-zinc-300'}`}>
                  {track.muted ? 'Muted' : 'Mute'}
                </button>
                <button onClick={() => mutations.removeTrack(idx)}
                  className="text-xs px-2.5 py-1 rounded bg-zinc-800 hover:bg-red-900 text-zinc-500 hover:text-red-300 transition-colors">✕</button>
              </div>
            </div>

            {track.type === 'drum'    && <DrumGrid    track={track} trackIdx={idx} currentStep={currentStep} />}
            {track.type === 'melodic' && <MelodicGrid track={track} trackIdx={idx} currentStep={currentStep} previewNote={previewNote} />}
          </div>
        ))}

        {state.tracks.length === 0 && (
          <p className="text-center text-zinc-600 py-16 text-sm">No tracks — add a Drum or Melodic track above.</p>
        )}
      </div>

      <details className="bg-panel border border-border rounded-lg">
        <summary className="p-3 text-xs text-zinc-600 cursor-pointer hover:text-zinc-400">Y.js snapshot</summary>
        <pre className="p-4 text-xs text-zinc-500 overflow-auto max-h-48 border-t border-border">{JSON.stringify(state, null, 2)}</pre>
      </details>
    </div>
  )
}

// ─── Session name editor ──────────────────────────────────────────────────────

function SessionNameEditor({ name, onSave }: { name: string; onSave: (n: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState(name)

  useEffect(() => { if (!editing) setDraft(name) }, [name, editing])

  const commit = () => {
    const v = draft.trim() || name
    onSave(v); setDraft(v); setEditing(false)
  }

  if (editing) {
    return (
      <input autoFocus value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setDraft(name); setEditing(false) } }}
        className="bg-zinc-800 px-2 py-0.5 rounded font-semibold outline-none border border-violet-500 w-48"
      />
    )
  }
  return (
    <span onClick={() => { setDraft(name); setEditing(true) }} title="Click to rename"
      className="font-semibold cursor-pointer hover:text-zinc-300 border-b border-transparent hover:border-zinc-500 transition-colors truncate max-w-xs">
      {name}
    </span>
  )
}

// ─── Inline track name editor ─────────────────────────────────────────────────

function TrackNameEditor({ name, trackIdx }: { name: string; trackIdx: number }) {
  const { setTrackName }      = useSignaledMutations()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState(name)

  useEffect(() => { if (!editing) setDraft(name) }, [name, editing])

  const commit = () => {
    const v = draft.trim() || name
    setTrackName(trackIdx, v); setDraft(v); setEditing(false)
  }

  if (editing) {
    return (
      <input autoFocus value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setDraft(name); setEditing(false) } }}
        className="bg-zinc-800 px-2 py-0.5 rounded text-sm font-semibold outline-none border border-violet-500 w-32 mt-0.5"
      />
    )
  }
  return (
    <span onClick={() => { setDraft(name); setEditing(true) }} title="Click to rename"
      className="font-semibold text-sm cursor-pointer hover:text-zinc-300 border-b border-transparent hover:border-zinc-500 transition-colors mt-0.5">
      {name}
    </span>
  )
}

// ─── Shared UI primitives ─────────────────────────────────────────────────────

function ParamSlider({ label, min, max, step = 0.001, value, onChange, fmt }: {
  label: string; min: number; max: number; step?: number
  value: number; onChange: (v: number) => void; fmt?: (v: number) => string
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-zinc-500 w-14 shrink-0">{label}</span>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-24 accent-violet-500" />
      <span className="text-xs tabular-nums text-zinc-400 w-12 text-right">
        {fmt ? fmt(value) : value.toFixed(2)}
      </span>
    </div>
  )
}

function PresetPicker<T extends string>({ keys, value, onChange }: { keys: T[]; value: string; onChange: (v: T) => void }) {
  return (
    <div className="flex gap-1 flex-wrap">
      {keys.map((k) => (
        <button key={k} onClick={() => onChange(k)}
          className={`text-xs px-2 py-0.5 rounded capitalize transition-colors ${
            value === k ? 'bg-violet-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
          }`}>
          {k}
        </button>
      ))}
    </div>
  )
}

function StepCountPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-zinc-500 w-14 shrink-0">Steps</span>
      <div className="flex gap-1">
        {STEP_COUNT_OPTIONS.map((n) => (
          <button key={n} onClick={() => onChange(n)}
            className={`text-xs px-2 py-0.5 rounded transition-colors tabular-nums ${
              value === n ? 'bg-violet-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}>
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Drum grid + params ───────────────────────────────────────────────────────

function DrumGrid({ track, trackIdx, currentStep }: { track: DrumTrack; trackIdx: number; currentStep: number }) {
  const { toggleDrumStep, setTrackParameter } = useSignaledMutations()
  const { setFocus }                          = useLocalFocus()
  const sc = track.parameters.stepCount

  const LANE_META = [
    { inst: 'kick'  as const, keys: KICK_PRESET_KEYS,  param: 'kickPreset',  current: track.parameters.kickPreset  },
    { inst: 'snare' as const, keys: SNARE_PRESET_KEYS, param: 'snarePreset', current: track.parameters.snarePreset },
    { inst: 'hihat' as const, keys: HIHAT_PRESET_KEYS, param: 'hihatPreset', current: track.parameters.hihatPreset },
  ]

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {LANE_META.map(({ inst, keys, param, current }) => (
          <div key={inst} className="flex items-center gap-2 flex-wrap">
            <span className="w-11 text-xs text-zinc-500 capitalize shrink-0">{inst}</span>
            <div className="flex gap-1">
              {track.lanes[inst].slice(0, sc).map((active, step) => {
                const addr: FocusAddress = { kind: 'drumStep', trackId: track.id, instrument: inst, step }
                return (
                  <PeerOverlay key={step} addr={addr}>
                    <button onClick={() => toggleDrumStep(trackIdx, inst, step)}
                      onMouseEnter={() => setFocus(addr)}
                      onMouseLeave={() => setFocus(null)}
                      className={[
                        'w-7 h-7 rounded transition-colors',
                        active ? 'bg-violet-500 hover:bg-violet-400' : 'bg-zinc-800 hover:bg-zinc-700',
                        (currentStep % sc) === step ? 'ring-1 ring-white/60' : '',
                        step % 4 === 0 && step !== 0 ? 'ml-1' : '',
                      ].join(' ')}
                    />
                  </PeerOverlay>
                )
              })}
            </div>
            <div className="ml-2">
              <PeerOverlay
                addr={{ kind: 'param', trackId: track.id, key: param }}
                onMouseEnter={() => setFocus({ kind: 'param', trackId: track.id, key: param })}
                onMouseLeave={() => setFocus(null)}
              >
                <PresetPicker keys={keys} value={current} onChange={(v) => setTrackParameter(trackIdx, param, v)} />
              </PeerOverlay>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-2 border-t border-border flex flex-wrap gap-x-6 gap-y-2">
        <PeerOverlay addr={{ kind: 'param', trackId: track.id, key: 'stepCount' }}
          onMouseEnter={() => setFocus({ kind: 'param', trackId: track.id, key: 'stepCount' })}
          onMouseLeave={() => setFocus(null)}>
          <StepCountPicker value={sc} onChange={(v) => setTrackParameter(trackIdx, 'stepCount', v)} />
        </PeerOverlay>
        <PeerOverlay addr={{ kind: 'param', trackId: track.id, key: 'volume' }}
          onMouseEnter={() => setFocus({ kind: 'param', trackId: track.id, key: 'volume' })}
          onMouseLeave={() => setFocus(null)}>
          <ParamSlider label="Volume" min={-40} max={6} step={0.5} value={track.parameters.volume}
            onChange={(v) => setTrackParameter(trackIdx, 'volume', v)}
            fmt={(v) => `${v} dB`} />
        </PeerOverlay>
        <PeerOverlay addr={{ kind: 'param', trackId: track.id, key: 'decay' }}
          onMouseEnter={() => setFocus({ kind: 'param', trackId: track.id, key: 'decay' })}
          onMouseLeave={() => setFocus(null)}>
          <ParamSlider label="Decay" min={0.05} max={2} value={track.parameters.decay}
            onChange={(v) => setTrackParameter(trackIdx, 'decay', v)}
            fmt={(v) => `${v.toFixed(2)} s`} />
        </PeerOverlay>
      </div>
    </div>
  )
}

// ─── Melodic grid + params ────────────────────────────────────────────────────

const PIANO_ROLL = [
  'C5','B4','A#4','A4','G#4','G4','F#4','F4','E4','D#4','D4','C#4','C4',
  'B3','A#3','A3','G#3','G3','F#3','F3','E3','D#3','D3','C#3','C3',
]

function MelodicGrid({ track, trackIdx, currentStep, previewNote }: {
  track:       MelodicTrack
  trackIdx:    number
  currentStep: number
  previewNote: (trackId: string, note: string) => void
}) {
  const { setMelodicStep, setMelodicPreset, setTrackParameter } = useSignaledMutations()
  const { setFocus } = useLocalFocus()
  const p  = track.parameters
  const sc = p.stepCount

  return (
    <div className="space-y-3">
      {/* Sound preset */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-zinc-500 w-14 shrink-0">Sound</span>
        <PeerOverlay addr={{ kind: 'param', trackId: track.id, key: 'preset' }}
          onMouseEnter={() => setFocus({ kind: 'param', trackId: track.id, key: 'preset' })}
          onMouseLeave={() => setFocus(null)}>
          <PresetPicker keys={MELODIC_PRESET_KEYS} value={p.preset}
            onChange={(v: MelodicPreset) => setMelodicPreset(trackIdx, v)} />
        </PeerOverlay>
      </div>

      {/* Parameters */}
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <PeerOverlay addr={{ kind: 'param', trackId: track.id, key: 'stepCount' }}
          onMouseEnter={() => setFocus({ kind: 'param', trackId: track.id, key: 'stepCount' })}
          onMouseLeave={() => setFocus(null)}>
          <StepCountPicker value={sc} onChange={(v) => setTrackParameter(trackIdx, 'stepCount', v)} />
        </PeerOverlay>
        <PeerOverlay addr={{ kind: 'param', trackId: track.id, key: 'volume' }}
          onMouseEnter={() => setFocus({ kind: 'param', trackId: track.id, key: 'volume' })}
          onMouseLeave={() => setFocus(null)}>
          <ParamSlider label="Volume"  min={-40} max={6}   step={0.5}   value={p.volume}  onChange={(v) => setTrackParameter(trackIdx, 'volume',  v)} fmt={(v) => `${v} dB`} />
        </PeerOverlay>
        <PeerOverlay addr={{ kind: 'param', trackId: track.id, key: 'attack' }}
          onMouseEnter={() => setFocus({ kind: 'param', trackId: track.id, key: 'attack' })}
          onMouseLeave={() => setFocus(null)}>
          <ParamSlider label="Attack"  min={0.001} max={2} step={0.001} value={p.attack}  onChange={(v) => setTrackParameter(trackIdx, 'attack',  v)} fmt={(v) => `${v.toFixed(3)} s`} />
        </PeerOverlay>
        <PeerOverlay addr={{ kind: 'param', trackId: track.id, key: 'decay' }}
          onMouseEnter={() => setFocus({ kind: 'param', trackId: track.id, key: 'decay' })}
          onMouseLeave={() => setFocus(null)}>
          <ParamSlider label="Decay"   min={0.001} max={2} step={0.001} value={p.decay}   onChange={(v) => setTrackParameter(trackIdx, 'decay',   v)} fmt={(v) => `${v.toFixed(3)} s`} />
        </PeerOverlay>
        <PeerOverlay addr={{ kind: 'param', trackId: track.id, key: 'sustain' }}
          onMouseEnter={() => setFocus({ kind: 'param', trackId: track.id, key: 'sustain' })}
          onMouseLeave={() => setFocus(null)}>
          <ParamSlider label="Sustain" min={0} max={1}     step={0.01}  value={p.sustain} onChange={(v) => setTrackParameter(trackIdx, 'sustain', v)} fmt={(v) => `${Math.round(v * 100)} %`} />
        </PeerOverlay>
        <PeerOverlay addr={{ kind: 'param', trackId: track.id, key: 'release' }}
          onMouseEnter={() => setFocus({ kind: 'param', trackId: track.id, key: 'release' })}
          onMouseLeave={() => setFocus(null)}>
          <ParamSlider label="Release" min={0.001} max={5} step={0.001} value={p.release} onChange={(v) => setTrackParameter(trackIdx, 'release', v)} fmt={(v) => `${v.toFixed(3)} s`} />
        </PeerOverlay>
      </div>

      {/* Playhead row */}
      <div className="flex gap-1 pl-10 border-t border-border pt-3">
        {Array.from({ length: sc }, (_, i) => (
          <div key={i} className={`w-7 h-1 rounded-sm transition-colors ${(currentStep % sc) === i ? 'bg-white/50' : 'bg-transparent'} ${i % 4 === 0 && i !== 0 ? 'ml-1' : ''}`} />
        ))}
      </div>

      {/* Piano roll — supports polyphony: multiple notes per column */}
      <div className="space-y-px">
        {PIANO_ROLL.map((note) => {
          const isBlack = note.includes('#')
          return (
            <div key={note} className="flex items-center gap-2">
              <span className={`w-8 text-right text-xs shrink-0 ${isBlack ? 'text-zinc-700' : 'text-zinc-500'}`}>{note}</span>
              <div className="flex gap-1">
                {track.steps.slice(0, sc).map((step, si) => {
                  const lit = !!step[note]
                  const addr: FocusAddress = { kind: 'melodicStep', trackId: track.id, step: si, note }
                  return (
                    <PeerOverlay key={si} addr={addr}>
                      <button
                        onClick={() => {
                          const nowActive = !lit
                          setMelodicStep(trackIdx, si, note, nowActive)
                          if (nowActive) previewNote(track.id, note)
                        }}
                        onMouseEnter={() => setFocus(addr)}
                        onMouseLeave={() => setFocus(null)}
                        className={[
                          'w-7 h-3.5 rounded-sm transition-colors',
                          lit ? 'bg-violet-500 hover:bg-violet-400' : isBlack ? 'bg-zinc-900 hover:bg-zinc-700' : 'bg-zinc-800 hover:bg-zinc-700',
                          (currentStep % sc) === si ? 'ring-1 ring-white/40' : '',
                          si % 4 === 0 && si !== 0 ? 'ml-1' : '',
                        ].join(' ')}
                      />
                    </PeerOverlay>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
