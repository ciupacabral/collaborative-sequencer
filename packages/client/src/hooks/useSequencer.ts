import { useCallback, useRef, useSyncExternalStore } from 'react'
import { useYjs } from '../context/YjsContext'
import { snapshotSequencer } from '../lib/yjsSchema'
import type { SequencerSnapshot } from '../types/sequencer'

/**
 * Subscribes to the Y.js document and returns a plain-JS snapshot of the
 * full sequencer state. Re-renders only when Y.js emits an update.
 *
 * Architecture note:
 * - React state = read-only projection of Y.js truth
 * - Tone.js will read from Y.js directly (bypassing React) for scheduling
 * - This hook is the only bridge from Y.js into the React render tree
 *
 * The snapshot cache is required by useSyncExternalStore: consecutive
 * getSnapshot() calls must return the same reference when no store update
 * occurred in between. Without this, React would re-render on every call.
 */
export function useSequencer(): SequencerSnapshot {
  const { ydoc } = useYjs()

  const cacheRef    = useRef<SequencerSnapshot | null>(null)
  const invalidated = useRef(true)

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const root = ydoc.getMap('sequencer')
      const observer = () => {
        invalidated.current = true
        onStoreChange()
      }
      root.observeDeep(observer)
      return () => root.unobserveDeep(observer)
    },
    [ydoc],
  )

  const getSnapshot = useCallback((): SequencerSnapshot => {
    if (invalidated.current || !cacheRef.current) {
      cacheRef.current    = snapshotSequencer(ydoc)
      invalidated.current = false
    }
    return cacheRef.current
  }, [ydoc])

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
