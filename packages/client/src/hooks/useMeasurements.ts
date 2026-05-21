import { useEffect, useMemo, useRef, useState } from 'react'
import * as Y from 'yjs'
import { useYjs } from '../context/YjsContext'
import { ClockSync, type PeerOffset } from '../lib/clockSync'
import { MeasurementsStore, type AudioSample } from '../lib/measurements'

const PROBE_INTERVAL_MS = 1000

export interface MeasurementsContextValue {
  store:     MeasurementsStore
  clockSync: ClockSync
  offsets:   Map<number, PeerOffset>
}

interface UseMeasurementsArgs {
  enabled:         boolean
  roomId:          string
  attachAudioSink: (sink: ((s: AudioSample) => void) | null) => void
}

export function useMeasurements(args: UseMeasurementsArgs): MeasurementsContextValue | null {
  const { enabled, roomId, attachAudioSink } = args
  const { ydoc, provider } = useYjs()

  const [, force] = useState(0)
  const storeRef  = useRef<MeasurementsStore | null>(null)
  const syncRef   = useRef<ClockSync | null>(null)

  useEffect(() => {
    if (!enabled || !provider) return

    const store     = new MeasurementsStore(roomId, provider.awareness.clientID)
    const clockSync = new ClockSync(provider.awareness)
    storeRef.current = store
    syncRef.current  = clockSync

    clockSync.start()
    const unsubStore = store.subscribe(() => force((n) => n + 1))
    const unsubSync  = clockSync.subscribe(() => force((n) => n + 1))

    attachAudioSink((s) => store.pushAudio(s))

    const telemetry = ydoc.getMap('_telemetry') as Y.Map<unknown>
    let probeCounter = 0

    const isProducer = (): boolean => {
      const states = provider.awareness.getStates()
      if (states.size <= 1) return false
      const ids: number[] = []
      states.forEach((_, id) => ids.push(id))
      ids.sort((a, b) => a - b)
      return ids[0] === provider.awareness.clientID
    }

    const sendProbe = () => {
      if (!isProducer()) return
      probeCounter += 1
      ydoc.transact(() => {
        telemetry.set('probe', {
          sender:  provider.awareness.clientID,
          counter: probeCounter,
          at:      Date.now(),
        })
      })
    }

    const probeTimer = window.setInterval(sendProbe, PROBE_INTERVAL_MS)

    const onTelemetryChange = () => {
      const probe = telemetry.get('probe') as { sender: number; counter: number; at: number } | undefined
      if (!probe) return
      if (probe.sender === provider.awareness.clientID) return
      const peerOffset = clockSync.offsets.get(probe.sender)
      if (!peerOffset) return
      const latency = (Date.now() + peerOffset.offset_ms) - probe.at
      store.pushSync({
        counter:    probe.counter,
        sender:     probe.sender,
        latency_ms: latency,
        scenario:   store.scenario,
        at:         Date.now(),
      })
    }
    telemetry.observe(onTelemetryChange)

    force((n) => n + 1)

    return () => {
      clearInterval(probeTimer)
      telemetry.unobserve(onTelemetryChange)
      attachAudioSink(null)
      unsubStore()
      unsubSync()
      clockSync.stop()
      storeRef.current = null
      syncRef.current  = null
    }
  }, [enabled, provider, ydoc, roomId, attachAudioSink])

  return useMemo<MeasurementsContextValue | null>(() => {
    if (!enabled || !storeRef.current || !syncRef.current) return null
    return {
      store:     storeRef.current,
      clockSync: syncRef.current,
      offsets:   syncRef.current.offsets,
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, storeRef.current, syncRef.current, force])
}
