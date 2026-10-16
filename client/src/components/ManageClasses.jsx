import { useEffect, useState } from 'react';
import { api } from '../api';
import { DAYS, PERIODS, PERIOD_TIMES } from '../config';
import { fmtDate, mergeBlocks, weekDates, ymd } from '../lib';

function Modal({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-40 grid place-items-end bg-ink/40 p-0 sm:place-items-center sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-t-2xl bg-white p-5 sm:rounded-2xl">
        <h3 className="mb-3 font-display text-xl font-bold">{title}</h3>
        {children}
      </div>
    </div>
  );
}

function ActionForm({ mode, block, date, onDone, onClose }) {
  const [reason, setReason] = useState('');
  const [toDate, setToDate] = useState(date);
  const [toPeriod, setToPeriod] = useState(block.startPeriod);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      if (mode === 'cancel') await api(`/slots/${block.id}/cancel`, { method: 'POST', body: { date, reason: reason.trim() } });
      else await api(`/slots/${block.id}/reschedule`, { method: 'POST', body: { date, toDate, toPeriod: Number(toPeriod), reason: reason.trim() } });
      onDone();
    } catch (e2) { setErr(e2.message); } finally { setBusy(false); }
  };

  return (
    <Modal title={mode === 'cancel' ? 'Cancel class' : 'Reschedule class'} onClose={onClose}>
      <p className="mb-3 text-sm text-ink/70">
        <b>{block.subject}</b> · {fmtDate(date)} · {block.start}–{block.end}{block.section ? ` · Section ${block.section}` : ''}
      </p>
      <form onSubmit={submit} className="space-y-3">
        {mode === 'reschedule' && (
          <div className="grid grid-cols-2 gap-2">
            <label className="text-sm font-medium">New date
              <input className="field mt-1" type="date" required min={ymd(new Date())} value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </label>
            <label className="text-sm font-medium">New period
              <select className="field mt-1" value={toPeriod} onChange={(e) => setToPeriod(e.target.value)}>
                {PERIODS.map((p) => <option key={p} value={p}>P{p} ({PERIOD_TIMES[p][0]})</option>)}
              </select>
            </label>
          </div>
        )}
        <label className="block text-sm font-medium">Reason (Visible to students)
          <textarea className="field mt-1" rows={2} maxLength={200} placeholder="e.g. I have a meeting / I am not feeling well" value={reason} onChange={(e) => setReason(e.target.value)} />
        </label>
        {err && <p role="alert" className="rounded-md bg-alertsoft px-3 py-2 text-sm text-alert">{err}</p>}
        <div className="flex gap-2">
          <button className="btn flex-1" disabled={busy}>{busy ? 'Loading…' : mode === 'cancel' ? 'Cancel' : 'Shift'}</button>
          <button type="button" className="btn-quiet" onClick={onClose}>Back</button>
        </div>
        <p className="text-xs text-ink/60">Students will receive an immediate live alert and email.</p>
      </form>
    </Modal>
  );
}

function SubstituteForm({ block, date, onDone, onClose }) {
  const [free, setFree] = useState(null);
  const [toTeacherId, setToTeacherId] = useState('');
  const [reason, setReason] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api(`/slots/${block.id}/free-teachers?date=${date}`).then(setFree).catch((e) => { setErr(e.message); setFree([]); });
  }, [block.id, date]);

  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      await api(`/slots/${block.id}/substitute`, { method: 'POST', body: { date, toTeacherId: Number(toTeacherId), reason: reason.trim() } });
      onDone();
    } catch (e2) { setErr(e2.message); } finally { setBusy(false); }
  };

  return (
    <Modal title="Choose Substitute teacher " onClose={onClose}>
      <p className="mb-3 text-sm text-ink/70">
        <b>{block.subject}</b> · {fmtDate(date)} · {block.start}–{block.end}{block.section ? ` · Section ${block.section}` : ''}
      </p>
      <form onSubmit={submit} className="space-y-3">
        <fieldset>
          <legend className="mb-1 text-sm font-medium">The teacher who is free at that time</legend>
          {free === null ? <p className="text-sm text-ink/60">we are looking for a teacher who is free at that time…</p>
            : free.length === 0 ? <p className="text-sm text-ink/60">No teacher is free at that time.</p>
            : (
              <ul className="max-h-48 space-y-1 overflow-y-auto">
                {free.map((t) => (
                  <li key={t.id}>
                    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm has-[:checked]:border-brand has-[:checked]:bg-brandsoft">
                      <input type="radio" name="sub" required value={t.id} checked={String(toTeacherId) === String(t.id)} onChange={() => setToTeacherId(t.id)} />
                      {t.name}
                    </label>
                  </li>
                ))}
              </ul>
            )}
        </fieldset>
        <label className="block text-sm font-medium">Reason (optional)
          <textarea className="field mt-1" rows={2} maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)} />
        </label>
        {err && <p role="alert" className="rounded-md bg-alertsoft px-3 py-2 text-sm text-alert">{err}</p>}
        <div className="flex gap-2">
          <button className="btn flex-1" disabled={busy || !toTeacherId}>{busy ? 'Sending…' : 'Request'}</button>
          <button type="button" className="btn-quiet" onClick={onClose}>Back</button>
        </div>
        <p className="text-xs text-ink/60">Students will be notified when the teacher accepts the request.</p>
      </form>
    </Modal>
  );
}

export default function ManageClasses({ week, changes, requests = [], onChanged }) {
  const dates = weekDates();
  const todayStr = ymd(new Date());
  const [dialog, setDialog] = useState(null);
  const [err, setErr] = useState('');
  const byKey = {};
  changes.forEach((c) => { byKey[`${c.slotId}|${c.date}`] = c; });
  const reqKey = {};  // my substitute requests (pending / accepted) per class + date
  requests.filter((r) => r.direction === 'outgoing' && (r.status === 'pending' || r.status === 'accepted')).forEach((r) => r.slotIds.forEach((id) => { reqKey[`${id}|${r.date}`] = r; }));

  const undo = async (id) => {
    setErr('');
    try { await api(`/changes/${id}`, { method: 'DELETE' }); onChanged(); } catch (e) { setErr(e.message); }
  };
  const withdraw = async (groupId) => {
    setErr('');
    try { await api(`/substitutes/${groupId}`, { method: 'DELETE' }); onChanged(); } catch (e) { setErr(e.message); }
  };
  const done = () => { setDialog(null); onChanged(); };

  return (
    <div className="space-y-5">
      <p className="text-sm text-ink/70">Cancel, reschedule, or assign someone else for your classes this week from here. Students will get an alert immediately.</p>
      {err && <p role="alert" className="rounded-md bg-alertsoft px-3 py-2 text-sm text-alert">{err}</p>}
      {Object.entries(DAYS).map(([d, label]) => {
        const date = dates[d];
        const blocks = mergeBlocks(week?.[d] || []);
        if (!blocks.length) return null;
        const past = date < todayStr;
        return (
          <section key={d}>
            <h3 className="mb-2 font-display text-lg font-bold">{label} · {fmtDate(date)}{date === todayStr && <span className="ml-2 text-sm font-normal text-brand">Today</span>}</h3>
            <ul className="space-y-2">
              {blocks.map((b) => {
                const c = byKey[`${b.id}|${date}`];
                const r = reqKey[`${b.id}|${date}`];
                return (
                  <li key={b.id} className="panel flex flex-wrap items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className={`font-display font-bold ${c || r?.status === 'accepted' ? 'text-ink/50 line-through' : ''}`}>{b.subject}{b.type === 'lab' && <span className="ml-2 text-xs font-medium text-ink/60">(Lab)</span>}</div>
                      <div className="text-sm text-ink/60">{b.start}–{b.end} · {b.room}{b.section ? ` · Section ${b.section}` : ''}</div>
                      {c && (
                        <div className="mt-1 text-xs font-semibold text-alert">
                          {c.type === 'cancel' ? 'Cancelled' : `Rescheduled: ${fmtDate(c.toDate)}, P${c.toPeriod}`}{c.reason ? ` — ${c.reason}` : ''}
                        </div>
                      )}
                      {r && (
                        <div className="mt-1 text-xs font-semibold text-amber">
                          {r.status === 'pending' ? `Substitute request send to: ${r.toTeacher} response pending` : `Substitute: ${r.toTeacher} will take`}
                        </div>
                      )}
                    </div>
                    {past ? (
                      <span className="text-xs text-ink/50">Has been completed</span>
                    ) : c ? (
                      <button className="btn-quiet" onClick={() => undo(c.id)}>Undo</button>
                    ) : r ? (
                      <button className="btn-quiet" onClick={() => withdraw(r.groupId)}>{r.status === 'pending' ? 'Withdraw Request' : 'Remove Substitute'}</button>
                    ) : (
                      <div className="flex gap-2">
                        <button className="btn-quiet" onClick={() => setDialog({ mode: 'cancel', block: b, date })}>Cancel</button>
                        {b.type !== 'lab' && <button className="btn-quiet" onClick={() => setDialog({ mode: 'reschedule', block: b, date })}>Reschedule</button>}
                        <button className="btn-quiet" onClick={() => setDialog({ mode: 'substitute', block: b, date })}>Substitute</button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      {dialog && (dialog.mode === 'substitute'
        ? <SubstituteForm {...dialog} onDone={done} onClose={() => setDialog(null)} />
        : <ActionForm {...dialog} onDone={done} onClose={() => setDialog(null)} />)}
    </div>
  );
}
