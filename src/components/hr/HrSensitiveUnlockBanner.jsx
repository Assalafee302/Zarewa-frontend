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
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 to-white px-4 py-3 shadow-sm">
        <div className="flex min-w-0 items-center gap-2.5 text-sm text-slate-700">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#134e4a] shadow-sm ring-1 ring-slate-100">
            <Lock size={16} aria-hidden />
          </span>
          <span>{label}</span>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="shrink-0 rounded-xl bg-[#134e4a] px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-white hover:bg-[#0f3d3a]"
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
