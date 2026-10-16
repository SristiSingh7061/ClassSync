import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { homeFor, useAuth } from '../auth';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [slow, setSlow] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setBusy(true);
    const timer = setTimeout(() => setSlow(true), 4000); // free hosting sleeps when idle
    try {
      const u = await login(form.email.trim(), form.password);
      nav(homeFor(u.role), { replace: true });
    } catch (e2) { setErr(e2.message); } finally { clearTimeout(timer); setSlow(false); setBusy(false); }
  };

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-brand">ClassSync</h1>
        <p className="mb-6 mt-1 text-sm text-ink/70">Replace WhatsApp PDFs with a live timetable. Get notified as soon as a class is cancelled.</p>
        <form onSubmit={submit} className="panel space-y-3">
          <label className="block text-sm font-medium">Email
            <input className="field mt-1" type="email" required autoComplete="username" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </label>
          <label className="block text-sm font-medium">Password
            <input className="field mt-1" type="password" required autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </label>
          {err && <p role="alert" className="rounded-md bg-alertsoft px-3 py-2 text-sm text-alert">{err}</p>}
          <button className="btn w-full" disabled={busy}>{busy ? 'Logging in…' : 'Login'}</button>
          {busy && slow && <p role="status" className="text-xs text-ink/60">The server is starting (free hosting). The first request may take 30–50 seconds. Please wait…</p>}
        </form>
        <p className="mt-4 text-center text-sm text-ink/70">Are you a student? <Link className="font-semibold text-brand" to="/register">Create an account</Link></p>
      </div>
    </div>
  );
}
