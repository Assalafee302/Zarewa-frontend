import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Printer, Wallet } from 'lucide-react';
import { formatNgn } from '../../Data/mockData';
import { receiveStaffObligationPayment } from '../../lib/hrStaffObligationCashier';
import { obligationRepaymentReceiptPdfUrl } from '../../lib/hrStaffObligations';
import { treasuryAccountDisplayName } from '../../lib/treasuryAccountsStore';
import { compareSelectLabels } from '../../lib/selectOptionSort';
import { ModalFrame, ModalScrollShell, ModalScrollBody, ModalScrollFooter } from '../layout';

const INPUT = 'z-finance-field';

/**
 * Branch cashier / finance — record early repayment on staff loan or purchase credit (treasury + ledger).
 */
export function StaffObligationRepaymentModal({ obligation, treasuryAccounts = [], onClose, onSaved }) {
  const outstanding = Math.max(0, Number(obligation?.principalOutstandingNgn) || 0);
  const monthly = Math.max(0, Number(obligation?.installmentNgn) || 0);
  const branchId = String(obligation?.branchId || '').trim();

  const branchAccounts = useMemo(
    () =>
      (Array.isArray(treasuryAccounts) ? treasuryAccounts : [])
        .filter((a) => !branchId || String(a.branchId || '') === branchId)
        .sort((a, b) => compareSelectLabels(treasuryAccountDisplayName(a), treasuryAccountDisplayName(b))),
    [treasuryAccounts, branchId]
  );

  const [form, setForm] = useState({
    payInFull: true,
    amountNgn: '',
    treasuryAccountId: '',
    paymentDateIso: new Date().toISOString().slice(0, 10),
    paymentReference: '',
    note: '',
    recalculateInstallment: false,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState(null);

  useEffect(() => {
    setForm({
      payInFull: true,
      amountNgn: String(outstanding || ''),
      treasuryAccountId: branchAccounts[0] ? String(branchAccounts[0].id) : '',
      paymentDateIso: new Date().toISOString().slice(0, 10),
      paymentReference: '',
      note: '',
      recalculateInstallment: false,
    });
    setError('');
    setReceipt(null);
  }, [obligation?.id, outstanding, branchAccounts]);

  useEffect(() => {
    if (form.payInFull) {
      setForm((prev) => ({ ...prev, amountNgn: String(outstanding || '') }));
    }
  }, [form.payInFull, outstanding]);

  const amountToCollect = form.payInFull ? outstanding : Math.round(Number(form.amountNgn) || 0);
  const lookupLine = [obligation?.staffEmployeeNo, obligation?.quotationRef].filter(Boolean).join(' · ');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const accountId = String(obligation?.id || '').trim();
    if (!accountId) return;

    const treasuryAccountId = Number(form.treasuryAccountId);
    const amountNgn = form.payInFull ? outstanding : Math.round(Number(form.amountNgn) || 0);
    if (!treasuryAccountId) {
      setError('Select the bank or cash account that received the payment.');
      return;
    }
    if (amountNgn <= 0) {
      setError('Payment amount must be greater than zero.');
      return;
    }
    if (amountNgn > outstanding) {
      setError('Amount exceeds outstanding balance.');
      return;
    }

    setBusy(true);
    const { ok, data } = await receiveStaffObligationPayment(accountId, {
      treasuryAccountId,
      payInFull: form.payInFull,
      amountNgn: form.payInFull ? undefined : amountNgn,
      paymentDateIso: form.paymentDateIso,
      paymentReference: form.paymentReference.trim() || undefined,
      note: form.note.trim() || undefined,
      recalculateInstallment: form.recalculateInstallment || undefined,
    });
    setBusy(false);
    if (!ok || !data?.ok) {
      setError(data?.error || 'Could not record payment.');
      return;
    }
    setReceipt(data);
    onSaved?.(data);
  };

  if (!obligation) return null;

  const txId = receipt?.transaction?.id;

  return (
    <ModalFrame
      isOpen={Boolean(obligation)}
      onClose={onClose}
      title="Record staff loan / purchase credit payment"
      surface="plain"
    >
      <ModalScrollShell>
        <form onSubmit={handleSubmit}>
          <ModalScrollBody className="space-y-5">
            <div className="rounded-2xl border border-teal-200 bg-teal-50/50 p-4 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-teal-700">
                {obligation.kindLabel || 'Staff obligation'}
              </p>
              <p className="text-lg font-bold text-slate-900">{obligation.staffDisplayName || obligation.userId}</p>
              {lookupLine ? <p className="text-sm font-semibold text-teal-900">Lookup: {lookupLine}</p> : null}
              <p className="text-sm text-slate-700">{obligation.title || obligation.id}</p>
              <p className="text-3xl font-black tabular-nums text-[#134e4a]">{formatNgn(outstanding)}</p>
              {monthly > 0 ? (
                <p className="text-xs text-slate-600">
                  Payroll deducts {formatNgn(monthly)}/month — early payment reduces balance; monthly stays the same
                  unless you recalculate below
                </p>
              ) : null}
            </div>

            {receipt?.ok ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-5 text-center space-y-3">
                <CheckCircle2 className="mx-auto text-emerald-600" size={40} aria-hidden />
                <p className="text-lg font-bold text-emerald-950">Payment recorded</p>
                <p className="text-sm text-emerald-900">
                  {formatNgn(amountToCollect)} posted — receipt{' '}
                  <strong>{receipt.receiptReference || ''}</strong>
                </p>
                {receipt.treasuryAccountName ? (
                  <p className="text-xs text-emerald-800">Treasury: {receipt.treasuryAccountName}</p>
                ) : null}
                {receipt.account?.principalOutstandingNgn === 0 ? (
                  <p className="text-xs text-emerald-800">Balance cleared.</p>
                ) : receipt.account?.principalOutstandingNgn != null ? (
                  <p className="text-xs text-emerald-800">
                    Remaining: {formatNgn(receipt.account.principalOutstandingNgn)}
                    {receipt.account?.installmentNgn != null ? (
                      <> · Monthly: {formatNgn(receipt.account.installmentNgn)}</>
                    ) : null}
                  </p>
                ) : null}
                {obligation.id && txId ? (
                  <a
                    className="inline-flex items-center gap-2 rounded-lg bg-white border border-emerald-200 px-4 py-2 text-sm font-bold text-[#134e4a] shadow-sm hover:bg-emerald-50"
                    href={obligationRepaymentReceiptPdfUrl(obligation.id, txId)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Printer size={16} aria-hidden />
                    Print receipt for staff
                  </a>
                ) : null}
              </div>
            ) : (
              <>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Collecting today</p>
                  <p className="mt-1 text-2xl font-black tabular-nums text-[#134e4a]">
                    {formatNgn(amountToCollect || outstanding)}
                  </p>
                </div>

                {error ? (
                  <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800">
                    {error}
                  </p>
                ) : null}

                <div className="space-y-3 rounded-2xl border border-teal-100 bg-teal-50/30 p-4">
                  <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-600">
                    <Wallet size={14} aria-hidden />
                    Bank / cash account
                  </p>
                  <label className="block text-xs font-semibold text-slate-600">
                    Received into
                    <select
                      className={`mt-1 ${INPUT}`}
                      value={form.treasuryAccountId}
                      onChange={(e) => setForm({ ...form, treasuryAccountId: e.target.value })}
                      required
                    >
                      <option value="">Select account…</option>
                      {branchAccounts.map((a) => (
                        <option key={a.id} value={String(a.id)}>
                          {treasuryAccountDisplayName(a)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={`rounded-lg px-3 py-2 text-xs font-bold border ${
                        form.payInFull
                          ? 'border-[#134e4a] bg-[#134e4a] text-white'
                          : 'border-slate-200 bg-white text-slate-700'
                      }`}
                      onClick={() => setForm({ ...form, payInFull: true })}
                    >
                      Full amount ({formatNgn(outstanding)})
                    </button>
                    <button
                      type="button"
                      className={`rounded-lg px-3 py-2 text-xs font-bold border ${
                        !form.payInFull
                          ? 'border-[#134e4a] bg-[#134e4a] text-white'
                          : 'border-slate-200 bg-white text-slate-700'
                      }`}
                      onClick={() => setForm({ ...form, payInFull: false })}
                    >
                      Partial amount
                    </button>
                  </div>

                  {!form.payInFull ? (
                    <label className="block text-xs font-semibold text-slate-600">
                      Amount received (₦)
                      <input
                        type="number"
                        min={1}
                        max={outstanding}
                        className={`mt-1 ${INPUT}`}
                        value={form.amountNgn}
                        onChange={(e) => setForm({ ...form, amountNgn: e.target.value })}
                        required
                      />
                    </label>
                  ) : null}

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block text-xs font-semibold text-slate-600">
                      Payment date
                      <input
                        type="date"
                        className={`mt-1 ${INPUT}`}
                        value={form.paymentDateIso}
                        onChange={(e) => setForm({ ...form, paymentDateIso: e.target.value })}
                        required
                      />
                    </label>
                    <label className="block text-xs font-semibold text-slate-600">
                      Bank / transfer ref (optional)
                      <input
                        className={`mt-1 ${INPUT}`}
                        value={form.paymentReference}
                        onChange={(e) => setForm({ ...form, paymentReference: e.target.value })}
                      />
                    </label>
                  </div>
                  <label className="block text-xs font-semibold text-slate-600">
                    Note (optional)
                    <input
                      className={`mt-1 ${INPUT}`}
                      value={form.note}
                      onChange={(e) => setForm({ ...form, note: e.target.value })}
                      placeholder="Cash at branch desk"
                    />
                  </label>
                  {!form.payInFull && outstanding > 0 ? (
                    <label className="flex items-start gap-2 text-xs font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={form.recalculateInstallment}
                        onChange={(e) => setForm({ ...form, recalculateInstallment: e.target.checked })}
                      />
                      <span>
                        Recalculate monthly installment from new balance (spread over remaining months on schedule)
                      </span>
                    </label>
                  ) : null}
                </div>
              </>
            )}
          </ModalScrollBody>
          <ModalScrollFooter className="flex flex-wrap gap-2 justify-end">
            <button type="button" className="z-btn-secondary" onClick={onClose} disabled={busy}>
              {receipt?.ok ? 'Done' : 'Cancel'}
            </button>
            {!receipt?.ok ? (
              <button type="submit" className="z-btn-primary" disabled={busy}>
                {busy ? 'Posting…' : `Confirm ${formatNgn(amountToCollect || outstanding)} received`}
              </button>
            ) : null}
          </ModalScrollFooter>
        </form>
      </ModalScrollShell>
    </ModalFrame>
  );
}
