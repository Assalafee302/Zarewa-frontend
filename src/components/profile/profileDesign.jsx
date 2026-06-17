import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

/** Optional thin accent — use sparingly (not on every panel). */
export function ProfileAccentBar({ className = '' }) {
  return <div className={`h-0.5 shrink-0 bg-gradient-to-r from-teal-400 to-[#134e4a] ${className}`} aria-hidden />;
}

/**
 * Section title row — flat header, no card wrapper (Sales / Procurement style).
 */
export function ProfileSectionHeader({ title, subtitle, action, className = '' }) {
  return (
    <div className={`mb-3 flex flex-wrap items-end justify-between gap-3 ${className}`}>
      <div className="min-w-0">
        {title ? <h3 className="text-sm font-bold text-slate-900">{title}</h3> : null}
        {subtitle ? <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

/**
 * KPI tile — matches Procurement dashboard stat cards (no nested accent bar).
 */
export function ProfileKpiCard({
  label,
  value,
  hint,
  icon: Icon,
  to,
  actionLabel,
  highlight = false,
}) {
  const shell = highlight
    ? 'border-teal-200/90 bg-gradient-to-br from-teal-50/50 to-white'
    : 'border-slate-200/90 bg-white';

  return (
    <div className={`flex h-full flex-col rounded-xl border p-4 shadow-sm ${shell}`}>
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {Icon ? <Icon size={13} className="text-[#134e4a]" aria-hidden /> : null}
        {label}
      </p>
      <div className="mt-2 min-h-[2rem] flex-1 text-slate-900">{value}</div>
      {hint ? <p className="mt-2 border-t border-slate-100 pt-2 text-[11px] leading-relaxed text-slate-500">{hint}</p> : null}
      {to && actionLabel ? (
        <Link
          to={to}
          className="mt-3 inline-flex min-h-8 items-center gap-0.5 text-xs font-semibold text-[#134e4a] no-underline hover:underline"
        >
          {actionLabel}
          <ChevronRight size={14} aria-hidden />
        </Link>
      ) : null}
    </div>
  );
}

/**
 * Content section — single slate panel, not card-in-card.
 */
export function ProfileModuleSection({
  id,
  title,
  subtitle,
  actionTo,
  actionLabel,
  children,
  className = '',
  flush = false,
}) {
  return (
    <section id={id} className={`scroll-mt-28 ${className}`}>
      {(title || actionTo) && (
        <ProfileSectionHeader
          title={title}
          subtitle={subtitle}
          action={
            actionTo ? (
              <Link
                to={actionTo}
                className="inline-flex min-h-9 items-center gap-0.5 text-xs font-semibold text-[#134e4a] no-underline hover:underline"
              >
                {actionLabel}
                <ChevronRight size={14} aria-hidden />
              </Link>
            ) : null
          }
        />
      )}
      <div
        className={
          flush
            ? ''
            : 'rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 sm:p-5'
        }
      >
        {children}
      </div>
    </section>
  );
}

/** Status chip */
export function ProfileStatusChip({ children, variant = 'pending' }) {
  const styles = {
    approved: 'bg-emerald-100 text-emerald-800',
    pending: 'bg-amber-100 text-amber-900',
    rejected: 'bg-rose-100 text-rose-800',
    info: 'bg-sky-100 text-sky-900',
    neutral: 'bg-slate-100 text-slate-700',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${styles[variant] || styles.neutral}`}
    >
      {children}
    </span>
  );
}

/** Table-style list row */
export function ProfileListRow({ children, to, onClick, className = '' }) {
  const base =
    'flex w-full items-center justify-between gap-3 border-b border-slate-100 px-1 py-3 text-sm transition-colors last:border-b-0 hover:bg-slate-50/80';
  if (to) {
    return (
      <Link to={to} className={`${base} no-underline text-slate-800 ${className}`}>
        {children}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${base} text-left ${className}`}>
        {children}
      </button>
    );
  }
  return <div className={`${base} ${className}`}>{children}</div>;
}

export function ProfileKpiSkeleton({ count = 3 }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-xl border border-slate-100 bg-white p-4">
          <div className="h-2 w-20 rounded bg-slate-200" />
          <div className="mt-3 h-7 w-2/3 rounded bg-slate-100" />
          <div className="mt-3 h-2 w-24 rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}
