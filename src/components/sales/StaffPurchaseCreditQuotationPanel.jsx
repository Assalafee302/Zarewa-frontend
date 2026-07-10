import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { HardHat } from 'lucide-react';
import { formatNgn } from '../../lib/hrFormat';
import { isStaffLinkedCustomer, customerPickerPrimaryLabel } from '../../lib/customerPickerSearch';
import { fetchQuotationStaffPurchaseStatus } from '../../lib/hrStaffPurchaseCredit';
import { salesQuotationDeepLink } from '../../lib/staffPurchaseCreditLinks';
import { ProfileStatusChip } from '../profile/profileDesign';
import { HR_BTN_PRIMARY } from '../hr/hrFormStyles';
import { HrPurchaseCreditDecisionContext } from '../hr/HrPurchaseCreditDecisionContext';
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

function statusChipVariant(status) {
  if (status === 'pending_approval') return 'pending';
  if (status === 'rejected' || status === 'cancelled') return 'rejected';
  if (status === 'active') return 'approved';
  return 'neutral';
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

  const panelShell = 'rounded-xl border border-teal-100 bg-gradient-to-br from-teal-50/50 to-white p-4 mb-5 shadow-sm';

  if (!quotationRef) {
    return (
      <div className={`${panelShell} border-amber-200 bg-amber-50/80`}>
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-amber-900">
          <HardHat size={14} aria-hidden />
          Staff purchase credit
        </p>
        <p className="mt-2 text-sm text-amber-950 leading-relaxed">
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
  const decisionData = account
    ? {
        ...account,
        serviceYears: status?.eligibility?.serviceYears,
        activeOutstandingNgn: status?.eligibility?.activeOutstandingNgn,
        eligible: status?.eligibility?.eligible,
        eligibilityIssues: status?.eligibility?.issues,
        quoteBalanceNgn: balance,
        depositRequiredNgn: status?.amountBounds?.depositRequiredNgn,
        depositPct: status?.amountBounds?.depositPct,
        maxSinglePurchaseNgn: status?.policy?.maxSinglePurchaseNgn,
        purposeNote: account.note,
      }
    : {
        serviceYears: status?.eligibility?.serviceYears,
        activeOutstandingNgn: status?.eligibility?.activeOutstandingNgn,
        eligible: status?.eligibility?.eligible,
        eligibilityIssues: status?.eligibility?.issues,
        quoteBalanceNgn: balance,
        depositRequiredNgn: status?.amountBounds?.depositRequiredNgn,
        depositPct: status?.amountBounds?.depositPct,
        maxSinglePurchaseNgn: status?.policy?.maxSinglePurchaseNgn,
      };

  return (
    <>
      <div className={panelShell}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-zarewa-teal">
            <HardHat size={14} aria-hidden />
            Staff purchase credit
          </p>
          {account ? (
            <ProfileStatusChip variant={statusChipVariant(account.status)}>
              {STATUS_LABELS[account.status] || account.status}
            </ProfileStatusChip>
          ) : null}
        </div>
        {loading ? <p className="mt-2 text-sm text-slate-500">Checking staff credit status…</p> : null}
        {loadError ? (
          <p className="mt-2 text-sm font-semibold text-rose-800 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
            {loadError}
          </p>
        ) : null}
        {hrLinkMissing ? (
          <p className="mt-2 text-sm font-semibold text-amber-900 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            Customer looks like staff, but HR link is missing. Open the customer profile → Edit → Link to staff, then
            refresh and reopen this quotation.
          </p>
        ) : null}
        {account ? (
          <div className="mt-3 space-y-2 text-sm">
            <p className="font-bold text-slate-900">{formatNgn(account.principalOriginalNgn)} credit</p>
            {account.principalOutstandingNgn > 0 ? (
              <p className="text-xs text-slate-600">
                Outstanding on staff ledger: <strong>{formatNgn(account.principalOutstandingNgn)}</strong>
                {account.installmentNgn ? ` · ${formatNgn(account.installmentNgn)}/mo payroll` : null}
              </p>
            ) : null}
            {status?.rejectionNote ? (
              <p className="text-xs font-semibold text-rose-800 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
                Rejection reason: {status.rejectionNote}
              </p>
            ) : null}
            {status?.activeCredit?.coversBalance ? (
              <p className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                Delivery may proceed — active staff credit covers quotation balance.
              </p>
            ) : null}
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-700 leading-relaxed">
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
        <HrPurchaseCreditDecisionContext data={decisionData} className="mt-3" />
        {timeline.length ? (
          <div className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
            <p className="text-ui-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5">Status timeline</p>
            <ul className="space-y-1.5">
              {timeline.map((ev, idx) => (
                <li key={`${ev.atIso}-${ev.action}-${idx}`} className="text-xs text-slate-700">
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
          <button type="button" onClick={() => setModalOpen(true)} className={`${HR_BTN_PRIMARY} mt-3 text-xs`}>
            Request staff purchase credit
          </button>
        ) : null}
        {quoteLink && readOnly ? (
          <Link
            to={quoteLink.to}
            state={quoteLink.state}
            className="mt-3 inline-block text-xs font-semibold text-zarewa-teal underline"
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
