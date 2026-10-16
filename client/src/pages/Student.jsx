import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../auth';
import { useLive } from '../live';
import { applyChanges } from '../lib';
import Shell from '../components/Shell';
import ScheduleView from '../components/ScheduleView';
import ChangeNotices from '../components/ChangeNotices';

export default function Student() {
  const { user } = useAuth();
  const { version } = useLive();
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!user.SectionId) return;
    api(`/timetable/section/${user.SectionId}`).then((d) => { setData(d); setErr(''); }).catch((e) => setErr(e.message));
  }, [user.SectionId, version]);

  const view = useMemo(() => (data ? applyChanges(data.week, data.changes || [], undefined, { subs: data.subs || [] }) : null), [data]);

  return (
    <Shell title="Student">
      {!user.SectionId ? (
        <div className="panel text-sm">Your section isn't set. Tell the HOD to assign your section.</div>
      ) : err ? (
        <div role="alert" className="rounded-md bg-alertsoft px-3 py-2 text-sm text-alert">{err}</div>
      ) : view ? (
        <div className="space-y-5">
          <ChangeNotices changes={data.changes} subs={data.subs} />
          <ScheduleView week={view} />
        </div>
        
      ) : (
        <p className="text-sm text-ink/60">The routine is loading…</p>
      )}
    </Shell>
  );
}
