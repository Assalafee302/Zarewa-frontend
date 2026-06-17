import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useUserProfile } from '../../context/UserProfileContext';
import { WORKSPACE_DEPARTMENT_LABELS } from '../../lib/departmentWorkspace';
import { ACCOUNT_PATH } from '../../lib/hrSelfServiceRoutes';
import { FAMILY_BENEFITS } from '../../lib/familyBenefitsUi';
import { DOMESTIC_BENEFITS } from '../../lib/domesticStaffUi';
import { ProfileAccentBar } from './profileDesign';
import { ProfileOnboardingCompleteChip } from './ProfileOnboardingWizard';

const COHORT_BADGE = {
  scholarship: { label: FAMILY_BENEFITS.badgeLabel, className: 'bg-violet-100 text-violet-800 border-violet-200' },
  domestic: { label: DOMESTIC_BENEFITS.badgeLabel, className: 'bg-amber-100 text-amber-900 border-amber-200' },
  special: { label: 'HQ / special', className: 'bg-sky-100 text-sky-800 border-sky-200' },
  employee: { label: 'Employee', className: 'bg-teal-50 text-teal-900 border-teal-200' },
};

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
    user?.roleLabel ||
    '—';

  const roleLine = hr?.jobTitle || user?.roleLabel || user?.roleKey || 'User';
  const badge = COHORT_BADGE[cohort];
  const isFamilyBenefits = cohort === 'scholarship';
  const isDomesticHub = cohort === 'domestic';

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm">
      <ProfileAccentBar />
      <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-start sm:p-6">
        {showAvatar ? (
          <img
            src={avatarUrl}
            alt=""
            className="h-16 w-16 shrink-0 rounded-lg border border-slate-200 object-cover shadow-sm"
          />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-[#134e4a] text-xl font-black text-white shadow-sm">
            {initials}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {badge ? (
              <span className={`rounded-md border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${badge.className}`}>
                {badge.label}
              </span>
            ) : null}
            <ProfileOnboardingCompleteChip />
          </div>
          <h2 className="z-page-title mt-1 truncate">{user?.displayName || '—'}</h2>
          {isFamilyBenefits ? (
            <>
              {fb?.familyParentLine ? <p className="z-meta-text mt-1">{fb.familyParentLine}</p> : null}
              <p className="text-sm text-slate-600">
                {fb?.schoolName || 'School not set'}
                {fb?.classLevel ? ` · ${fb.classLevel}` : ''}
              </p>
            </>
          ) : isDomesticHub ? (
            <>
              {db?.executiveEmployerLine ? <p className="z-meta-text mt-1">{db.executiveEmployerLine}</p> : null}
              <p className="text-sm text-slate-600">
                {db?.designation || roleLine}
                {db?.workLocation ? ` · ${db.workLocation}` : ''}
              </p>
            </>
          ) : (
            <p className="text-sm text-slate-600">{roleLine}</p>
          )}
          <dl className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {isFamilyBenefits ? (
              <>
                {fb?.linkedExecutiveLabel ? (
                  <div className="z-list-row-compact">
                    <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Linked executive</dt>
                    <dd className="mt-0.5 font-semibold text-slate-900">{fb.linkedExecutiveLabel}</dd>
                  </div>
                ) : null}
                {user?.email ? (
                  <div className="z-list-row-compact">
                    <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Email</dt>
                    <dd className="mt-0.5 truncate font-medium text-slate-900">{user.email}</dd>
                  </div>
                ) : null}
              </>
            ) : isDomesticHub ? (
              <>
                {db?.assignedExecutiveLabel ? (
                  <div className="z-list-row-compact">
                    <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Employer</dt>
                    <dd className="mt-0.5 font-semibold text-slate-900">{db.assignedExecutiveLabel}</dd>
                  </div>
                ) : null}
              </>
            ) : (
              <>
                {hr?.employeeNo ? (
                  <div className="z-list-row-compact">
                    <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Employee no.</dt>
                    <dd className="mt-0.5 font-mono font-semibold text-slate-900">{hr.employeeNo}</dd>
                  </div>
                ) : null}
                {user?.username ? (
                  <div className="z-list-row-compact">
                    <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Username</dt>
                    <dd className="mt-0.5 font-mono font-semibold text-slate-900">@{user.username}</dd>
                  </div>
                ) : null}
                {branchName ? (
                  <div className="z-list-row-compact">
                    <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Branch</dt>
                    <dd className="mt-0.5 font-medium text-slate-900">{branchName}</dd>
                  </div>
                ) : null}
                <div className="z-list-row-compact">
                  <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Department</dt>
                  <dd className="mt-0.5 font-medium text-slate-900">{deptLabel}</dd>
                </div>
              </>
            )}
          </dl>
          {initialLoading && hasHrSelfService ? (
            <div className="mt-4 space-y-2" aria-hidden>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-2 animate-pulse rounded bg-slate-200" style={{ width: `${60 + i * 10}%` }} />
              ))}
            </div>
          ) : null}
        </div>
        {!initialLoading ? (
          <Link
            to={ACCOUNT_PATH.account}
            className="z-btn-secondary !px-4 !py-2 !text-[10px] uppercase tracking-wide shrink-0 self-start sm:self-center"
          >
            Edit account
            <ChevronRight size={14} aria-hidden />
          </Link>
        ) : null}
      </div>
    </div>
  );
}
