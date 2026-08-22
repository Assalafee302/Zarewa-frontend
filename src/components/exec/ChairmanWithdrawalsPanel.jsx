import React, { Fragment, useEffect, useMemo, useState } from 'react';
import { Landmark } from 'lucide-react';
import { Button } from '../ui';
import { FormField, FormGrid, FormSection } from '../layout/FormLayout';
import { FIELD } from '../../lib/designTokens';
import { formatNgn } from '../../shared/lib/formatNgn.js';
import { remainingCashAfterDraw } from '../../lib/chairmanOfficeMath.js';
import { requestChairmanWithdrawal } from '../../lib/chairmanOffice';
import { appConfirm } from '../../lib/appConfirm';
import { useToast } from '../../context/ToastContext';
import { COMMAND_SECTION_SUB, COMMAND_SECTION_TITLE } from '../../lib/execPageUi';
import { formatPayrollPeriodLabel } from '../../lib/hrPayroll';
import { ChairmanRequestTimeline } from './ChairmanRequestTimeline';

function statusClass(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'approved') return 'bg-emerald-50 text-emerald-900 border-emerald-200';
  if (s === 'rejected') return 'bg-rose-50 text-rose-900 border-rose-200';
  if (s.includes('paid')) return 'bg-teal-50 text-zarewa-teal border-teal-200';
  return 'bg-amber-50 text-amber-950 border-amber-200';
}

function statusLabel(row) {
  if (Number(row.paidAmountNgn) > 0 && Number(row.outstandingNgn) <= 0) return 'Paid';
  if (Number(row.paidAmountNgn) > 0 && Number(row.outstandingNgn) > 0) return 'Part paid';
  return row.approvalStatus || 'Pending';
}

function reasonText(description) {
  const raw = String(description || '').trim();
  return raw.replace(/^Chairman withdrawal\s+[—-]\s*/i, '') || raw || '—';
}

/**
 * Equity picture + chairman withdrawal requests (GL 3200 Drawings on payout).
 */
export function ChairmanWithdrawalsPanel({ office, onChanged, defaultPayeeName = '' }) {
  const { show: showToast } = useToast();
  const impact = office?.impact || {};
  const equity = office?.equity || {};
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [payeeName, setPayeeName] = useState('');
  const [payeeBankName, setPayeeBankName] = useState('');
  const [payeeAccountNo, setPayeeAccountNo] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [expandedId, setExpandedId] = useState('');

  useEffect(() => {
    setPayeeName((prev) => prev || defaultPayeeName);
  }, [defaultPayeeName]);

  const requestedNgn = Math.round(Number(amount) || 0);
  const pendingBeforeThis =
    Number(impact.pendingWithdrawalsNgn || 0) +
    Number(impact.pendingBenefitPaymentsNgn || 0) +
    Number(impact.pendingLoanDisbursementNgn || 0);
  const cashIfPaid = useMemo(
    () => remainingCashAfterDraw(impact.treasuryCashNgn, pendingBeforeThis, requestedNgn),
    [impact.treasuryCashNgn, pendingBeforeThis, requestedNgn]
  );
  const reasonLen = String(reason).trim().length;
  const withdrawals = office?.withdrawals || [];
  const hrExpenses = office?.hrExpenses || [];
  const periodLabel = formatPayrollPeriodLabel(office?.periodKey);

  const submit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (requestedNgn <= 0) {
      setFormError('Enter a withdrawal amount greater than zero.');
      return;
    }
    if (reasonLen < 8) {
      setFormError('Add a short reason (at least 8 characters) so finance can post this as drawings.');
      return;
    }
    if (!(await appConfirm({
      title: 'Submit this withdrawal?',
      message: `${formatNgn(requestedNgn)} will go to MD or Finance for approval. Cashier pays later to GL 3200 Drawings — not profit.`,
    }))) return;
    setBusy(true);
    const { ok, data } = await requestChairmanWithdrawal({
      amountNgn: requestedNgn,
      reason: reason.trim(),
      payeeName: payeeName.trim(),
      payeeBankName: payeeBankName.trim(),
      payeeAccountNo: payeeAccountNo.trim(),
    });
    setBusy(false);
    if (!ok || !data?.ok) {
      setFormError(data?.error || 'Could not submit the withdrawal.');
      return;
    }
    setAmount('');
    setReason('');
    showToast(`Withdrawal ${data.requestID} sent for approval.`, { variant: 'success' });
    onChanged?.(data.office);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className={COMMAND_SECTION_TITLE}>Equity picture</h2>
        <p className={COMMAND_SECTION_SUB}>
          Capital and drawings are balance-sheet items. Paying a withdrawal reduces cash and increases drawings — it
          does not hit profit.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <p className="text-ui-xs font-medium text-slate-500">Share capital (3100)</p>
          <p className="z-stencil mt-1 text-xl text-slate-900">{formatNgn(equity.capitalNgn)}</p>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <p className="text-ui-xs font-medium text-slate-500">Drawings taken YTD (3200)</p>
          <p className="z-stencil mt-1 text-xl text-slate-900">{formatNgn(equity.drawingsYtdNgn)}</p>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <p className="text-ui-xs font-medium text-slate-500">Capital after drawings</p>
          <p className="z-stencil mt-1 text-xl text-slate-900">{formatNgn(equity.capitalNetOfDrawingsNgn)}</p>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <p className="text-ui-xs font-medium text-slate-500">Retained earnings (3900)</p>
          <p className="z-stencil mt-1 text-xl text-slate-900">{formatNgn(equity.retainedEarningsNgn)}</p>
        </div>
      </div>

      {office?.canRequestWithdrawal ? (
        <FormSection title="Request a withdrawal" icon={Landmark}>
          <p className="text-sm text-[var(--z-text-muted)]">
            Submit here. MD or finance approve the payment request, then cashier pays from treasury. The posting is
            GL 3200 Drawings — not an operating expense and not partner wallet (that is refunds).
          </p>
          <form onSubmit={submit} className="space-y-4">
            <FormGrid>
              <FormField label="Amount (₦)" htmlFor="chair-wd-amount" required>
                <input
                  id="chair-wd-amount"
                  className={FIELD.base}
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                />
              </FormField>
              <FormField
                label="Cash if this pays out"
                hint="Treasury minus pending drawings, pending family/household payouts, pending loans, and this request."
              >
                <p className={`z-stencil text-lg ${cashIfPaid < 0 ? 'text-amber-900' : 'text-slate-900'}`}>
                  {formatNgn(cashIfPaid)}
                </p>
              </FormField>
            </FormGrid>
            {cashIfPaid < 0 && requestedNgn > 0 ? (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                This request would take treasury below the cash already committed to pending payouts. Finance may still
                hold it until collections come in.
              </p>
            ) : null}
            <FormField
              label="Reason"
              htmlFor="chair-wd-reason"
              required
              hint={`${reasonLen}/8 characters minimum. This becomes the payment-request description.`}
            >
              <textarea
                id="chair-wd-reason"
                className={FIELD.base}
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why this drawing is needed"
              />
            </FormField>
            <FormGrid cols={3}>
              <FormField label="Payee name" htmlFor="chair-wd-payee" hint="Who receives the transfer.">
                <input
                  id="chair-wd-payee"
                  className={FIELD.base}
                  value={payeeName}
                  onChange={(e) => setPayeeName(e.target.value)}
                  placeholder="Chairman"
                />
              </FormField>
              <FormField label="Bank" htmlFor="chair-wd-bank">
                <input
                  id="chair-wd-bank"
                  className={FIELD.base}
                  value={payeeBankName}
                  onChange={(e) => setPayeeBankName(e.target.value)}
                  placeholder="Bank name"
                />
              </FormField>
              <FormField label="Account number" htmlFor="chair-wd-acct">
                <input
                  id="chair-wd-acct"
                  className={FIELD.base}
                  value={payeeAccountNo}
                  onChange={(e) => setPayeeAccountNo(e.target.value)}
                  placeholder="NUBAN"
                />
              </FormField>
            </FormGrid>
            {formError ? <p className="text-sm text-[var(--z-error)]">{formError}</p> : null}
            <Button type="submit" disabled={busy}>
              {busy ? 'Submitting…' : 'Submit for approval'}
            </Button>
          </form>
        </FormSection>
      ) : (
        <p className="rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          You can view drawings history here. Requesting a new withdrawal is limited to Chairman, MD, and Admin.
        </p>
      )}

      <section>
        <h2 className="text-sm font-semibold text-slate-900">Withdrawal trail</h2>
        <p className="mt-0.5 mb-3 text-sm text-slate-500">
          Payment requests coded Chairman withdrawal. Open a row for who approved, who paid, and how. Paid rows have
          already hit GL 3200.
        </p>
        {!withdrawals.length ? (
          <p className="rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
            No drawings requests yet. Submit one above when you need cash from the company.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-ui-xs font-black uppercase text-slate-500">
                  <th className="px-3 py-2 text-left">Request</th>
                  <th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-left">Reason</th>
                  <th className="px-3 py-2 text-right">Requested</th>
                  <th className="px-3 py-2 text-right">Paid</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Payee</th>
                </tr>
              </thead>
              <tbody>
                {withdrawals.map((w) => {
                  const open = expandedId === w.requestID;
                  return (
                    <Fragment key={w.requestID}>
                      <tr className="border-b border-slate-50">
                        <td className="px-3 py-2.5 font-semibold text-slate-800">
                          <button
                            type="button"
                            className="underline-offset-2 hover:underline"
                            onClick={() => setExpandedId(open ? '' : w.requestID)}
                          >
                            {w.requestID}
                          </button>
                        </td>
                        <td className="px-3 py-2.5 text-slate-600">{String(w.requestDate || '').slice(0, 10)}</td>
                        <td className="max-w-[18rem] px-3 py-2.5 text-slate-600" title={w.description}>
                          {reasonText(w.description)}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{formatNgn(w.amountRequestedNgn)}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{formatNgn(w.paidAmountNgn)}</td>
                        <td className="px-3 py-2.5">
                          <span className={`inline-flex rounded-sm border px-2 py-0.5 text-xs font-medium ${statusClass(statusLabel(w))}`}>
                            {statusLabel(w)}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-slate-600">{w.payeeName || '—'}</td>
                      </tr>
                      {open ? (
                        <tr className="border-b border-slate-100 bg-slate-50/80">
                          <td colSpan={7} className="px-4 py-4">
                            <p className="mb-1 text-ui-xs font-medium text-slate-500">How this is approved</p>
                            <p className="mb-3 text-sm text-slate-700">{w.howApprove}</p>
                            <p className="mb-1 text-ui-xs font-medium text-slate-500">How this is paid</p>
                            <p className="mb-4 text-sm text-slate-700">{w.howPay}</p>
                            {w.approvedBy ? (
                              <p className="mb-1 text-sm text-slate-600">
                                Approved by <span className="font-semibold">{w.approvedBy}</span>
                                {w.approvalNote ? ` — ${w.approvalNote}` : ''}
                              </p>
                            ) : null}
                            {w.paidBy ? (
                              <p className="mb-3 text-sm text-slate-600">
                                Paid by <span className="font-semibold">{w.paidBy}</span>
                                {w.paymentNote ? ` — ${w.paymentNote}` : ''}
                              </p>
                            ) : null}
                            <ChairmanRequestTimeline events={w.timeline} />
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {hrExpenses.length ? (
        <section>
          <h2 className="text-sm font-semibold text-slate-900">
            Other Chairman expenses{periodLabel ? ` · ${periodLabel}` : ''}
          </h2>
          <p className="mt-0.5 mb-3 text-sm text-slate-500">
            Household extras recorded in Executive HR this month — not drawings.
          </p>
          <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-ui-xs font-black uppercase text-slate-500">
                  <th className="px-3 py-2 text-left">Type</th>
                  <th className="px-3 py-2 text-left">Description</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                  <th className="px-3 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {hrExpenses.map((e) => (
                  <tr key={e.id} className="border-b border-slate-50">
                    <td className="px-3 py-2.5 text-slate-800">{e.expenseType || '—'}</td>
                    <td className="px-3 py-2.5 text-slate-600">{e.description || '—'}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{formatNgn(e.amountNgn)}</td>
                    <td className="px-3 py-2.5 text-slate-600">{e.paymentStatus || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
