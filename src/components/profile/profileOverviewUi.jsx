import React from 'react';
import { FAMILY_BENEFITS } from '../../lib/familyBenefitsUi';
import { DOMESTIC_BENEFITS } from '../../lib/domesticStaffUi';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { ProfileKpiCard, ProfileModuleSection, ProfileAccentBar } from './profileDesign';
import { ProfileOnboardingCompleteChip } from './ProfileOnboardingWizard';

const COHORT_CHIP = {
  scholarship: 'bg-violet-50 text-violet-700 border-violet-200',
  domestic: 'bg-amber-50 text-amber-800 border-amber-200',
  special: 'bg-sky-50 text-sky-800 border-sky-200',
  employee: 'bg-teal-50 text-teal-800 border-teal-200',
};

/** @deprecated Prefer ProfileModuleSection — thin wrapper for legacy imports. */
export function ProfileOverviewSection({ id, title, subtitle, actionTo, actionLabel, children, className = '' }) {
  return (
    <ProfileModuleSection
      id={id}
      title={title}
      subtitle={subtitle}
      actionTo={actionTo}
      actionLabel={actionLabel}
      className={className}
    >
      {children}
    </ProfileModuleSection>
  );
}

export function ProfileHubBanner({ to, title, description, tone = 'slate' }) {
  const tones = {
    slate: 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100/80',
    teal: 'border-teal-100 bg-teal-50/50 hover:border-teal-200 hover:bg-teal-50',
    violet: 'border-violet-100 bg-violet-50/50 hover:border-violet-200 hover:bg-violet-50',
    amber: 'border-amber-100 bg-amber-50/50 hover:border-amber-200 hover:bg-amber-50',
  };
  return (
    <Link
      to={to}
      className={`group relative flex min-h-[72px] items-center justify-between gap-4 overflow-hidden rounded-xl border p-4 no-underline transition-colors ${tones[tone] || tones.slate}`}
    >
      <ProfileAccentBar className="absolute inset-x-0 top-0 rounded-none" />
      <div className="min-w-0 pt-1">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{description}</p>
      </div>
      <ChevronRight
        size={18}
        className="shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-slate-600"
        aria-hidden
      />
    </Link>
  );
}

export function ProfileQuickAction({ to, icon: Icon, children }) {
  return (
    <Link
      to={to}
      className="relative flex min-h-[72px] flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border border-slate-200/90 bg-white px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-700 shadow-sm no-underline transition-colors hover:border-[#134e4a]/30 hover:bg-teal-50/30"
    >
      <ProfileAccentBar className="absolute inset-x-0 top-0 rounded-none" />
      {Icon ? <Icon size={18} className="mt-1 text-[#134e4a]" aria-hidden /> : null}
      <span className="text-center leading-tight">{children}</span>
    </Link>
  );
}

/** @deprecated Use ProfileKpiCard */
export function ProfileMetricCard({ title, footerTo, footerLabel, children }) {
  return (
    <ProfileKpiCard
      label={title}
      value={children}
      to={footerTo}
      actionLabel={footerLabel}
    />
  );
}

export { ProfileKpiSkeleton as ProfileMetricSkeleton } from './profileDesign';

export function ProfileHeroSkeleton() {
  return (
    <div
      className="animate-pulse overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm"
      aria-busy="true"
      aria-label="Loading profile"
    >
      <div className="h-1 bg-slate-200" />
      <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-start">
        <div className="h-16 w-16 shrink-0 rounded-lg bg-slate-200" />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="h-2 w-24 rounded bg-slate-200" />
          <div className="h-6 w-48 max-w-full rounded bg-slate-200" />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-8 rounded-lg bg-slate-100" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

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
    cohort === 'special'
      ? 'HQ / special'
      : cohort === 'domestic'
        ? DOMESTIC_BENEFITS.badgeLabel
        : cohort === 'scholarship'
          ? FAMILY_BENEFITS.badgeLabel
          : 'Employee';

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm">
      <ProfileAccentBar />
      <div className="flex flex-wrap items-center gap-4 p-4 sm:p-5">
        {showAvatar ? (
          <img
            src={hr.photoUrl}
            alt=""
            className="h-14 w-14 shrink-0 rounded-lg border border-slate-200 object-cover"
          />
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-[#134e4a] text-lg font-bold text-white">
            {initials}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-lg font-black tracking-tight text-slate-900">{user?.displayName || '—'}</p>
            {cohort ? (
              <span className={`rounded-md border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${chipClass}`}>
                {chipLabel}
              </span>
            ) : null}
            <ProfileOnboardingCompleteChip />
          </div>
          <p className="mt-0.5 truncate text-sm text-slate-600">{hr?.jobTitle || '—'}</p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
            {hr?.employeeNo ? (
              <span>
                Emp <strong className="font-semibold text-slate-800">{hr.employeeNo}</strong>
              </span>
            ) : null}
            {hr?.branchName || hr?.branchId ? (
              <span>
                Branch <strong className="font-semibold text-slate-800">{hr.branchName || hr.branchId}</strong>
              </span>
            ) : null}
            {hr?.department ? (
              <span>
                Dept <strong className="font-semibold text-slate-800">{hr.department}</strong>
              </span>
            ) : null}
          </div>
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

export function ProfileEmptyState({ title, description, actionTo, actionLabel }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center sm:px-6">
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      {description ? <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{description}</p> : null}
      {actionTo && actionLabel ? (
        <Link
          to={actionTo}
          className="z-btn-secondary mt-4 !px-4 !py-2 !text-[10px] uppercase tracking-wide"
        >
          {actionLabel}
          <ChevronRight size={14} aria-hidden />
        </Link>
      ) : null}
    </div>
  );
}
