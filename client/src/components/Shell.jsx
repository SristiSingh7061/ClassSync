import { useAuth } from '../auth';
import { useLive } from '../live';

export default function Shell({ title, children, wide }) {
  const { user, logout } = useAuth();
  const { connected } = useLive();
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-line bg-paper/90 backdrop-blur">
        <div className={`mx-auto flex items-center justify-between px-4 py-3 ${wide ? 'max-w-6xl' : 'max-w-3xl'}`}>
          <div className="flex items-baseline gap-3">
            <span className="font-display text-xl font-extrabold tracking-tight text-brand">ClassSync</span>
            <span className="hidden text-sm text-ink/60 sm:inline">{title}</span>
          </div>
          <div className="flex items-center gap-3">
            <span title={connected ? 'Live alerts are on' : 'Live alerts are off (reconnecting)'} className="flex items-center gap-1.5 text-xs text-ink/60">
              <span className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-line'}`} />
              <span className="hidden sm:inline">{connected ? 'Live' : 'Offline'}</span>
            </span>
            <span className="text-sm font-medium">{user?.name}</span>
            <button onClick={logout} className="btn-quiet">Logout</button>
          </div>
        </div>
      </header>
      <main className={`mx-auto px-4 py-6 ${wide ? 'max-w-6xl' : 'max-w-3xl'}`}>{children}</main>
    </div>
  );
}
