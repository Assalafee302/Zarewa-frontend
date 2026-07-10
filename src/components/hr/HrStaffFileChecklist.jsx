import React from 'react';

/**
 * Staff master-file checklist (board staff form alignment).
 * @param {{ completeness?: { items: {id:string;label:string;ok:boolean}[]; percent?: number; complete?: boolean } }} props
 */
export function HrStaffFileChecklist({ completeness }) {
  if (!completeness?.items?.length) return null;
  const { items, percent = 0, complete } = completeness;
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-zarewa-teal">Staff file completeness</h3>
        <span className={`text-xs font-bold ${complete ? 'text-emerald-700' : 'text-amber-800'}`}>
          {percent}% complete
        </span>
      </div>
      <ul className="grid gap-1.5 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-2 text-xs text-slate-700">
            <span className={item.ok ? 'text-emerald-600' : 'text-slate-300'} aria-hidden>
              {item.ok ? '✓' : '○'}
            </span>
            {item.label}
          </li>
        ))}
      </ul>
      {!complete ? (
        <p className="mt-3 text-xs text-slate-500">
          Complete personal, bank, and next-of-kin details before confirmation or staff loan processing.
        </p>
      ) : null}
    </div>
  );
}
