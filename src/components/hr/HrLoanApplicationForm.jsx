import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/apiBase';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { createHrLoanRequest } from '../../lib/hrStaff';
import { fetchHrStaffForLoanRegister } from '../../lib/hrStaffObligations';
import { HrStaffLoanBranchCashierNote } from './HrStaffLoanBranchCashierNote';
import { HR_BTN_PRIMARY, HR_BTN_SECONDARY, HR_FIELD_CLASS } from './hrFormStyles';

/**
 * @param {{ onSuccess?: () => void; onCancel?: () => void }} props
 */
export function HrLoanApplicationForm({ onSuccess, onCancel }) {
  const [staff, setStaff] = useState([]);
  const [userId, setUserId] = useState('');
  const [amountNgn, setAmountNgn] = useState('');
  const [repaymentMonths, setRepaymentMonths] = useState('1');
  const [deductionPerMonthNgn, setDeductionPerMonthNgn] = useState('');
  const [purpose, setPurpose] = useState('');
  const [exceptionalLoan, setExceptionalLoan] = useState(false);
  const [needsChairmanWaiver, setNeedsChairmanWaiver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useHrListLoad(async () => {
    const { ok, data } = await fetchHrStaffForLoanRegister();
    if (!ok || !data?.ok) {
      setStaff([]);
      return { hasData: false };
    }
    setStaff(data.staff || []);
    return { hasData: true };
  }, []);

  const amount = Math.round(Number(amountNgn) || 0);
  const months = Math.round(Number(repaymentMonths) || 0);
  const minDeduction = months > 0 && amount > 0 ? Math.ceil(amount / months) : 0;

  useEffect(() => {
    if (minDeduction > 0 && !deductionPerMonthNgn) {
      setDeductionPerMonthNgn(String(minDeduction));
    }
  }, [minDeduction, amount, months, deductionPerMonthNgn]);

  const submit = async (e) => {
    e.preventDefault();
    if (!userId) return;
    setBusy(true);
    setError('');
    const created = await createHrLoanRequest(userId, {
      amountNgn: amount,
      repaymentMonths: months,
      deductionPerMonthNgn: Number(deductionPerMonthNgn) || minDeduction,
      purpose: purpose.trim(),
      exceptionalLoan,
      needsChairmanWaiver: needsChairmanWaiver || exceptionalLoan,
      title: `Staff loan — ${staff.find((s) => s.userId === userId)?.displayName || userId}`,
    });
    if (!created.ok || !created.data?.ok) {
      setBusy(false);
      setError(created.data?.error || 'Could not create loan request.');
      return;
    }
    const id = created.data.request?.id;
    const submitted = await apiFetch(`/api/hr/requests/${encodeURIComponent(id)}/submit`, { method: 'PATCH' });
    setBusy(false);
    if (!submitted.ok || !submitted.data?.ok) {
      setError(submitted.data?.error || 'Draft created but submit failed — finish from Requests queue.');
      return;
    }
    onSuccess?.();
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-xs text-slate-500">Creates and submits a loan request for the selected employee (policy checks apply).</p>
      <HrStaffLoanBranchCashierNote />
      {error ? (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-semibold text-slate-600 sm:col-span-2">
          Employee
          <select className={HR_FIELD_CLASS} value={userId} onChange={(e) => setUserId(e.target.value)} required>
            <option value="">Select staff…</option>
            {staff.map((s) => (
              <option key={s.userId} value={s.userId}>
                {s.displayName || s.username}
                {s.employeeNo ? ` · ${s.employeeNo}` : ''}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Loan amount (₦)
          <input type="number" min={1} className={HR_FIELD_CLASS} value={amountNgn} onChange={(e) => setAmountNgn(e.target.value)} required />
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Repayment (months)
          <select className={HR_FIELD_CLASS} value={repaymentMonths} onChange={(e) => setRepaymentMonths(e.target.value)} required>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={String(m)}>
                {m} month{m === 1 ? '' : 's'}
              </option>
            ))}
          </select>
          <span className="mt-1 block font-normal text-slate-400 text-xs">Maximum repayment period is 12 months per company policy.</span>
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Monthly deduction (₦)
          <input type="number" min={minDeduction || 1} className={HR_FIELD_CLASS} value={deductionPerMonthNgn} onChange={(e) => setDeductionPerMonthNgn(e.target.value)} required />
          {minDeduction > 0 ? (
            <span className="mt-1 block font-normal text-slate-400">Minimum ₦{minDeduction.toLocaleString('en-NG')} / month</span>
          ) : null}
        </label>
        <label className="text-xs font-semibold text-slate-600 sm:col-span-2">
          Purpose
          <textarea className={`${HR_FIELD_CLASS} min-h-[72px]`} value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Why is this loan needed?" />
        </label>
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 sm:col-span-2">
          <input type="checkbox" checked={exceptionalLoan} onChange={(e) => setExceptionalLoan(e.target.checked)} />
          Exceptional loan (above policy limits — requires GM HR / MD path)
        </label>
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 sm:col-span-2">
          <input
            type="checkbox"
            checked={needsChairmanWaiver}
            onChange={(e) => setNeedsChairmanWaiver(e.target.checked)}
          />
          Needs Chairman waiver (final GM approval requires Chairman / MD)
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={busy} className={HR_BTN_PRIMARY}>
          {busy ? 'Submitting…' : 'Submit loan request'}
        </button>
        {onCancel ? (
          <button type="button" onClick={onCancel} className={HR_BTN_SECONDARY}>
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}
