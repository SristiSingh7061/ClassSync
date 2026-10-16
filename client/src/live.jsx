import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './auth';
import { PERIOD_TIMES } from './config';
import { fmtDate } from './lib';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const SOCKET_URL = API.replace(/\/api\/?$/, '');

const LiveCtx = createContext({ version: 0, connected: false });
export const useLive = () => useContext(LiveCtx);

const whenOf = (p) => { const t = PERIOD_TIMES[p.period]?.[0]; return `${fmtDate(p.date)}${t ? `, ${t}` : ''}`; };

// class:update  -> students, teacher, HOD
const describe = (p) => {
  const when = whenOf(p);
  const why = p.reason ? ` Reason: ${p.reason}` : '';
  if (p.kind === 'cancel') return `${p.subject} (${when}) was cancelled.${why}`;
  if (p.kind === 'reschedule') {
    const t2 = PERIOD_TIMES[p.toPeriod]?.[0];
    return `${p.subject} (${when}) was rescheduled to ${fmtDate(p.toDate)}${t2 ? `, ${t2}` : ''}.${why}`;
  }
  if (p.kind === 'substitute') return `${p.subject} (${when}): ${p.toTeacher} will cover for ${p.fromTeacher}.${why}`;
  return `${p.subject} (${when}) has returned to the original schedule.`;
};
// sub:request / sub:response  -> teachers only
const describeSub = (event, p) => {
  const when = whenOf(p);
  if (event === 'sub:request') return `${p.fromTeacher} requested a substitute for ${p.subject} (${when}). Check the "Requests" tab.`;
  if (p.kind === 'accepted') return `${p.toTeacher} accepted the substitute request for ${p.subject} (${when}).`;
  if (p.kind === 'declined') return `${p.toTeacher} declined the substitute request for ${p.subject} (${when}).`;
  return `${p.fromTeacher} withdrew the substitute request for ${p.subject} (${when}).`;
};

const TONE = { cancel: 'bg-alert', reschedule: 'bg-amber', substitute: 'bg-amber', restored: 'bg-brand', request: 'bg-amber', accepted: 'bg-brand', declined: 'bg-alert', cancelled: 'bg-ink' };

export function LiveProvider({ children }) {
  const { user } = useAuth();
  const [version, setVersion] = useState(0);   // pages reload their data when this changes
  const [connected, setConnected] = useState(false);
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('cs_token');
    if (!user || !token) return undefined;
    const socket = io(SOCKET_URL, { auth: { token } });
    let first = true;
    const toast = (kind, text) => {
      setVersion((v) => v + 1);
      const id = Date.now() + Math.random();
      setToasts((t) => [...t, { id, kind, text }]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 9000);
    };
    socket.on('connect', () => {
      setConnected(true);
      if (!first) setVersion((v) => v + 1);  // reconnected: refresh what we missed
      first = false;
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on('class:update', (p) => toast(p.kind, describe(p)));
    socket.on('sub:request', (p) => toast('request', describeSub('sub:request', p)));
    socket.on('sub:response', (p) => toast(p.kind, describeSub('sub:response', p)));
    return () => { socket.close(); setConnected(false); };
  }, [user]);

  const dismiss = (id) => setToasts((t) => t.filter((x) => x.id !== id));

  return (
    <LiveCtx.Provider value={{ version, connected }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-50 flex flex-col items-center gap-2 px-3" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} role="status" className={`pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg ${TONE[t.kind] || 'bg-brand'}`}>
            <span className="flex-1">{t.text}</span>
            <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="text-white/80 hover:text-white">✕</button>
          </div>
        ))}
      </div>
    </LiveCtx.Provider>
  );
}
