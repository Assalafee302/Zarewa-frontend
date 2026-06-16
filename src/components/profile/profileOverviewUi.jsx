import React from 'react';
import { FAMILY_BENEFITS } from '../../lib/familyBenefitsUi';
import { DOMESTIC_BENEFITS } from '../../lib/domesticStaffUi';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

const COHORT_CHIP = {
  scholarship: 'bg-violet-100 text-violet-800 border-violet-200',
  domestic: 'bg-amber-100 text-amber-900 border-amber-200',
  special: 'bg-sky-100 text-sky-900 border-sky-200',
  employee: 'bg-teal-100 text-teal-900 border-teal-200',
};

export function ProfileOverviewSection({ id, title, subtitle, actionTo, actionLabel, children, className = '' }) {
  return (
    <section
      id={id}
      className={`scroll-mt-28 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm sm:p-5 ${className}`}
    >
      {title || actionTo ? (
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          {title ? (
            <div>
              <h3 className="text-sm font-black text-slate-900">{title}</h3>
              {subtitle ? <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p> : null}
            </div>
          ) : (
            <div />
          )}
          {actionTo ? (
            <Link
              to={actionTo}
              className="inline-flex min-h-11 items-center gap-0.5 text-[11px] font-bold uppercase tracking-wide text-[#134e4a] no-underline hover:underline"
            >
              {actionLabel}
              <ChevronRight size={14} aria-hidden />
            </Link>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function ProfileHubBanner({ to, title, description, tone = 'teal' }) {
  const tones = {
    teal: 'border-teal-100 bg-gradient-to-br from-teal-50/90 to-white hover:border-teal-200 hover:shadow-md',
    violet: 'border-violet-100 bg-gradient-to-br from-violet-50/80 to-white hover:border-violet-200 hover:shadow-md',
    amber: 'border-amber-100 bg-gradient-to-br from-amber-50/80 to-white hover:border-amber-200 hover:shadow-md',
    slate: 'border-slate-200 bg-gradient-to-br from-slate-50/90 to-white hover:border-slate-300 hover:shadow-md',
  };
  return (
    <Link
      to={to}
      className={`group flex min-h-[72px] items-center justify-between gap-4 rounded-2xl border p-4 no-underline shadow-sm transition-all active:scale-[0.99] ${tones[tone]}`}
    >
      <div className="min-w-0">
        <p className="text-sm font-black text-[#134e4a]">{title}</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-600">{description}</p>
      </div>
      <ChevronRight
        size={20}
        className="shrink-0 text-[#134e4a]/50 transition group-hover:translate-x-0.5 group-hover:text-[#134e4a]"
        aria-hidden
      />
    </Link>
  );
}

export function ProfileQuickAction({ to, icon, children }) {
  return (
    <Link
      to={to}
      className="flex min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-[#134e4a] shadow-sm no-underline transition-colors hover:border-[#134e4a] hover:bg-teal-50/50 active:scale-[0.98] sm:text-[11px]"
    >
      <span className="text-lg" aria-hidden>
        {icon}
      </span>
      <span className="text-center leading-tight">{children}</span>
    </Link>
  );
}

export function ProfileMetricCard({ title, footerTo, footerLabel, children }) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">{title}</h3>
      <div className="min-h-[4.5rem] flex-1">{children}</div>
      {footerTo ? (
        <Link
          to={footerTo}
          className="mt-3 inline-flex min-h-9 items-center gap-0.5 text-[11px] font-bold uppercase text-[#134e4a] no-underline hover:underline"
        >
          {footerLabel}
          <ChevronRight size={12} aria-hidden />
        </Link>
      ) : null}
    </div>
  );
}

export function ProfileMetricSkeleton({ count = 3 }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Loading summary">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="mb-3 h-2 w-20 rounded bg-slate-200" />
          <div className="space-y-2">
            <div className="h-3 w-full rounded bg-slate-100" />
            <div className="h-3 w-2/3 rounded bg-slate-100" />
            <div className="h-5 w-1/2 rounded bg-slate-100" />
          </div>
          <div className="mt-4 h-2 w-24 rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

export function ProfileHeroSkeleton() {
  return (
    <div
      className="animate-pulse overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-br from-slate-200 to-slate-300 p-6 shadow-lg"
      aria-busy="true"
      aria-label="Loading profile"
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <div className="h-20 w-20 shrink-0 rounded-2xl bg-white/40" />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="h-2 w-24 rounded bg-white/50" />
          <div className="h-7 w-48 max-w-full rounded bg-white/50" />
          <div className="h-3 w-36 max-w-full rounded bg-white/40" />
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-9 rounded-lg bg-white/30" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Compact identity row for HR self-service overview (page header already shows section title).
 */
export function ProfileIdentityStrip({ user, hr, cohort }) {
  const initials = (user?.displayName || 'U')
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const showAvatar =
    hr?.photoUrl && (hr.photoUrl.startsWith('https://') || hr.photoUrl.startsWith('data:image/'));
  const chipClass = COHORT_CHIP[cohort] || COHORT_CHIP.employee;

  const chipLabel =
    cohort === 'special' ? 'HQ / special' : cohort === 'domestic' ? DOMESTIC_BENEFITS.badgeLabel : cohort === 'scholarship' ? FAMILY_BENEFITS.badgeLabel : 'Employee';

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-[#134e4a]/15 bg-gradient-to-r from-[#134e4a]/[0.06] via-teal-50/80 to-white p-4 shadow-sm">
      {showAvatar ? (
        <img
          src={hr.photoUrl}
          alt=""
          className="h-14 w-14 shrink-0 rounded-xl border-2 border-[#134e4a]/20 object-cover shadow-sm"
        />
      ) : (
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border-2 border-[#134e4a]/20 bg-[#134e4a] text-lg font-black text-white shadow-sm">
          {initials}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-lg font-black text-slate-900">{user?.displayName || '—'}</p>
          {cohort ? (
            <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${chipClass}`}>
              {chipLabel}
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 truncate text-sm text-slate-600">{hr?.jobTitle || '—'}</p>
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
          {hr?.employeeNo ? (
            <span>
              Emp. <strong className="font-semibold text-slate-700">{hr.employeeNo}</strong>
            </span>
          ) : null}
          {hr?.branchName || hr?.branchId ? (
            <span>
              Branch <strong className="font-semibold text-slate-700">{hr.branchName || hr.branchId}</strong>
            </span>
          ) : null}
          {hr?.department ? (
            <span>
              Dept <strong className="font-semibold text-slate-700">{hr.department}</strong>
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function ProfileInlineAlert({ variant = 'error', children }) {
  const styles = {
    error: 'border-red-100 bg-red-50 text-red-800',
    warning: 'border-amber-100 bg-amber-50 text-amber-900',
    success: 'border-emerald-100 bg-emerald-50 text-emerald-900',
    info: 'border-slate-200 bg-slate-50 text-slate-700',
  };
  return (
    <div
      className={`rounded-xl border px-4 py-3 text-sm ${styles[variant] || styles.error}`}
      role={variant === 'error' ? 'alert' : 'status'}
    >
      {children}
    </div>
  );
}

export function ProfileEmptyHint({ children }) {
  return <p className="text-sm leading-relaxed text-slate-500">{children}</p>;
}

/**
 * @param {{ title: string; description?: string; actionTo?: string; actionLabel?: string }} props
 */
export function ProfileEmptyState({ title, description, actionTo, actionLabel }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-7 text-center sm:px-6 sm:py-8">
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      {description ? <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{description}</p> : null}
      {actionTo && actionLabel ? (
        <Link
          to={actionTo}
          className="mt-4 inline-flex min-h-11 items-center gap-1 rounded-xl border border-teal-200 bg-teal-50 px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-[#134e4a] no-underline transition hover:bg-teal-100"
        >
          {actionLabel}
          <ChevronRight size={14} aria-hidden />
        </Link>
      ) : null}
    </div>
  );
}
