import React, { useCallback, useMemo, useState } from 'react';
import { Building2 } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';

export function BranchWorkspaceBar() {
  const ws = useWorkspace();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const branches = useMemo(
    () => ws.snapshot?.workspaceBranches ?? ws.session?.branches ?? [],
    [ws.snapshot?.workspaceBranches, ws.session?.branches]
  );

  const currentId = String(ws.session?.currentBranchId ?? '').trim();
  const viewAll = Boolean(ws.session?.viewAllBranches);
  const roleKey = String(ws.session?.user?.roleKey ?? '').trim().toLowerCase();
  const isHqRole = roleKey === 'admin' || roleKey === 'md' || roleKey === 'ceo';
  const canHqRollup = isHqRole && ws.hasPermission('hq.view_all_branches');

  const onBranchChange = useCallback(
    async (e) => {
      const id = String(e.target.value || '').trim();
      if (!id || id === currentId) return;
      setError(null);
      setBusy(true);
      const r = await ws.updateWorkspace({ currentBranchId: id });
      setBusy(false);
      if (!r.ok) setError(r.error || 'Update failed');
    },
    [currentId, ws.updateWorkspace]
  );

  if (!ws.apiOnline || branches.length === 0) return null;

  const activeBranch = branches.find((b) => b.id === currentId) || branches[0] || null;

  const onWorkspaceScopeChange = useCallback(
    async (e) => {
      const v = String(e.target.value || '').trim();
      if (!v) return;
      if (v === '__ALL__') {
        if (viewAll) return;
        setError(null);
        setBusy(true);
        const r = await ws.updateWorkspace({ viewAllBranches: true });
        setBusy(false);
        if (!r.ok) setError(r.error || 'Update failed');
        return;
      }
      if (v === currentId && !viewAll) return;
      setError(null);
      setBusy(true);
      const r = await ws.updateWorkspace({ currentBranchId: v, viewAllBranches: false });
      setBusy(false);
      if (!r.ok) setError(r.error || 'Update failed');
    },
    [currentId, viewAll, ws.updateWorkspace]
  );

  const scopeSelectValue = viewAll && canHqRollup ? '__ALL__' : currentId || (branches[0]?.id ?? '');

  return (
    <div className="flex w-full min-w-0 flex-col gap-1 sm:w-auto sm:flex-row sm:items-center sm:gap-3">
      {isHqRole ? (
        <div className="flex min-w-0 w-full items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white px-2.5 py-1.5 shadow-sm sm:gap-2 sm:rounded-2xl sm:border-gray-100/90 sm:bg-white/95 sm:px-3 sm:py-2 sm:shadow-sm">
          <Building2 size={16} className="shrink-0 text-[#134e4a]/70" aria-hidden />
          <div className="min-w-0 flex-1">
            <label htmlFor="zarewa-branch-workspace" className="sr-only">
              Workspace scope
            </label>
            <select
              id="zarewa-branch-workspace"
              value={scopeSelectValue}
              onChange={canHqRollup ? onWorkspaceScopeChange : onBranchChange}
              disabled={busy}
              className="w-full min-w-0 max-w-none cursor-pointer truncate bg-transparent text-[10px] font-bold uppercase tracking-wide text-[#134e4a] outline-none disabled:opacity-50 sm:z-toolbar-shell sm:text-[11px] sm:max-w-[280px]"
            >
              {canHqRollup ? (
                <option value="__ALL__">All branches (HQ roll-up)</option>
              ) : null}
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name || b.code || b.id}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : (
        <div className="flex min-w-0 w-full items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white px-2.5 py-1.5 shadow-sm sm:gap-2 sm:rounded-2xl sm:border-gray-100/90 sm:bg-white/95 sm:px-3 sm:py-2 sm:shadow-sm">
          <Building2 size={16} className="shrink-0 text-[#134e4a]/70" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[10px] font-bold uppercase tracking-wide text-[#134e4a] sm:text-[11px]">
              {activeBranch ? activeBranch.name || activeBranch.code || activeBranch.id : 'Branch'}
            </p>
          </div>
        </div>
      )}

      {viewAll && canHqRollup ? (
        <span
          className="hidden max-w-[280px] text-[10px] font-semibold leading-snug text-amber-800 lg:inline"
          title={ws.branchScopedCreateMessage}
        >
          HQ roll-up (read-only) — turn off All branches to create quotations or POs
        </span>
      ) : null}

      {error ? (
        <p className="text-[10px] font-semibold text-red-600 sm:max-w-[200px]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
