import React from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { WORKSPACE_DEPARTMENT_LABELS } from '../../lib/departmentWorkspace';

export function ProfileHeroCard() {
  const ws = useWorkspace();
  const user = ws?.session?.user;
  const branchId = ws?.session?.workspaceBranchId || ws?.snapshot?.workspaceBranchId;
  const branches = ws?.snapshot?.workspaceBranches ?? ws?.session?.branches ?? [];
  const branchName = branches.find((b) => b.id === branchId)?.name || branchId;

  const initials = (user?.displayName || user?.username || 'U')
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const avatarUrl = user?.avatarUrl;
  const showAvatar =
    avatarUrl && (avatarUrl.startsWith('https://') || avatarUrl.startsWith('data:image/'));

  const deptLabel =
    WORKSPACE_DEPARTMENT_LABELS?.[user?.departmentKey] ||
    user?.departmentKey ||
    user?.roleLabel ||
    '—';

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-br from-[#134e4a] via-[#0f766e] to-teal-800 p-6 text-white shadow-lg shadow-teal-900/10">
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl"
        aria-hidden
      />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
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
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-100/90">Signed in as</p>
          <h2 className="mt-1 truncate text-2xl font-black tracking-tight">{user?.displayName || '—'}</h2>
          <p className="mt-1 text-sm font-medium text-teal-50/90">{user?.roleLabel || user?.roleKey || 'User'}</p>
          <dl className="mt-4 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
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
          </dl>
        </div>
      </div>
    </div>
  );
}
