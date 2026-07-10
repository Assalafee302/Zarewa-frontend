import React from 'react';
import { formatNgn } from '../../../Data/mockData';

/**
 * Compact section switcher — one row, no nested PageTabs.
 * @param {{ sections: Array<{ id: string; title: string; count?: number; subtotalNgn?: number }>; value: string; onChange: (id: string) => void }} props
 */
export function AccountingSectionNav({ sections, value, onChange }) {
  if (!sections.length) return null;

  return (
    <div
      role="tablist"
      aria-label="Register section"
      className="flex flex-wrap gap-1.5 border-b border-slate-100 pb-3"
    >
      {sections.map((s) => {
        const active = value === s.id;
        return (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(s.id)}
            className={`rounded-lg px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zarewa-teal/25 ${
              active
                ? 'bg-zarewa-teal text-white shadow-sm'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            <span className="block text-ui-xs font-bold leading-tight">{s.title}</span>
            <span
              className={`block text-ui-xs tabular-nums mt-0.5 ${
                active ? 'text-white/85' : 'text-slate-500'
              }`}
            >
              {formatNgn(s.subtotalNgn ?? 0)} · {s.count ?? 0} line{(s.count ?? 0) === 1 ? '' : 's'}
              {(s.unlinkedLegacyCount ?? 0) > 0 ? (
                <span className={active ? ' text-amber-200' : ' text-amber-700'}>
                  {' '}
                  · {s.unlinkedLegacyCount} unlinked
                </span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * @param {{
 *   title: string;
 *   subtitle?: string;
 *   totalLabel?: string;
 *   totalValue?: React.ReactNode;
 *   actions?: React.ReactNode;
 *   compact?: boolean;
 * }} props
 */
export function AccountingRegisterHeader({
  title,
  subtitle,
  totalLabel = 'Register total',
  totalValue,
  actions,
  compact = false,
}) {
  if (compact) {
    return (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
        <div className="min-w-0 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          {subtitle ? <p className="text-xs text-slate-600 leading-snug max-w-2xl">{subtitle}</p> : null}
          {totalValue != null ? (
            <p className="text-ui-xs font-semibold uppercase tracking-wider text-slate-500 shrink-0">
              {totalLabel}{' '}
              <span className="text-base font-black text-zarewa-teal tabular-nums normal-case tracking-normal">
                {totalValue}
              </span>
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2 shrink-0">{actions}</div> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between border-b border-slate-100 pb-4">
      <div className="min-w-0">
        <h2 className="text-lg font-bold text-zarewa-teal">{title}</h2>
        {subtitle ? <p className="mt-1 text-xs text-slate-600 leading-snug max-w-2xl">{subtitle}</p> : null}
        {totalValue != null ? (
          <p className="mt-2 text-ui-xs font-semibold uppercase tracking-wider text-slate-500">
            {totalLabel}{' '}
            <span className="text-base font-black text-zarewa-teal tabular-nums normal-case tracking-normal">
              {totalValue}
            </span>
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2 shrink-0">{actions}</div> : null}
    </div>
  );
}

/**
 * @param {{ label?: string; value: string; onChange: (v: string) => void; options: Array<{ id: string; label: string }> }} props
 */
export function AccountingFilterSelect({ label = 'Filter', value, onChange, options }) {
  return (
    <label className="inline-flex items-center gap-2 text-ui-xs font-bold uppercase tracking-wider text-slate-500">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 min-w-[8rem]"
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
