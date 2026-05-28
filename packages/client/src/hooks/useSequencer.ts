import { useCallback, useRef, useSyncExternalStore } from 'react'
import { useYjs } from '../context/YjsContext'
import { snapshotSequencer } from '../lib/yjsSchema'
import type { SequencerSnapshot } from '../types/sequencer'

// se aboneaza la Y.Doc si intoarce un snapshot JS al intregii stari.
// re-randeaza doar cand yjs emite un update.
//
// ideea de arhitectura: starea React e doar o proiectie read-only a starii din yjs;
// Tone.js citeste direct din yjs (ocolind React) pentru scheduling, iar hook-ul asta
// e singura punte dinspre yjs spre arborele de randare React.
//
// cache-ul de snapshot e cerut de useSyncExternalStore: doua apeluri getSnapshot()
// consecutive trebuie sa intoarca aceeasi referinta daca nu a fost niciun update intre ele,
// altfel React ar re-randa la fiecare apel.
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
