import React from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useUserProfile } from '../../context/UserProfileContext';
import { WORKSPACE_DEPARTMENT_LABELS } from '../../lib/departmentWorkspace';

const COHORT_BADGE = {
  scholarship: { label: 'Scholarship', className: 'bg-violet-400/25 text-violet-50 border-violet-300/30' },
  domestic: { label: 'Domestic staff', className: 'bg-amber-400/20 text-amber-50 border-amber-300/30' },
  special: { label: 'HQ / special', className: 'bg-sky-400/20 text-sky-50 border-sky-300/30' },
  employee: { label: 'Employee', className: 'bg-white/15 text-teal-50 border-white/25' },
};

export function ProfileHeroCard() {
  const ws = useWorkspace();
  const { hr, user: hrUser, cohort, hasHrSelfService, initialLoading } = useUserProfile();

  const sessionUser = ws?.session?.user;
  const user = hrUser || sessionUser;

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

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-br from-[#134e4a] via-[#0f766e] to-teal-800 p-6 text-white shadow-lg shadow-teal-900/10">
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
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-100/90">My profile</p>
            {badge ? (
              <span
                className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${badge.className}`}
              >
                {badge.label}
              </span>
            ) : null}
          </div>
          <h2 className="mt-1 truncate text-2xl font-black tracking-tight">{user?.displayName || '—'}</h2>
          <p className="mt-1 text-sm font-medium text-teal-50/90">{roleLine}</p>
          <dl className="mt-4 grid grid-cols-1 gap-x-4 gap-y-2 text-xs sm:grid-cols-2 lg:grid-cols-3">
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
            {hr?.payrollGroup ? (
              <div>
                <dt className="text-teal-100/70">Payroll group</dt>
                <dd className="font-semibold capitalize text-white">{String(hr.payrollGroup).replace(/_/g, ' ')}</dd>
              </div>
            ) : null}
          </dl>
          {initialLoading && hasHrSelfService ? (
            <p className="mt-3 text-[11px] text-teal-100/80">Loading employment details…</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
