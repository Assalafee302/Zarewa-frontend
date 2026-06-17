import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

/** Teal accent bar — matches Procurement aside / transport agent panels. */
export function ProfileAccentBar({ className = '' }) {
  return <div className={`h-1 shrink-0 rounded-t-xl bg-[#134e4a] ${className}`} aria-hidden />;
}

/**
 * KPI stat card aligned with Sales / Procurement module panels.
 * @param {{ label: string; value: React.ReactNode; hint?: string; to?: string; actionLabel?: string; tone?: 'teal' | 'amber' | 'violet' | 'slate' }} props
 */
export function ProfileKpiCard({ label, value, hint, to, actionLabel, tone = 'teal' }) {
  const tones = {
    teal: 'border-slate-200/90 bg-white',
    amber: 'border-amber-100/90 bg-gradient-to-br from-amber-50/40 to-white',
    violet: 'border-violet-100/90 bg-gradient-to-br from-violet-50/40 to-white',
    slate: 'border-slate-200/90 bg-slate-50/30',
  };

  return (
    <div className={`relative flex h-full flex-col overflow-hidden rounded-xl border shadow-sm ${tones[tone] || tones.teal}`}>
      <ProfileAccentBar />
      <div className="flex flex-1 flex-col p-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
        <div className="mt-2 min-h-[2.5rem] flex-1">{value}</div>
        {hint ? <p className="mt-2 text-[11px] leading-relaxed text-slate-500">{hint}</p> : null}
        {to && actionLabel ? (
          <Link
            to={to}
            className="mt-3 inline-flex min-h-8 items-center gap-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#134e4a] no-underline hover:underline"
          >
            {actionLabel}
            <ChevronRight size={12} aria-hidden />
          </Link>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Section panel inside MainPanel — ProcurementFormSection style.
 */
export function ProfileModuleSection({ id, title, subtitle, actionTo, actionLabel, children, className = '' }) {
  return (
    <section id={id} className={`scroll-mt-28 ${className}`}>
      <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm">
        <ProfileAccentBar />
        <div className="p-4 sm:p-5">
          {(title || actionTo) && (
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              {title ? (
                <div>
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{title}</h3>
                  {subtitle ? <p className="mt-1 text-sm leading-relaxed text-slate-600">{subtitle}</p> : null}
                </div>
              ) : (
                <div />
              )}
              {actionTo ? (
                <Link
                  to={actionTo}
                  className="inline-flex min-h-9 items-center gap-0.5 text-xs font-semibold text-[#134e4a] no-underline hover:underline"
                >
                  {actionLabel}
                  <ChevronRight size={14} aria-hidden />
                </Link>
              ) : null}
            </div>
          )}
          {children}
        </div>
      </div>
    </section>
  );
}

/** Status chip — Procurement PILL pattern. */
export function ProfileStatusChip({ children, variant = 'pending' }) {
  const styles = {
    approved: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    pending: 'border-amber-200 bg-amber-50 text-amber-900',
    rejected: 'border-rose-200 bg-rose-50 text-rose-800',
    info: 'border-sky-200 bg-sky-50 text-sky-900',
    neutral: 'border-slate-200 bg-slate-50 text-slate-700',
  };
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${styles[variant] || styles.neutral}`}
    >
      {children}
    </span>
  );
}

/** Compact list row — Procurement CARD_ROW pattern. */
export function ProfileListRow({ children, to, onClick, className = '' }) {
  const base =
    'flex items-center justify-between gap-3 rounded-lg border border-slate-200/60 bg-white/70 px-3 py-2.5 text-sm shadow-sm transition-colors hover:bg-white';
  if (to) {
    return (
      <Link to={to} className={`${base} no-underline text-slate-800 ${className}`}>
        {children}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${base} w-full text-left ${className}`}>
        {children}
      </button>
    );
  }
  return <div className={`${base} ${className}`}>{children}</div>;
}

export function ProfileKpiSkeleton({ count = 3 }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
          <div className="h-1 bg-slate-200" />
          <div className="space-y-3 p-4">
            <div className="h-2 w-20 rounded bg-slate-200" />
            <div className="h-6 w-2/3 rounded bg-slate-100" />
            <div className="h-2 w-24 rounded bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}
