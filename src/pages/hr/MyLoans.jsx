import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/apiBase';
import { useWorkspace } from '../../context/WorkspaceContext';
import { HrRequestsPanel } from '../../components/hr/HrRequestsPanel';
import { createHrLoanRequest } from '../../lib/hrStaff';
import { HrAddFormButton, HrFormModal } from '../../components/hr/HrFormModal';
import { HR_BTN_PRIMARY, HR_FIELD_CLASS } from '../../components/hr/hrFormStyles';

export default function MyLoans() {
  const ws = useWorkspace();
  const userId = ws?.session?.user?.id;
  const [modalOpen, setModalOpen] = useState(false);

  const [amountNgn, setAmountNgn] = useState('');
  const [repaymentMonths, setRepaymentMonths] = useState('1');
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
    setModalOpen(false);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-500">Staff loans</h2>
        <HrAddFormButton onClick={() => setModalOpen(true)}>Apply for loan</HrAddFormButton>
      </div>

      {message ? (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {message}
        </div>
      ) : null}

      <HrFormModal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Apply for a staff loan" size="lg">
        <form onSubmit={submit} className="space-y-4">
          {error ? (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-semibold text-slate-600">
              Amount (₦)
              <input
                type="number"
                min={1}
                className={HR_FIELD_CLASS}
                value={amountNgn}
                onChange={(e) => setAmountNgn(e.target.value)}
                required
              />
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Repayment (months)
              <select
                className={HR_FIELD_CLASS}
                value={repaymentMonths}
                onChange={(e) => setRepaymentMonths(e.target.value)}
                required
              >
                <option value="1">1 month</option>
                <option value="2">2 months</option>
                <option value="3">3 months</option>
                <option value="4">4 months</option>
              </select>
              <span className="mt-1 block font-normal text-slate-400 text-[11px]">Maximum repayment period is 4 months per company policy.</span>
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Monthly deduction (₦)
              <input
                type="number"
                min={minDeduction || 1}
                className={HR_FIELD_CLASS}
                value={deductionPerMonthNgn}
                onChange={(e) => setDeductionPerMonthNgn(e.target.value)}
                required
              />
            </label>
            <label className="text-xs font-semibold text-slate-600 sm:col-span-2">
              Purpose
              <textarea
                className={`${HR_FIELD_CLASS} min-h-[72px]`}
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                required
                minLength={3}
              />
            </label>
          </div>
          <button type="submit" disabled={busy} className={HR_BTN_PRIMARY}>
            {busy ? 'Submitting…' : 'Submit loan application'}
          </button>
        </form>
      </HrFormModal>

      <section>
        <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-3">My loan requests</h2>
        <HrRequestsPanel allowedScopes={['mine']} defaultScope="mine" kindFilter="loan" staffLinkBase="/hr/staff" />
      </section>
    </div>
  );
}
