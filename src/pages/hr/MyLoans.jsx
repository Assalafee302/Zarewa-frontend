import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/apiBase';
import { useWorkspace } from '../../context/WorkspaceContext';
import { HrRequestsPanel } from '../../components/hr/HrRequestsPanel';
import { createHrLoanRequest } from '../../lib/hrStaff';
import { fetchStaffLoanSchedule } from '../../lib/hrMasterData';
import { HrAddFormButton, HrFormModal } from '../../components/hr/HrFormModal';
import { HrCard } from '../../components/hr/hrPageUi';
import { formatNgn } from '../../lib/hrFormat';
import { HR_BTN_PRIMARY, HR_FIELD_CLASS } from '../../components/hr/hrFormStyles';

export default function MyLoans({ staffLinkBase = '/my-profile' }) {
  const ws = useWorkspace();
  const userId = ws?.session?.user?.id;
  const [modalOpen, setModalOpen] = useState(false);

  const [amountNgn, setAmountNgn] = useState('');
  const [repaymentMonths, setRepaymentMonths] = useState('1');
  const [deductionPerMonthNgn, setDeductionPerMonthNgn] = useState('');
  const [purpose, setPurpose] = useState('');
  const [expectedStartPeriod, setExpectedStartPeriod] = useState('');
  const [guarantorNote, setGuarantorNote] = useState('');
  const [termsAck, setTermsAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [schedule, setSchedule] = useState([]);
  const [baseSalaryNgn, setBaseSalaryNgn] = useState(null);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const [schedRes, meRes] = await Promise.all([
        fetchStaffLoanSchedule(userId),
        apiFetch('/api/hr/me'),
      ]);
      if (schedRes.ok && schedRes.data?.ok) setSchedule(schedRes.data.schedule || []);
      if (meRes.ok && meRes.data?.ok) setBaseSalaryNgn(meRes.data.hr?.baseSalaryNgn ?? null);
    })();
  }, [userId, message]);

  const amount = Math.round(Number(amountNgn) || 0);
  const months = Math.round(Number(repaymentMonths) || 0);
  const minDeduction = months > 0 && amount > 0 ? Math.ceil(amount / months) : 0;
  const activeLoans = schedule.filter((l) => l.status === 'active' || l.outstandingNgn > 0);
  const maxSuggested = baseSalaryNgn ? Math.round(baseSalaryNgn * 3) : null;

  useEffect(() => {
    if (minDeduction > 0 && !deductionPerMonthNgn) setDeductionPerMonthNgn(String(minDeduction));
  }, [minDeduction, amount, months]);

  const submit = async (e) => {
    e.preventDefault();
    if (!userId) return;
    if (!termsAck) {
      setError('Please acknowledge the loan terms before submitting.');
      return;
    }
    setBusy(true);
    setError('');
    setMessage('');
    const created = await createHrLoanRequest(userId, {
      amountNgn: amount,
      repaymentMonths: months,
      deductionPerMonthNgn: Number(deductionPerMonthNgn) || minDeduction,
      purpose: purpose.trim(),
      expectedStartPeriod: expectedStartPeriod.trim() || null,
      guarantorNote: guarantorNote.trim() || null,
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
    setTermsAck(false);
    setModalOpen(false);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-500">Staff loans</h2>
          <p className="mt-1 text-xs text-slate-600">Apply for a salary-backed loan — max 4-month repayment per policy.</p>
        </div>
        <HrAddFormButton onClick={() => setModalOpen(true)}>Apply for loan</HrAddFormButton>
      </div>

      {message ? (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{message}</div>
      ) : null}

      {activeLoans.length ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          You have {activeLoans.length} active loan(s) with total outstanding{' '}
          <strong>{formatNgn(activeLoans.reduce((s, l) => s + (l.outstandingNgn || 0), 0))}</strong>.
          New loans may require HR approval as exceptional.
        </div>
      ) : null}

      {schedule.length ? (
        <section className="space-y-3">
          <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-500">Loan & repayment schedule</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {schedule.map((loan) => (
              <HrCard key={loan.requestId} className="!p-4">
                <p className="font-bold text-slate-900">{loan.title}</p>
                <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  <dt className="text-slate-500">Approved</dt><dd className="font-semibold tabular-nums">{formatNgn(loan.amountNgn)}</dd>
                  <dt className="text-slate-500">Monthly</dt><dd className="font-semibold tabular-nums">{formatNgn(loan.monthlyDeductionNgn)}</dd>
                  <dt className="text-slate-500">Months</dt><dd>{loan.repaymentMonths || '—'}</dd>
                  <dt className="text-slate-500">Paid</dt><dd>{loan.monthsPaid ?? 0} mo</dd>
                  <dt className="text-slate-500">Outstanding</dt><dd className="font-semibold text-[#134e4a]">{formatNgn(loan.outstandingNgn)}</dd>
                  <dt className="text-slate-500">Status</dt><dd className="capitalize">{loan.status?.replace(/_/g, ' ')}</dd>
                </dl>
              </HrCard>
            ))}
          </div>
        </section>
      ) : null}

      <HrFormModal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Apply for a staff loan" description="Salary-backed loan with payroll deduction. HR and GM approval required." size="lg">
        <form onSubmit={submit} className="space-y-4">
          {error ? <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}
          {maxSuggested ? (
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              Policy guide: suggested max ~3× base salary ({formatNgn(maxSuggested)}). HR may approve exceptional amounts separately.
            </div>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-semibold text-slate-600">
              Requested amount (₦) *
              <input type="number" min={1} className={HR_FIELD_CLASS} value={amountNgn} onChange={(e) => setAmountNgn(e.target.value)} required />
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Repayment period *
              <select className={HR_FIELD_CLASS} value={repaymentMonths} onChange={(e) => setRepaymentMonths(e.target.value)} required>
                <option value="1">1 month</option>
                <option value="2">2 months</option>
                <option value="3">3 months</option>
                <option value="4">4 months</option>
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Est. monthly deduction (₦) *
              <input type="number" min={minDeduction || 1} className={HR_FIELD_CLASS} value={deductionPerMonthNgn} onChange={(e) => setDeductionPerMonthNgn(e.target.value)} required />
              {minDeduction > 0 ? <span className="mt-1 block text-[11px] font-normal text-slate-400">Minimum ₦{minDeduction.toLocaleString('en-NG')}/month</span> : null}
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Deduction start period
              <input type="month" className={HR_FIELD_CLASS} value={expectedStartPeriod} onChange={(e) => setExpectedStartPeriod(e.target.value)} />
            </label>
            <label className="text-xs font-semibold text-slate-600 sm:col-span-2">
              Purpose *
              <textarea className={`${HR_FIELD_CLASS} min-h-[72px]`} value={purpose} onChange={(e) => setPurpose(e.target.value)} required minLength={10} placeholder="Explain why you need this loan" />
            </label>
            <label className="text-xs font-semibold text-slate-600 sm:col-span-2">
              Guarantor / HR note (optional)
              <input className={HR_FIELD_CLASS} value={guarantorNote} onChange={(e) => setGuarantorNote(e.target.value)} placeholder="Name of guarantor or additional context" />
            </label>
            <label className="flex items-start gap-2 text-xs font-semibold text-slate-600 sm:col-span-2">
              <input type="checkbox" className="mt-1" checked={termsAck} onChange={(e) => setTermsAck(e.target.checked)} required />
              <span>I understand repayment will be deducted from my salary and that failure to repay may affect future loan eligibility.</span>
            </label>
          </div>
          <button type="submit" disabled={busy || !termsAck} className={HR_BTN_PRIMARY}>{busy ? 'Submitting…' : 'Submit loan application'}</button>
        </form>
      </HrFormModal>

      <section>
        <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-3">My loan requests</h2>
        <HrRequestsPanel allowedScopes={['mine']} defaultScope="mine" kindFilter="loan" staffLinkBase={staffLinkBase} />
      </section>
    </div>
  );
}

