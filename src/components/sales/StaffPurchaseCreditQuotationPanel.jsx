import React, { useCallback, useEffect, useState } from 'react';
import { HardHat } from 'lucide-react';
import { formatNgn } from '../../lib/hrFormat';
import { fetchQuotationStaffPurchaseStatus } from '../../lib/hrStaffPurchaseCredit';
import { StaffPurchaseCreditRequestModal } from './StaffPurchaseCreditRequestModal';

const STATUS_LABELS = {
  pending_approval: 'Awaiting BM approval',
  active: 'Active — payroll collection',
  rejected: 'Rejected',
  paid_off: 'Paid off',
  cancelled: 'Cancelled',
};

/**
 * Quotation sidebar panel for staff purchase credit (staff-linked customer).
 */
export function StaffPurchaseCreditQuotationPanel({ quotationRef, customerId, readOnly = false }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const reload = useCallback(async () => {
    if (!quotationRef) return;
    setLoading(true);
    const r = await fetchQuotationStaffPurchaseStatus(quotationRef);
    setLoading(false);
    const data = r.data || r;
    if (r.ok && data?.ok) setStatus(data);
    else setStatus(null);
  }, [quotationRef]);

  useEffect(() => {
    reload();
  }, [reload, customerId]);

  if (!quotationRef) return null;

  const isStaffCustomer = Boolean(status?.isStaffCustomer);
  if (!loading && !isStaffCustomer && !status?.account && !status?.activeCredit) {
    return null;
  }

  const account = status?.account;
  const balance = status?.balanceNgn ?? 0;
  const canRequest = !readOnly && balance > 0 && !account;

  return (
    <>
      <div className="rounded-xl border border-[#134e4a]/20 bg-[#134e4a]/5 p-4 mb-5">
        <p className="text-[9px] font-semibold text-[#134e4a] uppercase tracking-widest mb-2 flex items-center gap-2">
          <HardHat size={14} />
          Staff purchase credit
        </p>
        {loading ? (
          <p className="text-[10px] text-slate-500">Checking staff credit status…</p>
        ) : account ? (
          <div className="space-y-2 text-sm">
            <p className="font-bold text-slate-900">
              {STATUS_LABELS[account.status] || account.status} · {formatNgn(account.principalOriginalNgn)}
            </p>
            {account.principalOutstandingNgn > 0 ? (
              <p className="text-xs text-slate-600">
                Outstanding on staff ledger: <strong>{formatNgn(account.principalOutstandingNgn)}</strong>
                {account.installmentNgn ? ` · ${formatNgn(account.installmentNgn)}/mo payroll` : null}
              </p>
            ) : null}
            {status?.activeCredit?.coversBalance ? (
              <p className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-lg px-2 py-1.5">
                Delivery may proceed — active staff credit covers quotation balance.
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-[10px] text-slate-700 leading-relaxed mb-2">
            This quotation is on a staff customer account. Request purchase credit for branch manager approval;
            repayment is collected via payroll.
            {balance > 0 ? (
              <>
                {' '}
                Balance due: <strong>{formatNgn(balance)}</strong>
              </>
            ) : null}
          </p>
        )}
        {canRequest ? (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="mt-2 rounded-lg bg-[#134e4a] px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-white hover:brightness-105"
          >
            Request staff purchase credit
          </button>
        ) : null}
      </div>
      <StaffPurchaseCreditRequestModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        quotationRef={quotationRef}
        onSubmitted={reload}
      />
    </>
  );
}
