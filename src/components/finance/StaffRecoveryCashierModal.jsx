import React, { useEffect, useMemo, useState } from 'react';
import { formatNgn } from '../../Data/mockData';
import { receiveStaffRecoveryPayment } from '../../lib/hrStaffRecoveries';
import { obligationRepaymentReceiptPdfUrl } from '../../lib/hrStaffObligations';
import { treasuryAccountDisplayName } from '../../lib/treasuryAccountsStore';
import { compareSelectLabels } from '../../lib/selectOptionSort';
import { ModalFrame, ModalScrollShell, ModalScrollBody, ModalScrollFooter } from '../layout';
import { ProcurementFormSection } from '../procurement/ProcurementFormSection';

const INPUT = 'z-finance-field';

/**
 * Branch cashier — receive staff discipline recovery (money in + treasury credit).
 * @param {{
 *   recovery: object | null;
 *   treasuryAccounts: object[];
 *   onClose: () => void;
 *   onSaved: (result?: object) => void;
 * }} props
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
    <ModalFrame isOpen={Boolean(recovery)} onClose={onClose} title="Receive staff recovery payment" surface="plain">
      <ModalScrollShell>
        <form onSubmit={handleSubmit}>
          <ModalScrollBody className="space-y-4">
            <ProcurementFormSection title="Employee & case">
              <p className="text-sm font-bold text-slate-900">{recovery.staffDisplayName || recovery.userId}</p>
              <p className="text-xs text-slate-600 mt-1">
                {recovery.caseNumber ? `Case ${recovery.caseNumber}` : recovery.title || recovery.scheduleId}
                {recovery.branchId ? ` · Branch ${recovery.branchId}` : ''}
              </p>
              <p className="text-lg font-black tabular-nums text-[#134e4a] mt-2">
                Outstanding {formatNgn(outstanding)}
              </p>
              {recovery.installmentAmountNgn ? (
                <p className="text-xs text-slate-500 mt-1">
                  Payroll deduction: {formatNgn(recovery.installmentAmountNgn)}/month (stops when cleared)
                </p>
              ) : null}
            </ProcurementFormSection>

            {receipt?.ok ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
                <p className="font-bold">Payment recorded</p>
                <p className="mt-1 text-xs">
                  {formatNgn(receipt.settlement?.amountNgn ?? 0)} received
                  {receipt.treasuryAccountName ? ` into ${receipt.treasuryAccountName}` : ''}.
                  {receipt.paidInFull ? ' Balance cleared — payroll deductions stopped.' : ''}
                </p>
                {receipt.obligationAccountId && receipt.obligationTransactionId ? (
                  <a
                    className="mt-2 inline-block text-xs font-bold text-[#134e4a] underline"
                    href={obligationRepaymentReceiptPdfUrl(receipt.obligationAccountId, receipt.obligationTransactionId)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Download receipt PDF
                  </a>
                ) : null}
              </div>
            ) : (
              <>
                {error ? <p className="text-xs font-bold text-rose-700">{error}</p> : null}
                <label className="flex items-center gap-2 text-sm text-slate-800">
                  <input
                    type="checkbox"
                    checked={form.payInFull}
                    onChange={(e) => setForm({ ...form, payInFull: e.target.checked })}
                  />
                  Pay full outstanding ({formatNgn(outstanding)})
                </label>
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
                  Received into (bank / cash)
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
                    placeholder="e.g. Cash at KD office"
                  />
                </label>
              </>
            )}
          </ModalScrollBody>
          <ModalScrollFooter className="flex flex-wrap gap-2 justify-end">
            <button type="button" className="z-btn-secondary" onClick={onClose} disabled={busy}>
              {receipt?.ok ? 'Close' : 'Cancel'}
            </button>
            {!receipt?.ok ? (
              <button type="submit" className="z-btn-primary" disabled={busy || !branchAccounts.length}>
                {busy ? 'Posting…' : 'Receive payment'}
              </button>
            ) : null}
          </ModalScrollFooter>
        </form>
      </ModalScrollShell>
    </ModalFrame>
  );
}
