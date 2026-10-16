import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { useLive } from '../live';
import { applyChanges } from '../lib';
import Shell from '../components/Shell';
import ScheduleView from '../components/ScheduleView';
import ManageClasses from '../components/ManageClasses';
import SubRequests from '../components/SubRequests';
import ChangeNotices from '../components/ChangeNotices';

export default function Teacher() {
  const { version } = useLive();
  const [data, setData] = useState(null);
  const [requests, setRequests] = useState([]);
  const [err, setErr] = useState('');
  const [tab, setTab] = useState('schedule');
  const [tick, setTick] = useState(0); // manual reload after cancel / undo / substitute

  useEffect(() => {
    Promise.all([api('/timetable/teacher/me'), api('/substitutes/mine')])
      .then(([d, r]) => { setData(d); setRequests(r); setErr(''); })
      .catch((e) => setErr(e.message));
  }, [version, tick]);

  const view = useMemo(
    () => (data ? applyChanges(data.week, data.changes || [], undefined, { subs: data.subs || [], me: data.teacherId }) : null),
    [data]
  );
  const waiting = requests.filter((r) => r.direction === 'incoming' && r.status === 'pending').length;
  const reload = () => setTick((t) => t + 1);

  return (
    <Shell title="Teacher">
      {err ? (
        <div role="alert" className="rounded-md bg-alertsoft px-3 py-2 text-sm text-alert">{err}</div>
      ) : data ? (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2">
            {[['schedule', 'My schedule'], ['manage', 'Cancel / Reschedule'], ['requests', 'Requests']].map(([k, label]) => (
              <button key={k} onClick={() => setTab(k)} className={tab === k ? 'btn' : 'btn-quiet'}>
                {label}
                {k === 'requests' && waiting > 0 && <span className="ml-2 rounded-full bg-alert px-1.5 text-xs text-white">{waiting}</span>}
              </button>
            ))}
          </div>
          {tab === 'schedule' && (
            <>
              <ChangeNotices changes={data.changes} subs={(data.subs || []).filter((x) => x.toTeacherId === data.teacherId)} />
              <ScheduleView week={view} showSection />
            </>
          )}
          {tab === 'manage' && <ManageClasses week={data.week} changes={data.changes || []} requests={requests} onChanged={reload} />}
          {tab === 'requests' && <SubRequests requests={requests} onChanged={reload} />}
        </div>
      ) : (
        <p className="text-sm text-ink/60">Schedule is loading…</p>
      )}
    </Shell>
  );
}
