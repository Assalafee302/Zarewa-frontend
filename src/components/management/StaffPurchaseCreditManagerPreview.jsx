import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Flag } from 'lucide-react';
import { Button } from '../ui';
import { ZareApprovalHint } from '../ZareApprovalHint';
import { salesQuotationDeepLink } from '../../lib/staffPurchaseCreditLinks';
import { hrStaffCreditPath, HR_STAFF_CREDIT_SECTION } from '../../lib/hrRoutes';
import { HrPurchaseCreditDecisionContext } from '../hr/HrPurchaseCreditDecisionContext';
import {
  DecisionActionBar,
  DecisionActionTile,
  DecisionBand,
} from './DecisionSurface';

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
      <DecisionBand
        tone="credit"
        eyebrow="Staff purchase credit"
        title={staffName}
        subtitle={account.title || 'Roofing / materials on credit'}
        aside={
          amountNgn > 0 ? (
            <>
              <p className="text-ui-xs font-bold uppercase text-slate-400">Credit amount</p>
              <p className="text-lg font-black tabular-nums text-slate-900">{asMoney(amountNgn)}</p>
            </>
          ) : null
        }
      >
        <dl className="mt-3 grid gap-2 text-sm text-slate-800 sm:grid-cols-2">
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
      </DecisionBand>

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
        <p className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
          Awaiting Managing Director approval. You may reject if this request should not proceed.
        </p>
      ) : null}

      {rejectOpen ? (
        <DecisionActionBar hint="Rejection reason is required (at least 3 characters).">
          <textarea
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            rows={3}
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            minLength={3}
            placeholder="Explain why this purchase credit should not proceed"
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" disabled={busy} onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <DecisionActionTile
              variant="compactReject"
              icon={Flag}
              label={busy ? 'Working…' : 'Confirm reject'}
              disabled={busy || rejectNote.trim().length < 3}
              onClick={confirmReject}
            />
          </div>
        </DecisionActionBar>
      ) : (
        <DecisionActionBar>
          <div className="flex flex-wrap gap-2">
            {canReject ? (
              <DecisionActionTile
                variant="compactReject"
                icon={Flag}
                label="Reject"
                disabled={busy}
                onClick={() => setRejectOpen(true)}
              />
            ) : null}
            {canApprove ? (
              <DecisionActionTile
                variant="compactApprove"
                icon={CheckCircle2}
                label={busy ? 'Working…' : 'Approve'}
                disabled={busy}
                onClick={() => onApprove?.()}
              />
            ) : null}
            <Link
              to={hrStaffCreditPath(HR_STAFF_CREDIT_SECTION.PURCHASE_CREDIT)}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-wide text-slate-700 hover:bg-slate-50"
            >
              Open purchase credit queue
            </Link>
          </div>
        </DecisionActionBar>
      )}
    </div>
  );
}
