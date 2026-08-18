import React from 'react';

/**
 * Underline section tabs — one horizontal row, sentence case, no padded pill chrome.
 * tabs: [{ id: string, label: string, title?: string, icon?: ReactNode, badge?: number | string }]
 */
export function PageTabs({ tabs, value, onChange, ariaLabel = 'Section', className = '' }) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`flex w-full min-w-0 max-w-full items-stretch gap-0.5 overflow-x-auto overscroll-x-contain border-b border-slate-200/90 [-webkit-overflow-scrolling:touch] ${className}`}
    >
      {tabs.map((tab) => {
        const active = value === tab.id;
        const badgeNum = Number(tab.badge);
        const showBadge = Number.isFinite(badgeNum) && badgeNum > 0;
        const hint = tab.title || tab.label;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            title={hint}
            aria-label={tab.title && tab.title !== tab.label ? hint : undefined}
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={`relative inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap px-2.5 py-2 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zarewa-teal/25 focus-visible:ring-offset-2 ${
              active
                ? 'text-zarewa-teal'
                : 'text-slate-500 hover:text-zarewa-teal'
            }`}
          >
            {tab.icon ? (
              <span className="hidden text-current sm:inline-flex [&>svg]:h-3.5 [&>svg]:w-3.5" aria-hidden>
                {tab.icon}
              </span>
            ) : null}
            {tab.label}
            {showBadge ? (
              <span
                className={`inline-flex min-w-[1.125rem] items-center justify-center rounded px-1 py-px text-[10px] font-bold tabular-nums ${
                  active ? 'bg-teal-50 text-zarewa-teal' : 'bg-amber-100 text-amber-950'
                }`}
              >
                {badgeNum > 99 ? '99+' : badgeNum}
              </span>
            ) : null}
            <span
              className={`pointer-events-none absolute inset-x-2 -bottom-px h-0.5 rounded-full ${
                active ? 'bg-zarewa-teal' : 'bg-transparent'
              }`}
              aria-hidden
            />
          </button>
        );
      })}
    </div>
  );
}
