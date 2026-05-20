const KEY = 'collab-sequencer-sessions'

export interface Session {
  id:          string
  name:        string
  createdAt:   number
  lastVisited: number
}

export function getSessions(): Session[] {
  try   { return JSON.parse(localStorage.getItem(KEY) ?? '[]') }
  catch { return [] }
}

export function upsertSession(session: Omit<Session, 'createdAt'> & { createdAt?: number }): void {
  const existing = getSessions()
  const idx      = existing.findIndex(s => s.id === session.id)
  const full: Session = { createdAt: Date.now(), ...session }
  if (idx >= 0) existing[idx] = full
  else          existing.unshift(full)
  localStorage.setItem(KEY, JSON.stringify(existing.slice(0, 30)))
}

export function deleteSession(id: string): void {
  localStorage.setItem(KEY, JSON.stringify(getSessions().filter(s => s.id !== id)))
}

export function updateSessionName(id: string, name: string): void {
  const sessions = getSessions()
  const s = sessions.find(s => s.id === id)
  if (s) { s.name = name; localStorage.setItem(KEY, JSON.stringify(sessions)) }
}
