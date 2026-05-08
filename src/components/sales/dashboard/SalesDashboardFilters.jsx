import React from 'react';

export default function SalesDashboardFilters({ filters, onChange }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-[10px]">
          <span className="mb-1 block font-bold uppercase tracking-wide text-slate-500">From</span>
          <input
            type="date"
            value={filters.from}
            onChange={(e) => onChange({ from: e.target.value })}
            className="z-input !py-1.5 !text-[11px]"
          />
        </label>
        <label className="text-[10px]">
          <span className="mb-1 block font-bold uppercase tracking-wide text-slate-500">To</span>
          <input
            type="date"
            value={filters.to}
            onChange={(e) => onChange({ to: e.target.value })}
            className="z-input !py-1.5 !text-[11px]"
          />
        </label>
      </div>
    </div>
  );
}

