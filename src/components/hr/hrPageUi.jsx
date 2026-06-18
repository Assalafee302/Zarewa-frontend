import React from 'react';
import { Link } from 'react-router-dom';
import { HrStatusBadge } from './HrStatusBadge';

export {
  HR_BTN_PRIMARY,
  HR_BTN_SECONDARY,
  HR_BTN_ADD,
  HR_BTN_PILL,
  HR_CARD,
  HR_FIELD_CLASS,
  HR_INPUT,
  HR_MUTED,
  HR_SECTION_TITLE,
  HR_TEXTAREA_CLASS,
} from './hrFormStyles';

/** Constrains page content width inside HR main panel. */
export function HrPageBody({ children, className = '', compact = false }) {
  return (
    <div className={`mx-auto w-full ${compact ? 'max-w-full space-y-4' : 'max-w-5xl space-y-6'} ${className}`}>
      {children}
    </div>
  );
}

export function HrPageIntro({ title, description, actions, children }) {
  return (
    <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1">
        {title ? <h2 className="text-lg font-bold text-[#134e4a]">{title}</h2> : null}
        {description ? <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600">{description}</p> : null}
        {children}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function HrCard({ title, subtitle, actions, children, className = '' }) {
  return (
    <section className={`rounded-2xl border border-slate-100 bg-white shadow-sm ${className}`}>
      {title || actions ? (
        <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-50 px-4 py-3 sm:px-5">
          <div>
            {title ? <h3 className="text-sm font-bold text-slate-800">{title}</h3> : null}
            {subtitle ? <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>
      ) : null}
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

export function HrStatusPill({ status, label }) {
  return <HrStatusBadge status={status} variant="workflow" label={label || status} />;
}

export function HrEmptyState({ title, description, action }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-10 text-center">
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      {description ? <p className="mt-1 text-xs text-slate-500">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

/** Left list + right detail (recruiting, learning, engagement). */
export function HrSplitWorkspace({ sidebar, children, sidebarWidth = 'w-full lg:w-72' }) {
  return (
    <div className={`grid gap-5 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]`}>
      <aside className={`min-w-0 ${sidebarWidth}`}>{sidebar}</aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function HrListItemButton({ active, onClick, title, meta, badge }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${
        active
          ? 'border-[#134e4a]/40 bg-teal-50/60 shadow-sm'
          : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50/80'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-semibold text-slate-800 line-clamp-2">{title}</span>
        {badge}
      </div>
      {meta ? <p className="mt-1 text-xs text-slate-500 line-clamp-1">{meta}</p> : null}
    </button>
  );
}

export function HrInlineLink({ to, children }) {
  return (
    <Link to={to} className="text-sm font-semibold text-[#134e4a] hover:underline">
      {children}
    </Link>
  );
}

export function HrAlert({ tone = 'error', children }) {
  const tones = {
    error: 'border-red-100 bg-red-50 text-red-800',
    success: 'border-emerald-100 bg-emerald-50 text-emerald-900',
    info: 'border-sky-100 bg-sky-50 text-sky-900',
  };
  return <div className={`rounded-xl border px-4 py-3 text-sm ${tones[tone] || tones.error}`}>{children}</div>;
}
