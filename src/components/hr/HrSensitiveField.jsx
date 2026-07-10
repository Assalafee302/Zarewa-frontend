import React from 'react';
import { Lock } from 'lucide-react';

/**
 * Inline masked sensitive value with optional unlock hint.
 */
export function HrSensitiveField({
  label,
  value,
  redacted = false,
  unlockHint = 'Unlock sensitive HR to view',
  className = '',
}) {
  return (
    <div className={className}>
      {label ? (
        <dt className="text-ui-xs font-black uppercase tracking-widest text-slate-400">{label}</dt>
      ) : null}
      <dd className="mt-1 flex items-center gap-1.5 font-semibold text-slate-900">
        {redacted ? (
          <>
            <Lock size={12} className="shrink-0 text-slate-400" aria-hidden />
            <span className="text-sm text-slate-500 italic">{unlockHint}</span>
          </>
        ) : (
          <span className="tabular-nums">{value ?? '—'}</span>
        )}
      </dd>
    </div>
  );
}

/** Banner for confidential HR pages (discipline, medical, etc.). */
export function HrConfidentialBanner({ children }) {
  return (
    <div
      className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950"
      role="note"
    >
      <Lock size={18} className="mt-0.5 shrink-0 text-amber-700" aria-hidden />
      <div>
        <p className="font-bold">Confidential — screen privacy</p>
        <p className="mt-0.5 text-xs leading-relaxed text-amber-900/90">
          {children ||
            'This section may contain sensitive employment information. Avoid sharing your screen in public areas.'}
        </p>
      </div>
    </div>
  );
}
