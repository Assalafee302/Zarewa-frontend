import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../lib/apiBase';
import { useWorkspace } from '../../context/WorkspaceContext';
import { HrRequestsPanel } from '../../components/hr/HrRequestsPanel';
import { createHrLoanRequest } from '../../lib/hrStaff';
import { fetchStaffLoanSchedule } from '../../lib/hrMasterData';
import {
  fetchStaffMoneySummary,
  obligationDisbursementVoucherPdfUrl,
  obligationStatementPdfUrl,
} from '../../lib/hrStaffObligations';
import { WorkPayFormModal } from '../../components/profile/WorkPayFormModal';
import { WorkPayHero } from '../../components/profile/WorkPayHero';
import { WorkPayFormAlert, WorkPayHeroButton } from '../../components/profile/workPayFormUi';
import { ProfileFormActions, ProfileFormField } from '../../components/profile/profileFormUi';
import { computeLoanEligibility, loanRepaymentPreview } from '../../lib/hrLoanEligibility';
import { ProfilePageBody } from '../../components/profile/profilePageUi';
import { ProfileInlineAlert, ProfileOverviewSection } from '../../components/profile/profileOverviewUi';
import { ProfileKpiCard, ProfileStatusChip } from '../../components/profile/profileDesign';
import { useUserProfile } from '../../context/UserProfileContext';
import { formatNgn } from '../../lib/hrFormat';
import { HR_BTN_PRIMARY, HR_BTN_SECONDARY, HR_FIELD_CLASS } from '../../components/hr/hrFormStyles';
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
  const [moneySummary, setMoneySummary] = useState(null);
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
      const sumRes = await fetchStaffMoneySummary(userId);
      if (sumRes.ok && sumRes.data?.ok) setMoneySummary(sumRes.data);
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
  const activeLoans = schedule.filter(
    (l) => l.status === 'active' || l.status === 'pending_disbursement' || l.outstandingNgn > 0
  );
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
        title="Money with Zarewa"
        description="Staff loans and purchase credit (roofing/materials) — balances and payroll repayment."
        action={
          <WorkPayHeroButton onClick={() => setModalOpen(true)} disabled={!eligibility.eligible}>
            Apply for loan
          </WorkPayHeroButton>
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

      {moneySummary?.totalOutstandingNgn > 0 ? (
        <ProfileOverviewSection title="Total outstanding" subtitle="All active staff obligations">
          <ProfileKpiCard label="You owe Zarewa">
            <p className="text-2xl font-black tabular-nums text-[#134e4a]">{formatNgn(moneySummary.totalOutstandingNgn)}</p>
          </ProfileKpiCard>
        </ProfileOverviewSection>
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
                  {loan.status === 'pending_disbursement'
                    ? 'Awaiting payout'
                    : loan.status === 'paid_off'
                      ? 'Paid off'
                      : loan.status === 'active'
                        ? 'Repaying'
                        : loan.status || 'active'}
                </ProfileStatusChip>
                {loan.obligationAccountId ? (
                  <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-semibold">
                    <a
                      className="text-[#134e4a] underline"
                      href={obligationStatementPdfUrl(loan.obligationAccountId)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Statement PDF
                    </a>
                    {loan.status !== 'pending_disbursement' ? null : (
                      <a
                        className="text-[#134e4a] underline"
                        href={obligationDisbursementVoucherPdfUrl(loan.obligationAccountId)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Disbursement voucher
                      </a>
                    )}
                  </div>
                ) : null}
              </ProfileKpiCard>
            ))}
          </div>
        </ProfileOverviewSection>
      ) : null}

      {(moneySummary?.purchases || []).filter((p) => p.principalOutstandingNgn > 0 || p.status === 'pending_approval').length ? (
        <ProfileOverviewSection title="Purchase credit" subtitle="Roofing and materials on staff credit">
          <div className="grid gap-3 sm:grid-cols-2">
            {moneySummary.purchases
              .filter((p) => p.principalOutstandingNgn > 0 || p.status === 'pending_approval')
              .map((p) => (
                <ProfileKpiCard key={p.id} label={p.title || 'Staff purchase'}>
                  <dl className="mt-1 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                    <div>
                      <dt className="text-slate-500">Amount</dt>
                      <dd className="font-bold tabular-nums">{formatNgn(p.principalOriginalNgn)}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Monthly</dt>
                      <dd className="font-bold tabular-nums">{formatNgn(p.installmentNgn)}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-slate-500">Outstanding</dt>
                      <dd className="text-lg font-black tabular-nums text-[#134e4a]">{formatNgn(p.principalOutstandingNgn)}</dd>
                    </div>
                  </dl>
                  {p.quotationRef ? (
                    <p className="mt-1 text-[10px] text-slate-500">Quote {p.quotationRef}</p>
                  ) : null}
                  <ProfileStatusChip variant={p.status === 'active' ? 'pending' : 'default'}>
                    {p.status === 'pending_approval' ? 'Awaiting approval' : p.status === 'active' ? 'Repaying' : p.status}
                  </ProfileStatusChip>
                  <a
                    className="mt-2 inline-block text-[10px] font-semibold text-[#134e4a] underline"
                    href={obligationStatementPdfUrl(p.id)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Statement PDF
                  </a>
                </ProfileKpiCard>
              ))}
          </div>
        </ProfileOverviewSection>
      ) : null}

      <WorkPayFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        eyebrow="Work & pay"
        title="Apply for a staff loan"
        description="Applications are validated against company loan policy before HR review."
        trackId="loan-application"
        footer={
          <ProfileFormActions className="!border-t-0 !pt-0">
            <button type="button" onClick={() => setModalOpen(false)} className={HR_BTN_SECONDARY}>
              Cancel
            </button>
            <button
              type="submit"
              form="loan-application-form"
              disabled={busy || !termsAck || !policyAck || policyErrors.length > 0}
              className={HR_BTN_PRIMARY}
            >
              {busy ? 'Submitting…' : 'Submit loan application'}
            </button>
          </ProfileFormActions>
        }
      >
        <form id="loan-application-form" onSubmit={submit} className="space-y-4">
          {error ? <WorkPayFormAlert variant="error">{error}</WorkPayFormAlert> : null}
          {maxLoanNgn || eligibility.maxLoanNgn ? (
            <WorkPayFormAlert variant="info">
              Policy maximum: <strong>{formatNgn(eligibility.maxLoanNgn || maxLoanNgn)}</strong> ({policy.loanMaxSalaryMonths}× gross{' '}
              {grossSalaryNgn ? formatNgn(grossSalaryNgn) : 'salary'}). Min monthly deduction:{' '}
              {minDeduction ? formatNgn(minDeduction) : '—'}.
            </WorkPayFormAlert>
          ) : null}
          {repaymentPreview ? (
            <div className="rounded-xl border border-teal-100 bg-white px-4 py-3 text-sm text-teal-950 shadow-sm">
              <p className="font-semibold">Repayment preview</p>
              <p className="mt-1 text-xs text-slate-600">
                {formatNgn(repaymentPreview.monthlyDeductionNgn)}/month × {repaymentPreview.repaymentMonths} months ={' '}
                {formatNgn(repaymentPreview.totalNgn)} payroll deduction
              </p>
            </div>
          ) : null}
          {policyErrors.length ? (
            <WorkPayFormAlert variant="warning">
              <ul className="space-y-1">
                {policyErrors.map((pe) => (
                  <li key={pe}>• {pe}</li>
                ))}
              </ul>
            </WorkPayFormAlert>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <ProfileFormField label="Requested amount (₦)" required>
              <input
                type="number"
                min={1}
                max={maxLoanNgn || undefined}
                className={HR_FIELD_CLASS}
                value={amountNgn}
                onChange={(e) => setAmountNgn(e.target.value)}
                required
              />
            </ProfileFormField>
            <ProfileFormField label="Repayment period" required>
              <select className={HR_FIELD_CLASS} value={repaymentMonths} onChange={(e) => setRepaymentMonths(e.target.value)} required>
                {Array.from({ length: Number(policy.loanMaxRepaymentMonths) || 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={String(m)}>
                    {m} month{m === 1 ? '' : 's'}
                  </option>
                ))}
              </select>
            </ProfileFormField>
            <ProfileFormField label="Monthly deduction (₦)" required>
              <input
                type="number"
                min={minDeduction || 1}
                className={HR_FIELD_CLASS}
                value={deductionPerMonthNgn}
                onChange={(e) => setDeductionPerMonthNgn(e.target.value)}
                required
              />
            </ProfileFormField>
            <ProfileFormField label="Deduction start period">
              <input type="month" className={HR_FIELD_CLASS} value={expectedStartPeriod} onChange={(e) => setExpectedStartPeriod(e.target.value)} />
            </ProfileFormField>
            <ProfileFormField label="Purpose" required className="sm:col-span-2">
              <textarea className={`${HR_FIELD_CLASS} min-h-[72px]`} value={purpose} onChange={(e) => setPurpose(e.target.value)} required minLength={10} />
            </ProfileFormField>
            <ProfileFormField label="Guarantor name(s)" hint="As on uploaded guarantor form." className="sm:col-span-2">
              <input className={HR_FIELD_CLASS} value={guarantorNote} onChange={(e) => setGuarantorNote(e.target.value)} placeholder="Full name(s)" />
            </ProfileFormField>
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
        </form>
      </WorkPayFormModal>

      <ProfileOverviewSection title="My loan requests" subtitle="Drafts and applications awaiting HR review">
        <HrRequestsPanel allowedScopes={['mine']} defaultScope="mine" kindFilter="loan" staffLinkBase={staffLinkBase} showStageBar />
      </ProfileOverviewSection>
    </ProfilePageBody>
  );
}
