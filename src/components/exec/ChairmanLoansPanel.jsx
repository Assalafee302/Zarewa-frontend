import React, { useEffect, useMemo, useState } from 'react';
import { Banknote } from 'lucide-react';
import { Button } from '../ui';
import { FormField, FormGrid, FormSection } from '../layout/FormLayout';
import { FIELD } from '../../lib/designTokens';
import { formatNgn } from '../../shared/lib/formatNgn.js';
import { remainingCashAfterDraw } from '../../lib/chairmanOfficeMath.js';
import { recordChairmanOfficeLoanRepayment, requestChairmanOfficeLoan } from '../../lib/chairmanOffice';
import { appConfirm } from '../../lib/appConfirm';
import { useToast } from '../../context/ToastContext';
import { COMMAND_SECTION_SUB, COMMAND_SECTION_TITLE } from '../../lib/execPageUi';
import { ChairmanRequestTimeline } from './ChairmanRequestTimeline';

function statusClass(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'approved' || s === 'repaid') return 'bg-emerald-50 text-emerald-900 border-emerald-200';
  if (s === 'rejected') return 'bg-rose-50 text-rose-900 border-rose-200';
  if (s === 'outstanding' || s.includes('payout')) return 'bg-teal-50 text-zarewa-teal border-teal-200';
  return 'bg-amber-50 text-amber-950 border-amber-200';
}

function loanStatusLabel(row) {
  if (row.disbursedNgn > 0 && row.outstandingNgn <= 0) return 'Repaid';
  if (row.disbursedNgn > 0 && row.outstandingNgn > 0) return 'Outstanding';
  if (row.unpaidDisbursement) return row.approvalStatus || 'Pending payout';
  return row.approvalStatus || 'Pending';
}

function borrowerKindLabel(kind) {
  return String(kind) === 'non_staff' ? 'Non-staff' : 'Chairman';
}

/**
 * Company loans from Chairman Office — GL 1200 receivable, not drawings and not staff payroll loans.
 */
export function ChairmanLoansPanel({ office, onChanged, defaultPayeeName = '' }) {
  const { show: showToast } = useToast();
  const impact = office?.impact || {};
  const [borrowerKind, setBorrowerKind] = useState('chairman');
  const [borrowerName, setBorrowerName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [amount, setAmount] = useState('');
  const [purpose, setPurpose] = useState('');
  const [repaymentMonths, setRepaymentMonths] = useState('');
  const [payeeName, setPayeeName] = useState('');
  const [payeeBankName, setPayeeBankName] = useState('');
  const [payeeAccountNo, setPayeeAccountNo] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [expandedId, setExpandedId] = useState('');
  const [repayAmount, setRepayAmount] = useState('');
  const [repayHow, setRepayHow] = useState('');
  const [repayBusy, setRepayBusy] = useState(false);
  const [repayError, setRepayError] = useState('');

  useEffect(() => {
    setPayeeName((prev) => prev || defaultPayeeName);
    if (borrowerKind === 'chairman') {
      setBorrowerName((prev) => prev || defaultPayeeName || 'Chairman');
    }
  }, [defaultPayeeName, borrowerKind]);

  const requestedNgn = Math.round(Number(amount) || 0);
  const pendingBeforeThis =
    Number(impact.pendingWithdrawalsNgn || 0) +
    Number(impact.pendingBenefitPaymentsNgn || 0) +
    Number(impact.pendingLoanDisbursementNgn || 0);
  const cashIfPaid = useMemo(
    () => remainingCashAfterDraw(impact.treasuryCashNgn, pendingBeforeThis, requestedNgn),
    [impact.treasuryCashNgn, pendingBeforeThis, requestedNgn]
  );
  const purposeLen = String(purpose).trim().length;
  const loans = office?.loans || [];

  const submit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (requestedNgn <= 0) {
      setFormError('Enter a loan amount greater than zero.');
      return;
    }
    if (purposeLen < 8) {
      setFormError('Add a short purpose (at least 8 characters) so finance know why the company is lending.');
      return;
    }
    if (borrowerKind === 'non_staff' && String(borrowerName).trim().length < 2) {
      setFormError('Enter the borrower name.');
      return;
    }
    if (borrowerKind === 'non_staff' && String(relationship).trim().length < 2) {
      setFormError('Say how this person is related to the office (family, associate, other).');
      return;
    }
    const who = borrowerKind === 'non_staff' ? String(borrowerName).trim() : 'the Chairman';
    if (!(await appConfirm({
      title: 'Submit this company loan?',
      message: `${formatNgn(requestedNgn)} to ${who}. MD or Finance approve, then cashier pays. The borrower will owe the company (GL 1200) — this is not a drawing.`,
    }))) return;
    setBusy(true);
    const { ok, data } = await requestChairmanOfficeLoan({
      borrowerKind,
      borrowerName: String(borrowerName).trim(),
      borrowerRelationship: String(relationship).trim(),
      amountNgn: requestedNgn,
      purpose: purpose.trim(),
      repaymentMonths: repaymentMonths ? Number(repaymentMonths) : 0,
      payeeName: payeeName.trim(),
      payeeBankName: payeeBankName.trim(),
      payeeAccountNo: payeeAccountNo.trim(),
    });
    setBusy(false);
    if (!ok || !data?.ok) {
      setFormError(data?.error || 'Could not submit the loan request.');
      return;
    }
    setAmount('');
    setPurpose('');
    if (borrowerKind === 'non_staff') {
      setBorrowerName('');
      setRelationship('');
    }
    showToast(`Loan ${data.requestID} sent for approval.`, { variant: 'success' });
    onChanged?.(data.office);
  };

  const submitRepay = async (loan) => {
    setRepayError('');
    const amt = Math.round(Number(repayAmount) || 0);
    if (amt <= 0) {
      setRepayError('Enter a repayment amount greater than zero.');
      return;
    }
    if (String(repayHow).trim().length < 8) {
      setRepayError('Say how the money came back (cash received, bank transfer, and which till or bank).');
      return;
    }
    if (!(await appConfirm({
      title: 'Record this repayment?',
      message: `${formatNgn(amt)} from ${loan.borrowerName}. This log does not post GL — receipt the cash on Finance after.`,
    }))) return;
    setRepayBusy(true);
    const { ok, data } = await recordChairmanOfficeLoanRepayment(loan.id, {
      amountNgn: amt,
      how: repayHow.trim(),
    });
    setRepayBusy(false);
    if (!ok || !data?.ok) {
      setRepayError(data?.error || 'Could not record the repayment.');
      return;
    }
    setRepayAmount('');
    setRepayHow('');
    showToast('Repayment recorded. Receipt the cash on the Finance desk so GL 1200 is credited.', {
      variant: 'success',
    });
    onChanged?.(data.office);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className={COMMAND_SECTION_TITLE}>Company loans</h2>
        <p className={COMMAND_SECTION_SUB}>
          Money the company is owed (GL 1200 Receivable). This is not a drawing and not a staff payroll loan — do not
          create a fake staff record for someone who is not on payroll.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <p className="text-ui-xs font-medium text-slate-500">Awaiting payout</p>
          <p className="z-stencil mt-1 text-xl text-slate-900">{formatNgn(impact.pendingLoanDisbursementNgn)}</p>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <p className="text-ui-xs font-medium text-slate-500">Outstanding (owed to company)</p>
          <p className="z-stencil mt-1 text-xl text-slate-900">{formatNgn(impact.loansOutstandingNgn)}</p>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <p className="text-ui-xs font-medium text-slate-500">Open requests</p>
          <p className="z-stencil mt-1 text-xl text-slate-900">{Number(impact.pendingLoanCount) || 0}</p>
        </div>
      </div>

      {office?.canRequestLoan ? (
        <FormSection title="Request a company loan" icon={Banknote}>
          <p className="text-sm text-[var(--z-text-muted)]">
            Submit here. MD or Finance approve on the Accounts payment-request desk (cash does not move yet). Cashier
            then pays from a named treasury account. GL 1200 — the borrower owes the company.
          </p>
          <form onSubmit={submit} className="space-y-4">
            <fieldset className="space-y-2">
              <legend className="text-ui-xs font-medium text-slate-500">Who is borrowing</legend>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={borrowerKind === 'chairman' ? 'default' : 'outline'}
                  onClick={() => setBorrowerKind('chairman')}
                >
                  Chairman
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={borrowerKind === 'non_staff' ? 'default' : 'outline'}
                  onClick={() => setBorrowerKind('non_staff')}
                >
                  Someone not on staff
                </Button>
              </div>
            </fieldset>
            <FormGrid>
              <FormField
                label="Borrower name"
                htmlFor="chair-loan-name"
                required={borrowerKind === 'non_staff'}
              >
                <input
                  id="chair-loan-name"
                  className={FIELD.base}
                  value={borrowerName}
                  onChange={(e) => setBorrowerName(e.target.value)}
                  placeholder={borrowerKind === 'chairman' ? 'Chairman' : 'Full name'}
                />
              </FormField>
              {borrowerKind === 'non_staff' ? (
                <FormField
                  label="Relationship"
                  htmlFor="chair-loan-rel"
                  required
                  hint="Family, associate, or other — not an ERP staff user."
                >
                  <input
                    id="chair-loan-rel"
                    className={FIELD.base}
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value)}
                    placeholder="Family / associate / other"
                  />
                </FormField>
              ) : (
                <FormField
                  label="Cash if this pays out"
                  hint="Treasury minus pending drawings, benefits, other loans, and this request."
                >
                  <p className={`z-stencil text-lg ${cashIfPaid < 0 ? 'text-amber-900' : 'text-slate-900'}`}>
                    {formatNgn(cashIfPaid)}
                  </p>
                </FormField>
              )}
            </FormGrid>
            {borrowerKind === 'non_staff' ? (
              <FormField
                label="Cash if this pays out"
                hint="Treasury minus pending drawings, benefits, other loans, and this request."
              >
                <p className={`z-stencil text-lg ${cashIfPaid < 0 ? 'text-amber-900' : 'text-slate-900'}`}>
                  {formatNgn(cashIfPaid)}
                </p>
              </FormField>
            ) : null}
            <FormGrid>
              <FormField label="Amount (₦)" htmlFor="chair-loan-amount" required>
                <input
                  id="chair-loan-amount"
                  className={FIELD.base}
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                />
              </FormField>
              <FormField
                label="Repayment months"
                htmlFor="chair-loan-months"
                hint="Optional. Cashier still pays in full on disbursement."
              >
                <input
                  id="chair-loan-months"
                  className={FIELD.base}
                  inputMode="numeric"
                  value={repaymentMonths}
                  onChange={(e) => setRepaymentMonths(e.target.value)}
                  placeholder="e.g. 6"
                />
              </FormField>
            </FormGrid>
            {cashIfPaid < 0 && requestedNgn > 0 ? (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                This request would take treasury below cash already committed to pending payouts. Finance may still
                hold it until collections come in.
              </p>
            ) : null}
            <FormField
              label="Purpose"
              htmlFor="chair-loan-purpose"
              required
              hint={`${purposeLen}/8 characters minimum. Finance use this on the payment request.`}
            >
              <textarea
                id="chair-loan-purpose"
                className={FIELD.base}
                rows={3}
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="Why the company is lending this money"
              />
            </FormField>
            <FormGrid cols={3}>
              <FormField label="Payee name" htmlFor="chair-loan-payee" hint="Who receives the transfer.">
                <input
                  id="chair-loan-payee"
                  className={FIELD.base}
                  value={payeeName}
                  onChange={(e) => setPayeeName(e.target.value)}
                />
              </FormField>
              <FormField label="Bank" htmlFor="chair-loan-bank">
                <input
                  id="chair-loan-bank"
                  className={FIELD.base}
                  value={payeeBankName}
                  onChange={(e) => setPayeeBankName(e.target.value)}
                  placeholder="Bank name"
                />
              </FormField>
              <FormField label="Account number" htmlFor="chair-loan-acct">
                <input
                  id="chair-loan-acct"
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
          You can view the loan register here. Requesting a new loan is limited to Chairman, MD, and Admin.
        </p>
      )}

      <section>
        <h2 className="text-sm font-semibold text-slate-900">Loan trail</h2>
        <p className="mt-0.5 mb-3 text-sm text-slate-500">
          Open a row to see who requested, who approved, who paid, and any repayments recorded here.
        </p>
        {!loans.length ? (
          <p className="rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
            No company loans yet. Submit one above for the Chairman or for someone who is not on staff.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-ui-xs font-black uppercase text-slate-500">
                  <th className="px-3 py-2 text-left">Borrower</th>
                  <th className="px-3 py-2 text-left">Purpose</th>
                  <th className="px-3 py-2 text-right">Requested</th>
                  <th className="px-3 py-2 text-right">Paid out</th>
                  <th className="px-3 py-2 text-right">Outstanding</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Request</th>
                </tr>
              </thead>
              <tbody>
                {loans.map((loan) => {
                  const open = expandedId === loan.id;
                  return (
                    <React.Fragment key={loan.id}>
                      <tr className="border-b border-slate-50">
                        <td className="px-3 py-2.5">
                          <button
                            type="button"
                            className="text-left font-semibold text-slate-800 underline-offset-2 hover:underline"
                            onClick={() => {
                              setExpandedId(open ? '' : loan.id);
                              setRepayError('');
                            }}
                          >
                            {loan.borrowerName}
                          </button>
                          <p className="text-ui-xs text-slate-500">
                            {borrowerKindLabel(loan.borrowerKind)}
                            {loan.borrowerRelationship && loan.borrowerKind === 'non_staff'
                              ? ` · ${loan.borrowerRelationship}`
                              : ''}
                          </p>
                        </td>
                        <td className="max-w-[16rem] px-3 py-2.5 text-slate-600" title={loan.purpose}>
                          {loan.purpose || '—'}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{formatNgn(loan.amountNgn)}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{formatNgn(loan.disbursedNgn)}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{formatNgn(loan.outstandingNgn)}</td>
                        <td className="px-3 py-2.5">
                          <span
                            className={`inline-flex rounded-sm border px-2 py-0.5 text-xs font-medium ${statusClass(loanStatusLabel(loan))}`}
                          >
                            {loanStatusLabel(loan)}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 font-semibold text-slate-700">{loan.paymentRequestId || '—'}</td>
                      </tr>
                      {open ? (
                        <tr className="border-b border-slate-100 bg-slate-50/80">
                          <td colSpan={7} className="px-4 py-4">
                            <p className="mb-1 text-ui-xs font-medium text-slate-500">How this is approved</p>
                            <p className="mb-3 text-sm text-slate-700">{loan.howApprove}</p>
                            <p className="mb-1 text-ui-xs font-medium text-slate-500">How this is paid</p>
                            <p className="mb-4 text-sm text-slate-700">{loan.howPay}</p>
                            <ChairmanRequestTimeline events={loan.timeline} />
                            {loan.disbursedNgn > 0 && loan.outstandingNgn > 0 && office?.canRequestLoan ? (
                              <div className="mt-4 max-w-xl space-y-3 rounded-md border border-slate-200 bg-white p-4">
                                <p className="text-sm font-semibold text-slate-900">Record a repayment</p>
                                <p className="text-ui-xs text-slate-500">
                                  This log does not post GL. After recording, receipt the cash on the Finance desk (Dr
                                  treasury / Cr 1200).
                                </p>
                                <FormGrid>
                                  <FormField label="Amount (₦)" htmlFor={`repay-${loan.id}`}>
                                    <input
                                      id={`repay-${loan.id}`}
                                      className={FIELD.base}
                                      inputMode="decimal"
                                      value={repayAmount}
                                      onChange={(e) => setRepayAmount(e.target.value)}
                                    />
                                  </FormField>
                                  <FormField
                                    label="How it came back"
                                    htmlFor={`repay-how-${loan.id}`}
                                    hint="Cash at which till, or which bank transfer."
                                  >
                                    <input
                                      id={`repay-how-${loan.id}`}
                                      className={FIELD.base}
                                      value={repayHow}
                                      onChange={(e) => setRepayHow(e.target.value)}
                                      placeholder="Cash received at HQ till"
                                    />
                                  </FormField>
                                </FormGrid>
                                {repayError ? <p className="text-sm text-[var(--z-error)]">{repayError}</p> : null}
                                <Button type="button" size="sm" disabled={repayBusy} onClick={() => submitRepay(loan)}>
                                  {repayBusy ? 'Saving…' : 'Record repayment'}
                                </Button>
                              </div>
                            ) : null}
                          </td>
                        </tr>
                      ) : null}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
