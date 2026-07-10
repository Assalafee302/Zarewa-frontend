import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ZareApprovalHint } from '../ZareApprovalHint';
import { HR_BTN_PRIMARY, HR_BTN_SECONDARY } from '../hr/hrFormStyles';
import { salesQuotationDeepLink } from '../../lib/staffPurchaseCreditLinks';
import { hrStaffCreditPath, HR_STAFF_CREDIT_SECTION } from '../../lib/hrRoutes';
import { HrPurchaseCreditDecisionContext } from '../hr/HrPurchaseCreditDecisionContext';

/**
 * MD / manager review panel for pending staff purchase credit (materials on credit).
 */
export function StaffPurchaseCreditManagerPreview({
  row,
  formatNgn,
  canApprove,
  canReject,
  busy,
  onApprove,
  onReject,
}) {
  const account = row && typeof row === 'object' ? row : {};
  const amountNgn = Number(account.principalOriginalNgn) || 0;
  const installmentNgn = Number(account.installmentNgn) || 0;
  const termMonths = Number(account.termMonths) || 0;
  const quoteRef = String(account.quotationRef || '').trim();
  const staffName = String(account.staffDisplayName || account.userId || 'Staff').trim();
  const asMoney = typeof formatNgn === 'function' ? formatNgn : (n) => `NGN ${Number(n || 0).toLocaleString()}`;
  const quoteLink = salesQuotationDeepLink(quoteRef);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState('');

  const confirmReject = () => {
    const note = String(rejectNote || '').trim();
    if (note.length < 3) return;
    onReject?.(note);
    setRejectOpen(false);
    setRejectNote('');
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-teal-200 bg-teal-50/60 px-4 py-4">
        <p className="text-ui-xs font-black uppercase tracking-widest text-zarewa-teal">Staff purchase credit</p>
        <p className="mt-1 text-lg font-bold text-slate-900">{staffName}</p>
        <p className="text-sm text-slate-600 mt-1">{account.title || 'Roofing / materials on credit'}</p>
        <dl className="mt-4 grid gap-2 text-sm text-slate-800 sm:grid-cols-2">
          {quoteRef ? (
            <div className="sm:col-span-2">
              <dt className="text-ui-xs font-bold uppercase text-slate-500">Quotation</dt>
              <dd className="font-mono font-semibold">{quoteRef}</dd>
              {quoteLink ? (
                <Link
                  to={quoteLink.to}
                  state={quoteLink.state}
                  className="mt-1 inline-block text-xs font-bold text-zarewa-teal underline"
                >
                  Open quotation in Sales
                </Link>
              ) : null}
            </div>
          ) : null}
          {amountNgn > 0 ? (
            <div>
              <dt className="text-ui-xs font-bold uppercase text-slate-500">Credit amount</dt>
              <dd className="font-semibold">{asMoney(amountNgn)}</dd>
            </div>
          ) : null}
          {installmentNgn > 0 ? (
            <div>
              <dt className="text-ui-xs font-bold uppercase text-slate-500">Payroll repayment</dt>
              <dd>
                {asMoney(installmentNgn)}/mo
                {termMonths > 0 ? ` · ${termMonths} months` : ''}
              </dd>
            </div>
          ) : null}
          {account.branchId ? (
            <div>
              <dt className="text-ui-xs font-bold uppercase text-slate-500">Branch</dt>
              <dd>{account.branchId}</dd>
            </div>
          ) : null}
        </dl>
      </div>

      <HrPurchaseCreditDecisionContext item={account} className="mt-2" />

      <p className="text-xs leading-relaxed text-slate-600">
        Approved credit covers the quotation balance for delivery. Repayment is collected through payroll on the staff
        obligation ledger.
      </p>

      {!canApprove && !canReject ? (
        <ZareApprovalHint
          context={{
            referenceNo: account.id,
            documentType: 'staff_purchase_credit',
            canApprove: false,
            missingPermission: 'Only the Managing Director can approve staff purchase credit.',
            zareQuery: `Why can't I approve staff purchase credit ${account.id || ''}?`,
          }}
        />
      ) : null}

      {!canApprove && canReject ? (
        <p className="text-xs font-semibold text-amber-800 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2">
          Awaiting Managing Director approval. You may reject if this request should not proceed.
        </p>
      ) : null}

      {rejectOpen ? (
        <div className="space-y-2 rounded-xl border border-rose-100 bg-rose-50/60 p-3">
          <label className="block text-xs font-bold text-slate-700">
            Rejection reason (required)
            <textarea
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              rows={3}
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              minLength={3}
              placeholder="Explain why this purchase credit should not proceed"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={HR_BTN_SECONDARY} disabled={busy} onClick={() => setRejectOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              className={HR_BTN_SECONDARY}
              disabled={busy || rejectNote.trim().length < 3}
              onClick={confirmReject}
            >
              {busy ? 'Working…' : 'Confirm reject'}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2 pt-2">
          {canReject ? (
            <button type="button" className={HR_BTN_SECONDARY} disabled={busy} onClick={() => setRejectOpen(true)}>
              Reject
            </button>
          ) : null}
          {canApprove ? (
            <button type="button" className={HR_BTN_PRIMARY} disabled={busy} onClick={() => onApprove?.()}>
              {busy ? 'Working…' : 'Approve'}
            </button>
          ) : null}
          <Link to={hrStaffCreditPath(HR_STAFF_CREDIT_SECTION.PURCHASE_CREDIT)} className={HR_BTN_SECONDARY}>
            Open purchase credit queue
          </Link>
        </div>
      )}
    </div>
  );
}
