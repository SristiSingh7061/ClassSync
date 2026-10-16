import { useEffect, useState } from 'react';
import { api } from '../api';
import { DAYS, PERIODS } from '../config';

const Stat = ({ label, value, tone = '' }) => (
  <div className="panel">
    <div className={`font-display text-3xl font-extrabold ${tone}`}>{value}</div>
    <div className="text-sm text-ink/60">{label}</div>
  </div>
);

const Bar = ({ label, sub, percent, tone = 'bg-brand' }) => (
  <li>
    <div className="flex justify-between text-sm"><span className="font-medium">{label}</span><span className="text-ink/60">{sub}</span></div>
    <div className="mt-1 h-2 rounded-full bg-line" role="img" aria-label={`${label}: ${sub}`}>
      <div className={`h-2 rounded-full ${tone}`} style={{ width: `${Math.min(100, percent)}%` }} />
    </div>
  </li>
);

export default function AnalyticsPanel() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { api('/analytics').then(setD).catch((e) => setErr(e.message)); }, []);

  if (err) return <p role="alert" className="rounded-md bg-alertsoft px-3 py-2 text-sm text-alert">{err}</p>;
  if (!d) return <p className="text-sm text-ink/60">Analytics loading…</p>;
  const maxLoad = Math.max(1, ...d.teachers.map((t) => t.weeklyLoad));

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Teachers" value={d.totals.teachers} />
        <Stat label="Students" value={d.totals.students} />
        <Stat label="Sections" value={d.totals.sections} />
        <Stat label="Weekly classes" value={d.totals.weeklyClasses} />
      </section>

      <section>
        <h2 className="mb-2 font-display text-lg font-bold">Last 30 days</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Cancelled" value={d.last30.cancelled} tone="text-alert" />
          <Stat label="Shifted" value={d.last30.rescheduled} tone="text-amber" />
          <Stat label="Substitutes" value={d.last30.substituted} tone="text-brand" />
          <Stat label="Request pending" value={d.last30.substitutePending} />
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="panel">
          <h2 className="mb-3 font-display text-lg font-bold">Room use (Of the week)</h2>
          <ul className="space-y-3">
            {d.rooms.map((r) => <Bar key={r.name} label={`${r.name} (${r.type})`} sub={`${r.used}/${r.capacity} periods · ${r.percent}%`} percent={r.percent} />)}
            {!d.rooms.length && <li className="text-sm text-ink/60">There are no rooms right now.</li>}
          </ul>
        </section>
        <section className="panel">
          <h2 className="mb-3 font-display text-lg font-bold">Teacher load</h2>
          <ul className="space-y-3">
            {d.teachers.map((t) => (
              <Bar key={t.name} label={t.name} sub={`${t.weeklyLoad} periods · ${t.cancels} cancel · ${t.subsTaken} substitute`} percent={(t.weeklyLoad / maxLoad) * 100} tone="bg-amber" />
            ))}
            {!d.teachers.length && <li className="text-sm text-ink/60">There are no teachers.</li>}
          </ul>
        </section>
      </div>

      <section className="panel">
        <h2 className="mb-1 font-display text-lg font-bold">Which period is busiest</h2>
        <p className="mb-3 text-sm text-ink/60">Darker shade = more classes at that time.</p>
        <div className="overflow-x-auto">
          <table className="border-separate border-spacing-1 text-xs">
            <thead>
              <tr><th />{PERIODS.map((p) => <th key={p} className="px-2 font-medium text-ink/60">P{p}</th>)}</tr>
            </thead>
            <tbody>
              {Object.entries(DAYS).map(([n, label], i) => (
                <tr key={n}>
                  <th className="pr-2 text-left font-medium text-ink/60">{label}</th>
                  {d.heat.rows[i].map((v, j) => (
                    <td key={j} className="h-9 w-12 rounded-md text-center font-semibold" style={{ background: `rgba(51,71,176,${0.08 + 0.85 * (v / d.heat.max)})`, color: v / d.heat.max > 0.5 ? '#fff' : '#16213E' }} title={`${label} P${j + 1}: ${v} classes`}>{v}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
