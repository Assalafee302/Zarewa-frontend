import React from 'react';

const tabBtn =
  'px-4 py-2.5 min-h-10 rounded-xl text-ui-xs font-bold uppercase tracking-[0.08em] transition-all flex items-center gap-2 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zarewa-teal/25 focus-visible:ring-offset-2 focus-visible:ring-offset-white';

/**
 * Segmented control used across module pages for consistent UX.
 * tabs: [{ id: string, label: string, icon?: ReactNode }]
 */
export function PageTabs({ tabs, value, onChange, ariaLabel = 'Section' }) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="inline-flex w-full max-w-full min-w-0 flex-wrap gap-1 overflow-x-auto overscroll-x-contain p-1.5 [-webkit-overflow-scrolling:touch] rounded-2xl border border-white/80 bg-white/88 shadow-[0_16px_32px_-26px_rgba(15,23,42,0.35)] backdrop-blur-xl max-sm:flex-nowrap sm:overflow-x-visible"
    >
      {tabs.map((tab) => {
        const active = value === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={`${tabBtn} ${
              active
                ? 'bg-zarewa-teal text-white shadow-lg shadow-teal-950/15'
                : 'text-slate-500 hover:bg-slate-50 hover:text-zarewa-teal'
            }`}
          >
            {tab.icon ?? null}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
