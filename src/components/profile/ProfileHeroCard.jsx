import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useUserProfile } from '../../context/UserProfileContext';
import { WORKSPACE_DEPARTMENT_LABELS } from '../../lib/departmentWorkspace';
import { ACCOUNT_PATH } from '../../lib/hrSelfServiceRoutes';
import { FAMILY_BENEFITS } from '../../lib/familyBenefitsUi';
import { DOMESTIC_BENEFITS } from '../../lib/domesticStaffUi';

const COHORT_BADGE = {
  scholarship: { label: FAMILY_BENEFITS.badgeLabel, className: 'bg-violet-400/25 text-violet-50 border-violet-300/30' },
  domestic: { label: DOMESTIC_BENEFITS.badgeLabel, className: 'bg-amber-400/25 text-amber-50 border-amber-300/30' },
  special: { label: 'HQ / special', className: 'bg-sky-400/20 text-sky-50 border-sky-300/30' },
  employee: { label: 'Employee', className: 'bg-white/15 text-teal-50 border-white/25' },
};

export function ProfileHeroCard() {
  const ws = useWorkspace();
  const { hr, user: hrUser, cohort, hasHrSelfService, initialLoading } = useUserProfile();

  const sessionUser = ws?.session?.user;
  const user = hrUser || sessionUser;
  const fb = hr?.familyBenefits;
  const db = hr?.domesticBenefits;

  const branchId =
    hr?.branchId || ws?.session?.workspaceBranchId || ws?.snapshot?.workspaceBranchId;
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
  const showAvatar =
    avatarUrl && (avatarUrl.startsWith('https://') || avatarUrl.startsWith('data:image/'));

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
    <div
      className={`relative overflow-hidden rounded-3xl border p-6 text-white shadow-lg ${
        isFamilyBenefits
          ? 'border-violet-200/80 bg-gradient-to-br from-violet-700 via-violet-800 to-indigo-900 shadow-violet-900/15'
          : isDomesticHub
            ? 'border-amber-200/80 bg-gradient-to-br from-amber-700 via-amber-800 to-orange-950 shadow-amber-900/15'
            : 'border-slate-200/80 bg-gradient-to-br from-[#134e4a] via-[#0f766e] to-teal-800 shadow-teal-900/10'
      }`}
    >
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl"
        aria-hidden
      />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start">
        {showAvatar ? (
          <img
            src={avatarUrl}
            alt=""
            className="h-20 w-20 shrink-0 rounded-2xl border-2 border-white/30 object-cover shadow-lg"
          />
        ) : (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border-2 border-white/30 bg-white/15 text-2xl font-black shadow-lg backdrop-blur-sm">
            {initials}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p
              className={`text-[10px] font-bold uppercase tracking-[0.2em] ${
                isFamilyBenefits ? 'text-violet-200/90' : isDomesticHub ? 'text-amber-200/90' : 'text-teal-100/90'
              }`}
            >
              {isFamilyBenefits ? FAMILY_BENEFITS.hubEyebrow : isDomesticHub ? DOMESTIC_BENEFITS.hubEyebrow : 'My profile'}
            </p>
            {badge ? (
              <span
                className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${badge.className}`}
              >
                {badge.label}
              </span>
            ) : null}
          </div>
          <h2 className="mt-1 truncate text-2xl font-black tracking-tight">{user?.displayName || '—'}</h2>
          {isFamilyBenefits ? (
            <>
              {fb?.familyParentLine ? (
                <p className="mt-1 text-sm font-medium text-violet-100">{fb.familyParentLine}</p>
              ) : null}
              <p className="mt-1 text-sm text-violet-100/90">
                {fb?.schoolName || 'School not set'}
                {fb?.classLevel ? ` · ${fb.classLevel}` : ''}
              </p>
              {fb?.currentTerm || fb?.academicSession ? (
                <p className="mt-0.5 text-xs text-violet-200/80">
                  {[fb?.currentTerm, fb?.academicSession].filter(Boolean).join(' · ')}
                </p>
              ) : null}
            </>
          ) : isDomesticHub ? (
            <>
              {db?.executiveEmployerLine ? (
                <p className="mt-1 text-sm font-medium text-amber-100">{db.executiveEmployerLine}</p>
              ) : null}
              <p className="mt-1 text-sm text-amber-100/90">
                {db?.designation || roleLine}
                {db?.workLocation ? ` · ${db.workLocation}` : ''}
              </p>
            </>
          ) : (
            <p className="mt-1 text-sm font-medium text-teal-50/90">{roleLine}</p>
          )}
          <dl className="mt-4 grid grid-cols-1 gap-x-4 gap-y-2 text-xs sm:grid-cols-2 lg:grid-cols-3">
            {isFamilyBenefits ? (
              <>
                {fb?.linkedExecutiveLabel ? (
                  <div>
                    <dt className="text-violet-200/70">Linked executive</dt>
                    <dd className="font-semibold text-white">{fb.linkedExecutiveLabel}</dd>
                  </div>
                ) : null}
                {user?.email ? (
                  <div>
                    <dt className="text-violet-200/70">Email</dt>
                    <dd className="truncate font-semibold text-white">{user.email}</dd>
                  </div>
                ) : null}
                {user?.phone ? (
                  <div>
                    <dt className="text-violet-200/70">Phone</dt>
                    <dd className="font-semibold text-white">{user.phone}</dd>
                  </div>
                ) : null}
              </>
            ) : isDomesticHub ? (
              <>
                {db?.assignedExecutiveLabel ? (
                  <div>
                    <dt className="text-amber-200/70">Employer</dt>
                    <dd className="font-semibold text-white">{db.assignedExecutiveLabel}</dd>
                  </div>
                ) : null}
                {user?.email ? (
                  <div>
                    <dt className="text-amber-200/70">Email</dt>
                    <dd className="truncate font-semibold text-white">{user.email}</dd>
                  </div>
                ) : null}
              </>
            ) : (
              <>
                {hr?.employeeNo ? (
                  <div>
                    <dt className="text-teal-100/70">Employee no.</dt>
                    <dd className="font-mono font-semibold text-white">{hr.employeeNo}</dd>
                  </div>
                ) : null}
                {user?.username ? (
                  <div>
                    <dt className="text-teal-100/70">Username</dt>
                    <dd className="font-mono font-semibold text-white">@{user.username}</dd>
                  </div>
                ) : null}
                {user?.email ? (
                  <div>
                    <dt className="text-teal-100/70">Email</dt>
                    <dd className="truncate font-semibold text-white">{user.email}</dd>
                  </div>
                ) : null}
                {user?.phone ? (
                  <div>
                    <dt className="text-teal-100/70">Phone</dt>
                    <dd className="font-semibold text-white">{user.phone}</dd>
                  </div>
                ) : null}
                {branchName ? (
                  <div>
                    <dt className="text-teal-100/70">Branch</dt>
                    <dd className="font-semibold text-white">{branchName}</dd>
                  </div>
                ) : null}
                <div>
                  <dt className="text-teal-100/70">Department</dt>
                  <dd className="font-semibold text-white">{deptLabel}</dd>
                </div>
                {hr?.dateJoinedIso ? (
                  <div>
                    <dt className="text-teal-100/70">Date joined</dt>
                    <dd className="font-semibold text-white">{hr.dateJoinedIso}</dd>
                  </div>
                ) : null}
                {hr?.employmentType ? (
                  <div>
                    <dt className="text-teal-100/70">Employment type</dt>
                    <dd className="font-semibold capitalize text-white">{hr.employmentType}</dd>
                  </div>
                ) : null}
              </>
            )}
          </dl>
          {initialLoading && hasHrSelfService ? (
            <div className="mt-4 space-y-2" aria-hidden>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-2 animate-pulse rounded bg-white/25" style={{ width: `${60 + i * 10}%` }} />
              ))}
            </div>
          ) : null}
        </div>
        {!initialLoading ? (
          <Link
            to={ACCOUNT_PATH.account}
            className="inline-flex min-h-11 shrink-0 items-center gap-1 self-start rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-white no-underline backdrop-blur-sm transition hover:bg-white/20 sm:self-center"
          >
            Edit account
            <ChevronRight size={14} aria-hidden />
          </Link>
        ) : null}
      </div>
    </div>
  );
}
