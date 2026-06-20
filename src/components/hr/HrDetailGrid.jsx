import React from 'react';

/**
 * Two-column definition list for profile tabs.
 */
export function HrDetailGrid({ rows }) {
  return (
    <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {(rows || []).map((row) => (
        <div key={row.label}>
          <dt className="z-meta-text font-semibold text-slate-500">{row.label}</dt>
          <dd className="mt-1 text-sm font-semibold text-slate-900">{row.value ?? '—'}</dd>
        </div>
      ))}
    </dl>
  );
}
