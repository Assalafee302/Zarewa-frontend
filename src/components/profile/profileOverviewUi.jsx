import React from 'react';
import { FAMILY_BENEFITS } from '../../lib/familyBenefitsUi';
import { DOMESTIC_BENEFITS } from '../../lib/domesticStaffUi';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { ProfileKpiCard, ProfileModuleSection } from './profileDesign';
import { ProfileOnboardingCompleteChip } from './ProfileOnboardingWizard';

const COHORT_CHIP = {
  scholarship: 'bg-violet-100 text-violet-800',
  domestic: 'bg-amber-100 text-amber-900',
  special: 'bg-sky-100 text-sky-800',
  employee: 'bg-teal-100 text-teal-900',
};

/** @deprecated Prefer ProfileModuleSection */
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
    slate: 'border-slate-200 bg-slate-50 hover:bg-slate-100',
    teal: 'border-teal-200 bg-teal-50/80 hover:bg-teal-50',
    violet: 'border-violet-200 bg-violet-50/80 hover:bg-violet-50',
    amber: 'border-amber-200 bg-amber-50/80 hover:bg-amber-50',
  };
  return (
    <Link
      to={to}
      className={`group flex items-center justify-between gap-4 rounded-xl border p-4 no-underline transition ${tones[tone] || tones.slate}`}
    >
      <div className="min-w-0">
        <p className="text-sm font-bold text-slate-900">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{description}</p>
      </div>
      <ChevronRight
        size={18}
        className="shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-[#134e4a]"
        aria-hidden
      />
    </Link>
  );
}

export function ProfileQuickAction({ to, icon: Icon, children }) {
  return (
    <Link
      to={to}
      className="flex min-h-[4rem] flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs font-semibold text-slate-700 no-underline shadow-sm transition hover:border-[#134e4a]/30 hover:bg-teal-50/40"
    >
      {Icon ? <Icon size={20} className="text-[#134e4a]" aria-hidden /> : null}
      <span className="text-center leading-tight">{children}</span>
    </Link>
  );
}

/** @deprecated Use ProfileKpiCard */
export function ProfileMetricCard({ title, footerTo, footerLabel, children }) {
  return (
    <ProfileKpiCard label={title} value={children} to={footerTo} actionLabel={footerLabel} />
  );
}

export { ProfileKpiSkeleton as ProfileMetricSkeleton } from './profileDesign';

export function ProfileHeroSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl bg-gradient-to-br from-slate-200 to-slate-300 p-7" aria-busy="true" aria-label="Loading profile">
      <div className="flex gap-4">
        <div className="h-16 w-16 shrink-0 rounded-2xl bg-white/40" />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="h-3 w-20 rounded-full bg-white/40" />
          <div className="h-7 w-48 max-w-full rounded bg-white/50" />
          <div className="flex gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-7 w-20 rounded-full bg-white/30" />
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
    <div className="flex flex-wrap items-center gap-4 border-b border-slate-200/80 pb-5">
      {showAvatar ? (
        <img
          src={hr.photoUrl}
          alt=""
          className="h-14 w-14 shrink-0 rounded-xl border border-slate-200 object-cover shadow-sm"
        />
      ) : (
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#134e4a] text-lg font-bold text-white shadow-sm">
          {initials}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-lg font-black tracking-tight text-slate-900">{user?.displayName || '—'}</p>
          {cohort ? (
            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${chipClass}`}>
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
  );
}

export function ProfileInlineAlert({ variant = 'error', children }) {
  const styles = {
    error: 'border-red-200 bg-red-50 text-red-800',
    warning: 'border-amber-200 bg-amber-50 text-amber-900',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
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
    <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center sm:px-6">
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      {description ? <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{description}</p> : null}
      {actionTo && actionLabel ? (
        <Link
          to={actionTo}
          className="z-btn-secondary mt-4 !px-4 !py-2 !text-xs font-semibold"
        >
          {actionLabel}
          <ChevronRight size={14} aria-hidden />
        </Link>
      ) : null}
    </div>
  );
}
