import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Printer, Wallet } from 'lucide-react';
import { formatNgn } from '../../Data/mockData';
import { receiveStaffRecoveryPayment } from '../../lib/hrStaffRecoveries';
import { obligationRepaymentReceiptPdfUrl } from '../../lib/hrStaffObligations';
import { treasuryAccountDisplayName } from '../../lib/treasuryAccountsStore';
import { compareSelectLabels } from '../../lib/selectOptionSort';
import { ModalFrame, ModalScrollShell, ModalScrollBody, ModalScrollFooter } from '../layout';

const INPUT = 'z-finance-field';

/**
 * Branch cashier — receive staff discipline recovery (money in + treasury credit).
 */
export function StaffRecoveryCashierModal({ recovery, treasuryAccounts, onClose, onSaved }) {
  const outstanding = Math.max(0, Number(recovery?.principalOutstandingNgn) || 0);
  const branchId = String(recovery?.branchId || '').trim();

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
    note: '',
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
      note: '',
    });
    setError('');
    setReceipt(null);
  }, [recovery?.scheduleId, outstanding, branchAccounts]);

  useEffect(() => {
    if (form.payInFull) {
      setForm((prev) => ({ ...prev, amountNgn: String(outstanding || '') }));
    }
  }, [form.payInFull, outstanding]);

  const amountToCollect = form.payInFull ? outstanding : Math.round(Number(form.amountNgn) || 0);
  const lookupLine = [recovery?.staffEmployeeNo, recovery?.caseNumber].filter(Boolean).join(' · ');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const scheduleId = String(recovery?.scheduleId || '').trim();
    if (!scheduleId) return;

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
    const { ok, data } = await receiveStaffRecoveryPayment(scheduleId, {
      treasuryAccountId,
      payInFull: form.payInFull,
      amountNgn: form.payInFull ? undefined : amountNgn,
      paymentDateIso: form.paymentDateIso,
      note: form.note.trim() || undefined,
    });
    setBusy(false);
    if (!ok || !data?.ok) {
      setError(data?.error || 'Could not record recovery payment.');
      return;
    }
    setReceipt(data);
    onSaved?.(data);
  };

  if (!recovery) return null;

  return (
    <ModalFrame isOpen={Boolean(recovery)} onClose={onClose} title="Record staff recovery payment" surface="plain">
      <ModalScrollShell>
        <form onSubmit={handleSubmit}>
          <ModalScrollBody className="space-y-5">
            <div className="rounded-2xl border border-violet-200 bg-violet-50/50 p-4 space-y-2">
              <p className="text-ui-xs font-bold uppercase tracking-widest text-violet-700">HR initiated — amount due</p>
              <p className="text-lg font-bold text-slate-900">{recovery.staffDisplayName || recovery.userId}</p>
              {lookupLine ? (
                <p className="text-sm font-semibold text-violet-900">Employee ID / case: {lookupLine}</p>
              ) : null}
              <p className="text-3xl font-black tabular-nums text-zarewa-teal">{formatNgn(outstanding)}</p>
              {recovery.hrInitiatedAmountNgn && recovery.hrInitiatedAmountNgn !== outstanding ? (
                <p className="text-xs text-slate-600">
                  HR original amount {formatNgn(recovery.hrInitiatedAmountNgn)} — partial payments already recorded
                </p>
              ) : recovery.initiatedByName || recovery.initiatedAtIso ? (
                <p className="text-xs text-slate-600">
                  Set by HR{recovery.initiatedByName ? ` (${recovery.initiatedByName})` : ''}
                  {recovery.initiatedAtIso ? ` on ${String(recovery.initiatedAtIso).slice(0, 10)}` : ''}
                </p>
              ) : null}
              {recovery.branchId ? (
                <p className="text-xs text-slate-500">Branch {recovery.branchId}</p>
              ) : null}
            </div>

            {receipt?.ok ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-5 text-center space-y-3">
                <CheckCircle2 className="mx-auto text-emerald-600" size={40} aria-hidden />
                <p className="text-lg font-bold text-emerald-950">Payment recorded</p>
                <p className="text-sm text-emerald-900">
                  {formatNgn(receipt.settlement?.amountNgn ?? amountToCollect)} on{' '}
                  <strong>{receipt.paymentDateIso || form.paymentDateIso}</strong> credited to{' '}
                  <strong>{receipt.treasuryAccountName || 'treasury'}</strong>.
                </p>
                {receipt.paidInFull ? (
                  <p className="text-xs text-emerald-800">Balance cleared — payroll deductions stopped for this case.</p>
                ) : (
                  <p className="text-xs text-emerald-800">
                    Remaining: {formatNgn(receipt.principalOutstandingNgn ?? 0)}
                  </p>
                )}
                {receipt.obligationAccountId && receipt.obligationTransactionId ? (
                  <a
                    className="inline-flex items-center gap-2 rounded-lg bg-white border border-emerald-200 px-4 py-2 text-sm font-bold text-zarewa-teal shadow-sm hover:bg-emerald-50"
                    href={obligationRepaymentReceiptPdfUrl(receipt.obligationAccountId, receipt.obligationTransactionId)}
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
                  <p className="mt-1 text-2xl font-black tabular-nums text-zarewa-teal">{formatNgn(amountToCollect || outstanding)}</p>
                  {!form.payInFull && amountToCollect < outstanding ? (
                    <p className="mt-1 text-xs text-slate-600">
                      Partial — {formatNgn(outstanding - amountToCollect)} will remain on HR schedule
                    </p>
                  ) : recovery.installmentAmountNgn ? (
                    <p className="mt-1 text-xs text-slate-600">
                      Full payment stops {formatNgn(recovery.installmentAmountNgn)}/month payroll deduction
                    </p>
                  ) : null}
                </div>

                {error ? (
                  <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800">
                    {error}
                  </p>
                ) : null}

                <div className="space-y-3 rounded-2xl border border-teal-100 bg-teal-50/30 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-zarewa-teal flex items-center gap-2">
                    <Wallet size={14} aria-hidden />
                    Cashier — record what was received
                  </p>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={`rounded-lg px-3 py-2 text-xs font-bold border ${
                        form.payInFull
                          ? 'border-zarewa-teal bg-zarewa-teal text-white'
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
                          ? 'border-zarewa-teal bg-zarewa-teal text-white'
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

                  <label className="block text-xs font-semibold text-slate-600">
                    Received into (bank / cash account)
                    <select
                      className={`mt-1 ${INPUT}`}
                      value={form.treasuryAccountId}
                      onChange={(e) => setForm({ ...form, treasuryAccountId: e.target.value })}
                      required
                    >
                      {!branchAccounts.length ? <option value="">No accounts for this branch</option> : null}
                      {branchAccounts.map((a) => (
                        <option key={a.id} value={String(a.id)}>
                          {treasuryAccountDisplayName(a)}
                        </option>
                      ))}
                    </select>
                  </label>

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
                      Note (optional)
                      <input
                        className={`mt-1 ${INPUT}`}
                        value={form.note}
                        onChange={(e) => setForm({ ...form, note: e.target.value })}
                        placeholder="Cash / transfer ref"
                      />
                    </label>
                  </div>
                </div>
              </>
            )}
          </ModalScrollBody>
          <ModalScrollFooter className="flex flex-wrap gap-2 justify-end">
            <button type="button" className="z-btn-secondary" onClick={onClose} disabled={busy}>
              {receipt?.ok ? 'Done' : 'Cancel'}
            </button>
            {!receipt?.ok ? (
              <button type="submit" className="z-btn-primary" disabled={busy || !branchAccounts.length}>
                {busy ? 'Posting…' : `Confirm ${formatNgn(amountToCollect || outstanding)} received`}
              </button>
            ) : null}
          </ModalScrollFooter>
        </form>
      </ModalScrollShell>
    </ModalFrame>
  );
}
