import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../lib/apiBase';
import { useWorkspace } from '../../context/WorkspaceContext';
import { HrRequestsPanel } from '../../components/hr/HrRequestsPanel';
import { createHrLoanRequest } from '../../lib/hrStaff';
import { fetchStaffLoanSchedule } from '../../lib/hrMasterData';
import { HrAddFormButton, HrFormModal } from '../../components/hr/HrFormModal';
import { HrCard } from '../../components/hr/hrPageUi';
import { formatNgn } from '../../lib/hrFormat';
import { HR_BTN_PRIMARY, HR_FIELD_CLASS } from '../../components/hr/hrFormStyles';
import { GUARANTOR_FORM_TEMPLATE_URL } from '../../lib/hrStaffDocumentKinds';

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
  const [policyAck, setPolicyAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [schedule, setSchedule] = useState([]);
  const [loanPolicy, setLoanPolicy] = useState(null);
  const [grossSalaryNgn, setGrossSalaryNgn] = useState(null);
  const [hasGuarantorDoc, setHasGuarantorDoc] = useState(false);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const [schedRes, meRes, docsRes] = await Promise.all([
        fetchStaffLoanSchedule(userId),
        apiFetch('/api/hr/me'),
        apiFetch(`/api/hr/staff/${encodeURIComponent(userId)}/documents`),
      ]);
      if (schedRes.ok && schedRes.data?.ok) setSchedule(schedRes.data.schedule || []);
      if (meRes.ok && meRes.data?.ok) {
        const hr = meRes.data.hr || {};
        setLoanPolicy(meRes.data.loanPolicy || null);
        const gross =
          (Number(hr.baseSalaryNgn) || 0) +
          (Number(hr.housingAllowanceNgn) || 0) +
          (Number(hr.transportAllowanceNgn) || 0);
        setGrossSalaryNgn(gross > 0 ? gross : Number(hr.baseSalaryNgn) || null);
      }
      if (docsRes.ok && docsRes.data?.ok) {
        setHasGuarantorDoc((docsRes.data.documents || []).some((d) => d.docKind === 'guarantor_form'));
      }
    })();
  }, [userId, message]);

  const policy = loanPolicy || {
    loanMinServiceYears: 3,
    loanMaxSalaryMonths: 4,
    loanMaxRepaymentMonths: 12,
  };

  const amount = Math.round(Number(amountNgn) || 0);
  const months = Math.round(Number(repaymentMonths) || 0);
  const minDeduction = months > 0 && amount > 0 ? Math.ceil(amount / months) : 0;
  const maxLoanNgn =
    grossSalaryNgn && policy.loanMaxSalaryMonths
      ? Math.round(grossSalaryNgn * Number(policy.loanMaxSalaryMonths))
      : null;
  const activeLoans = schedule.filter((l) => l.status === 'active' || l.outstandingNgn > 0);
  const deduction = Number(deductionPerMonthNgn) || minDeduction;

  const policyErrors = useMemo(() => {
    const errs = [];
    if (amount > 0 && maxLoanNgn && amount > maxLoanNgn) {
      errs.push(`Amount exceeds policy maximum of ${formatNgn(maxLoanNgn)} (${policy.loanMaxSalaryMonths}× gross salary).`);
    }
    if (months > Number(policy.loanMaxRepaymentMonths || 12)) {
      errs.push(`Repayment cannot exceed ${policy.loanMaxRepaymentMonths} months.`);
    }
    if (amount > 0 && months > 0 && deduction < minDeduction) {
      errs.push(`Monthly deduction must be at least ${formatNgn(minDeduction)} to repay in ${months} month(s).`);
    }
    if (activeLoans.length > 0) {
      errs.push('You have an active loan. New applications require HR exceptional approval.');
    }
    if (!hasGuarantorDoc) {
      errs.push('Upload a signed guarantor form under Documents before applying.');
    }
    return errs;
  }, [amount, maxLoanNgn, months, policy, deduction, minDeduction, activeLoans.length, hasGuarantorDoc]);

  useEffect(() => {
    if (minDeduction > 0 && !deductionPerMonthNgn) setDeductionPerMonthNgn(String(minDeduction));
  }, [minDeduction, amount, months]);

  const submit = async (e) => {
    e.preventDefault();
    if (!userId) return;
    if (!termsAck || !policyAck) {
      setError('Acknowledge company loan policy and repayment terms.');
      return;
    }
    if (policyErrors.length) {
      setError(policyErrors[0]);
      return;
    }
    setBusy(true);
    setError('');
    setMessage('');
    const created = await createHrLoanRequest(userId, {
      amountNgn: amount,
      repaymentMonths: months,
      deductionPerMonthNgn: deduction,
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
    setPolicyAck(false);
    setModalOpen(false);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-500">Staff loans</h2>
          <p className="mt-1 text-xs text-slate-600">
            Salary-backed loan — max {policy.loanMaxSalaryMonths}× gross salary, up to {policy.loanMaxRepaymentMonths}{' '}
            months repayment, min {policy.loanMinServiceYears} years service.
          </p>
        </div>
        <HrAddFormButton onClick={() => setModalOpen(true)}>Apply for loan</HrAddFormButton>
      </div>

      {message ? (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{message}</div>
      ) : null}

      {!hasGuarantorDoc ? (
        <div className="rounded-xl border border-violet-100 bg-violet-50 px-4 py-3 text-sm text-violet-950">
          Download the{' '}
          <a href={GUARANTOR_FORM_TEMPLATE_URL} download className="font-bold underline">
            guarantor form
          </a>
          , have it signed, then{' '}
          <Link to={`${staffLinkBase}/documents`} className="font-bold underline">
            upload it
          </Link>{' '}
          before applying.
        </div>
      ) : null}

      {activeLoans.length ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Active loan outstanding:{' '}
          <strong>{formatNgn(activeLoans.reduce((s, l) => s + (l.outstandingNgn || 0), 0))}</strong>. Contact HR for
          exceptional top-up.
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
                  <dt className="text-slate-500">Approved</dt>
                  <dd className="font-semibold tabular-nums">{formatNgn(loan.amountNgn)}</dd>
                  <dt className="text-slate-500">Monthly</dt>
                  <dd className="font-semibold tabular-nums">{formatNgn(loan.monthlyDeductionNgn)}</dd>
                  <dt className="text-slate-500">Outstanding</dt>
                  <dd className="font-semibold text-[#134e4a]">{formatNgn(loan.outstandingNgn)}</dd>
                </dl>
              </HrCard>
            ))}
          </div>
        </section>
      ) : null}

      <HrFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Apply for a staff loan"
        description="Applications are validated against company loan policy before HR review."
        size="lg"
      >
        <form onSubmit={submit} className="space-y-4">
          {error ? <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}
          {maxLoanNgn ? (
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-700">
              Policy maximum: <strong>{formatNgn(maxLoanNgn)}</strong> ({policy.loanMaxSalaryMonths}× gross{' '}
              {grossSalaryNgn ? formatNgn(grossSalaryNgn) : 'salary'}). Min monthly deduction:{' '}
              {minDeduction ? formatNgn(minDeduction) : '—'}.
            </div>
          ) : null}
          {policyErrors.length ? (
            <ul className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-950 space-y-1">
              {policyErrors.map((pe) => (
                <li key={pe}>• {pe}</li>
              ))}
            </ul>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-semibold text-slate-600">
              Requested amount (₦) *
              <input
                type="number"
                min={1}
                max={maxLoanNgn || undefined}
                className={HR_FIELD_CLASS}
                value={amountNgn}
                onChange={(e) => setAmountNgn(e.target.value)}
                required
              />
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Repayment period *
              <select className={HR_FIELD_CLASS} value={repaymentMonths} onChange={(e) => setRepaymentMonths(e.target.value)} required>
                {Array.from({ length: Number(policy.loanMaxRepaymentMonths) || 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={String(m)}>
                    {m} month{m === 1 ? '' : 's'}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Monthly deduction (₦) *
              <input
                type="number"
                min={minDeduction || 1}
                className={HR_FIELD_CLASS}
                value={deductionPerMonthNgn}
                onChange={(e) => setDeductionPerMonthNgn(e.target.value)}
                required
              />
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Deduction start period
              <input type="month" className={HR_FIELD_CLASS} value={expectedStartPeriod} onChange={(e) => setExpectedStartPeriod(e.target.value)} />
            </label>
            <label className="text-xs font-semibold text-slate-600 sm:col-span-2">
              Purpose *
              <textarea className={`${HR_FIELD_CLASS} min-h-[72px]`} value={purpose} onChange={(e) => setPurpose(e.target.value)} required minLength={10} />
            </label>
            <label className="text-xs font-semibold text-slate-600 sm:col-span-2">
              Guarantor name(s)
              <input className={HR_FIELD_CLASS} value={guarantorNote} onChange={(e) => setGuarantorNote(e.target.value)} placeholder="As on uploaded guarantor form" />
            </label>
            <label className="flex items-start gap-2 text-xs font-semibold text-slate-600 sm:col-span-2">
              <input type="checkbox" className="mt-1" checked={policyAck} onChange={(e) => setPolicyAck(e.target.checked)} required />
              <span>
                I confirm I meet the service requirement ({policy.loanMinServiceYears}+ years), my amount is within policy
                limits, and a signed guarantor form is on file.
              </span>
            </label>
            <label className="flex items-start gap-2 text-xs font-semibold text-slate-600 sm:col-span-2">
              <input type="checkbox" className="mt-1" checked={termsAck} onChange={(e) => setTermsAck(e.target.checked)} required />
              <span>
                I authorise payroll deduction for the full repayment schedule. Default may affect future loan eligibility and
                may involve guarantor recovery per company policy.
              </span>
            </label>
          </div>
          <button type="submit" disabled={busy || !termsAck || !policyAck || policyErrors.length > 0} className={HR_BTN_PRIMARY}>
            {busy ? 'Submitting…' : 'Submit loan application'}
          </button>
        </form>
      </HrFormModal>

      <section>
        <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-3">My loan requests</h2>
        <HrRequestsPanel allowedScopes={['mine']} defaultScope="mine" kindFilter="loan" staffLinkBase={staffLinkBase} />
      </section>
    </div>
  );
}
