import React, { useCallback, useEffect, useState } from 'react';
import { decideStaffPurchaseCredit, fetchStaffPurchaseCredits } from '../../lib/hrStaffPurchaseCredit';
import { formatNgn } from '../../lib/hrFormat';
import { HR_BTN_PRIMARY, HR_BTN_SECONDARY } from './hrFormStyles';

export function HrStaffPurchaseCreditQueue() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const { ok, data } = await fetchStaffPurchaseCredits();
    setLoading(false);
    if (!ok || !data?.ok) {
      setError(data?.error || 'Could not load purchase credit queue.');
      setItems([]);
      return;
    }
    setError('');
    setItems(data.items || []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (id, decision) => {
    setBusyId(id);
    setError('');
    const { ok, data } = await decideStaffPurchaseCredit(id, decision, {
      note: decision === 'approve' ? 'Approved' : 'Rejected',
    });
    setBusyId('');
    if (!ok || !data?.ok) {
      setError(data?.error || 'Action failed.');
      return;
    }
    load();
  };

  if (loading) {
    return <p className="text-sm text-slate-500">Loading purchase credit queue…</p>;
  }

  const pending = items.filter((i) => i.status === 'pending_approval');

  if (!items.length && !error) {
    return <p className="text-sm text-slate-500">No staff purchase credit requests in queue.</p>;
  }

  return (
    <div className="space-y-3">
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <p className="text-xs text-slate-500">
        Staff roofing / materials on credit — approved balances are collected via payroll. Delivery is allowed when credit
        covers the quotation balance.
      </p>
      <div className="space-y-2">
        {pending.map((item) => (
          <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-bold text-slate-900">{item.staffDisplayName || item.userId}</p>
                <p className="text-sm text-slate-600">{item.title}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {item.quotationRef ? `Quote ${item.quotationRef}` : null}
                  {item.quotationRef ? ' · ' : ''}
                  {formatNgn(item.principalOriginalNgn)} · {formatNgn(item.installmentNgn)}/mo
                  {item.branchId ? ` · Branch ${item.branchId}` : ''}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  className={HR_BTN_SECONDARY}
                  disabled={busyId === item.id}
                  onClick={() => act(item.id, 'reject')}
                >
                  Reject
                </button>
                <button
                  type="button"
                  className={HR_BTN_PRIMARY}
                  disabled={busyId === item.id}
                  onClick={() => act(item.id, 'approve')}
                >
                  Approve
                </button>
              </div>
            </div>
          </div>
        ))}
        {!pending.length ? (
          <p className="text-sm text-slate-500">No pending approvals — {items.length} active/historical record(s).</p>
        ) : null}
      </div>
    </div>
  );
}
