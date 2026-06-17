import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { useHrSensitiveAccess } from '../../hooks/useHrSensitiveAccess';
import { HrSensitiveUnlockModal } from './HrSensitiveUnlockModal';

/**
 * Inline unlock prompt — list/content stays visible; amounts stay masked until verified.
 */
export function HrSensitiveUnlockBanner({ scope = 'payslip', label = 'Unlock to view amounts' }) {
  const sensitive = useHrSensitiveAccess();
  const [open, setOpen] = useState(false);

  if (sensitive.isUnlocked) {
    return (
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-100 bg-emerald-50/70 px-3 py-2 text-xs text-emerald-900">
        <span>Amounts visible — session unlocked</span>
        <button type="button" onClick={sensitive.lock} className="font-bold uppercase tracking-wide hover:underline">
          Lock again
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2 text-sm text-slate-700">
          <Lock size={16} className="shrink-0 text-slate-400" aria-hidden />
          <span>{label}</span>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="shrink-0 rounded-xl bg-[#134e4a] px-4 py-2 text-xs font-bold text-white hover:brightness-110"
        >
          Unlock with password
        </button>
      </div>
      <HrSensitiveUnlockModal
        open={open}
        onClose={() => setOpen(false)}
        onVerified={() => setOpen(false)}
        busy={sensitive.busy}
        error={sensitive.error}
        verifyPassword={sensitive.verifyPassword}
      />
    </>
  );
}
