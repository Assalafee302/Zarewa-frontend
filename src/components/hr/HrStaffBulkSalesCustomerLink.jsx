import React, { useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { bulkEnsureStaffSalesCustomers } from '../../lib/hrStaffPurchaseCredit';
import { HR_BTN_PRIMARY, HR_BTN_SECONDARY } from './hrFormStyles';

/**
 * HR tool — create/link sales customer records for staff missing purchase-credit linkage.
 */
export function HrStaffBulkSalesCustomerLink() {
  const ws = useWorkspace();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const branchId = ws?.viewAllBranches ? 'ALL' : ws?.branchScope || ws?.session?.currentBranchId || '';

  async function run() {
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
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
      <div>
        <p className="text-sm font-bold text-slate-900">Bulk link staff sales customers</p>
        <p className="mt-1 text-xs text-slate-600 leading-relaxed">
          Creates or links a Sales customer account for active staff who do not yet have one — required before purchase
          credit quotations.
          {branchId && branchId !== 'ALL' ? ` Scope: branch ${branchId}.` : ' Scope: all branches.'}
        </p>
      </div>
      {error ? <p className="text-xs font-semibold text-rose-700">{error}</p> : null}
      {result ? (
        <p className="text-xs font-semibold text-emerald-800">
          Linked {result.linked} of {result.scanned} staff
          {result.failed ? ` · ${result.failed} failed` : ''}.
        </p>
      ) : null}
      <button type="button" className={HR_BTN_PRIMARY} disabled={busy} onClick={() => void run()}>
        {busy ? 'Linking…' : 'Run bulk link'}
      </button>
    </div>
  );
}
