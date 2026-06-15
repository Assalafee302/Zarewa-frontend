import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, LockKeyhole, Building2, ArrowRight, AlertTriangle } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { ZAREWA_LOGO_SRC } from '../../Data/companyQuotation';
import { resolvePostLoginPath } from '../../lib/departmentWorkspace';
import PasswordField from './PasswordField';

export default function LoginScreen() {
  const navigate = useNavigate();
  const ws = useWorkspace();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!ws?.sessionMessage) return undefined;
    const message = ws.sessionMessage;
    setError(message);
    ws.clearSessionMessage?.();
    const t = window.setTimeout(() => {
      setError((current) => (current === message ? '' : current));
    }, 6000);
    return () => window.clearTimeout(t);
  }, [ws?.sessionMessage, ws?.clearSessionMessage]);

  const submitLogin = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const fd = new FormData(e.currentTarget);
      const user = String(fd.get('username') ?? username).trim();
      const pass = String(fd.get('password') ?? password);
      const r = await ws.login(user, pass);
      if (!r.ok) {
        setError(r.error || 'Could not sign in.');
      } else {
        const perms = Array.isArray(r.data?.permissions) ? r.data.permissions : [];
        navigate(resolvePostLoginPath(r.data?.user, perms), { replace: true });
      }
    } catch (err) {
      setError(String(err?.message || err || 'Could not sign in.'));
    }
    setBusy(false);
  };

  return (
    <div className="min-h-[100dvh] w-full min-w-0 max-w-full z-app-bg px-[max(1rem,env(safe-area-inset-left))] pt-[max(1rem,env(safe-area-inset-top))] pr-[max(1rem,env(safe-area-inset-right))] pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6 sm:pt-8 sm:pb-8 lg:px-10">
      <div className="mx-auto grid min-h-0 min-w-0 max-w-6xl grid-cols-1 gap-6 lg:min-h-[calc(100vh-4rem)] lg:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-[28px] border border-white/70 bg-white/80 p-5 shadow-[0_24px_80px_-32px_rgba(15,23,42,0.35)] backdrop-blur-xl sm:rounded-[32px] sm:p-10">
          <img
            src={ZAREWA_LOGO_SRC}
            alt="Zarewa Aluminium and Plastics"
            className="h-14 w-auto max-w-[220px] object-contain object-left sm:h-[4.25rem]"
            width={220}
            height={68}
          />
          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-teal-200/70 bg-teal-50/80 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-[#134e4a]">
            <ShieldCheck size={14} />
            Production-safe workspace
          </div>
          <h1 className="mt-6 text-2xl font-black tracking-tight text-[#134e4a] sm:text-5xl">
            Zarewa operating system
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base sm:leading-7">
            Sign in to continue with live treasury controls, approval workflows, audit visibility, and the
            unified production dashboard.
          </p>

          <div className="mt-8 overflow-hidden rounded-[28px] border border-slate-200/80 bg-slate-950 text-white shadow-xl">
            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1720036237561-2049a547752e?auto=format&fit=crop&w=1600&q=80"
                alt="Industrial metal sheet production line with forming machinery"
                className="h-[260px] w-full object-cover sm:h-[300px]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/30 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-7">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-400/15 text-teal-300">
                    <Building2 size={22} />
                  </div>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/45">
                      Production visibility
                    </p>
                    <p className="mt-1 text-sm font-semibold text-white/90">
                      Secure login for real-time treasury controls and end-to-end production workflows.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200/80 bg-white/92 p-5 shadow-[0_24px_80px_-32px_rgba(15,23,42,0.3)] backdrop-blur-xl sm:rounded-[32px] sm:p-10">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#134e4a] text-[#8ef0dc] shadow-lg shadow-teal-950/20">
              <LockKeyhole size={22} />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Secure sign in</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-[#134e4a]">Open your workspace</h2>
            </div>
          </div>

          <form className="mt-8 space-y-5" onSubmit={submitLogin}>
            <div>
              <label className="z-field-label" htmlFor="login-username">
                Username
              </label>
              <input
                id="login-username"
                name="username"
                autoComplete="username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (error) setError('');
                }}
                className="z-input"
                placeholder="Enter your username"
              />
            </div>
            <PasswordField
              id="login-password"
              name="password"
              label="Password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError('');
              }}
              placeholder="Enter your password"
              disabled={busy}
            />

            {error ? (
              <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}

            {ws.status === 'offline' ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                API server is offline. Start the backend to sign in to the live database.
              </div>
            ) : null}

            <button
              type="submit"
              disabled={busy}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#134e4a] px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-teal-950/15 transition hover:brightness-105 disabled:cursor-wait disabled:opacity-70"
            >
              {busy ? 'Signing in…' : 'Enter workspace'}
              <ArrowRight size={17} />
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
