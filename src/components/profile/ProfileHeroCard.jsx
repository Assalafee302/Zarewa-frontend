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
  scholarship: { label: FAMILY_BENEFITS.badgeLabel, className: 'bg-violet-100 text-violet-700' },
  domestic: { label: DOMESTIC_BENEFITS.badgeLabel, className: 'bg-amber-100 text-amber-800' },
  special: { label: 'HQ / special', className: 'bg-sky-100 text-sky-800' },
  employee: { label: 'Employee', className: 'bg-slate-100 text-slate-700' },
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
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        {showAvatar ? (
          <img
            src={avatarUrl}
            alt=""
            className="h-16 w-16 shrink-0 rounded-lg border border-slate-200 object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-xl font-semibold text-slate-700">
            {initials}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {badge ? (
              <span className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${badge.className}`}>
                {badge.label}
              </span>
            ) : null}
          </div>
          <h2 className="mt-1 truncate text-xl font-semibold text-slate-900">{user?.displayName || '—'}</h2>
          {isFamilyBenefits ? (
            <>
              {fb?.familyParentLine ? (
                <p className="mt-1 text-sm text-slate-600">{fb.familyParentLine}</p>
              ) : null}
              <p className="mt-1 text-sm text-slate-600">
                {fb?.schoolName || 'School not set'}
                {fb?.classLevel ? ` · ${fb.classLevel}` : ''}
              </p>
              {fb?.currentTerm || fb?.academicSession ? (
                <p className="mt-0.5 text-xs text-slate-500">
                  {[fb?.currentTerm, fb?.academicSession].filter(Boolean).join(' · ')}
                </p>
              ) : null}
            </>
          ) : isDomesticHub ? (
            <>
              {db?.executiveEmployerLine ? (
                <p className="mt-1 text-sm text-slate-600">{db.executiveEmployerLine}</p>
              ) : null}
              <p className="mt-1 text-sm text-slate-600">
                {db?.designation || roleLine}
                {db?.workLocation ? ` · ${db.workLocation}` : ''}
              </p>
            </>
          ) : (
            <p className="mt-1 text-sm text-slate-600">{roleLine}</p>
          )}
          <dl className="mt-4 grid grid-cols-1 gap-x-4 gap-y-2 text-xs sm:grid-cols-2 lg:grid-cols-3">
            {isFamilyBenefits ? (
              <>
                {fb?.linkedExecutiveLabel ? (
                  <div>
                    <dt className="text-slate-500">Linked executive</dt>
                    <dd className="font-medium text-slate-900">{fb.linkedExecutiveLabel}</dd>
                  </div>
                ) : null}
                {user?.email ? (
                  <div>
                    <dt className="text-slate-500">Email</dt>
                    <dd className="truncate font-medium text-slate-900">{user.email}</dd>
                  </div>
                ) : null}
                {user?.phone ? (
                  <div>
                    <dt className="text-slate-500">Phone</dt>
                    <dd className="font-medium text-slate-900">{user.phone}</dd>
                  </div>
                ) : null}
              </>
            ) : isDomesticHub ? (
              <>
                {db?.assignedExecutiveLabel ? (
                  <div>
                    <dt className="text-slate-500">Employer</dt>
                    <dd className="font-medium text-slate-900">{db.assignedExecutiveLabel}</dd>
                  </div>
                ) : null}
                {user?.email ? (
                  <div>
                    <dt className="text-slate-500">Email</dt>
                    <dd className="truncate font-medium text-slate-900">{user.email}</dd>
                  </div>
                ) : null}
              </>
            ) : (
              <>
                {hr?.employeeNo ? (
                  <div>
                    <dt className="text-slate-500">Employee no.</dt>
                    <dd className="font-mono font-medium text-slate-900">{hr.employeeNo}</dd>
                  </div>
                ) : null}
                {user?.username ? (
                  <div>
                    <dt className="text-slate-500">Username</dt>
                    <dd className="font-mono font-medium text-slate-900">@{user.username}</dd>
                  </div>
                ) : null}
                {user?.email ? (
                  <div>
                    <dt className="text-slate-500">Email</dt>
                    <dd className="truncate font-medium text-slate-900">{user.email}</dd>
                  </div>
                ) : null}
                {user?.phone ? (
                  <div>
                    <dt className="text-slate-500">Phone</dt>
                    <dd className="font-medium text-slate-900">{user.phone}</dd>
                  </div>
                ) : null}
                {branchName ? (
                  <div>
                    <dt className="text-slate-500">Branch</dt>
                    <dd className="font-medium text-slate-900">{branchName}</dd>
                  </div>
                ) : null}
                <div>
                  <dt className="text-slate-500">Department</dt>
                  <dd className="font-medium text-slate-900">{deptLabel}</dd>
                </div>
                {hr?.dateJoinedIso ? (
                  <div>
                    <dt className="text-slate-500">Date joined</dt>
                    <dd className="font-medium text-slate-900">{hr.dateJoinedIso}</dd>
                  </div>
                ) : null}
                {hr?.employmentType ? (
                  <div>
                    <dt className="text-slate-500">Employment type</dt>
                    <dd className="font-medium capitalize text-slate-900">{hr.employmentType}</dd>
                  </div>
                ) : null}
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
            className="inline-flex min-h-9 shrink-0 items-center gap-1 self-start rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 no-underline transition hover:bg-slate-50 sm:self-center"
          >
            Edit account
            <ChevronRight size={14} aria-hidden />
          </Link>
        ) : null}
      </div>
    </div>
  );
}
