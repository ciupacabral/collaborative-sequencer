import { useState } from 'react'
import { downloadJson, percentile, stdev } from '../lib/measurements'
import type { MeasurementsContextValue } from '../hooks/useMeasurements'

const SCENARIOS = ['default', 'LAN', 'WiFi', 'Slow 3G', 'Fast 3G', 'Cellular'] as const

interface Props {
  ctx: MeasurementsContextValue
}

export function DebugOverlay({ ctx }: Props) {
  const { store, offsets } = ctx
  const [tag, setTag] = useState(store.scenario)

  const syncSamples  = store.syncRing.snapshot().map((s) => s.latency_ms)
  const audioSamples = store.audioRing.snapshot().map((s) => s.jitter_ms)
  const audioWindow  = audioSamples.slice(-60)

  const p50 = percentile(syncSamples, 50)
  const p95 = percentile(syncSamples, 95)
  const p99 = percentile(syncSamples, 99)
  const aSig = stdev(audioWindow)
  const aMax = audioWindow.length === 0 ? null : Math.max(...audioWindow)

  const onReset     = () => store.reset()
  const onExport    = () => {
    const stamp = new Date().toISOString().slice(11, 16).replace(':', '')
    const safe  = store.scenario.replace(/[^a-z0-9_-]+/gi, '-').toLowerCase()
    downloadJson(store.exportJson(offsets), `measurements-${safe}-${stamp}.json`)
  }

  const fmt = (n: number | null, suffix = 'ms') => n === null ? '—' : `${n.toFixed(1)}${suffix}`

  return (
    <div className="fixed bottom-2 right-2 w-64 sm:w-72 p-2 bg-black/90 text-zinc-200 border border-zinc-700 rounded text-[11px] leading-tight font-mono z-50 space-y-1">
      <div>
        LAT  p50 {fmt(p50)}  p95 {fmt(p95)}  p99 {fmt(p99)}
        <span className="text-zinc-500"> [n={syncSamples.length}]</span>
      </div>
      <div>
        JITTER  σ {fmt(aSig)}  max {fmt(aMax)}
        <span className="text-zinc-500"> [n={audioSamples.length}]</span>
      </div>
      <div className="pt-1 border-t border-zinc-800">
        <div className="text-zinc-500">clock offsets:</div>
        {offsets.size === 0 && <div className="text-zinc-600 pl-2">syncing...</div>}
        {Array.from(offsets.entries()).map(([peer, info]) => (
          <div key={peer} className="pl-2">
            peer {peer}: {info.offset_ms >= 0 ? '+' : ''}{info.offset_ms.toFixed(1)}ms  rtt {info.rtt_ms.toFixed(1)}ms
          </div>
        ))}
      </div>
      <div className="pt-1 border-t border-zinc-800 flex items-center gap-1">
        <span className="text-zinc-500 shrink-0">scenario:</span>
        <select
          value={tag}
          onChange={(e) => { setTag(e.target.value); store.setScenario(e.target.value) }}
          className="flex-1 bg-zinc-900 px-1 py-0.5 rounded text-[11px] outline-none focus:ring-1 focus:ring-zinc-600"
        >
          {SCENARIOS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      <div className="flex gap-1">
        <button onClick={onReset}  className="flex-1 bg-zinc-800 hover:bg-zinc-700 rounded py-0.5">Reset</button>
        <button onClick={onExport} className="flex-1 bg-zinc-800 hover:bg-zinc-700 rounded py-0.5">Export JSON</button>
      </div>
    </div>
  )
}
