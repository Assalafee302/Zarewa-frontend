import React from 'react';

const tabBtn =
  'px-4 py-2.5 min-h-10 rounded-xl text-ui-xs font-bold uppercase tracking-[0.08em] transition-all flex items-center gap-2 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zarewa-teal/25 focus-visible:ring-offset-2 focus-visible:ring-offset-white';

/**
 * Segmented control used across module pages for consistent UX.
 * tabs: [{ id: string, label: string, icon?: ReactNode, badge?: number | string }]
 */
export function PageTabs({ tabs, value, onChange, ariaLabel = 'Section', className = '' }) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`inline-flex w-full max-w-full min-w-0 flex-wrap gap-1 overflow-x-auto overscroll-x-contain p-1.5 [-webkit-overflow-scrolling:touch] rounded-2xl border border-white/80 bg-white/88 shadow-[0_16px_32px_-26px_rgba(15,23,42,0.35)] backdrop-blur-xl max-sm:flex-nowrap sm:overflow-x-visible ${className}`}
    >
      {tabs.map((tab) => {
        const active = value === tab.id;
        const badgeNum = Number(tab.badge);
        const showBadge = Number.isFinite(badgeNum) && badgeNum > 0;
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
            {showBadge ? (
              <span
                className={`ml-0.5 inline-flex min-w-[1.25rem] items-center justify-center rounded-md px-1 py-0.5 text-[10px] font-black tabular-nums ${
                  active ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-950'
                }`}
              >
                {badgeNum > 99 ? '99+' : badgeNum}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
