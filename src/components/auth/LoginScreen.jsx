/**
 * Sign-in canvas from the Stitch operating-system mockup.
 * Local ZP mark + mill hero; existing login / reset flows stay intact.
 */
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LockKeyhole,
  ArrowRight,
  AlertTriangle,
  KeyRound,
  ShieldCheck,
  LayoutDashboard,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { ZAREWA_LOGO_SRC, ZAREWA_QUOTATION_BRANDING } from '../../Data/companyQuotation';
import { resolvePostLoginPath } from '../../lib/departmentWorkspace';
import PasswordField from './PasswordField';

const LOGIN_HERO_SRC = '/login-mill-hero.jpg';

const PASSWORD_TOGGLE_CLASS =
  'absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-xl text-[#707976] transition-colors hover:text-zarewa-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zarewa-teal disabled:cursor-not-allowed disabled:opacity-50';

const BRANCH_TICKETS = ZAREWA_QUOTATION_BRANDING.branches.map((b) =>
  String(b.title || '')
    .replace(/\s+HEAD OFFICE$/i, '')
    .replace(/\s+FACTORY$/i, '')
    .trim()
);

function LoginBanner({ tone, children, id, bannerRef }) {
  const toneClass =
    tone === 'error'
      ? 'border-[#ba1a1a]/20 bg-[#ffdad6]/50 text-[#93000a]'
      : tone === 'warn'
        ? 'border-amber-200/80 bg-amber-50 text-amber-950'
        : 'border-[#aacec6] bg-[#c6eae2]/70 text-[#00201c]';
  return (
    <div
      ref={bannerRef}
      id={id}
      tabIndex={tone === 'error' ? -1 : undefined}
      role={tone === 'error' ? 'alert' : 'status'}
      className={`mb-2 flex items-start gap-3 rounded-xl border p-4 text-base outline-none ${toneClass} ${
        tone === 'error' ? 'focus-visible:ring-2 focus-visible:ring-[#ba1a1a]/40' : ''
      }`}
    >
      {tone === 'error' ? (
        <AlertTriangle size={20} className="mt-0.5 shrink-0 text-[#ba1a1a]" aria-hidden />
      ) : null}
      <p>{children}</p>
    </div>
  );
}

function TextLink({ children, onClick }) {
  return (
    <button
      type="button"
      className="cursor-pointer text-sm font-semibold text-zarewa-teal transition-colors hover:text-zarewa-teal-hover hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zarewa-teal"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function PrimaryButton({ children, busy, icon }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="group relative flex h-14 w-full cursor-pointer items-center justify-center rounded-2xl bg-zarewa-teal px-5 text-sm font-bold text-white shadow-[0_18px_36px_-16px_rgba(19,78,74,0.45)] transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-zarewa-teal-hover hover:shadow-[0_22px_40px_-14px_rgba(19,78,74,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zarewa-teal focus-visible:ring-offset-2 active:scale-[0.99] disabled:cursor-wait disabled:opacity-70"
    >
      {children}
      {icon ? (
        <span className="absolute right-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/15 transition-transform duration-200 group-hover:translate-x-0.5">
          {icon}
        </span>
      ) : null}
    </button>
  );
}

function GhostButton({ children, onClick }) {
  return (
    <button
      type="button"
      className="h-14 cursor-pointer rounded-xl border border-[#bfc9c5] px-5 text-sm font-bold text-[#0b1c30] transition-colors hover:bg-[#eff4ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zarewa-teal"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function LogoMark({ className }) {
  return (
    <img
      src={ZAREWA_LOGO_SRC}
      alt="Zarewa Aluminium and Plastics"
      className={className}
      width={220}
      height={68}
    />
  );
}

export default function LoginScreen() {
  const navigate = useNavigate();
  const ws = useWorkspace();
  const errorRef = useRef(null);
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

  useEffect(() => {
    if (!error) return;
    errorRef.current?.focus();
  }, [error]);

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

  const errorId = 'login-error';
  const modeEyebrow =
    mode === 'login' ? 'Secure sign in' : mode === 'forgot' ? 'Reset request' : 'New user setup';
  const modeTitle =
    mode === 'login' ? 'Open your workspace' : mode === 'forgot' ? 'Request a reset code' : 'Set your password';

  return (
    <div className="flex min-h-[100dvh] w-full items-center justify-center bg-[#eff4ff] px-[max(1rem,env(safe-area-inset-left))] py-[max(1rem,env(safe-area-inset-top))] pr-[max(1rem,env(safe-area-inset-right))] pb-[max(1rem,env(safe-area-inset-bottom))] text-[#0b1c30] md:p-8">
      <main className="mx-auto flex h-auto min-h-0 w-full max-w-[1440px] flex-col gap-6 rounded-[40px] lg:h-[90vh] lg:min-h-[700px] lg:max-h-[920px] lg:flex-row lg:gap-8">
        <section className="relative hidden w-[55%] flex-col overflow-hidden rounded-[2rem] bg-[#f8f9ff] p-12 z-login-shadow lg:flex">
          <div className="absolute inset-0 z-0">
            <img
              alt=""
              className="h-full w-full object-cover opacity-90"
              src={LOGIN_HERO_SRC}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zarewa-teal/90 via-zarewa-teal/50 to-transparent mix-blend-multiply" />
            <div className="absolute inset-0 bg-gradient-to-b from-[#f8f9ff]/90 via-[#f8f9ff]/40 to-transparent" />
          </div>
          <div className="relative z-10 flex h-full flex-col">
            <div className="mb-auto">
              <LogoMark className="h-16 w-auto drop-shadow-md" />
            </div>
            <div className="mt-auto max-w-xl pb-12">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#b2eee1]/30 bg-[#b2eee1]/20 px-4 py-2 backdrop-blur-md">
                <ShieldCheck size={16} className="text-[#b2eee1]" aria-hidden />
                <span className="text-[12px] font-bold uppercase tracking-[0.1em] text-[#b2eee1]">
                  Production-safe workspace
                </span>
              </div>
              <h1 className="mb-6 text-[clamp(2rem,4vw,3rem)] font-bold leading-[1.1] tracking-[-0.02em] text-white drop-shadow-lg text-balance">
                Zarewa operating system
              </h1>
              <p className="max-w-md text-lg leading-relaxed text-white/90 drop-shadow">
                Sign in to continue with live treasury controls, approval workflows, audit visibility, and the unified
                production dashboard.
              </p>
              <div className="mt-12 flex items-start gap-4 rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-xl">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-zarewa-teal">
                  <LayoutDashboard size={22} className="text-[#82bdb1]" aria-hidden />
                </div>
                <div>
                  <h3 className="mb-1 text-[12px] font-bold uppercase tracking-[0.1em] text-[#b2eee1]">
                    Production visibility
                  </h3>
                  <p className="text-base leading-relaxed text-white/80">
                    Secure login for real-time treasury controls and end-to-end production workflows.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="relative flex h-full min-h-0 w-full flex-col overflow-hidden rounded-[2rem] z-login-pane z-login-shadow lg:w-[45%]">
          <div className="pointer-events-none absolute -right-16 top-10 h-48 w-48 rounded-full bg-[#b2eee1]/40 blur-3xl" aria-hidden />
          <div className="flex flex-1 flex-col justify-center overflow-y-auto p-5 sm:p-8 lg:p-10">
            <div className="mb-6 flex justify-center lg:hidden">
              <LogoMark className="h-12 w-auto" />
            </div>
            <div className="mx-auto w-full max-w-[440px] rounded-[1.75rem] border border-white/80 bg-white/85 p-5 shadow-[0_28px_64px_-36px_rgba(11,28,48,0.35)] backdrop-blur-sm sm:p-8">
              <div className="mb-8 text-left">
                <div className="mb-5 inline-flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zarewa-teal text-zarewa-teal-soft shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_10px_24px_-12px_rgba(19,78,74,0.45)]">
                    {mode === 'login' ? (
                      <LockKeyhole size={22} aria-hidden />
                    ) : (
                      <KeyRound size={22} aria-hidden />
                    )}
                  </div>
                  <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-zarewa-teal">{modeEyebrow}</p>
                </div>
                <h2 className="text-[28px] font-bold leading-[1.15] tracking-[-0.02em] text-[#0b1c30] md:text-[34px]">
                  {modeTitle}
                </h2>
                {mode === 'login' ? (
                  <p className="mt-2 max-w-[36ch] text-[15px] leading-relaxed text-[#404946]">
                    Use your mill login for sales, store, production, and cash.
                  </p>
                ) : null}
              </div>

              {mode === 'login' ? (
                <form className="space-y-6" onSubmit={submitLogin}>
                  {error ? (
                    <LoginBanner tone="error" id={errorId} bannerRef={errorRef}>
                      {error}
                    </LoginBanner>
                  ) : null}
                  {info ? <LoginBanner tone="info">{info}</LoginBanner> : null}
                  {ws.status === 'offline' ? (
                    <LoginBanner tone="warn">
                      {ws.lastError ||
                        'API server is offline. Start the backend to sign in to the live database.'}
                    </LoginBanner>
                  ) : null}

                  <div>
                    <label className="z-login-label" htmlFor="login-username">
                      Username or employee ID
                    </label>
                    <input
                      id="login-username"
                      name="username"
                      autoComplete="username"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        if (error) setError('');
                      }}
                      className="z-login-input"
                      placeholder="e.g. zapkd001"
                      aria-invalid={error ? true : undefined}
                      aria-describedby={error ? errorId : undefined}
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
                    invalid={Boolean(error)}
                    describedBy={error ? errorId : undefined}
                    className="z-login-input"
                    labelClassName="z-login-label"
                    toggleClassName={PASSWORD_TOGGLE_CLASS}
                  />
                  <div className="flex items-center justify-between pt-2">
                    <TextLink onClick={() => switchMode('forgot')}>Forgot password?</TextLink>
                    <TextLink onClick={() => switchMode('reset')}>New user setup</TextLink>
                  </div>
                  <div className="pt-2">
                    <PrimaryButton busy={busy} icon={<ArrowRight size={16} aria-hidden />}>
                      {busy ? 'Signing in…' : 'Enter workspace'}
                    </PrimaryButton>
                  </div>
                </form>
              ) : null}

              {mode === 'forgot' ? (
                <form className="space-y-6" onSubmit={submitForgot}>
                  <p className="text-base leading-relaxed text-[#404946]">
                    Enter your username, employee ID, or work email. Reset codes are for new-user accounts only and are
                    delivered through your administrator.
                  </p>
                  <div>
                    <label className="z-login-label" htmlFor="forgot-identifier">
                      Username or email
                    </label>
                    <input
                      id="forgot-identifier"
                      name="identifier"
                      autoComplete="username"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      value={resetIdentifier}
                      onChange={(e) => {
                        setResetIdentifier(e.target.value);
                        if (error) setError('');
                      }}
                      className="z-login-input"
                      placeholder="username, employee ID, or email"
                      aria-invalid={error ? true : undefined}
                      aria-describedby={error ? errorId : undefined}
                    />
                  </div>
                  {error ? (
                    <LoginBanner tone="error" id={errorId} bannerRef={errorRef}>
                      {error}
                    </LoginBanner>
                  ) : null}
                  {info ? <LoginBanner tone="info">{info}</LoginBanner> : null}
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <GhostButton onClick={() => switchMode('login')}>Back to sign in</GhostButton>
                    <div className="sm:flex-1">
                      <PrimaryButton busy={busy} icon={<ArrowRight size={16} aria-hidden />}>
                        {busy ? 'Sending…' : 'Request reset code'}
                      </PrimaryButton>
                    </div>
                  </div>
                </form>
              ) : null}

              {mode === 'reset' ? (
                <form className="space-y-6" onSubmit={submitReset}>
                  <p className="text-base leading-relaxed text-[#404946]">
                    Use the one-time code from your administrator to set a permanent password before first sign-in.
                  </p>
                  <div>
                    <label className="z-login-label" htmlFor="reset-identifier">
                      Username or email
                    </label>
                    <input
                      id="reset-identifier"
                      name="identifier"
                      autoComplete="username"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      value={resetIdentifier}
                      onChange={(e) => setResetIdentifier(e.target.value)}
                      className="z-login-input"
                      placeholder="username, employee ID, or email"
                    />
                  </div>
                  <div>
                    <label className="z-login-label" htmlFor="reset-token">
                      Reset code
                    </label>
                    <input
                      id="reset-token"
                      name="token"
                      value={resetToken}
                      onChange={(e) => setResetToken(e.target.value)}
                      className="z-login-input font-mono"
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
                    className="z-login-input"
                    labelClassName="z-login-label"
                    toggleClassName={PASSWORD_TOGGLE_CLASS}
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
                    className="z-login-input"
                    labelClassName="z-login-label"
                    toggleClassName={PASSWORD_TOGGLE_CLASS}
                  />
                  {error ? (
                    <LoginBanner tone="error" id={errorId} bannerRef={errorRef}>
                      {error}
                    </LoginBanner>
                  ) : null}
                  {info ? <LoginBanner tone="info">{info}</LoginBanner> : null}
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <GhostButton onClick={() => switchMode('login')}>Back to sign in</GhostButton>
                    <div className="sm:flex-1">
                      <PrimaryButton busy={busy} icon={<ArrowRight size={16} aria-hidden />}>
                        {busy ? 'Saving…' : 'Set password'}
                      </PrimaryButton>
                    </div>
                  </div>
                </form>
              ) : null}
            </div>
          </div>

          <footer className="mt-auto flex flex-col items-center justify-between gap-4 rounded-b-[2rem] border-t border-black/5 px-6 py-5 text-center lg:flex-row lg:px-10 lg:text-left">
            <p className="text-sm text-[#404946]">
              © {new Date().getFullYear()} Zarewa Aluminium &amp; Plastics. All rights reserved.
            </p>
            <p className="text-sm font-medium uppercase tracking-[0.08em] text-[#44655f]">
              {BRANCH_TICKETS.join('  ·  ')}
            </p>
          </footer>
        </section>
      </main>
    </div>
  );
}
