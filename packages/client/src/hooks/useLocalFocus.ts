import { useCallback, useEffect, useRef } from 'react'
import { useYjs } from '../context/YjsContext'
import type { FocusAddress } from '../types/awareness'
import { sameAddress } from '../types/awareness'

const FOCUS_THROTTLE_MS = 50
const EDIT_CLEAR_MS     = 1200

export function useLocalFocus() {
  const { provider } = useYjs()
  const lastFocusRef    = useRef<FocusAddress | null>(null)
  const pendingFocusRef = useRef<FocusAddress | null>(null)
  const focusTimerRef   = useRef<number | null>(null)
  const editTimerRef    = useRef<number | null>(null)

  const publishFocus = useCallback((addr: FocusAddress | null) => {
    if (!provider) return
    const eq = (a: FocusAddress | null, b: FocusAddress | null) =>
      a === b || (a !== null && b !== null && sameAddress(a, b))
    if (eq(addr, lastFocusRef.current)) return
    lastFocusRef.current = addr
    provider.awareness.setLocalStateField('focus', addr)
  }, [provider])

  const setFocus = useCallback((addr: FocusAddress | null) => {
    if (!provider) return
    if (addr === null) {
      if (focusTimerRef.current !== null) {
        clearTimeout(focusTimerRef.current)
        focusTimerRef.current = null
      }
      pendingFocusRef.current = null
      publishFocus(null)
      return
    }
    pendingFocusRef.current = addr
    if (focusTimerRef.current !== null) return
    focusTimerRef.current = window.setTimeout(() => {
      focusTimerRef.current = null
      if (pendingFocusRef.current) publishFocus(pendingFocusRef.current)
    }, FOCUS_THROTTLE_MS)
  }, [provider, publishFocus])

  const signalEdit = useCallback((addr: FocusAddress) => {
    if (!provider) return
    provider.awareness.setLocalStateField('lastEdit', { addr, at: Date.now() })
    if (editTimerRef.current !== null) clearTimeout(editTimerRef.current)
    editTimerRef.current = window.setTimeout(() => {
      editTimerRef.current = null
      provider.awareness.setLocalStateField('lastEdit', null)
    }, EDIT_CLEAR_MS)
  }, [provider])

  useEffect(() => {
    const onVis = () => { if (document.hidden) setFocus(null) }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [setFocus])

  useEffect(() => {
    return () => {
      if (focusTimerRef.current !== null) clearTimeout(focusTimerRef.current)
      if (editTimerRef.current  !== null) clearTimeout(editTimerRef.current)
    }
  }, [])

  return { setFocus, signalEdit }
}
