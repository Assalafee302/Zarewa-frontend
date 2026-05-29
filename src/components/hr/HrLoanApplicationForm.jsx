import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/apiBase';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { createHrLoanRequest } from '../../lib/hrStaff';
import { canManageHrStaff } from '../../lib/hrAccess';
import { useWorkspace } from '../../context/WorkspaceContext';

const fieldCls =
  'mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-[#134e4a] focus:outline-none focus:ring-2 focus:ring-[#134e4a]/15';

/**
 * HR creates a staff loan request on behalf of an employee.
 */
export function HrLoanApplicationForm() {
  const ws = useWorkspace();
  const canManage = canManageHrStaff(ws?.permissions);

  const [staff, setStaff] = useState([]);
  const [userId, setUserId] = useState('');
  const [amountNgn, setAmountNgn] = useState('');
  const [repaymentMonths, setRepaymentMonths] = useState('6');
  const [deductionPerMonthNgn, setDeductionPerMonthNgn] = useState('');
  const [purpose, setPurpose] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useHrListLoad(async () => {
    const { ok, data } = await apiFetch('/api/hr/staff');
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
  }, [minDeduction, amount, months]);

  const submit = async (e) => {
    e.preventDefault();
    if (!canManage || !userId) return;
    setBusy(true);
    setError('');
    setMessage('');
    const created = await createHrLoanRequest(userId, {
      amountNgn: amount,
      repaymentMonths: months,
      deductionPerMonthNgn: Number(deductionPerMonthNgn) || minDeduction,
      purpose: purpose.trim(),
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
    setMessage('Loan request submitted for approval.');
    setAmountNgn('');
    setPurpose('');
    setUserId('');
  };

  if (!canManage) return null;

  return (
    <form onSubmit={submit} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
      <h3 className="text-sm font-black uppercase tracking-wide text-[#134e4a]">New staff loan application</h3>
      <p className="text-xs text-slate-500">Creates and submits a loan request for the selected employee (policy checks apply).</p>
      {error ? (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}
      {message ? (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {message}
        </div>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-semibold text-slate-600 sm:col-span-2">
          Employee
          <select className={fieldCls} value={userId} onChange={(e) => setUserId(e.target.value)} required>
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
          <input
            type="number"
            min={1}
            className={fieldCls}
            value={amountNgn}
            onChange={(e) => setAmountNgn(e.target.value)}
            required
          />
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Repayment (months)
          <input
            type="number"
            min={1}
            max={36}
            className={fieldCls}
            value={repaymentMonths}
            onChange={(e) => setRepaymentMonths(e.target.value)}
            required
          />
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Monthly deduction (₦)
          <input
            type="number"
            min={minDeduction || 1}
            className={fieldCls}
            value={deductionPerMonthNgn}
            onChange={(e) => setDeductionPerMonthNgn(e.target.value)}
            required
          />
          {minDeduction > 0 ? (
            <span className="mt-1 block font-normal text-slate-400">Minimum ₦{minDeduction.toLocaleString('en-NG')} / month</span>
          ) : null}
        </label>
        <label className="text-xs font-semibold text-slate-600 sm:col-span-2">
          Purpose
          <textarea
            className={`${fieldCls} min-h-[72px]`}
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="Why is this loan needed?"
          />
        </label>
      </div>
      <button
        type="submit"
        disabled={busy}
        className="rounded-xl bg-[#134e4a] px-5 py-2.5 text-[11px] font-bold uppercase tracking-wide text-white disabled:opacity-50"
      >
        {busy ? 'Submitting…' : 'Submit loan request'}
      </button>
    </form>
  );
}
