import { DAYS, PERIODS, PERIOD_TIMES } from '../config';
import { todayIndex } from '../lib';

const TONE = {
  cancelled: 'bg-alertsoft text-alert',
  moved: 'bg-line/60 text-ink/50',
  covered: 'bg-line/60 text-ink/50',
  rescheduled: 'bg-ambersoft text-amber',
  substituted: 'bg-ambersoft text-amber',
};
const TAG = { cancelled: 'Cancelled', moved: 'Moved', covered: 'Covered', rescheduled: 'Shifted', substituted: 'Substitute' };

export default function WeekGrid({ week = {}, showSection }) {
  const today = todayIndex();
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-white">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr>
            <th className="w-20 p-2 text-left text-xs font-medium text-ink/50">Period</th>
            {Object.entries(DAYS).map(([n, label]) => (
              <th key={n} className={`p-2 text-left font-display text-sm ${Number(n) === today ? 'text-brand' : ''}`}>
                {label}{Number(n) === today && <span className="ml-1 text-xs font-normal">(today)</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PERIODS.map((p) => (
            <tr key={p} className="border-t border-line align-top">
              <td className="p-2 text-xs text-ink/60">
                <div className="font-semibold text-ink">P{p}</div>
                {PERIOD_TIMES[p]?.[0]}
              </td>
              {Object.keys(DAYS).map((d) => {
                const items = (week[d] || []).filter((x) => x.period === p);
                return (
                  <td key={d} className="space-y-1 p-1">
                    {items.length ? items.map((s) => (
                      <div key={s.id} className={`rounded-md px-2 py-1.5 ${TONE[s.status] || 'bg-brandsoft text-brand'}`}>
                        <div className={`font-semibold leading-tight ${s.status === 'cancelled' || s.status === 'moved' || s.status === 'covered' ? 'line-through' : ''}`}>{s.subject}</div>
                        <div className="text-xs opacity-80">{s.room}{showSection && s.section ? ` · ${s.section}` : ''}</div>
                        {TAG[s.status] && <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide">{TAG[s.status]}</div>}
                      </div>
                    )) : <div className="h-9" />}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
