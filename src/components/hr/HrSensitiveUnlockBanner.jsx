import React, { useMemo, useState } from 'react';
import { Lock } from 'lucide-react';
import { useHrSensitiveAccess } from '../../hooks/useHrSensitiveAccess';
import { HrSensitiveUnlockModal } from './HrSensitiveUnlockModal';

const SCOPE_COPY = {
  payslip: {
    label: 'Unlock to view payslip amounts',
    hint: 'Net pay and deductions are hidden until you verify your password. Access lasts for this browser session.',
  },
  compensation: {
    label: 'Unlock to view salary details',
    hint: 'Base pay, allowances, and bank details stay hidden until you verify your password.',
  },
  general: {
    label: 'Unlock to view amounts',
    hint: 'Sensitive HR figures are hidden until you verify your password for this session.',
  },
};

function formatUnlockExpiry(iso) {
  if (!iso) return null;
  const ms = Date.parse(iso) - Date.now();
  if (ms <= 0) return null;
  const mins = Math.round(ms / 60_000);
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'}`;
  const hrs = Math.round(mins / 60);
  return `${hrs} hr${hrs === 1 ? '' : 's'}`;
}

/**
 * Inline unlock prompt — list/content stays visible; amounts stay masked until verified.
 */
export function HrSensitiveUnlockBanner({ scope = 'payslip', label }) {
  const sensitive = useHrSensitiveAccess();
  const [open, setOpen] = useState(false);
  const copy = SCOPE_COPY[scope] || SCOPE_COPY.general;
  const resolvedLabel = label || copy.label;
  const expiryLabel = useMemo(() => formatUnlockExpiry(sensitive.unlockExpiresAtIso), [sensitive.unlockExpiresAtIso]);

  if (sensitive.isUnlocked) {
    return (
      <div
        className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-100 bg-emerald-50/70 px-3 py-2 text-xs text-emerald-900"
        role="status"
        aria-live="polite"
      >
        <span>
          Amounts visible{expiryLabel ? ` — session expires in about ${expiryLabel}` : ''}
        </span>
        <button type="button" onClick={sensitive.lock} className="min-h-9 font-semibold text-emerald-900 hover:underline">
          Lock again
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 to-white px-4 py-3 shadow-sm">
        <div className="flex min-w-0 items-start gap-2.5 text-sm text-slate-700">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-zarewa-teal shadow-sm ring-1 ring-slate-100">
            <Lock size={16} aria-hidden />
          </span>
          <span>
            <span className="block font-semibold text-slate-900">{resolvedLabel}</span>
            <span className="mt-0.5 block text-xs text-slate-600">{copy.hint}</span>
          </span>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl bg-zarewa-teal px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#0f3d3a]"
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
