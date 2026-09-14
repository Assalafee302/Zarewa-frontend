import React, { useMemo, useState } from 'react';
import { Building2 } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { hasPermissionInList } from '../../lib/moduleAccess';

/**
 * Post-login gate for HQ roles: pick a branch (or all-branches roll-up) before shell data loads.
 */
export default function ConfirmBranchGate() {
  const ws = useWorkspace();
  const session = ws?.session;
  const branches = useMemo(() => {
    const raw = session?.branches ?? ws?.snapshot?.workspaceBranches ?? [];
    return Array.isArray(raw) ? raw.filter((b) => b && (b.active !== false)) : [];
  }, [session?.branches, ws?.snapshot?.workspaceBranches]);

  const defaultBranchId = String(session?.currentBranchId || branches[0]?.id || '').trim();
  const canHqRollup = hasPermissionInList(ws?.permissions ?? session?.permissions ?? [], 'hq.view_all_branches');

  const [selection, setSelection] = useState(() =>
    session?.viewAllBranches && canHqRollup ? '__ALL__' : defaultBranchId
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const onContinue = async () => {
    setError('');
    setBusy(true);
    try {
      const r =
        selection === '__ALL__'
          ? await ws.confirmWorkspaceBranch?.({ viewAllBranches: true })
          : await ws.confirmWorkspaceBranch?.({
              currentBranchId: selection,
              viewAllBranches: false,
            });
      if (!r?.ok) {
        setError(r?.error || 'Could not set workspace branch.');
      }
    } finally {
      setBusy(false);
    }
  };

  const onSignOut = async () => {
    setBusy(true);
    try {
      await ws?.logout?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f6f5] px-6">
      <div className="w-full max-w-md rounded-[28px] border border-white/70 bg-white/95 px-8 py-7 shadow-xl">
        <img
          src="/zarewa-logo.png"
          alt=""
          className="mx-auto h-12 w-auto object-contain"
          width={120}
          height={48}
        />
        <p className="mt-3 text-center text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
          Zarewa
        </p>
        <div className="mt-5 flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#e7f3f1] text-[#134e4a]">
            <Building2 size={20} aria-hidden />
          </div>
          <div>
            <h1 className="text-xl font-black text-[#134e4a]">Choose workspace branch</h1>
            <p className="mt-1 text-sm font-medium leading-relaxed text-slate-600">
              Confirm which branch to load before workspace data starts. This keeps HQ sign-in fast and
              avoids pulling every factory at once.
            </p>
          </div>
        </div>

        <label htmlFor="hq-branch-confirm" className="mt-6 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
          Branch
        </label>
        <select
          id="hq-branch-confirm"
          value={selection || defaultBranchId}
          onChange={(e) => setSelection(e.target.value)}
          disabled={busy || branches.length === 0}
          className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-800 outline-none ring-[#134e4a]/30 focus:ring-2 disabled:opacity-50"
        >
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name || b.code || b.id}
              {b.code ? ` (${b.code})` : ''}
            </option>
          ))}
          {canHqRollup ? <option value="__ALL__">All branches (HQ roll-up)</option> : null}
        </select>

        {selection === '__ALL__' ? (
          <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-950">
            All-branches mode loads a larger workspace and is slower on weak networks. Prefer a single
            branch for day-to-day work.
          </p>
        ) : null}

        {error ? (
          <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-900" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="button"
          disabled={busy || (!selection && !defaultBranchId)}
          onClick={() => void onContinue()}
          className="mt-6 w-full rounded-xl bg-[#134e4a] px-4 py-3 text-xs font-bold uppercase tracking-wide text-white shadow-lg hover:brightness-110 disabled:opacity-50"
        >
          {busy ? 'Loading workspace…' : 'Continue'}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void onSignOut()}
          className="mt-3 w-full text-center text-xs font-semibold text-slate-500 underline underline-offset-2 hover:text-slate-800 disabled:opacity-50"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
