import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, ChevronRight, Mail, User } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useUserProfile } from '../../context/UserProfileContext';
import { WORKSPACE_DEPARTMENT_LABELS } from '../../lib/departmentWorkspace';
import { ACCOUNT_PATH, HR_SELF_SERVICE_PATH } from '../../lib/hrSelfServiceRoutes';
import { FAMILY_BENEFITS } from '../../lib/familyBenefitsUi';
import { DOMESTIC_BENEFITS } from '../../lib/domesticStaffUi';
import { ProfileOnboardingCompleteChip } from './ProfileOnboardingWizard';

const COHORT_BADGE = {
  scholarship: 'bg-white/20 text-white ring-1 ring-white/30',
  domestic: 'bg-white/20 text-white ring-1 ring-white/30',
  special: 'bg-white/20 text-white ring-1 ring-white/30',
  employee: 'bg-white/20 text-white ring-1 ring-white/30',
};

function MetaPill({ icon: Icon, children }) {
  if (!children) return null;
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white/95 ring-1 ring-white/20">
      {Icon ? <Icon size={12} className="shrink-0 opacity-80" aria-hidden /> : null}
      <span className="truncate">{children}</span>
    </span>
  );
}

export function ProfileHeroCard() {
  const ws = useWorkspace();
  const { hr, user: hrUser, cohort, hasHrSelfService, initialLoading } = useUserProfile();

  const sessionUser = ws?.session?.user;
  const user = hrUser || sessionUser;
  const fb = hr?.familyBenefits;
  const db = hr?.domesticBenefits;

  const branchId = hr?.branchId || ws?.session?.workspaceBranchId || ws?.snapshot?.workspaceBranchId;
  const branches = ws?.snapshot?.workspaceBranches ?? ws?.session?.branches ?? [];
  const branchName = hr?.branchName || branches.find((b) => b.id === branchId)?.name || branchId;

  const initials = (user?.displayName || user?.username || 'U')
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const avatarUrl = hr?.photoUrl || user?.avatarUrl;
  const showAvatar = avatarUrl && (avatarUrl.startsWith('https://') || avatarUrl.startsWith('data:image/'));

  const deptLabel =
    hr?.department ||
    WORKSPACE_DEPARTMENT_LABELS?.[sessionUser?.departmentKey] ||
    sessionUser?.departmentKey ||
    user?.roleLabel;

  const roleLine = hr?.jobTitle || user?.roleLabel || user?.roleKey || 'User';
  const badgeLabel =
    cohort === 'scholarship'
      ? FAMILY_BENEFITS.badgeLabel
      : cohort === 'domestic'
        ? DOMESTIC_BENEFITS.badgeLabel
        : cohort === 'special'
          ? 'HQ / special'
          : cohort === 'employee'
            ? 'Employee'
            : null;

  const hrHubTo =
    cohort === 'scholarship'
      ? HR_SELF_SERVICE_PATH.school
      : cohort === 'domestic'
        ? HR_SELF_SERVICE_PATH.home
        : hasHrSelfService
          ? HR_SELF_SERVICE_PATH.overview
          : null;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zarewa-teal via-[#0d5c56] to-zarewa-teal p-5 text-white shadow-lg shadow-teal-950/15 sm:p-7">
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl"
        aria-hidden
      />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-4">
          {showAvatar ? (
            <img
              src={avatarUrl}
              alt=""
              className="h-16 w-16 shrink-0 rounded-2xl border-2 border-white/30 object-cover shadow-md sm:h-[4.5rem] sm:w-[4.5rem]"
            />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border-2 border-white/30 bg-white/10 text-xl font-black shadow-md sm:h-[4.5rem] sm:w-[4.5rem]">
              {initials}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {badgeLabel ? (
                <span className={`rounded-full px-2.5 py-0.5 text-ui-xs font-bold uppercase tracking-wide ${COHORT_BADGE[cohort] || COHORT_BADGE.employee}`}>
                  {badgeLabel}
                </span>
              ) : null}
              <ProfileOnboardingCompleteChip onDark />
            </div>
            <h2 className="mt-1 truncate text-xl font-black tracking-tight sm:text-2xl">
              {user?.displayName || '—'}
            </h2>
            <p className="mt-0.5 text-sm font-medium text-teal-50/90">
              {cohort === 'scholarship'
                ? [fb?.schoolName, fb?.classLevel].filter(Boolean).join(' · ') || 'Scholarship beneficiary'
                : cohort === 'domestic'
                  ? [db?.designation, db?.workLocation].filter(Boolean).join(' · ') || 'Domestic staff'
                  : roleLine}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {hr?.employeeNo ? (
                <MetaPill icon={User}>
                  <span className="font-mono tracking-wide">{hr.employeeNo}</span>
                </MetaPill>
              ) : null}
              {branchName ? <MetaPill icon={Building2}>{branchName}</MetaPill> : null}
              {deptLabel && cohort !== 'scholarship' && cohort !== 'domestic' ? (
                <MetaPill>{deptLabel}</MetaPill>
              ) : null}
              {user?.email ? <MetaPill icon={Mail}>{user.email}</MetaPill> : null}
            </div>
          </div>
        </div>
        {!initialLoading ? (
          <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col sm:items-stretch">
            <Link
              to={ACCOUNT_PATH.account}
              className="inline-flex min-h-10 items-center justify-center gap-1 rounded-xl bg-white px-4 py-2 text-xs font-bold text-zarewa-teal no-underline shadow-sm transition hover:bg-teal-50"
            >
              Account settings
              <ChevronRight size={14} aria-hidden />
            </Link>
            {hrHubTo ? (
              <Link
                to={hrHubTo}
                className="inline-flex min-h-10 items-center justify-center gap-1 rounded-xl bg-white/15 px-4 py-2 text-xs font-bold text-white no-underline ring-1 ring-white/25 transition hover:bg-white/25"
              >
                My HR
                <ChevronRight size={14} aria-hidden />
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
      {initialLoading && hasHrSelfService ? (
        <div className="relative mt-4 flex gap-2" aria-hidden>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-7 w-24 animate-pulse rounded-full bg-white/20" />
          ))}
        </div>
      ) : null}
    </div>
  );
}
