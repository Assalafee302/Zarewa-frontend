import { HrButton, HrAddButton, HR_BTN_PRIMARY, HR_BTN_SECONDARY } from '../../components/hr/hrPageUi';
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageTabs } from '../../components/layout/PageTabs';
import { apiFetch } from '../../lib/apiBase';
import { useWorkspace } from '../../context/WorkspaceContext';
import { HrRequestsPanel } from '../../components/hr/HrRequestsPanel';
import { createHrLoanRequest } from '../../lib/hrStaff';
import { fetchStaffLoanSchedule } from '../../lib/hrMasterData';
import {
  fetchStaffMoneySummary,
} from '../../lib/hrStaffObligations';
import { WorkPayFormModal } from '../../components/profile/WorkPayFormModal';
import { WorkPayHero } from '../../components/profile/WorkPayHero';
import { WorkPayFormAlert } from '../../components/profile/workPayFormUi';
import { ProfileFormActions, ProfileFormField } from '../../components/profile/profileFormUi';
import { computeLoanEligibility, loanRepaymentPreview } from '../../lib/hrLoanEligibility';
import { ProfilePageBody } from '../../components/profile/profilePageUi';
import { ProfileInlineAlert, ProfileOverviewSection } from '../../components/profile/profileOverviewUi';
import { ProfileKpiCard, ProfileStatusChip } from '../../components/profile/profileDesign';
import { useUserProfile } from '../../context/UserProfileContext';
import { formatNgn } from '../../lib/hrFormat';
import { HR_FIELD_CLASS } from '../../components/hr/hrFormStyles';
import { GUARANTOR_FORM_TEMPLATE_URL } from '../../lib/hrStaffDocumentKinds';
import { fetchMyQuotationsForPurchaseCredit } from '../../lib/hrStaffPurchaseCredit';
import { StaffPurchaseCreditRequestModal } from '../../components/sales/StaffPurchaseCreditRequestModal';
import { salesQuotationDeepLink } from '../../lib/staffPurchaseCreditLinks';
import { StaffPaymentsPayGuide } from '../../components/hr/StaffPaymentsPayGuide';
import { StaffObligationBalanceCard } from '../../components/hr/StaffObligationBalanceCard';
import { collectRepayableObligations, normalizeObligationForPayback } from '../../lib/hrObligationPayUi';

import { HR_SELF_SERVICE_PATH } from '../../lib/hrSelfServiceRoutes';

const LOAN_TABS = [
  { id: 'repay', label: 'Pay back' },
  { id: 'loans', label: 'Staff loans' },
  { id: 'credit', label: 'Purchase credit' },
];

const LOAN_STEPS = ['Amount & period', 'Purpose & guarantor', 'Review & acknowledge'];

export default function MyLoans({ staffLinkBase = '/my-profile' }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const ws = useWorkspace();
  const { hr, loanPolicy: ctxLoanPolicy, reload, me } = useUserProfile();
  const userId = ws?.session?.user?.id;
  const [modalOpen, setModalOpen] = useState(false);
  const [step, setStep] = useState(0);

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

  const tabRaw = searchParams.get('tab') || '';
  const tab = LOAN_TABS.some((t) => t.id === tabRaw)
    ? tabRaw
    : Number(moneySummary?.totalOutstandingNgn) > 0
      ? 'repay'
      : 'loans';
  const [scheduleLoading, setScheduleLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [hasGuarantorDoc, setHasGuarantorDoc] = useState(false);
  const [myQuotations, setMyQuotations] = useState([]);
  const [myQuotesLoading, setMyQuotesLoading] = useState(true);
  const [purchaseModalRef, setPurchaseModalRef] = useState('');

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
    let cancelled = false;
    (async () => {
      setScheduleLoading(true);
      setSummaryLoading(true);
      setLoadError('');
      const schedRes = await fetchStaffLoanSchedule(userId);
      const sumRes = await fetchStaffMoneySummary(userId);
      if (cancelled) return;
      setScheduleLoading(false);
      setSummaryLoading(false);
      if (schedRes.ok && schedRes.data?.ok) setSchedule(schedRes.data.schedule || []);
      else setSchedule([]);
      if (sumRes.ok && sumRes.data?.ok) setMoneySummary(sumRes.data);
      else setMoneySummary(null);
      const err =
        (!schedRes.ok && (schedRes.data?.error || 'Could not load loan schedule.')) ||
        (!sumRes.ok && (sumRes.data?.error || 'Could not load money summary.')) ||
        '';
      setLoadError(err);
      const docs = me?.documents || [];
      setHasGuarantorDoc(docs.some((d) => d.docKind === 'guarantor_form'));
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, message, me?.documents]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      setMyQuotesLoading(true);
      const qRes = await fetchMyQuotationsForPurchaseCredit();
      if (cancelled) return;
      setMyQuotesLoading(false);
      if (qRes.ok && qRes.data?.ok) setMyQuotations(qRes.data.items || []);
      else setMyQuotations([]);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, message]);

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

  const activeRecoveries = useMemo(
    () =>
      (moneySummary?.recoveries || []).filter((r) => Math.max(0, Number(r.principalOutstandingNgn) || 0) > 0),
    [moneySummary?.recoveries]
  );

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

  const payrollDeductionLoans = useMemo(
    () => collectRepayableObligations({ schedule, purchases: moneySummary?.purchases }),
    [schedule, moneySummary?.purchases]
  );

  const resetWizard = () => {
    setStep(0);
    setAmountNgn('');
    setRepaymentMonths('1');
    setDeductionPerMonthNgn('');
    setPurpose('');
    setExpectedStartPeriod('');
    setGuarantorNote('');
    setTermsAck(false);
    setPolicyAck(false);
    setError('');
  };

  const closeModal = () => {
    setModalOpen(false);
    resetWizard();
  };

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

  const canNext =
    step === 0
      ? amount > 0 && months > 0 && deduction >= (minDeduction || 1) && policyErrors.length === 0
      : step === 1
        ? purpose.trim().length >= 10
        : true;

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
    closeModal();
    await reload?.();
  };

  return (
    <ProfilePageBody>
      <WorkPayHero
        variant="context"
        description="Track what you owe, how payroll collects it, and apply for new loans or purchase credit."
        action={
          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            <div className="flex flex-wrap items-center justify-end gap-2">
              <ProfileStatusChip variant={eligibility.eligible ? 'approved' : 'pending'}>
                {eligibility.eligible ? 'Eligible' : 'Action needed'}
              </ProfileStatusChip>
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                disabled={!eligibility.eligible}
                className={HR_BTN_PRIMARY}
              >
                Apply for loan
              </button>
            </div>
            {!eligibility.eligible && eligibility.issues.length ? (
              <div className="max-w-xs rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-left text-xs text-amber-950">
                <p className="font-semibold">Before you can apply:</p>
                <ul className="mt-1 space-y-0.5">
                  {eligibility.issues.map((line) => (
                    <li key={line}>• {line}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        }
      />

      {loadError ? <ProfileInlineAlert variant="warning">{loadError}</ProfileInlineAlert> : null}

      <PageTabs
        tabs={LOAN_TABS}
        value={tab}
        onChange={(next) => {
          setSearchParams((prev) => {
            const p = new URLSearchParams(prev);
            p.set('tab', next);
            return p;
          });
        }}
      />

      {(scheduleLoading || summaryLoading) && !schedule.length && !moneySummary ? (
        <p className="text-sm text-slate-500">Loading your balances…</p>
      ) : null}

      {tab === 'repay' ? (
        <>
          {payrollDeductionLoans.length || activeRecoveries.length ? (
            <StaffPaymentsPayGuide
              recoveries={activeRecoveries}
              obligations={payrollDeductionLoans}
              staffEmployeeNo={moneySummary?.staffEmployeeNo}
              staffBranchId={moneySummary?.staffBranchId || hr?.branchId || ws?.session?.currentBranchId}
            />
          ) : null}

          {payrollDeductionLoans.length ? (
            <ProfileOverviewSection title="Your balances" subtitle="Loans and purchase credit on staff payroll deduction">
              <div className="grid gap-3 sm:grid-cols-2">
                {payrollDeductionLoans.map((o) => (
                  <StaffObligationBalanceCard key={o.id} obligation={o} />
                ))}
              </div>
            </ProfileOverviewSection>
          ) : !activeRecoveries.length ? (
            <ProfileOverviewSection title="Nothing to pay back" subtitle="No active staff loans or purchase credit">
              <p className="text-sm text-slate-600">
                When you have an approved loan or purchase credit, this tab shows your balance, monthly payroll
                deduction, and how to pay early if you choose.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <HrButton
                  type="button"
                  variant="secondary"
                  onClick={() => setSearchParams((p) => { const n = new URLSearchParams(p); n.set('tab', 'loans'); return n; })}
                >
                  Apply for staff loan
                </HrButton>
                <HrButton
                  type="button"
                  variant="secondary"
                  onClick={() => setSearchParams((p) => { const n = new URLSearchParams(p); n.set('tab', 'credit'); return n; })}
                >
                  Request purchase credit
                </HrButton>
              </div>
            </ProfileOverviewSection>
          ) : null}
        </>
      ) : null}

      {tab === 'loans' ? (
        <>
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
          before applying for a loan.
        </ProfileInlineAlert>
      ) : null}

      {activeLoans.length ? (
        <ProfileInlineAlert variant="info">
          Active loan outstanding:{' '}
          <strong>{formatNgn(activeLoans.reduce((s, l) => s + (l.outstandingNgn || 0), 0))}</strong>.{' '}
          <button
            type="button"
            className="font-bold underline"
            onClick={() => setSearchParams((p) => { const n = new URLSearchParams(p); n.set('tab', 'repay'); return n; })}
          >
            View payback details
          </button>
        </ProfileInlineAlert>
      ) : null}

      <ProfileOverviewSection title="My loan requests" subtitle="Track approval progress">
        <p className="mb-3 text-xs text-slate-600">
          All requests also appear in{' '}
          <Link to={HR_SELF_SERVICE_PATH.requests} className="font-semibold text-zarewa-teal hover:underline">
            My requests
          </Link>
          .
        </p>
        <HrRequestsPanel allowedScopes={['mine']} defaultScope="mine" kindFilter="loan" staffLinkBase={staffLinkBase} showStageBar selfService />
      </ProfileOverviewSection>
        </>
      ) : null}

      {tab === 'credit' ? (
        <>
      {moneySummary?.purchaseEligibility ? (
        <ProfileOverviewSection title="Purchase credit eligibility" subtitle="Roofing and materials on staff credit via Sales">
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${
              moneySummary.purchaseEligibility.eligible
                ? 'border-emerald-100 bg-emerald-50/80 text-emerald-950'
                : 'border-amber-100 bg-amber-50/80 text-amber-950'
            }`}
          >
            <p className="font-semibold">
              {moneySummary.purchaseEligibility.eligible ? 'Eligible for purchase credit' : 'Not yet eligible'}
            </p>
            <p className="mt-1 text-xs">
              Service: ~{Number(moneySummary.purchaseEligibility.serviceYears || 0).toFixed(1)} years
              {moneySummary.purchaseEligibility.policy?.maxSinglePurchaseNgn
                ? ` · Max single purchase ${formatNgn(moneySummary.purchaseEligibility.policy.maxSinglePurchaseNgn)}`
                : ''}
              {moneySummary.purchaseEligibility.activeOutstandingNgn > 0
                ? ` · Outstanding ${formatNgn(moneySummary.purchaseEligibility.activeOutstandingNgn)}`
                : ''}
            </p>
            {moneySummary.purchaseEligibility.issues?.length ? (
              <ul className="mt-2 space-y-1 text-xs">
                {moneySummary.purchaseEligibility.issues.map((line) => (
                  <li key={line}>• {line}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-xs">
                Ask Sales to raise a quotation on your linked staff customer account when you are ready to buy on credit.
              </p>
            )}
            {!moneySummary.purchaseEligibility.salesCustomerId ? (
              <p className="mt-2 text-xs text-slate-600">
                Your sales customer link is not set up yet — contact HR to enable purchase credit quotations.
              </p>
            ) : null}
          </div>
        </ProfileOverviewSection>
      ) : null}

      {(moneySummary?.purchases || []).some((p) => p.principalOutstandingNgn > 0) ? (
        <ProfileInlineAlert variant="info">
          Purchase credit outstanding:{' '}
          <strong>
            {formatNgn(
              (moneySummary.purchases || [])
                .filter((p) => p.principalOutstandingNgn > 0)
                .reduce((s, p) => s + p.principalOutstandingNgn, 0)
            )}
          </strong>
          .{' '}
          <button
            type="button"
            className="font-bold underline"
            onClick={() => setSearchParams((p) => { const n = new URLSearchParams(p); n.set('tab', 'repay'); return n; })}
          >
            View payback details
          </button>
        </ProfileInlineAlert>
      ) : null}

      <ProfileOverviewSection title="My purchase credit requests" subtitle="Track MD approval and payroll repayment">
        {(moneySummary?.purchases || []).length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {moneySummary.purchases.map((p) => {
              const obligation = normalizeObligationForPayback(p, 'purchase');
              return obligation ? <StaffObligationBalanceCard key={p.id} obligation={obligation} /> : null;
            })}
          </div>
        ) : (
          <p className="text-sm text-slate-600">
            When you request purchase credit on a Sales quotation, it appears here with approval status and repayment
            details.
          </p>
        )}
      </ProfileOverviewSection>

      {(myQuotesLoading || myQuotations.length > 0) ? (
        <ProfileOverviewSection
          title="Quotations ready for purchase credit"
          subtitle="Open balances on your linked staff customer account"
        >
          {myQuotesLoading ? (
            <p className="text-sm text-slate-500">Loading your quotations…</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {myQuotations.map((q) => {
                const quoteLink = salesQuotationDeepLink(q.quotationRef);
                return (
                  <ProfileKpiCard key={q.quotationRef} label={q.projectName || q.quotationRef}>
                    <p className="text-xs text-slate-600">
                      Balance due: <strong>{formatNgn(q.balanceNgn)}</strong>
                    </p>
                    {q.hasPendingCredit ? (
                      <ProfileStatusChip variant="pending">
                        {q.creditStatus === 'pending_approval' ? 'Awaiting MD approval' : q.creditStatus || 'Credit linked'}
                      </ProfileStatusChip>
                    ) : (
                      <button
                        type="button"
                        className={`${HR_BTN_PRIMARY} mt-2 text-xs`}
                        onClick={() => setPurchaseModalRef(q.quotationRef)}
                      >
                        Request purchase credit
                      </button>
                    )}
                    {quoteLink ? (
                      <Link
                        to={quoteLink.to}
                        state={quoteLink.state}
                        className="mt-2 inline-block text-xs font-semibold text-zarewa-teal underline"
                      >
                        View quotation
                      </Link>
                    ) : null}
                  </ProfileKpiCard>
                );
              })}
            </div>
          )}
        </ProfileOverviewSection>
      ) : null}
        </>
      ) : null}

      <WorkPayFormModal
        isOpen={modalOpen}
        onClose={closeModal}
        eyebrow="Work & pay"
        title="Apply for a staff loan"
        description="Applications are validated against company loan policy before HR review."
        steps={LOAN_STEPS}
        currentStep={step}
        trackId="loan-application"
        footer={
          <ProfileFormActions className="!border-t-0 !pt-0">
            {step > 0 ? (
              <button type="button" onClick={() => setStep((s) => s - 1)} className={HR_BTN_SECONDARY}>
                Back
              </button>
            ) : (
              <HrButton type="button" onClick={closeModal} variant="secondary">
                Cancel
              </HrButton>
            )}
            {step < LOAN_STEPS.length - 1 ? (
              <button type="button" disabled={!canNext} onClick={() => setStep((s) => s + 1)} className={HR_BTN_PRIMARY}>
                Next
              </button>
            ) : (
              <button
                type="submit"
                form="loan-application-form"
                disabled={busy || !termsAck || !policyAck || policyErrors.length > 0}
                className={HR_BTN_PRIMARY}
              >
                {busy ? 'Submitting…' : 'Submit loan application'}
              </button>
            )}
          </ProfileFormActions>
        }
      >
        <form id="loan-application-form" onSubmit={submit} className="space-y-4">
          {error ? <WorkPayFormAlert variant="error">{error}</WorkPayFormAlert> : null}

          {step === 0 ? (
            <>
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
                <ProfileFormField label="Deduction start period" hint="When you want payroll to start deducting.">
                  <input type="month" className={HR_FIELD_CLASS} value={expectedStartPeriod} onChange={(e) => setExpectedStartPeriod(e.target.value)} />
                </ProfileFormField>
              </div>
            </>
          ) : null}

          {step === 1 ? (
            <div className="grid gap-4">
              <ProfileFormField label="Purpose" required hint="Briefly explain how you will use the loan.">
                <textarea className={`${HR_FIELD_CLASS} min-h-[96px]`} value={purpose} onChange={(e) => setPurpose(e.target.value)} required minLength={10} />
              </ProfileFormField>
              <ProfileFormField label="Guarantor name(s)" hint="As on uploaded guarantor form.">
                <input className={HR_FIELD_CLASS} value={guarantorNote} onChange={(e) => setGuarantorNote(e.target.value)} placeholder="Full name(s)" />
              </ProfileFormField>
              {!hasGuarantorDoc ? (
                <WorkPayFormAlert variant="warning">
                  Upload a signed{' '}
                  <a href={GUARANTOR_FORM_TEMPLATE_URL} download className="font-bold underline">
                    guarantor form
                  </a>{' '}
                  in{' '}
                  <Link to={`${staffLinkBase}/documents`} className="font-bold underline">
                    My documents
                  </Link>{' '}
                  before HR can approve your application.
                </WorkPayFormAlert>
              ) : null}
            </div>
          ) : null}

          {step === 2 ? (
            <>
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800">
                <p className="font-semibold text-slate-900">Review your application</p>
                <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                  <div>
                    <dt className="text-slate-500">Amount</dt>
                    <dd className="font-bold tabular-nums">{formatNgn(amount)}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Repayment</dt>
                    <dd className="font-bold">
                      {formatNgn(deduction)}/month × {months} month{months === 1 ? '' : 's'}
                    </dd>
                  </div>
                  {expectedStartPeriod ? (
                    <div>
                      <dt className="text-slate-500">Deduction starts</dt>
                      <dd className="font-bold">{expectedStartPeriod}</dd>
                    </div>
                  ) : null}
                  <div className="sm:col-span-2">
                    <dt className="text-slate-500">Purpose</dt>
                    <dd className="font-semibold">{purpose.trim()}</dd>
                  </div>
                  {guarantorNote.trim() ? (
                    <div className="sm:col-span-2">
                      <dt className="text-slate-500">Guarantor</dt>
                      <dd className="font-semibold">{guarantorNote.trim()}</dd>
                    </div>
                  ) : null}
                </dl>
              </div>
              <label className="flex items-start gap-2 text-xs font-semibold text-slate-600">
                <input type="checkbox" className="mt-1" checked={policyAck} onChange={(e) => setPolicyAck(e.target.checked)} required />
                <span>
                  I confirm I meet the service requirement ({policy.loanMinServiceYears}+ years), my amount is within policy
                  limits, and a signed guarantor form is on file.
                </span>
              </label>
              <label className="flex items-start gap-2 text-xs font-semibold text-slate-600">
                <input type="checkbox" className="mt-1" checked={termsAck} onChange={(e) => setTermsAck(e.target.checked)} required />
                <span>
                  I authorise payroll deduction for the full repayment schedule. Default may affect future loan eligibility and
                  may involve guarantor recovery per company policy.
                </span>
              </label>
            </>
          ) : null}
        </form>
      </WorkPayFormModal>

      <StaffPurchaseCreditRequestModal
        open={Boolean(purchaseModalRef)}
        onClose={() => setPurchaseModalRef('')}
        quotationRef={purchaseModalRef}
        selfInitiated
        onSubmitted={() => {
          setPurchaseModalRef('');
          setMessage('Purchase credit request submitted — awaiting MD approval.');
        }}
      />
    </ProfilePageBody>
  );
}
