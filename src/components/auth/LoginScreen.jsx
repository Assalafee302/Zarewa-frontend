import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, LockKeyhole, Building2, ArrowRight, AlertTriangle, KeyRound } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { ZAREWA_LOGO_SRC } from '../../Data/companyQuotation';
import { resolvePostLoginPath } from '../../lib/departmentWorkspace';
import PasswordField from './PasswordField';

export default function LoginScreen() {
  const navigate = useNavigate();
  const ws = useWorkspace();
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const sessionMessage = ws?.sessionMessage;
  const clearSessionMessage = ws?.clearSessionMessage;

  useEffect(() => {
    if (!sessionMessage) return undefined;
    const message = sessionMessage;
    setError(message);
    clearSessionMessage?.();
    const t = window.setTimeout(() => {
      setError((current) => (current === message ? '' : current));
    }, 6000);
    return () => window.clearTimeout(t);
  }, [sessionMessage, clearSessionMessage]);

  const switchMode = (next) => {
    setMode(next);
    setError('');
    setInfo('');
  };

  const submitLogin = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setInfo('');
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

  const submitForgot = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setInfo('');
    try {
      const identifier = String(resetIdentifier || username).trim();
      if (!identifier) {
        setError('Enter your username or email.');
        setBusy(false);
        return;
      }
      const r = await ws.forgotPassword(identifier);
      if (!r.ok) {
        setError(r.error || 'Could not request a reset code.');
      } else {
        setInfo(
          r.data?.message ||
            'If a matching new-user account exists, your administrator can provide a single-use reset code.'
        );
        setResetIdentifier(identifier);
        setMode('reset');
      }
    } catch (err) {
      setError(String(err?.message || err || 'Could not request a reset code.'));
    }
    setBusy(false);
  };

  const submitReset = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setInfo('');
    try {
      const identifier = String(resetIdentifier || username).trim();
      const token = String(resetToken).trim();
      if (!identifier || !token) {
        setError('Username or email and reset code are required.');
        setBusy(false);
        return;
      }
      if (resetPassword !== resetPasswordConfirm) {
        setError('New passwords do not match.');
        setBusy(false);
        return;
      }
      const r = await ws.resetPassword(identifier, token, resetPassword);
      if (!r.ok) {
        setError(r.error || 'Could not reset password.');
      } else {
        setInfo(r.data?.message || 'Password updated. Sign in with your new password.');
        setPassword('');
        setResetToken('');
        setResetPassword('');
        setResetPasswordConfirm('');
        setUsername(identifier);
        setMode('login');
      }
    } catch (err) {
      setError(String(err?.message || err || 'Could not reset password.'));
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
          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-teal-200/70 bg-teal-50/80 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-zarewa-teal">
            <ShieldCheck size={14} />
            Production-safe workspace
          </div>
          <h1 className="mt-6 text-2xl font-black tracking-tight text-zarewa-teal sm:text-5xl">
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
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
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
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zarewa-teal text-[#8ef0dc] shadow-lg shadow-teal-950/20">
              {mode === 'login' ? <LockKeyhole size={22} /> : <KeyRound size={22} />}
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                {mode === 'login' ? 'Secure sign in' : mode === 'forgot' ? 'Reset request' : 'New user setup'}
              </p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-zarewa-teal">
                {mode === 'login'
                  ? 'Open your workspace'
                  : mode === 'forgot'
                    ? 'Request a reset code'
                    : 'Set your password'}
              </h2>
            </div>
          </div>

          {mode === 'login' ? (
            <form className="mt-8 space-y-5" onSubmit={submitLogin}>
              <div>
                <label className="z-field-label" htmlFor="login-username">
                  Username or employee ID
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
                  placeholder="Username or employee ID (e.g. zapkd001)"
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

              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <button
                  type="button"
                  className="font-semibold text-zarewa-teal underline-offset-2 hover:underline"
                  onClick={() => switchMode('forgot')}
                >
                  Forgot password?
                </button>
                <button
                  type="button"
                  className="font-semibold text-slate-600 underline-offset-2 hover:underline"
                  onClick={() => switchMode('reset')}
                >
                  New user setup
                </button>
              </div>

              {error ? (
                <div
                  role="alert"
                  className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900"
                >
                  <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden />
                  <span>{error}</span>
                </div>
              ) : null}

              {info ? (
                <div role="status" className="rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">
                  {info}
                </div>
              ) : null}

              {ws.status === 'offline' ? (
                <div role="status" className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  {ws.lastError ||
                    'API server is offline. Start the backend to sign in to the live database.'}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={busy}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-zarewa-teal px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-teal-950/15 transition hover:brightness-105 disabled:cursor-wait disabled:opacity-70"
              >
                {busy ? 'Signing in…' : 'Enter workspace'}
                <ArrowRight size={17} />
              </button>
            </form>
          ) : null}

          {mode === 'forgot' ? (
            <form className="mt-8 space-y-5" onSubmit={submitForgot}>
              <p className="text-sm leading-relaxed text-slate-600">
                Enter your username, employee ID, or work email. Reset codes are for new-user accounts only and are delivered
                through your administrator.
              </p>
              <div>
                <label className="z-field-label" htmlFor="forgot-identifier">
                  Username or email
                </label>
                <input
                  id="forgot-identifier"
                  name="identifier"
                  autoComplete="username"
                  value={resetIdentifier}
                  onChange={(e) => {
                    setResetIdentifier(e.target.value);
                    if (error) setError('');
                  }}
                  className="z-input"
                  placeholder="username, employee ID, or email"
                />
              </div>

              {error ? (
                <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                  <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              ) : null}

              {info ? (
                <div className="rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">
                  {info}
                </div>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700"
                  onClick={() => switchMode('login')}
                >
                  Back to sign in
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-zarewa-teal px-5 py-3 text-sm font-black text-white disabled:opacity-70"
                >
                  {busy ? 'Sending…' : 'Request reset code'}
                </button>
              </div>
            </form>
          ) : null}

          {mode === 'reset' ? (
            <form className="mt-8 space-y-5" onSubmit={submitReset}>
              <p className="text-sm leading-relaxed text-slate-600">
                Use the one-time code from your administrator to set a permanent password before first sign-in.
              </p>
              <div>
                <label className="z-field-label" htmlFor="reset-identifier">
                  Username or email
                </label>
                <input
                  id="reset-identifier"
                  name="identifier"
                  autoComplete="username"
                  value={resetIdentifier}
                  onChange={(e) => setResetIdentifier(e.target.value)}
                  className="z-input"
                  placeholder="username, employee ID, or email"
                />
              </div>
              <div>
                <label className="z-field-label" htmlFor="reset-token">
                  Reset code
                </label>
                <input
                  id="reset-token"
                  name="token"
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  className="z-input font-mono"
                  placeholder="Paste reset code"
                  autoComplete="one-time-code"
                />
              </div>
              <PasswordField
                id="reset-new-password"
                name="newPassword"
                label="New password"
                autoComplete="new-password"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                placeholder="At least 8 characters with upper, lower, number, symbol"
                disabled={busy}
              />
              <PasswordField
                id="reset-confirm-password"
                name="confirmPassword"
                label="Confirm password"
                autoComplete="new-password"
                value={resetPasswordConfirm}
                onChange={(e) => setResetPasswordConfirm(e.target.value)}
                placeholder="Re-enter new password"
                disabled={busy}
              />

              {error ? (
                <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                  <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              ) : null}

              {info ? (
                <div className="rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">
                  {info}
                </div>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700"
                  onClick={() => switchMode('login')}
                >
                  Back to sign in
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-zarewa-teal px-5 py-3 text-sm font-black text-white disabled:opacity-70"
                >
                  {busy ? 'Saving…' : 'Set password'}
                </button>
              </div>
            </form>
          ) : null}
        </section>
      </div>
    </div>
  );
}
