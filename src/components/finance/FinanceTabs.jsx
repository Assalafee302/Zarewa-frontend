import React from 'react';

/**
 * @param {{ tabs: { id: string; label: string }[]; active: string; onChange: (id: string) => void }} props
 */
export function FinanceTabs({ tabs, active, onChange }) {
  return (
    <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-200 pb-3">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={`rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${
            active === t.id
              ? 'bg-zarewa-teal text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
