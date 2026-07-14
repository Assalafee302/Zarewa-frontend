import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { LockKeyhole, ShieldCheck, AlertTriangle } from 'lucide-react';
import { appConfirm } from '../../lib/appConfirm';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useToast } from '../../context/ToastContext';
import { ZAREWA_LOGO_SRC } from '../../Data/companyQuotation';
import PasswordField from './PasswordField';

/**
 * Blocking modal until the user replaces a temporary or admin-assigned password.
 */
export default function ForcePasswordChangeModal() {
  const ws = useWorkspace();
  const { show: showToast } = useToast();
  const user = ws?.session?.user;
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }
    setBusy(true);
    try {
      const r = await ws?.changePassword?.(currentPassword, newPassword);
      if (!r?.ok) {
        setError(r?.error || 'Could not update password.');
        return;
      }
      showToast('Password updated. Loading your role guide…');
      await ws?.refresh?.();
    } catch (err) {
      setError(String(err?.message || err || 'Could not update password.'));
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    if (!(await appConfirm({
      title: 'Sign out',
      message: 'Sign out? You will need your temporary password to sign in again.',
    }))) return;
    await ws?.logout?.();
  };

  const modal = (
    <div className="fixed inset-0 z-[12000] flex items-center justify-center px-4 py-10">
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px]" aria-hidden />
      <div
        className="relative w-full max-w-lg rounded-[28px] border border-slate-200/80 bg-white/98 p-6 shadow-[0_24px_80px_-32px_rgba(15,23,42,0.45)] sm:p-10"
        role="dialog"
        aria-modal="true"
        aria-labelledby="force-password-title"
      >
        <div className="flex flex-col items-center text-center">
          <img src={ZAREWA_LOGO_SRC} alt="" className="h-10 w-auto object-contain" width={100} height={40} />
          <p className="mt-4 text-xs font-black uppercase tracking-[0.18em] text-slate-400">First sign-in</p>
          <h1 id="force-password-title" className="mt-2 text-2xl font-black text-zarewa-teal">
            Set your password
          </h1>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            Welcome{user?.displayName ? `, ${user.displayName}` : ''}. Replace the temporary password you were given
            before using Zarewa.
          </p>
        </div>

        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-teal-200/80 bg-teal-50/80 px-4 py-3 text-sm text-teal-950">
          <ShieldCheck size={20} className="mt-0.5 shrink-0 text-teal-700" aria-hidden />
          <p className="text-left leading-relaxed">
            Use at least 8 characters with uppercase, lowercase, a number, and a special character (for example{' '}
            <span className="font-mono text-xs">!</span> or <span className="font-mono text-xs">@</span>).
          </p>
        </div>

        <form className="mt-6 space-y-4" onSubmit={submit}>
          <PasswordField
            id="fp-current"
            label="Current (temporary) password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            disabled={busy}
            required
          />
          <PasswordField
            id="fp-new"
            label="New password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={busy}
            required
          />
          <PasswordField
            id="fp-confirm"
            label="Confirm new password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={busy}
            required
          />

          {error ? (
            <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
              <AlertTriangle size={18} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-zarewa-teal px-5 py-3.5 text-sm font-black text-white shadow-lg disabled:opacity-70"
          >
            <LockKeyhole size={17} aria-hidden />
            {busy ? 'Saving…' : 'Save password and continue'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => void signOut()}
          className="mt-4 w-full text-center text-xs font-semibold text-slate-500 hover:text-slate-800 underline underline-offset-2"
        >
          Sign out
        </button>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : modal;
}
