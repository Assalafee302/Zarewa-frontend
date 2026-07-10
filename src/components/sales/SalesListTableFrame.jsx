import React from 'react';
import { Search } from 'lucide-react';

/**
 * Bordered table container with search (and optional sort controls) in the header band.
 */
export function SalesListTableFrame({ toolbar, children }) {
  return (
    <div className="z-scroll-x max-w-full min-w-0 rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="space-y-3 border-b border-slate-200 bg-slate-50/90 px-3 py-3 sm:px-4">{toolbar}</div>
      <div className="min-w-0 p-3 sm:p-4">{children}</div>
    </div>
  );
}

export function SalesListSearchInput({ value, onChange, placeholder }) {
  return (
    <div className="relative w-full min-w-0">
      <Search
        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        size={16}
        strokeWidth={2}
      />
      <input
        type="search"
        placeholder={placeholder}
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white border border-slate-200 rounded-lg py-2.5 pl-10 pr-3 text-base sm:text-xs font-semibold text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-zarewa-teal/35 focus:ring-2 focus:ring-zarewa-teal/10 shadow-sm"
      />
    </div>
  );
}

export function SalesListSortBar({ fields, field, dir, onFieldChange, onDirToggle }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-ui-xs">
      <span className="font-bold text-slate-400 uppercase tracking-widest shrink-0">Sort by</span>
      <select
        value={field}
        onChange={(e) => onFieldChange(e.target.value)}
        className="min-w-0 max-w-full rounded-lg border border-slate-200 bg-white py-2 pl-2 pr-7 text-base sm:text-ui-xs font-bold text-zarewa-teal outline-none focus:border-zarewa-teal/35 focus:ring-2 focus:ring-zarewa-teal/10"
      >
        {fields.map((f) => (
          <option key={f.id} value={f.id}>
            {f.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={onDirToggle}
        className="shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-ui-xs font-black uppercase tracking-widest text-zarewa-teal hover:bg-slate-50 transition-colors"
      >
        {dir === 'asc' ? 'Ascending' : 'Descending'}
      </button>
    </div>
  );
}
