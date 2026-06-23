import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Smartphone } from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { apiFetch } from '../lib/apiBase';
import { formatNgn } from '../Data/mockData';
import { ExecPulseBar } from '../components/exec/ExecPulseBar';
import { ExecMobileDecideQueue } from '../components/exec/ExecMobileDecideQueue';
import { ExecutiveWorkItemReviewModal } from '../components/exec/ExecutiveWorkItemReviewModal';
import { execWorkItemOpensInModal } from '../lib/execWorkItemReview';
import {
  EXEC_APPROVAL_TIER_MD_ONLY,
  EXEC_APPROVAL_TIER_SHARED,
} from '../lib/execApprovalTier';

/**
 * Mobile-first MD approve queue — installable via PWA shortcut (/exec/m).
 */
export default function ExecMobileDecidePage() {
  const ws = useWorkspace();
  const roleKey = String(ws?.session?.user?.roleKey || '').toLowerCase();
  const isMdCockpit = roleKey === 'md' || roleKey === 'admin';

  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState('');
  const [reviewItem, setReviewItem] = useState(null);
  const [workTrayFilter, setWorkTrayFilter] = useState('md_only');

  const canPickBranch = Boolean(ws?.viewAllBranches || data?.actor?.canUseAllBranches);
  const branchId = ws?.viewAllBranches ? ws?.branchScope || 'ALL' : ws?.session?.currentBranchId || 'ALL';

  const load = useCallback(async () => {
    setBusy(true);
    setErr('');
    const qs = new URLSearchParams({ periodKey: 'month' });
    if (canPickBranch && branchId && branchId !== 'ALL') qs.set('branchId', branchId);
    else if (canPickBranch && branchId === 'ALL') qs.set('branchId', 'ALL');
    const { ok, data: d } = await apiFetch(`/api/exec/dashboard?${qs.toString()}`);
    setBusy(false);
    if (!ok || !d?.ok) {
      setData(null);
      setErr(d?.error || 'Could not load approve queue.');
      return;
    }
    setData(d);
  }, [branchId, canPickBranch]);

  useEffect(() => {
    void load();
  }, [load]);

  const readOnly = Boolean(data?.workTray?.readOnlyForActor ?? data?.actor?.readOnlyExecutiveView);
  const workTrayItems = useMemo(() => data?.workTray?.items || [], [data?.workTray?.items]);
  const mdOnlyCount = data?.workTray?.summary?.mdOnly ?? 0;
  const sharedCount = data?.workTray?.summary?.shared ?? 0;

  const filteredWorkTrayItems = useMemo(() => {
    if (workTrayFilter === 'md_only') {
      return workTrayItems.filter((row) => row.approvalTier === EXEC_APPROVAL_TIER_MD_ONLY);
    }
    if (workTrayFilter === 'shared') {
      return workTrayItems.filter((row) => row.approvalTier === EXEC_APPROVAL_TIER_SHARED);
    }
    return workTrayItems;
  }, [workTrayFilter, workTrayItems]);

  const handleReview = (row) => {
    if (!row) return;
    if (execWorkItemOpensInModal(row.kind, row)) {
      setReviewItem(row);
      return;
    }
    window.location.href = row.route || '/exec?tab=decide';
  };

  if (!ws?.hasPermission?.('exec.dashboard.view')) {
    return <Navigate to="/" replace />;
  }

  if (!isMdCockpit) {
    return <Navigate to="/exec?tab=decide" replace />;
  }

  return (
    <div className="flex flex-col min-h-[calc(100dvh-4rem)] max-w-lg mx-auto lg:max-w-none lg:min-h-0 -mx-3 sm:-mx-4 md:mx-0 bg-slate-50/90 lg:bg-transparent">
      <header className="shrink-0 sticky top-0 z-10 border-b border-slate-200/90 bg-white/95 backdrop-blur-sm px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Smartphone size={18} className="text-[#134e4a] shrink-0" aria-hidden />
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-[#134e4a]">MD Decide</p>
              <h1 className="text-base font-bold text-slate-900 truncate">Approve queue</h1>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => void load()}
              disabled={busy}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 disabled:opacity-50"
              aria-label="Refresh queue"
            >
              <RefreshCw size={18} className={busy ? 'animate-spin' : ''} />
            </button>
            <Link
              to="/exec?tab=decide"
              className="hidden sm:inline-flex min-h-[44px] items-center gap-1 rounded-xl border border-slate-200 px-3 text-[10px] font-bold uppercase text-slate-600 hover:bg-slate-50"
            >
              <ArrowLeft size={14} />
              Full desk
            </Link>
          </div>
        </div>
        {err ? (
          <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-800">
            {err}
          </p>
        ) : null}
      </header>

      <div className="shrink-0 px-4 pt-3">
        <ExecPulseBar pulses={data?.cockpit?.pulses} formatNgn={formatNgn} loading={busy && !data} />
      </div>

      <ExecMobileDecideQueue
        items={filteredWorkTrayItems}
        busy={busy}
        readOnly={readOnly}
        workTrayFilter={workTrayFilter}
        onWorkTrayFilterChange={setWorkTrayFilter}
        mdOnlyCount={mdOnlyCount}
        sharedCount={sharedCount}
        onReview={handleReview}
        formatNgn={formatNgn}
      />

      <footer className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 text-center lg:hidden pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Link to="/exec" className="text-[10px] font-bold uppercase text-[#134e4a] hover:underline">
          Open full MD Office
        </Link>
      </footer>

      <ExecutiveWorkItemReviewModal
        item={reviewItem}
        isOpen={Boolean(reviewItem)}
        onClose={() => setReviewItem(null)}
        onCompleted={load}
        readOnly={readOnly}
      />
    </div>
  );
}
