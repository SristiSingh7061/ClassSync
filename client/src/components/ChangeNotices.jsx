import { PERIOD_TIMES } from '../config';
import { fmtDate, ymd } from '../lib';

// Upcoming cancellations, rescheduled classes, and substitutes
export default function ChangeNotices({ changes = [], subs = [] }) {
  const today = ymd(new Date());
  const items = [
    ...changes
      .filter((c) => c.date >= today || (c.type === 'reschedule' && c.toDate >= today))
      .map((c) => ({
        key: `c${c.id}`, date: c.date, kind: c.type === 'cancel' ? 'Cancelled' : 'Shifted', tone: c.type === 'cancel' ? 'bg-alertsoft text-alert' : 'bg-ambersoft text-amber',
        subject: c.subject, period: c.period, reason: c.reason,
        extra: c.type === 'reschedule' ? ` → ${fmtDate(c.toDate)}, ${PERIOD_TIMES[c.toPeriod]?.[0] || `P${c.toPeriod}`}` : '',
      })),
    ...subs
      .filter((x) => x.date >= today)
      .map((x) => ({ key: `s${x.id}`, date: x.date, kind: 'Substitute', tone: 'bg-ambersoft text-amber', subject: x.subject, period: x.period, reason: x.reason, extra: ` — ${x.toTeacher} Instead of (${x.fromTeacher} as the teacher name)` })),
  ].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6);
  if (!items.length) return null;
  return (
    <section className="panel space-y-2" aria-label="Class change">
      <h2 className="font-display text-lg font-bold">Class change</h2>
      <ul className="space-y-2 text-sm">
        {items.map((c) => (
          <li key={c.key} className="flex items-start gap-2">
            <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${c.tone}`}>{c.kind}</span>
            <span>
              <span className="font-semibold">{c.subject}</span> · {fmtDate(c.date)}, P{c.period}{c.extra}
              {c.reason && <span className="text-ink/60"> — {c.reason}</span>}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
