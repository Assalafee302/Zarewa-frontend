import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../../lib/apiBase';

/**
 * @param {{ canManage?: boolean; onOpenQueue?: (scope: string) => void }} props
 */
export default function HrTransfersOverview({ canManage, onOpenQueue }) {
  const [stats, setStats] = useState({
    pendingTransferBranchReview: 0,
    pendingTransferHrReview: 0,
    pendingTransferGmApproval: 0,
    pendingTransferComplete: 0,
  });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    const { ok, data } = await apiFetch('/api/hr/dashboard');
    setBusy(false);
    if (!ok || !data?.ok) return;
    const s = data.observability?.summary || {};
    setStats({
      pendingTransferBranchReview: Number(s.pendingTransferBranchReview) || 0,
      pendingTransferHrReview: Number(s.pendingTransferHrReview) || 0,
      pendingTransferGmApproval: Number(s.pendingTransferGmApproval) || 0,
      pendingTransferComplete: Number(s.pendingTransferComplete) || 0,
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const tiles = [
    canManage && {
      label: 'Branch review',
      value: stats.pendingTransferBranchReview,
      scope: 'branch_queue',
      tone: 'border-teal-200 bg-teal-50/50 text-teal-950',
    },
    canManage && {
      label: 'HR review',
      value: stats.pendingTransferHrReview,
      scope: 'hr_queue',
      tone: 'border-amber-200 bg-amber-50 text-amber-950',
    },
    canManage && {
      label: 'GM approval',
      value: stats.pendingTransferGmApproval,
      scope: 'gm_queue',
      tone: 'border-indigo-200 bg-indigo-50 text-indigo-950',
    },
    {
      label: 'Awaiting completion',
      value: stats.pendingTransferComplete,
      scope: 'complete_queue',
      tone: 'border-slate-200 bg-slate-50 text-slate-800',
    },
  ].filter(Boolean);

  if (!tiles.length) {
    return (
      <p className="text-sm text-slate-600">
        Inter-branch transfers: branch review → HR → GM approval → complete on effective date.
      </p>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {tiles.map((t) => (
        <button
          key={t.label}
          type="button"
          onClick={() => onOpenQueue?.(t.scope)}
          disabled={busy}
          className={`rounded-xl border px-4 py-3 text-left transition hover:shadow-sm ${t.tone}`}
        >
          <div className="text-2xl font-bold tabular-nums">{busy ? '…' : t.value}</div>
          <div className="mt-1 text-xs font-semibold uppercase tracking-wide opacity-80">{t.label}</div>
        </button>
      ))}
    </div>
  );
}
