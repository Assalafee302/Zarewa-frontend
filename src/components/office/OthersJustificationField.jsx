import React, { useMemo } from 'react';

/**
 * Others / exception category justification with live character progress.
 */
export function OthersJustificationField({
  value = '',
  onChange,
  minLength = 40,
  label = 'Why not a standard category?',
  placeholder,
  className = '',
}) {
  const len = String(value || '').trim().length;
  const pct = Math.min(100, Math.round((len / Math.max(minLength, 1)) * 100));
  const status = len >= minLength ? 'ok' : len >= minLength * 0.6 ? 'near' : 'short';

  const barClass =
    status === 'ok' ? 'bg-emerald-500' : status === 'near' ? 'bg-amber-500' : 'bg-rose-400';

  const hint = useMemo(() => {
    if (status === 'ok') return 'Meets minimum length';
    if (status === 'near') return `${minLength - len} more character${minLength - len === 1 ? '' : 's'} needed`;
    return `At least ${minLength} characters required`;
  }, [len, minLength, status]);

  return (
    <div className={`mt-3 ${className}`.trim()}>
      <div className="flex items-end justify-between gap-2 mb-1.5">
        <label className="text-[10px] font-bold text-amber-900 uppercase">{label}</label>
        <span
          className={`text-[9px] font-bold tabular-nums ${
            status === 'ok' ? 'text-emerald-700' : status === 'near' ? 'text-amber-800' : 'text-rose-700'
          }`}
        >
          {len}/{minLength}
        </span>
      </div>
      <div className="h-1 rounded-full bg-amber-100/80 overflow-hidden mb-2" aria-hidden>
        <div className={`h-full rounded-full transition-all duration-300 ${barClass}`} style={{ width: `${pct}%` }} />
      </div>
      <textarea
        rows={3}
        value={value}
        onChange={onChange}
        placeholder={
          placeholder ||
          `Explain why this expense does not fit a standard category (min ${minLength} characters).`
        }
        className="w-full bg-amber-50/60 border border-amber-200/90 rounded-xl py-3 px-4 text-sm font-medium outline-none resize-y min-h-[80px] focus:border-amber-300 focus:ring-2 focus:ring-amber-200/50"
      />
      <p className="text-[9px] text-amber-900/70 mt-1 ml-0.5">{hint}</p>
    </div>
  );
}
