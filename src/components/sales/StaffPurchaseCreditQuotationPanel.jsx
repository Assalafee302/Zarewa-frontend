import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { HardHat } from 'lucide-react';
import { formatNgn } from '../../lib/hrFormat';
import { isStaffLinkedCustomer, customerPickerPrimaryLabel } from '../../lib/customerPickerSearch';
import { fetchQuotationStaffPurchaseStatus } from '../../lib/hrStaffPurchaseCredit';
import { salesQuotationDeepLink } from '../../lib/staffPurchaseCreditLinks';
import { StaffPurchaseCreditRequestModal } from './StaffPurchaseCreditRequestModal';

const STATUS_LABELS = {
  pending_approval: 'Awaiting MD approval',
  active: 'Active — payroll collection',
  rejected: 'Rejected',
  paid_off: 'Paid off',
  cancelled: 'Cancelled',
};

const TIMELINE_LABELS = {
  'hr.purchase_credit.requested': 'Credit requested',
  'hr.purchase_credit.approved': 'Approved by MD',
  'hr.purchase_credit.rejected': 'Rejected',
};

function formatTimelineAt(iso) {
  const s = String(iso || '').trim();
  if (!s) return '';
  try {
    return new Date(s).toLocaleString();
  } catch {
    return s;
  }
}

/**
 * Quotation panel for staff purchase credit (staff-linked customer).
 * @param {{ quotationRef?: string; customerId?: string; customer?: object | null; readOnly?: boolean }} props
 */
export function StaffPurchaseCreditQuotationPanel({
  quotationRef = '',
  customerId = '',
  customer = null,
  readOnly = false,
}) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const clientStaff = isStaffLinkedCustomer(customer);

  const reload = useCallback(async () => {
    if (!quotationRef) {
      setStatus(null);
      setLoadError('');
      return;
    }
    setLoading(true);
    setLoadError('');
    const r = await fetchQuotationStaffPurchaseStatus(quotationRef);
    setLoading(false);
    const data = r.data || r;
    if (r.ok && data?.ok) {
      setStatus(data);
      return;
    }
    setStatus(null);
    setLoadError(data?.error || 'Could not load staff purchase credit status.');
  }, [quotationRef]);

  useEffect(() => {
    reload();
  }, [reload, customerId]);

  if (!customerId && !clientStaff) return null;

  const isStaffCustomer = Boolean(status?.isStaffCustomer) || clientStaff;

  if (!isStaffCustomer && !loading && !status?.account && !status?.activeCredit) {
    return null;
  }

  if (!quotationRef) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-4 mb-5">
        <p className="text-[9px] font-semibold text-amber-900 uppercase tracking-widest mb-2 flex items-center gap-2">
          <HardHat size={14} />
          Staff purchase credit
        </p>
        <p className="text-[10px] text-amber-950 leading-relaxed">
          Staff customer selected
          {customer ? `: ${customerPickerPrimaryLabel(customer)}` : ''}. Save the quotation first, then return here
          to request purchase credit.
        </p>
      </div>
    );
  }

  const account = status?.account;
  const balance = status?.balanceNgn ?? 0;
  const canRequest = !readOnly && balance > 0 && !account && isStaffCustomer;
  const hrLinkMissing = clientStaff && status && !status.isStaffCustomer;
  const quoteLink = salesQuotationDeepLink(quotationRef);
  const timeline = Array.isArray(status?.timeline) ? status.timeline : [];

  return (
    <>
      <div className="rounded-xl border border-[#134e4a]/20 bg-[#134e4a]/5 p-4 mb-5">
        <p className="text-[9px] font-semibold text-[#134e4a] uppercase tracking-widest mb-2 flex items-center gap-2">
          <HardHat size={14} />
          Staff purchase credit
        </p>
        {loading ? (
          <p className="text-[10px] text-slate-500">Checking staff credit status…</p>
        ) : null}
        {loadError ? (
          <p className="text-[10px] font-semibold text-rose-800 bg-rose-50 border border-rose-100 rounded-lg px-2 py-1.5 mb-2">
            {loadError}
          </p>
        ) : null}
        {hrLinkMissing ? (
          <p className="text-[10px] font-semibold text-amber-900 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1.5 mb-2">
            Customer looks like staff, but HR link is missing. Open the customer profile → Edit → Link to staff, then
            refresh and reopen this quotation.
          </p>
        ) : null}
        {account ? (
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
            {status?.rejectionNote ? (
              <p className="text-[10px] font-semibold text-rose-800 bg-rose-50 border border-rose-100 rounded-lg px-2 py-1.5">
                Rejection reason: {status.rejectionNote}
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
            This quotation is on a staff customer account. Request purchase credit for Managing Director approval;
            repayment is collected via payroll.
            {balance > 0 ? (
              <>
                {' '}
                Balance due: <strong>{formatNgn(balance)}</strong>
              </>
            ) : balance === 0 && !loading ? (
              <> Quotation is fully paid — purchase credit is not needed.</>
            ) : null}
          </p>
        )}
        {timeline.length ? (
          <div className="mt-3 rounded-lg border border-slate-200 bg-white/80 px-3 py-2">
            <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500 mb-1.5">Status timeline</p>
            <ul className="space-y-1.5">
              {timeline.map((ev, idx) => (
                <li key={`${ev.atIso}-${ev.action}-${idx}`} className="text-[10px] text-slate-700">
                  <span className="font-semibold text-slate-900">
                    {TIMELINE_LABELS[ev.action] || ev.action}
                  </span>
                  {ev.actorDisplayName ? ` · ${ev.actorDisplayName}` : ''}
                  <span className="block text-slate-500">{formatTimelineAt(ev.atIso)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {canRequest ? (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="mt-2 rounded-lg bg-[#134e4a] px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-white hover:brightness-105"
          >
            Request staff purchase credit
          </button>
        ) : null}
        {quoteLink && readOnly ? (
          <Link
            to={quoteLink.to}
            state={quoteLink.state}
            className="mt-2 inline-block text-[10px] font-bold text-[#134e4a] underline"
          >
            Open quotation in Sales
          </Link>
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
