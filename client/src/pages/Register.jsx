import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { homeFor, useAuth } from '../auth';

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [sections, setSections] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', password: '', sectionId: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { api('/public/sections').then(setSections).catch(() => {}); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      const u = await register({ ...form, email: form.email.trim(), sectionId: form.sectionId ? Number(form.sectionId) : null });
      nav(homeFor(u.role), { replace: true });
    } catch (e2) { setErr(e2.message); } finally { setBusy(false); }
  };

  return (
    <div className="grid min-h-screen place-items-center px-4 py-8">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-3xl font-extrabold text-brand">Student account</h1>
        <p className="mb-6 mt-1 text-sm text-ink/70">The teacher's account is made HOD.</p>
        <form onSubmit={submit} className="panel space-y-3">
          <label className="block text-sm font-medium">Name
            <input className="field mt-1" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label className="block text-sm font-medium">Email
            <input className="field mt-1" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </label>
          <label className="block text-sm font-medium">Password (Atleast 8 characters)
            <input className="field mt-1" type="password" minLength={8} required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </label>
          <label className="block text-sm font-medium">Section
            <select className="field mt-1" required value={form.sectionId} onChange={(e) => setForm({ ...form, sectionId: e.target.value })}>
              <option value="">SELECT…</option>
              {sections.map((s) => <option key={s.id} value={s.id}>Section {s.name} (Sem {s.semester})</option>)}
            </select>
          </label>
          {err && <p role="alert" className="rounded-md bg-alertsoft px-3 py-2 text-sm text-alert">{err}</p>}
          <button className="btn w-full" disabled={busy}>{busy ? 'Creating account…' : 'Create Account'}</button>
        </form>
        <p className="mt-4 text-center text-sm text-ink/70">Do you already have an account? <Link className="font-semibold text-brand" to="/login">Login</Link></p>
      </div>
    </div>
  );
}
