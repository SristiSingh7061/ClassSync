import { useState } from 'react';
import { DAYS } from '../config';
import { mergeBlocks, nowNext, todayIndex } from '../lib';
import WeekGrid from './WeekGrid';

const BADGE = {
  cancelled: ['Cancelled', 'bg-alertsoft text-alert'],
  rescheduled: ['Shifted', 'bg-ambersoft text-amber'],
  substituted: ['Substitute', 'bg-ambersoft text-amber'],
  moved: ['Moved', 'bg-line text-ink/60'],
};

function Hero({ focus, today, showSection }) {
  if (!today) return <div className="panel text-sm text-ink/70">Today is Sunday, so there are no classes.</div>;
  if (!focus) return <div className="panel text-sm text-ink/70">All classes for today are completed. See you tomorrow!</div>;
  const { kind, block: b } = focus;
  const cancelled = b.status === 'cancelled';
  const shifted = b.status === 'rescheduled';
  return (
    <div className={`rounded-2xl p-5 text-white ${cancelled ? 'bg-alert' : shifted ? 'bg-amber' : 'bg-brand'}`}>
      <p className="text-sm opacity-80">{kind === 'now' ? 'Class in progress' : 'Next class'}</p>
      <h2 className={`mt-1 font-display text-3xl font-extrabold leading-tight ${cancelled ? 'line-through' : ''}`}>{b.subject}</h2>
      <p className="mt-3 text-lg font-semibold">{b.start} – {b.end}</p>
      <p className="text-sm opacity-90">
        {b.room}{b.teacher ? ` · ${b.teacher}` : ''}{showSection && b.section ? ` · Section ${b.section}` : ''}
      </p>
      {cancelled && <p className="mt-2 text-sm font-semibold">This class has been cancelled.{b.reason ? ` Reason: ${b.reason}` : ''}</p>}
      {shifted && <p className="mt-2 text-sm font-semibold">This class has been shifted.{b.reason ? ` Reason: ${b.reason}` : ''}</p>}
    </div>
  );
}

function Row({ b, showSection }) {
  const tone = b.status === 'cancelled' ? 'border-alert' : b.status === 'rescheduled' || b.status === 'substituted' ? 'border-amber' : b.status === 'moved' ? 'border-line' : 'border-brand';
  const badge = BADGE[b.status];
  const struck = b.status === 'cancelled' || b.status === 'moved';
  return (
    <li className={`panel flex items-center gap-4 border-l-4 ${tone}`}>
      <div className="w-24 shrink-0 text-sm">
        <div className="font-semibold">{b.start}</div>
        <div className="text-ink/50">{b.end}</div>
      </div>
      <div className="min-w-0 flex-1">
        <div className={`truncate font-display text-lg font-bold ${struck ? 'line-through' : ''} ${b.status === 'cancelled' ? 'text-alert' : ''}`}>{b.subject}</div>
        <div className="truncate text-sm text-ink/60">
          {b.room}{b.teacher ? ` · ${b.teacher}` : ''}{showSection && b.section ? ` · Section ${b.section}` : ''}
        </div>
        {b.status === 'moved' && b.note && <div className="text-xs text-ink/60">Shifted: {b.note}</div>}
        {b.reason && b.status !== 'moved' && <div className="text-xs text-ink/60">Reason: {b.reason}</div>}
      </div>
      {badge && <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badge[1]}`}>{badge[0]}</span>}
    </li>
  );
}

export default function ScheduleView({ week, showSection }) {
  const [tab, setTab] = useState('today');
  const today = todayIndex();
  const blocks = today ? mergeBlocks(week?.[today] || []) : [];
  const empty = !week || Object.keys(week).length === 0;

  return (
    <div className="space-y-5">
      <Hero focus={nowNext(blocks.filter((b) => b.status !== 'moved'))} today={today} showSection={showSection} />
      <div className="flex gap-2">
        {[['today', 'Today'], ['week', 'The whole week']].map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} className={tab === k ? 'btn' : 'btn-quiet'}>{label}</button>
        ))}
      </div>
      {empty ? (
        <div className="panel text-sm text-ink/70">The routine hasn't been generated yet. Tell the HOD to run 'Generate'.</div>
      ) : tab === 'today' ? (
        blocks.length ? (
          <>
            <h3 className="font-display text-lg font-bold">{DAYS[today]} classes</h3>
            <ul className="space-y-3">{blocks.map((b) => <Row key={`${b.startPeriod}-${b.id}`} b={b} showSection={showSection} />)}</ul>
          </>
        ) : (
          <div className="panel text-sm text-ink/70">There are no classes scheduled for today.</div>
        )
      ) : (
        <WeekGrid week={week} showSection={showSection} />
      )}
    </div>
  );
}
