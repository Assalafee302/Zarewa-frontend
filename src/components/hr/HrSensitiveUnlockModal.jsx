import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { ModalFrame } from '../layout';

/**
 * Re-authentication before viewing salary, payslips, bank, or discipline details.
 */
export function HrSensitiveUnlockModal({
  open,
  onClose,
  onVerified,
  title = 'Confirm your password',
  description = 'HR payroll and personal compensation data requires a fresh password check. Your unlock lasts about 15 minutes.',
  busy = false,
  error = '',
  verifyPassword,
}) {
  const [password, setPassword] = useState('');

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const ok = await verifyPassword?.(password, 'sensitive_view');
    if (ok) {
      setPassword('');
      onVerified?.();
      onClose?.();
    }
  };

  return (
    <ModalFrame isOpen={open} onClose={onClose} title={title} description={description} surface="plain">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50/80 px-3 py-3 text-sm text-amber-950">
          <Lock size={18} className="mt-0.5 shrink-0 text-amber-700" aria-hidden />
          <p className="leading-snug">
            This extra step protects salary, bank, and payslip information. Branch managers never see these values for
            other staff.
          </p>
        </div>
        <label className="block">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Password</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm shadow-sm focus:border-[#134e4a] focus:outline-none focus:ring-2 focus:ring-[#134e4a]/20"
            required
          />
        </label>
        {error ? (
          <p className="text-sm font-medium text-red-700" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy || password.length < 1}
            className="rounded-xl bg-[#134e4a] px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-white shadow-sm hover:brightness-110 disabled:opacity-50"
          >
            {busy ? 'Checking…' : 'Unlock'}
          </button>
        </div>
      </form>
      </div>
    </ModalFrame>
  );
}
