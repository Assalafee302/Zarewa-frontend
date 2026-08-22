import React from 'react';

const REVIEW_SECTIONS = [
  { id: 'pack', label: 'Chairman briefing pack' },
  { id: 'customers', label: 'Customers' },
  { id: 'trace', label: 'Audit trail' },
  { id: 'intelligence', label: 'Intelligence', biOnly: true },
  { id: 'finance', label: 'Finance' },
];

/**
 * MD Review uses a labeled select, not a second PageTabs strip.
 */
export function ExecMdReviewNav({ value = 'pack', onChange, mayViewBi = false }) {
  const options = REVIEW_SECTIONS.filter((s) => !s.biOnly || mayViewBi);
  const current = options.some((s) => s.id === value) ? value : 'pack';

  return (
    <div className="flex flex-col gap-2 rounded-md border border-slate-200 bg-white px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
      <label htmlFor="exec-md-review-section" className="text-sm font-semibold text-slate-800">
        Review section
      </label>
      <select
        id="exec-md-review-section"
        value={current}
        onChange={(e) => onChange?.(e.target.value)}
        className="min-h-11 w-full max-w-md rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-base font-semibold text-slate-800 outline-none focus:border-zarewa-teal/35 focus:ring-2 focus:ring-zarewa-teal/10 sm:text-sm"
      >
        {options.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </select>
    </div>
  );
}
