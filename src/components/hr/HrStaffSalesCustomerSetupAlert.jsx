import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Link2 } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { bulkEnsureStaffSalesCustomers, fetchStaffSalesCustomerLinkStats } from '../../lib/hrStaffPurchaseCredit';
import { HR_BTN_PRIMARY } from './hrFormStyles';

/**
 * Alert when active staff are missing Sales customer links (purchase credit prerequisite).
 */
export function HrStaffSalesCustomerSetupAlert({ onLinked }) {
  const ws = useWorkspace();
  const [unlinkedCount, setUnlinkedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const branchId = ws?.viewAllBranches ? 'ALL' : ws?.branchScope || ws?.session?.currentBranchId || '';

  const load = useCallback(async () => {
    setLoading(true);
    const { ok, data } = await fetchStaffSalesCustomerLinkStats(
      branchId && branchId !== 'ALL' ? { branchId } : {}
    );
    setLoading(false);
    if (ok && data?.ok) setUnlinkedCount(Number(data.unlinkedCount) || 0);
    else setUnlinkedCount(0);
  }, [branchId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function runBulkLink() {
    setBusy(true);
    setError('');
    setResult(null);
    const { ok, data } = await bulkEnsureStaffSalesCustomers(branchId && branchId !== 'ALL' ? { branchId } : {});
    setBusy(false);
    if (!ok || !data?.ok) {
      setError(data?.error || 'Bulk link failed.');
      return;
    }
    setResult(data);
    await ws.refresh?.();
    await load();
    onLinked?.(data);
  }

  if (loading || unlinkedCount <= 0) return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 space-y-2">
      <p className="flex items-start gap-2 text-sm font-semibold text-amber-950">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <span>
          <strong className="tabular-nums">{unlinkedCount}</strong> active staff
          {branchId && branchId !== 'ALL' ? ` in ${branchId}` : ''} have no Sales customer link — purchase credit
          quotations cannot be raised until HR links them.
        </span>
      </p>
      {error ? <p className="text-xs font-semibold text-rose-700">{error}</p> : null}
      {result ? (
        <p className="text-xs font-semibold text-emerald-800">
          Linked {result.linked} of {result.scanned} staff
          {result.failed ? ` · ${result.failed} failed` : ''}.
        </p>
      ) : null}
      <button type="button" className={`${HR_BTN_PRIMARY} inline-flex items-center gap-1.5`} disabled={busy} onClick={() => void runBulkLink()}>
        <Link2 size={14} aria-hidden />
        {busy ? 'Linking…' : 'Run bulk link now'}
      </button>
    </div>
  );
}
