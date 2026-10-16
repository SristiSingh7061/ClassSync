import { useEffect, useState } from 'react';
import { api } from '../api';

const TONE = (a) => (a.includes('cancel') || a.includes('decline') ? 'bg-alertsoft text-alert' : a.includes('generate') ? 'bg-brandsoft text-brand' : a.includes('substitute') || a.includes('reschedule') ? 'bg-ambersoft text-amber' : 'bg-line text-ink/70');
const fmtTime = (iso) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const brief = (d) => (d ? Object.entries(d).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join(' · ') : '');

export default function AuditPanel() {
  const [rows, setRows] = useState([]);
  const [more, setMore] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async (before) => {
    setBusy(true);
    try {
      const page = await api(`/audit?limit=30${before ? `&before=${before}` : ''}`);
      setRows((r) => (before ? [...r, ...page] : page));
      setMore(page.length === 30);
      setErr('');
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold">Audit log</h2>
        <button className="btn-quiet" onClick={() => load()} disabled={busy}>Refresh</button>
      </div>
      <p className="text-sm text-ink/60">Who did what and when, all is recorded here.</p>
      {err && <p role="alert" className="rounded-md bg-alertsoft px-3 py-2 text-sm text-alert">{err}</p>}
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.id} className="panel flex flex-wrap items-start gap-3 text-sm">
            <span className="w-28 shrink-0 text-ink/60">{fmtTime(r.at)}</span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${TONE(r.action)}`}>{r.action}</span>
            <span className="font-medium">{r.user}{r.role ? ` (${r.role})` : ''}</span>
            <span className="min-w-0 basis-full break-words text-xs text-ink/60 sm:basis-auto sm:flex-1">{brief(r.details)}</span>
          </li>
        ))}
        {!rows.length && !busy && !err && <li className="text-sm text-ink/60">There are no audit records to display.</li>}
      </ul>
      {more && <button className="btn-quiet w-full" disabled={busy} onClick={() => load(rows[rows.length - 1].id)}>Show more</button>}
    </div>
  );
}
