import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import Shell from '../components/Shell';
import WeekGrid from '../components/WeekGrid';
import AnalyticsPanel from '../components/AnalyticsPanel';
import AuditPanel from '../components/AuditPanel';

const TABS = ['Analytics', 'Generate', 'Sections', 'Teachers', 'Rooms', 'Subjects', 'Assign', 'Audit'];

function useList(path) {
  const [rows, setRows] = useState([]);
  const load = useCallback(() => api(path).then(setRows).catch(() => setRows([])), [path]);
  useEffect(() => { load(); }, [load]);
  return [rows, load];
}

function Msg({ msg }) {
  if (!msg) return null;
  return (
    <p role="status" className={`rounded-md px-3 py-2 text-sm ${msg.ok ? 'bg-brandsoft text-brand' : 'bg-alertsoft text-alert'}`}>{msg.text}</p>
  );
}

// Small helper: run an API call and show success / error
function useAction() {
  const [msg, setMsg] = useState(null);
  const run = async (fn, okText) => {
    try { await fn(); setMsg({ ok: true, text: okText }); return true; }
    catch (e) { setMsg({ ok: false, text: e.message }); return false; }
  };
  return [msg, run];
}

function Generate() {
  const [sections] = useList('/sections');
  const [sel, setSel] = useState('');
  const [week, setWeek] = useState(null);
  const [msg, run] = useAction();
  const [busy, setBusy] = useState(false);

  const preview = async (id) => {
    if (!id) return setWeek(null);
    try { setWeek((await api(`/timetable/section/${id}`)).week); } catch { setWeek(null); }
  };

  const generate = async () => {
    setBusy(true);
    await run(async () => {
      const body = sel ? { sectionIds: [Number(sel)] } : {};
      const r = await api('/timetable/generate', { method: 'POST', body });
      if (sel) await preview(sel);
      return r;
    }, 'Routine ban gaya. Neeche preview dekho.');
    setBusy(false);
  };

  return (
    <div className="space-y-4">
      <div className="panel space-y-3">
        <h2 className="font-display text-xl font-bold">Timetable generate karo</h2>
        <p className="text-sm text-ink/70">Pehle teachers, rooms, subjects banao aur Assign tab mein teacher-subject-section jodo. Phir yahan Generate dabao.</p>
        <div className="flex flex-wrap items-center gap-2">
          <select className="field w-auto" value={sel} onChange={(e) => { setSel(e.target.value); preview(e.target.value); }}>
            <option value="">Saare sections</option>
            {sections.map((s) => <option key={s.id} value={s.id}>Section {s.name} (Sem {s.semester})</option>)}
          </select>
          <button className="btn" onClick={generate} disabled={busy}>{busy ? 'Ban raha hai…' : 'Generate'}</button>
        </div>
        <Msg msg={msg} />
      </div>
      {week && <WeekGrid week={week} />}
    </div>
  );
}

function Teachers() {
  const [rows, load] = useList('/teachers');
  const [form, setForm] = useState({ name: '', email: '', password: '', department: '' });
  const [msg, run] = useAction();
  const add = async (e) => {
    e.preventDefault();
    if (await run(() => api('/teachers', { method: 'POST', body: form }), 'Teacher ban gaya.')) {
      setForm({ name: '', email: '', password: '', department: '' }); load();
    }
  };
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <form onSubmit={add} className="panel space-y-3">
        <h2 className="font-display text-xl font-bold">Naya teacher</h2>
        <input className="field" placeholder="Naam" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className="field" type="email" placeholder="Email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input className="field" type="password" placeholder="Password (min 8)" minLength={8} required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <input className="field" placeholder="Department (optional)" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
        <button className="btn w-full">Teacher banao</button>
        <Msg msg={msg} />
      </form>
      <div className="panel">
        <h2 className="mb-3 font-display text-xl font-bold">Teachers ({rows.length})</h2>
        <ul className="divide-y divide-line text-sm">
          {rows.map((t) => (
            <li key={t.id} className="flex justify-between py-2">
              <span className="font-medium">{t.User?.name}</span>
              <span className="text-ink/60">id {t.id} · {t.User?.email}</span>
            </li>
          ))}
          {!rows.length && <li className="py-2 text-ink/60">Abhi koi teacher nahi.</li>}
        </ul>
      </div>
    </div>
  );
}

function Rooms() {
  const [rows, load] = useList('/rooms');
  const [form, setForm] = useState({ name: '', type: 'classroom', capacity: 60 });
  const [msg, run] = useAction();
  const add = async (e) => {
    e.preventDefault();
    if (await run(() => api('/rooms', { method: 'POST', body: { ...form, capacity: Number(form.capacity) } }), 'Room ban gaya.')) {
      setForm({ name: '', type: 'classroom', capacity: 60 }); load();
    }
  };
  const remove = async (id) => { if (await run(() => api(`/rooms/${id}`, { method: 'DELETE' }), 'Room delete ho gaya.')) load(); };
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <form onSubmit={add} className="panel space-y-3">
        <h2 className="font-display text-xl font-bold">Naya room</h2>
        <input className="field" placeholder="Naam (e.g. Room 102)" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <select className="field" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
          <option value="classroom">Classroom</option>
          <option value="lab">Lab</option>
        </select>
        <input className="field" type="number" min="1" placeholder="Capacity" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
        <button className="btn w-full">Room banao</button>
        <Msg msg={msg} />
      </form>
      <div className="panel">
        <h2 className="mb-3 font-display text-xl font-bold">Rooms ({rows.length})</h2>
        <ul className="divide-y divide-line text-sm">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center justify-between py-2">
              <span><span className="font-medium">{r.name}</span> <span className="text-ink/60">· {r.type} · {r.capacity}</span></span>
              <button className="btn-quiet" onClick={() => remove(r.id)}>Delete</button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Subjects() {
  const [rows, load] = useList('/subjects');
  const blank = { name: '', code: '', type: 'theory', weeklyCount: 4, semester: 5 };
  const [form, setForm] = useState(blank);
  const [msg, run] = useAction();
  const add = async (e) => {
    e.preventDefault();
    const body = { ...form, weeklyCount: Number(form.weeklyCount), semester: Number(form.semester) };
    if (await run(() => api('/subjects', { method: 'POST', body }), 'Subject ban gaya.')) { setForm(blank); load(); }
  };
  const remove = async (id) => { if (await run(() => api(`/subjects/${id}`, { method: 'DELETE' }), 'Subject delete ho gaya.')) load(); };
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <form onSubmit={add} className="panel space-y-3">
        <h2 className="font-display text-xl font-bold">Naya subject</h2>
        <input className="field" placeholder="Naam (e.g. Operating Systems)" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className="field" placeholder="Code (e.g. CS502)" required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
        <select className="field" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
          <option value="theory">Theory</option>
          <option value="lab">Lab (2 periods ka block)</option>
        </select>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs font-medium">Periods / week
            <input className="field mt-1" type="number" min="1" max="12" value={form.weeklyCount} onChange={(e) => setForm({ ...form, weeklyCount: e.target.value })} />
          </label>
          <label className="text-xs font-medium">Semester
            <input className="field mt-1" type="number" min="1" max="8" value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} />
          </label>
        </div>
        <button className="btn w-full">Subject banao</button>
        <Msg msg={msg} />
      </form>
      <div className="panel">
        <h2 className="mb-3 font-display text-xl font-bold">Subjects ({rows.length})</h2>
        <ul className="divide-y divide-line text-sm">
          {rows.map((s) => (
            <li key={s.id} className="flex items-center justify-between py-2">
              <span><span className="font-medium">{s.name}</span> <span className="text-ink/60">· {s.code} · {s.type} · {s.weeklyCount}/wk · id {s.id}</span></span>
              <button className="btn-quiet" onClick={() => remove(s.id)}>Delete</button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Sections() {
  const [rows, load] = useList('/sections');
  const [form, setForm] = useState({ name: '', semester: 5 });
  const [msg, run] = useAction();
  const add = async (e) => {
    e.preventDefault();
    if (await run(() => api('/sections', { method: 'POST', body: { name: form.name.trim(), semester: Number(form.semester) } }), 'Section ban gaya.')) {
      setForm({ name: '', semester: form.semester }); load();
    }
  };
  const remove = async (id) => { if (await run(() => api(`/sections/${id}`, { method: 'DELETE' }), 'Section delete ho gaya.')) load(); };
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <form onSubmit={add} className="panel space-y-3">
        <h2 className="font-display text-xl font-bold">Naya section</h2>
        <input className="field" placeholder="Naam (e.g. A)" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <label className="block text-xs font-medium">Semester
          <input className="field mt-1" type="number" min="1" max="8" value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} />
        </label>
        <button className="btn w-full">Section banao</button>
        <Msg msg={msg} />
        <p className="text-xs text-ink/60">Students register karte waqt yahi sections dekhenge.</p>
      </form>
      <div className="panel">
        <h2 className="mb-3 font-display text-xl font-bold">Sections ({rows.length})</h2>
        <ul className="divide-y divide-line text-sm">
          {rows.map((s) => (
            <li key={s.id} className="flex items-center justify-between py-2">
              <span><span className="font-medium">Section {s.name}</span> <span className="text-ink/60">· Sem {s.semester} · id {s.id}</span></span>
              <button className="btn-quiet" onClick={() => remove(s.id)}>Delete</button>
            </li>
          ))}
          {!rows.length && <li className="py-2 text-ink/60">Abhi koi section nahi.</li>}
        </ul>
      </div>
    </div>
  );
}

function Assign() {
  const [teachers] = useList('/teachers');
  const [subjects] = useList('/subjects');
  const [sections] = useList('/sections');
  const [rows, load] = useList('/assignments');
  const [form, setForm] = useState({ teacherId: '', subjectId: '', sectionId: '' });
  const [msg, run] = useAction();
  const add = async (e) => {
    e.preventDefault();
    const body = { teacherId: Number(form.teacherId), subjectId: Number(form.subjectId), sectionId: Number(form.sectionId) };
    if (await run(() => api('/assignments', { method: 'POST', body }), 'Assignment save ho gayi.')) load();
  };
  const remove = async (id) => { if (await run(() => api(`/assignments/${id}`, { method: 'DELETE' }), 'Assignment hat gayi.')) load(); };
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <form onSubmit={add} className="panel space-y-3">
        <h2 className="font-display text-xl font-bold">Kaun kya padhayega</h2>
        <select className="field" required value={form.teacherId} onChange={(e) => setForm({ ...form, teacherId: e.target.value })}>
          <option value="">Teacher chuno…</option>
          {teachers.map((t) => <option key={t.id} value={t.id}>{t.User?.name}</option>)}
        </select>
        <select className="field" required value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })}>
          <option value="">Subject chuno…</option>
          {subjects.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
        </select>
        <select className="field" required value={form.sectionId} onChange={(e) => setForm({ ...form, sectionId: e.target.value })}>
          <option value="">Section chuno…</option>
          {sections.map((s) => <option key={s.id} value={s.id}>Section {s.name} (Sem {s.semester})</option>)}
        </select>
        <button className="btn w-full">Assign karo</button>
        <Msg msg={msg} />
      </form>
      <div className="panel">
        <h2 className="mb-3 font-display text-xl font-bold">Assignments ({rows.length})</h2>
        <ul className="divide-y divide-line text-sm">
          {rows.map((a) => (
            <li key={a.id} className="flex items-center justify-between py-2">
              <span>
                <span className="font-medium">{a.Subject?.name}</span>
                <span className="text-ink/60"> · Section {a.Section?.name} · {a.Teacher?.User?.name}</span>
              </span>
              <button className="btn-quiet" onClick={() => remove(a.id)}>Hatao</button>
            </li>
          ))}
          {!rows.length && <li className="py-2 text-ink/60">Abhi koi assignment nahi.</li>}
        </ul>
      </div>
    </div>
  );
}

export default function Admin() {
  const [tab, setTab] = useState('Analytics');
  const View = { Analytics: AnalyticsPanel, Generate, Sections, Teachers, Rooms, Subjects, Assign, Audit: AuditPanel }[tab];
  return (
    <Shell title="HOD panel" wide>
      <nav className="mb-5 flex gap-2 overflow-x-auto" aria-label="Sections">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={tab === t ? 'btn' : 'btn-quiet'}>{t}</button>
        ))}
      </nav>
      <View />
    </Shell>
  );
}
