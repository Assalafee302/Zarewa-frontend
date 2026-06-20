import React from 'react';
import { Link } from 'react-router-dom';

const THEMES = {
  rose: {
    panel: 'border-rose-200/90 bg-rose-50/50',
    title: 'text-rose-900',
    count: 'text-rose-800',
    description: 'text-rose-900/80',
    row: 'border-rose-200/50 bg-white/40',
  },
  teal: {
    panel: 'border-teal-200/90 bg-teal-50/45',
    title: 'text-teal-950',
    count: 'text-teal-900',
    description: 'text-teal-950/80',
    row: 'border-teal-200/55 bg-white/50',
  },
  sky: {
    panel: 'border-sky-200/90 bg-sky-50/50',
    title: 'text-sky-950',
    count: 'text-sky-900',
    description: 'text-sky-950/85',
    row: 'border-sky-200/55 bg-white/50',
  },
  amber: {
    panel: 'border-amber-200/90 bg-amber-50/55',
    title: 'text-amber-950',
    count: 'text-amber-900',
    description: 'text-amber-950/85',
    row: 'border-amber-200/55 bg-white/50',
  },
  violet: {
    panel: 'border-violet-200/90 bg-violet-50/50',
    title: 'text-violet-950',
    count: 'text-violet-900',
    description: 'text-violet-950/85',
    row: 'border-violet-200/55 bg-white/50',
  },
};

/**
 * Treasury-style colour-coded work queue panel for Cashier Desk.
 * @param {{
 *   theme?: keyof typeof THEMES;
 *   title: string;
 *   icon?: React.ReactNode;
 *   count: number;
 *   description?: string;
 *   testId?: string;
 *   sectionId?: string;
 *   action?: React.ReactNode;
 *   children: React.ReactNode;
 * }} props
 */
export function FinanceDeskColoredQueuePanel({
  theme = 'teal',
  title,
  icon,
  count,
  description,
  testId,
  sectionId,
  action,
  children,
}) {
  const t = THEMES[theme] || THEMES.teal;
  return (
    <div
      id={sectionId}
      className={`rounded-xl border p-4 space-y-2 scroll-mt-20 ${t.panel}`}
      data-testid={testId}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className={`text-xs font-black uppercase tracking-widest flex items-center gap-2 ${t.title}`}>
          {icon}
          {title}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-[10px] font-bold tabular-nums ${t.count}`}>
            {count} open
          </span>
          {action}
        </div>
      </div>
      {description ? (
        <p className={`text-[10px] leading-relaxed ${t.description}`}>{description}</p>
      ) : null}
      {children}
    </div>
  );
}

/**
 * Single row inside a coloured queue panel (Treasury row pattern).
 * @param {{
 *   theme?: keyof typeof THEMES;
 *   title: React.ReactNode;
 *   meta?: string;
 *   extra?: React.ReactNode;
 *   amount: string;
 *   actions: React.ReactNode;
 *   testId?: string;
 * }} props
 */
export function FinanceDeskColoredQueueRow({
  theme = 'teal',
  title,
  meta,
  extra,
  amount,
  actions,
  testId,
}) {
  const t = THEMES[theme] || THEMES.teal;
  return (
    <li
      data-testid={testId}
      className={`rounded-lg border backdrop-blur-md py-1.5 px-2.5 shadow-sm ${t.row}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2 min-w-0">
        <div className="min-w-0 leading-tight flex-1">
          <div className="text-[11px] font-bold text-[#134e4a] truncate">{title}</div>
          {meta ? (
            <p className="text-[8px] text-slate-500 mt-0.5 leading-snug line-clamp-2" title={meta}>
              {meta}
            </p>
          ) : null}
          {extra}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="text-[11px] font-black text-[#134e4a] tabular-nums">{amount}</span>
          <div className="flex flex-wrap items-center justify-end gap-1">{actions}</div>
        </div>
      </div>
    </li>
  );
}

/** Compact payout / confirm button matching Treasury tab. */
export function FinanceDeskQueueActionButton({ children, onClick, to, tone = 'sky', title, disabled }) {
  const toneCls = {
    sky: 'text-sky-800 bg-sky-100 hover:bg-sky-200',
    teal: 'text-teal-900 bg-teal-100 hover:bg-teal-200',
    rose: 'text-rose-800 bg-rose-100 hover:bg-rose-200',
    slate: 'text-slate-700 bg-slate-100 hover:bg-slate-200',
    primary: 'text-white bg-[#134e4a] hover:bg-[#0f3d3a]',
  };
  const cls = `inline-flex items-center text-[8px] font-semibold uppercase tracking-wide px-2 py-1 rounded-md disabled:opacity-60 disabled:cursor-not-allowed ${toneCls[tone] || toneCls.sky}`;
  if (to) {
    return (
      <Link to={to} className={cls} title={title}>
        {children}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cls}
    >
      {children}
    </button>
  );
}
