import React from 'react';

/**
 * Two-column definition list for profile tabs.
 */
export function HrDetailGrid({ rows }) {
  return (
    <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {(rows || []).map((row) => (
        <div key={row.label}>
          <dt className="text-[10px] font-black uppercase tracking-widest text-slate-400">{row.label}</dt>
          <dd className="mt-1 text-sm font-semibold text-slate-900">{row.value ?? '—'}</dd>
        </div>
      ))}
    </dl>
  );
}
