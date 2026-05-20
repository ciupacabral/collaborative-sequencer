import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import { getSessions, deleteSession, type Session } from '../lib/localSessions'

export function HomePage() {
  const navigate  = useNavigate()
  const [sessions, setSessions] = useState<Session[]>(() => getSessions())

  const createNew = () => navigate(`/room/${uuidv4().slice(0, 8)}`)
  const open      = (id: string) => navigate(`/room/${id}`)
  const remove    = (id: string) => { deleteSession(id); setSessions(getSessions()) }

  return (
    <div className="min-h-screen bg-surface text-white font-mono flex flex-col items-center pt-20 px-4">
      <div className="w-full max-w-md space-y-8">

        <div>
          <h1 className="text-2xl font-bold tracking-tight">Collaborative Sequencer</h1>
          <p className="text-sm text-zinc-500 mt-1">Real-time multi-track step sequencer — share a link to jam together.</p>
        </div>

        <button onClick={createNew}
          className="w-full py-3 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-semibold transition-colors">
          + New Session
        </button>

        {sessions.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xs uppercase tracking-widest text-zinc-500">Recent Sessions</h2>
            {sessions.map((s) => (
              <div key={s.id} className="flex items-center gap-3 bg-panel border border-border rounded-lg px-4 py-3">
                <button onClick={() => open(s.id)} className="flex-1 text-left min-w-0">
                  <div className="font-semibold text-sm truncate">{s.name}</div>
                  <div className="text-xs text-zinc-500 mt-0.5">
                    #{s.id} · {new Date(s.lastVisited).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </button>
                <button onClick={() => remove(s.id)}
                  className="text-zinc-600 hover:text-red-400 transition-colors text-sm shrink-0 px-1">
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {sessions.length === 0 && (
          <p className="text-center text-zinc-600 text-sm py-4">No saved sessions yet.</p>
        )}
      </div>
    </div>
  )
}
