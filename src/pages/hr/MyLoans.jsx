import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/apiBase';
import { useWorkspace } from '../../context/WorkspaceContext';
import { HrRequestsPanel } from '../../components/hr/HrRequestsPanel';
import { createHrLoanRequest } from '../../lib/hrStaff';

const fieldCls =
  'mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-[#134e4a] focus:outline-none focus:ring-2 focus:ring-[#134e4a]/15';

export default function MyLoans() {
  const ws = useWorkspace();
  const userId = ws?.session?.user?.id;

  const [amountNgn, setAmountNgn] = useState('');
  const [repaymentMonths, setRepaymentMonths] = useState('6');
  const [deductionPerMonthNgn, setDeductionPerMonthNgn] = useState('');
  const [purpose, setPurpose] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const amount = Math.round(Number(amountNgn) || 0);
  const months = Math.round(Number(repaymentMonths) || 0);
  const minDeduction = months > 0 && amount > 0 ? Math.ceil(amount / months) : 0;

  useEffect(() => {
    if (minDeduction > 0 && !deductionPerMonthNgn) setDeductionPerMonthNgn(String(minDeduction));
  }, [minDeduction, amount, months]);

  const submit = async (e) => {
    e.preventDefault();
    if (!userId) return;
    setBusy(true);
    setError('');
    setMessage('');
    const created = await createHrLoanRequest(userId, {
      amountNgn: amount,
      repaymentMonths: months,
      deductionPerMonthNgn: Number(deductionPerMonthNgn) || minDeduction,
      purpose: purpose.trim(),
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
      setError(submitted.data?.error || 'Draft saved — submit from the list below.');
      return;
    }
    setMessage('Loan request submitted.');
    setAmountNgn('');
    setPurpose('');
  };

  return (
    <div className="space-y-8">
      <form onSubmit={submit} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-500">Apply for a staff loan</h2>
        {error ? (
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
        ) : null}
        {message ? (
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            {message}
          </div>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-semibold text-slate-600">
            Amount (₦)
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
          </label>
          <label className="text-xs font-semibold text-slate-600 sm:col-span-2">
            Purpose
            <textarea
              className={`${fieldCls} min-h-[72px]`}
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              required
              minLength={3}
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-[#134e4a] px-5 py-2.5 text-[11px] font-bold uppercase tracking-wide text-white disabled:opacity-50"
        >
          {busy ? 'Submitting…' : 'Submit loan application'}
        </button>
      </form>

      <section>
        <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-3">My loan requests</h2>
        <HrRequestsPanel allowedScopes={['mine']} defaultScope="mine" kindFilter="loan" staffLinkBase="/hr/staff" />
      </section>
    </div>
  );
}
