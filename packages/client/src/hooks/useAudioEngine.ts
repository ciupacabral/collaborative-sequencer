import { useCallback, useEffect, useRef, useState } from 'react'
import { useYjs } from '../context/YjsContext'
import { AudioEngine } from '../lib/audioEngine'
import type { AudioSample } from '../lib/measurements'

export function useAudioEngine() {
  const { ydoc }  = useYjs()
  const ref       = useRef<AudioEngine | null>(null)
  const [playing,     setPlaying]     = useState(false)
  const [currentStep, setCurrentStep] = useState(-1)

  useEffect(() => {
    const eng = new AudioEngine(ydoc)
    eng.onStep = setCurrentStep
    ref.current = eng
    return () => { eng.dispose(); ref.current = null; setPlaying(false); setCurrentStep(-1) }
  }, [ydoc])

  const toggle = useCallback(async () => {
    const eng = ref.current
    if (!eng) return
    if (eng.playing) {
      eng.stop()
      setPlaying(false)
      setCurrentStep(-1)
    } else {
      await eng.start()
      setPlaying(true)
    }
  }, [])

  const previewNote = useCallback((trackId: string, note: string) => {
    ref.current?.previewNote(trackId, note)
  }, [])

  const attachMeasurementsSink = useCallback((sink: ((s: AudioSample) => void) | null) => {
    ref.current?.setMeasurementsSink(sink)
  }, [])

  return { playing, currentStep, toggle, previewNote, attachMeasurementsSink }
}
