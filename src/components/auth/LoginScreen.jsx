import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { ShieldCheck, LockKeyhole, Building2, ArrowRight, AlertTriangle, RotateCcw } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { ZAREWA_LOGO_SRC } from '../../Data/companyQuotation';
import { resolvePostLoginPath } from '../../lib/departmentWorkspace';
import { auth, firebaseConfigured } from '../../lib/firebase.js';
import loginHeroSrc from '../../../assets/longspan-roof-login-hero.png';

export default function LoginScreen() {
  const navigate = useNavigate();
  const ws = useWorkspace();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [mode, setMode] = useState('login'); // 'login' | 'forgot' | 'reset'
  const [identifier, setIdentifier] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const submitLogin = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setSuccess('');
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

  const signInWithGoogle = async () => {
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const cred = await signInWithPopup(auth, provider);
      const idToken = await cred.user.getIdToken();
      const r = await ws.loginWithFirebase(idToken);
      if (!r.ok) {
        setError(r.error || 'Could not sign in with Google.');
        try {
          await signOut(auth);
        } catch {
          /* ignore */
        }
      } else {
        const perms = Array.isArray(r.data?.permissions) ? r.data.permissions : [];
        navigate(resolvePostLoginPath(r.data?.user, perms), { replace: true });
      }
    } catch (err) {
      const code = err?.code;
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setError('');
      } else {
        setError(String(err?.message || err || 'Google sign-in failed.'));
      }
    }
    setBusy(false);
  };

  const submitForgot = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const fd = new FormData(e.currentTarget);
      const id = String(fd.get('identifier') ?? identifier).trim();
      if (!id) {
        setError('Please enter your username or email.');
        setBusy(false);
        return;
      }
      const r = await ws.forgotPassword(id);
      if (!r.ok) {
        setError(r.error || 'Could not request reset.');
        setBusy(false);
        return;
      }
      const msg = r.data?.message || 'Reset code created. Continue to set your new password.';
      setSuccess(msg);
      setIdentifier(id);
      if (r.data?.devResetToken) {
        setResetToken(String(r.data.devResetToken));
      }
      setNewPassword('');
      setMode('reset');
    } catch (err) {
      setError(String(err?.message || err || 'Could not request reset.'));
    } finally {
      setBusy(false);
    }
  };

  const submitReset = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const fd = new FormData(e.currentTarget);
      const token = String(fd.get('resetToken') ?? resetToken).trim();
      const id = String(fd.get('identifier') ?? identifier).trim();
      const next = String(fd.get('newPassword') ?? newPassword);

      if (!id) {
        setError('Identifier is required.');
        setBusy(false);
        return;
      }
      if (!token) {
        setError('Reset code is required.');
        setBusy(false);
        return;
      }
      if (!next || next.length < 6) {
        setError('New password must be at least 6 characters.');
        setBusy(false);
        return;
      }

      const r = await ws.resetPassword(id, token, next);
      if (!r.ok) {
        setError(r.error || 'Could not reset password.');
        setBusy(false);
        return;
      }

      setSuccess(r.data?.message || 'Password updated. You can sign in now.');
      setMode('login');
      setPassword('');
      setNewPassword('');
      setResetToken('');
    } catch (err) {
      setError(String(err?.message || err || 'Could not reset password.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full min-w-0 max-w-full z-app-bg px-[max(1rem,env(safe-area-inset-left))] pt-[max(1rem,env(safe-area-inset-top))] pr-[max(1rem,env(safe-area-inset-right))] pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6 sm:pt-8 sm:pb-8 lg:px-10">
      <div className="mx-auto grid min-h-0 min-w-0 max-w-6xl grid-cols-1 gap-6 lg:min-h-[calc(100vh-4rem)] lg:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-[28px] border border-white/70 bg-white/80 p-5 shadow-[0_24px_80px_-32px_rgba(15,23,42,0.35)] backdrop-blur-xl sm:rounded-[32px] sm:p-10">
          <img
            src={ZAREWA_LOGO_SRC}
            alt=""
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

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              {
                title: 'Controlled postings',
                detail: 'Treasury, reversals, and payouts now require signed-in roles.',
              },
              {
                title: 'Audit visibility',
                detail: 'Sensitive actions leave an append-only trace for review.',
              },
              {
                title: 'Period protection',
                detail: 'Locked accounting periods block late postings and cash edits.',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-sm"
              >
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">{item.title}</p>
                <p className="mt-3 text-sm font-semibold leading-6 text-slate-700">{item.detail}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 overflow-hidden rounded-[28px] border border-slate-200/80 bg-slate-950 text-white shadow-xl">
            <div className="relative">
              <img
                src={loginHeroSrc}
                alt="Long-span roof production line"
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
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                {mode === 'login' ? 'Secure sign in' : 'Password recovery'}
              </p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-[#134e4a]">
                {mode === 'login'
                  ? 'Open your workspace'
                  : mode === 'forgot'
                    ? 'Forgot your password'
                    : 'Reset password'}
              </h2>
            </div>
          </div>

          {success ? (
            <div className="flex items-start gap-3 rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">
              <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-teal-400/15 text-teal-700">
                ✓
              </span>
              <span>{success}</span>
            </div>
          ) : null}

          <form className="mt-8 space-y-5" onSubmit={mode === 'login' ? submitLogin : mode === 'forgot' ? submitForgot : submitReset}>
            {mode === 'login' ? (
              <>
                <div>
                  <label className="z-field-label" htmlFor="login-username">
                    Username
                  </label>
                  <input
                    id="login-username"
                    name="username"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="z-input"
                    placeholder="Enter your username"
                  />
                </div>
                <div>
                  <label className="z-field-label" htmlFor="login-password">
                    Password
                  </label>
                  <input
                    id="login-password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="z-input"
                    placeholder="Enter your password"
                  />
                </div>

                <div className="flex items-center justify-between gap-4">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setError('');
                      setSuccess('');
                      setMode('forgot');
                      setIdentifier(username);
                    }}
                    className="text-sm font-semibold text-[#134e4a] hover:underline disabled:cursor-wait disabled:opacity-70"
                  >
                    Forgot password?
                  </button>
                </div>

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

                {firebaseConfigured && (
                  <>
                    <div className="relative py-2">
                      <div className="absolute inset-0 flex items-center" aria-hidden="true">
                        <div className="w-full border-t border-slate-200" />
                      </div>
                      <div className="relative flex justify-center text-xs font-bold uppercase tracking-wider text-slate-400">
                        <span className="bg-white/92 px-3">or</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void signInWithGoogle()}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-black text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-70"
                    >
                      <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      {busy ? 'Signing in…' : 'Continue with Google'}
                    </button>
                  </>
                )}
              </>
            ) : mode === 'forgot' ? (
              <>
                <div>
                  <label className="z-field-label" htmlFor="forgot-identifier">
                    Username or email
                  </label>
                  <input
                    id="forgot-identifier"
                    name="identifier"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="z-input"
                    placeholder="Enter your username or email"
                    autoComplete="username"
                  />
                </div>

                {error ? (
                  <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                    <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                ) : null}

                {ws.status === 'offline' ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    API server is offline. Start the backend to request a reset code.
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#134e4a] px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-teal-950/15 transition hover:brightness-105 disabled:cursor-wait disabled:opacity-70"
                >
                  {busy ? 'Requesting…' : 'Send reset code'}
                  <ArrowRight size={17} />
                </button>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setError('');
                    setSuccess('');
                    setMode('login');
                  }}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-black text-[#134e4a] shadow-sm transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-70"
                >
                  <RotateCcw size={17} />
                  Back to sign in
                </button>
              </>
            ) : (
              <>
                <div className="text-sm text-slate-600">
                  Enter the reset code you received, then set a new password.
                </div>

                <input type="hidden" name="identifier" value={identifier} />

                <div>
                  <label className="z-field-label" htmlFor="reset-token">
                    Reset code
                  </label>
                  <input
                    id="reset-token"
                    name="resetToken"
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    className="z-input"
                    placeholder="Enter reset code"
                    autoComplete="one-time-code"
                  />
                </div>

                <div>
                  <label className="z-field-label" htmlFor="reset-password">
                    New password
                  </label>
                  <input
                    id="reset-password"
                    name="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="z-input"
                    placeholder="Enter a new password"
                    autoComplete="new-password"
                  />
                </div>

                {error ? (
                  <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                    <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                ) : null}

                {ws.status === 'offline' ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    API server is offline. Start the backend to reset your password.
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#134e4a] px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-teal-950/15 transition hover:brightness-105 disabled:cursor-wait disabled:opacity-70"
                >
                  {busy ? 'Resetting…' : 'Reset password'}
                  <ArrowRight size={17} />
                </button>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setError('');
                    setSuccess('');
                    setMode('login');
                  }}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-black text-[#134e4a] shadow-sm transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-70"
                >
                  <RotateCcw size={17} />
                  Back to sign in
                </button>
              </>
            )}
          </form>
        </section>
      </div>
    </div>
  );
}
