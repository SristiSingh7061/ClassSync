import { useState } from 'react';
import { api } from '../api';
import { PERIOD_TIMES } from '../config';
import { fmtDate } from '../lib';

const when = (r) => `${fmtDate(r.date)}, ${PERIOD_TIMES[r.period]?.[0] || `P${r.period}`}${r.endPeriod !== r.period ? `–P${r.endPeriod}` : ''}`;
const STATUS = { pending: ['Awaiting response', 'bg-ambersoft text-amber'], accepted: ['Accepted', 'bg-brandsoft text-brand'], declined: ['Declined', 'bg-alertsoft text-alert'] };

export default function SubRequests({ requests, onChanged }) {
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState('');
  const incoming = requests.filter((r) => r.direction === 'incoming' && r.status === 'pending');
  const accepted = requests.filter((r) => r.direction === 'incoming' && r.status === 'accepted');
  const outgoing = requests.filter((r) => r.direction === 'outgoing');

  const act = async (groupId, fn) => {
    setErr(''); setBusy(groupId);
    try { await fn(); onChanged(); } catch (e) { setErr(e.message); } finally { setBusy(''); }
  };
  const respond = (groupId, accept) => act(groupId, () => api(`/substitutes/${groupId}/respond`, { method: 'POST', body: { accept } }));
  const withdraw = (groupId) => act(groupId, () => api(`/substitutes/${groupId}`, { method: 'DELETE' }));

  return (
    <div className="space-y-6">
      {err && <p role="alert" className="rounded-md bg-alertsoft px-3 py-2 text-sm text-alert">{err}</p>}

      <section>
        <h3 className="mb-2 font-display text-lg font-bold">Incoming requests ({incoming.length})</h3>
        {incoming.length ? (
          <ul className="space-y-2">
            {incoming.map((r) => (
              <li key={r.groupId} className="panel flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-display font-bold">{r.subject} · Section {r.section}</div>
                  <div className="text-sm text-ink/60">{when(r)} · Covering for {r.fromTeacher}{r.reason ? ` · ${r.reason}` : ''}</div>
                </div>
                <div className="flex gap-2">
                  <button className="btn" disabled={busy === r.groupId} onClick={() => respond(r.groupId, true)}>Accept</button>
                  <button className="btn-quiet" disabled={busy === r.groupId} onClick={() => respond(r.groupId, false)}>Decline</button>
                </div>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-ink/60">No incoming requests.</p>}
      </section>

      {accepted.length > 0 && (
        <section>
          <h3 className="mb-2 font-display text-lg font-bold">Accepted substitute duties</h3>
          <ul className="space-y-2">
            {accepted.map((r) => (
              <li key={r.groupId} className="panel text-sm">
                <span className="font-semibold">{r.subject}</span> · Section {r.section} · {when(r)} · Covering for {r.fromTeacher}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h3 className="mb-2 font-display text-lg font-bold">Requests sent ({outgoing.length})</h3>
        {outgoing.length ? (
          <ul className="space-y-2">
            {outgoing.map((r) => (
              <li key={r.groupId} className="panel flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-display font-bold">{r.subject} · Section {r.section}</div>
                  <div className="text-sm text-ink/60">{when(r)} · {r.toTeacher}{r.reason ? ` · ${r.reason}` : ''}</div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS[r.status][1]}`}>{STATUS[r.status][0]}</span>
                {r.status !== 'declined' && <button className="btn-quiet" disabled={busy === r.groupId} onClick={() => withdraw(r.groupId)}>{r.status === 'accepted' ? 'Remove' : 'Withdraw request'}</button>}
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-ink/60">You haven't requested a substitute.</p>}
      </section>
    </div>
  );
}
