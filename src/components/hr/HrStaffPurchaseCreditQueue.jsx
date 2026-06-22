import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { decideStaffPurchaseCredit, fetchStaffPurchaseCredits } from '../../lib/hrStaffPurchaseCredit';
import { useWorkspace } from '../../context/WorkspaceContext';
import { canApproveStaffPurchaseCredit, canRejectStaffPurchaseCredit } from '../../lib/hrAccess';
import { formatNgn } from '../../lib/hrFormat';
import { salesQuotationDeepLink } from '../../lib/staffPurchaseCreditLinks';
import { PageTabs } from '../layout/PageTabs';
import { HR_BTN_PRIMARY, HR_BTN_SECONDARY } from './hrFormStyles';
import { HrPurchaseCreditDecisionContext } from './HrPurchaseCreditDecisionContext';
import { ProfileStatusChip } from '../profile/profileDesign';

const QUEUE_TABS = [
  { id: 'pending', label: 'Pending approval' },
  { id: 'active', label: 'Active' },
  { id: 'all', label: 'All' },
];

const STATUS_LABELS = {
  pending_approval: 'Awaiting MD approval',
  active: 'Active — payroll collection',
  rejected: 'Rejected',
  paid_off: 'Paid off',
  cancelled: 'Cancelled',
  approved_pending_disbursement: 'Approved — pending',
  suspended: 'Suspended',
  closed_written_off: 'Written off',
};

function statusLabel(status) {
  return STATUS_LABELS[status] || String(status || '').replace(/_/g, ' ');
}

export function HrStaffPurchaseCreditQueue() {
  const ws = useWorkspace();
  const roleKey = ws?.session?.user?.roleKey;
  const permissions = ws?.permissions || [];
  const mayApprove = canApproveStaffPurchaseCredit(roleKey, permissions);
  const mayReject = canRejectStaffPurchaseCredit(roleKey, permissions);

  const [queueTab, setQueueTab] = useState('pending');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [rejectId, setRejectId] = useState('');
  const [rejectNote, setRejectNote] = useState('');

  const statusParam = useMemo(() => {
    if (queueTab === 'pending') return 'pending_approval';
    if (queueTab === 'active') return 'active';
    return 'all';
  }, [queueTab]);

  const load = useCallback(async () => {
    setLoading(true);
    const { ok, data } = await fetchStaffPurchaseCredits({ status: statusParam });
    setLoading(false);
    if (!ok || !data?.ok) {
      setError(data?.error || 'Could not load purchase credit queue.');
      setItems([]);
      return;
    }
    setError('');
    setItems(data.items || []);
  }, [statusParam]);

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

  const pending = items.filter((i) => i.status === 'pending_approval');
  const visibleItems = queueTab === 'pending' ? pending : items;

  return (
    <div className="space-y-3">
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <p className="text-xs text-slate-500">
        Staff roofing / materials on credit — requests require <strong>Managing Director approval</strong>. Approved
        balances are collected via payroll. Delivery is allowed when credit covers the quotation balance.
      </p>
      <PageTabs tabs={QUEUE_TABS} value={queueTab} onChange={setQueueTab} />
      {!mayApprove && queueTab === 'pending' && pending.length ? (
        <p className="text-xs font-semibold text-amber-800 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2">
          {pending.length} request(s) awaiting MD approval. You can view the queue; only the MD can approve.
        </p>
      ) : null}
      {loading ? <p className="text-sm text-slate-500">Loading purchase credit queue…</p> : null}
      {!loading && !visibleItems.length ? (
        <p className="text-sm text-slate-500">
          {queueTab === 'pending'
            ? 'No purchase credit requests awaiting MD approval.'
            : queueTab === 'active'
              ? 'No active purchase credit accounts.'
              : 'No staff purchase credit records yet.'}
        </p>
      ) : null}
      <div className="space-y-2">
        {visibleItems.map((item) => {
          const quoteLink = salesQuotationDeepLink(item.quotationRef);
          const isPending = item.status === 'pending_approval';
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
                      className="mt-1 inline-block text-xs font-semibold text-[#134e4a] underline"
                    >
                      Open quotation
                    </Link>
                  ) : null}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <ProfileStatusChip
                      variant={
                        isPending ? 'pending' : item.status === 'rejected' ? 'rejected' : item.status === 'active' ? 'approved' : 'neutral'
                      }
                    >
                      {statusLabel(item.status)}
                    </ProfileStatusChip>
                  </div>
                  {item.status === 'rejected' && item.note ? (
                    <p className="mt-2 text-xs font-semibold text-rose-800 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
                      Rejection reason: {item.note}
                    </p>
                  ) : null}
                  <HrPurchaseCreditDecisionContext item={item} className="mt-2" />
                  {item.principalOutstandingNgn > 0 && !isPending ? (
                    <p className="text-xs text-slate-600 mt-1">
                      Outstanding: <strong>{formatNgn(item.principalOutstandingNgn)}</strong>
                    </p>
                  ) : null}
                </div>
                {isPending && (mayApprove || mayReject) ? (
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
      </div>
    </div>
  );
}
