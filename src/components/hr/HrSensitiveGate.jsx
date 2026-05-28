import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { useHrSensitiveAccess } from '../../hooks/useHrSensitiveAccess';
import { HrSensitiveUnlockModal } from './HrSensitiveUnlockModal';

/**
 * Wraps sensitive HR content; shows unlock prompt until password verified.
 */
export function HrSensitiveGate({ children, label = 'View sensitive HR data' }) {
  const sensitive = useHrSensitiveAccess();
  const [modalOpen, setModalOpen] = useState(false);

  if (sensitive.isUnlocked) {
    return (
      <>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-2 text-[11px] text-emerald-900">
          <span>Sensitive section unlocked</span>
          <button
            type="button"
            onClick={sensitive.lock}
            className="font-bold uppercase tracking-wide text-emerald-800 hover:underline"
          >
            Lock again
          </button>
        </div>
        {children}
      </>
    );
  }

  return (
    <>
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-10 text-center">
        <Lock size={28} className="mx-auto text-slate-400" aria-hidden />
        <p className="mt-3 text-sm font-semibold text-slate-800">{label}</p>
        <p className="mx-auto mt-1 max-w-md text-xs text-slate-600 leading-relaxed">
          Enter your account password to view compensation, payslips, bank, or discipline details. Access expires after
          15 minutes.
        </p>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="mt-4 rounded-xl bg-[#134e4a] px-5 py-2.5 text-[11px] font-bold uppercase tracking-wide text-white shadow-sm hover:brightness-110"
        >
          Unlock with password
        </button>
      </div>
      <HrSensitiveUnlockModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onVerified={() => setModalOpen(false)}
        busy={sensitive.busy}
        error={sensitive.error}
        verifyPassword={sensitive.verifyPassword}
      />
    </>
  );
}
