import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { decideStaffPurchaseCredit, fetchStaffPurchaseCredits } from '../../lib/hrStaffPurchaseCredit';
import { useWorkspace } from '../../context/WorkspaceContext';
import { canApproveStaffPurchaseCredit, canRejectStaffPurchaseCredit } from '../../lib/hrAccess';
import { formatNgn } from '../../lib/hrFormat';
import { salesQuotationDeepLink } from '../../lib/staffPurchaseCreditLinks';
import { HR_BTN_PRIMARY, HR_BTN_SECONDARY } from './hrFormStyles';

export function HrStaffPurchaseCreditQueue() {
  const ws = useWorkspace();
  const roleKey = ws?.session?.user?.roleKey;
  const permissions = ws?.permissions || [];
  const mayApprove = canApproveStaffPurchaseCredit(roleKey, permissions);
  const mayReject = canRejectStaffPurchaseCredit(roleKey, permissions);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [rejectId, setRejectId] = useState('');
  const [rejectNote, setRejectNote] = useState('');

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

  const act = async (id, decision, note = '') => {
    if (decision === 'reject' && String(note || '').trim().length < 3) {
      setError('Rejection reason is required (at least 3 characters).');
      return;
    }
    setBusyId(id);
    setError('');
    const { ok, data } = await decideStaffPurchaseCredit(id, decision, {
      note: decision === 'approve' ? 'Approved by MD' : String(note || '').trim(),
    });
    setBusyId('');
    if (!ok || !data?.ok) {
      setError(data?.error || 'Action failed.');
      return;
    }
    setRejectId('');
    setRejectNote('');
    await ws.refreshStaffPurchaseCreditPending?.();
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
        Staff roofing / materials on credit — requests require <strong>Managing Director approval</strong>. Approved
        balances are collected via payroll. Delivery is allowed when credit covers the quotation balance.
      </p>
      {!mayApprove && pending.length ? (
        <p className="text-xs font-semibold text-amber-800 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2">
          {pending.length} request(s) awaiting MD approval. You can view the queue; only the MD can approve.
        </p>
      ) : null}
      <div className="space-y-2">
        {pending.map((item) => {
          const quoteLink = salesQuotationDeepLink(item.quotationRef);
          return (
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
                  {quoteLink ? (
                    <Link
                      to={quoteLink.to}
                      state={quoteLink.state}
                      className="mt-1 inline-block text-[10px] font-bold text-[#134e4a] underline"
                    >
                      Open quotation
                    </Link>
                  ) : null}
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[#134e4a] mt-1">Awaiting MD approval</p>
                </div>
                {mayApprove || mayReject ? (
                  <div className="flex shrink-0 flex-col gap-2 items-end">
                    {rejectId === item.id ? (
                      <div className="w-full min-w-[220px] space-y-2">
                        <textarea
                          className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                          rows={2}
                          value={rejectNote}
                          onChange={(e) => setRejectNote(e.target.value)}
                          placeholder="Rejection reason (required)"
                        />
                        <div className="flex gap-2">
                          <button type="button" className={HR_BTN_SECONDARY} onClick={() => setRejectId('')}>
                            Cancel
                          </button>
                          <button
                            type="button"
                            className={HR_BTN_SECONDARY}
                            disabled={busyId === item.id || rejectNote.trim().length < 3}
                            onClick={() => act(item.id, 'reject', rejectNote)}
                          >
                            Confirm
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        {mayReject ? (
                          <button
                            type="button"
                            className={HR_BTN_SECONDARY}
                            disabled={busyId === item.id}
                            onClick={() => {
                              setRejectId(item.id);
                              setRejectNote('');
                            }}
                          >
                            Reject
                          </button>
                        ) : null}
                        {mayApprove ? (
                          <button
                            type="button"
                            className={HR_BTN_PRIMARY}
                            disabled={busyId === item.id}
                            onClick={() => act(item.id, 'approve')}
                          >
                            Approve
                          </button>
                        ) : null}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
        {!pending.length ? (
          <p className="text-sm text-slate-500">No pending approvals — {items.length} active/historical record(s).</p>
        ) : null}
      </div>
    </div>
  );
}
