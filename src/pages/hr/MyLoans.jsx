import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../lib/apiBase';
import { useWorkspace } from '../../context/WorkspaceContext';
import { HrRequestsPanel } from '../../components/hr/HrRequestsPanel';
import { createHrLoanRequest } from '../../lib/hrStaff';
import { fetchStaffLoanSchedule } from '../../lib/hrMasterData';
import { HrAddFormButton, HrFormModal } from '../../components/hr/HrFormModal';
import { WorkPayHero } from '../../components/profile/WorkPayHero';
import { computeLoanEligibility, loanRepaymentPreview } from '../../lib/hrLoanEligibility';
import { ProfilePageBody } from '../../components/profile/profilePageUi';
import { ProfileInlineAlert, ProfileOverviewSection } from '../../components/profile/profileOverviewUi';
import { ProfileKpiCard, ProfileStatusChip } from '../../components/profile/profileDesign';
import { useUserProfile } from '../../context/UserProfileContext';
import { formatNgn } from '../../lib/hrFormat';
import { HR_BTN_PRIMARY, HR_FIELD_CLASS } from '../../components/hr/hrFormStyles';
import { GUARANTOR_FORM_TEMPLATE_URL } from '../../lib/hrStaffDocumentKinds';

export default function MyLoans({ staffLinkBase = '/my-profile' }) {
  const ws = useWorkspace();
  const { hr, loanPolicy: ctxLoanPolicy, reload, me } = useUserProfile();
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
  const [hasGuarantorDoc, setHasGuarantorDoc] = useState(false);

  const loanPolicy = ctxLoanPolicy;
  const grossSalaryNgn = useMemo(() => {
    if (!hr) return null;
    const gross =
      (Number(hr.baseSalaryNgn) || 0) +
      (Number(hr.housingAllowanceNgn) || 0) +
      (Number(hr.transportAllowanceNgn) || 0);
    return gross > 0 ? gross : Number(hr.baseSalaryNgn) || null;
  }, [hr]);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const schedRes = await fetchStaffLoanSchedule(userId);
      if (schedRes.ok && schedRes.data?.ok) setSchedule(schedRes.data.schedule || []);
      const docs = me?.documents || [];
      setHasGuarantorDoc(docs.some((d) => d.docKind === 'guarantor_form'));
    })();
  }, [userId, message, me?.documents]);

  const policy = useMemo(
    () =>
      loanPolicy || {
        loanMinServiceYears: 3,
        loanMaxSalaryMonths: 4,
        loanMaxRepaymentMonths: 12,
      },
    [loanPolicy]
  );

  const amount = Math.round(Number(amountNgn) || 0);
  const months = Math.round(Number(repaymentMonths) || 0);
  const minDeduction = months > 0 && amount > 0 ? Math.ceil(amount / months) : 0;
  const maxLoanNgn =
    grossSalaryNgn && policy.loanMaxSalaryMonths
      ? Math.round(grossSalaryNgn * Number(policy.loanMaxSalaryMonths))
      : null;
  const activeLoans = schedule.filter((l) => l.status === 'active' || l.outstandingNgn > 0);
  const activeOutstanding = activeLoans.reduce((s, l) => s + (l.outstandingNgn || 0), 0);
  const deduction = Number(deductionPerMonthNgn) || minDeduction;

  const eligibility = useMemo(
    () =>
      computeLoanEligibility({
        hr,
        loanPolicy: policy,
        hasGuarantorDoc,
        activeLoanOutstandingNgn: activeOutstanding,
      }),
    [hr, policy, hasGuarantorDoc, activeOutstanding]
  );

  const repaymentPreview = useMemo(
    () => loanRepaymentPreview(amount, months),
    [amount, months]
  );

  const policyErrors = useMemo(() => {
    const errs = [...eligibility.issues];
    if (amount > 0 && eligibility.maxLoanNgn && amount > eligibility.maxLoanNgn) {
      errs.push(`Amount exceeds policy maximum of ${formatNgn(eligibility.maxLoanNgn)} (${policy.loanMaxSalaryMonths}× gross salary).`);
    }
    if (months > Number(policy.loanMaxRepaymentMonths || 12)) {
      errs.push(`Repayment cannot exceed ${policy.loanMaxRepaymentMonths} months.`);
    }
    if (amount > 0 && months > 0 && deduction < minDeduction) {
      errs.push(`Monthly deduction must be at least ${formatNgn(minDeduction)} to repay in ${months} month(s).`);
    }
    return errs;
  }, [amount, eligibility.maxLoanNgn, months, policy, deduction, minDeduction, eligibility.issues]);

  useEffect(() => {
    if (minDeduction > 0 && !deductionPerMonthNgn) setDeductionPerMonthNgn(String(minDeduction));
  }, [minDeduction, amount, months, deductionPerMonthNgn]);

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
    await reload?.();
  };

  return (
    <ProfilePageBody>
      <WorkPayHero
        eyebrow="Work & pay"
        title="Staff loans"
        description={`Salary-backed loans — up to ${policy.loanMaxSalaryMonths}× gross salary, ${policy.loanMaxRepaymentMonths} months max repayment, ${policy.loanMinServiceYears}+ years service.`}
        action={
          <HrAddFormButton onClick={() => setModalOpen(true)} disabled={!eligibility.eligible}>
            Apply for loan
          </HrAddFormButton>
        }
        badge={
          eligibility.eligible ? (
            <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase text-white ring-1 ring-white/30">
              Eligible
            </span>
          ) : (
            <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase text-white ring-1 ring-white/30">
              Action needed
            </span>
          )
        }
      />

      <ProfileOverviewSection title="Eligibility" subtitle="Requirements before you apply">
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            eligibility.eligible ? 'border-emerald-100 bg-emerald-50/80 text-emerald-950' : 'border-amber-100 bg-amber-50/80 text-amber-950'
          }`}
        >
          <p className="font-semibold">
            Service: ~{eligibility.serviceYears.toFixed(1)} years
            {eligibility.maxLoanNgn ? ` · Max loan ${formatNgn(eligibility.maxLoanNgn)}` : ''}
          </p>
          {eligibility.issues.length ? (
            <ul className="mt-2 space-y-1 text-xs">
              {eligibility.issues.map((line) => (
                <li key={line}>• {line}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-xs">You meet the standard policy checks. Open the application form to proceed.</p>
          )}
          {eligibility.warnings.map((w) => (
            <p key={w} className="mt-2 text-xs text-slate-600">
              {w}
            </p>
          ))}
        </div>
      </ProfileOverviewSection>

      {message ? <ProfileInlineAlert variant="success">{message}</ProfileInlineAlert> : null}

      {!hasGuarantorDoc ? (
        <ProfileInlineAlert variant="warning">
          Download the{' '}
          <a href={GUARANTOR_FORM_TEMPLATE_URL} download className="font-bold underline">
            guarantor form
          </a>
          , have it signed, then{' '}
          <Link to={`${staffLinkBase}/documents`} className="font-bold underline">
            upload it
          </Link>{' '}
          before applying.
        </ProfileInlineAlert>
      ) : null}

      {activeLoans.length ? (
        <ProfileInlineAlert variant="warning">
          Active loan outstanding:{' '}
          <strong>{formatNgn(activeLoans.reduce((s, l) => s + (l.outstandingNgn || 0), 0))}</strong>. Contact HR for
          exceptional top-up.
        </ProfileInlineAlert>
      ) : null}

      {schedule.length ? (
        <ProfileOverviewSection title="Loan & repayment schedule" subtitle="Approved loans and outstanding balances">
          <div className="grid gap-3 sm:grid-cols-2">
            {schedule.map((loan) => (
              <ProfileKpiCard key={loan.requestId} label={loan.title || 'Staff loan'}>
                <dl className="mt-1 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                  <div>
                    <dt className="text-slate-500">Approved</dt>
                    <dd className="font-bold tabular-nums text-slate-900">{formatNgn(loan.amountNgn)}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Monthly</dt>
                    <dd className="font-bold tabular-nums text-slate-900">{formatNgn(loan.monthlyDeductionNgn)}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-slate-500">Outstanding</dt>
                    <dd className="text-lg font-black tabular-nums text-[#134e4a]">{formatNgn(loan.outstandingNgn)}</dd>
                  </div>
                </dl>
                <ProfileStatusChip variant={loan.outstandingNgn > 0 ? 'pending' : 'approved'}>
                  {loan.status || 'active'}
                </ProfileStatusChip>
              </ProfileKpiCard>
            ))}
          </div>
        </ProfileOverviewSection>
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
          {maxLoanNgn || eligibility.maxLoanNgn ? (
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-700">
              Policy maximum: <strong>{formatNgn(eligibility.maxLoanNgn || maxLoanNgn)}</strong> ({policy.loanMaxSalaryMonths}× gross{' '}
              {grossSalaryNgn ? formatNgn(grossSalaryNgn) : 'salary'}). Min monthly deduction:{' '}
              {minDeduction ? formatNgn(minDeduction) : '—'}.
            </div>
          ) : null}
          {repaymentPreview ? (
            <div className="rounded-xl border border-teal-100 bg-teal-50/60 px-3 py-3 text-sm text-teal-950">
              <p className="font-semibold">Repayment preview</p>
              <p className="mt-1 text-xs">
                {formatNgn(repaymentPreview.monthlyDeductionNgn)}/month × {repaymentPreview.repaymentMonths} months ={' '}
                {formatNgn(repaymentPreview.totalNgn)} payroll deduction
              </p>
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

      <ProfileOverviewSection title="My loan requests" subtitle="Drafts and applications awaiting HR review">
        <HrRequestsPanel allowedScopes={['mine']} defaultScope="mine" kindFilter="loan" staffLinkBase={staffLinkBase} showStageBar />
      </ProfileOverviewSection>
    </ProfilePageBody>
  );
}
