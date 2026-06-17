import React, { useEffect, useMemo, useRef, useState } from 'react';
import DomesticStaffHub from '../../components/hr/DomesticStaffHub';
import ScholarshipSchoolProfile from '../../components/hr/ScholarshipSchoolProfile';
import { useMyProfileCohort } from './useMyProfileCohort';
import { apiFetch } from '../../lib/apiBase';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useUserProfile } from '../../context/UserProfileContext';
import { HrSensitiveGate } from '../../components/hr/HrSensitiveGate';
import { useHrSensitiveAccess } from '../../hooks/useHrSensitiveAccess';
import { canViewOrgSensitiveHr } from '../../lib/hrAccess';
import { formatNgn } from '../../lib/hrFormat';
import { formatPeriodYyyymm } from '../../lib/hrPayroll';
import { ProfileSetupRow } from '../../components/profile/ProfileSetupRow';
import {
  ProfileEmptyState,
  ProfileHeroSkeleton,
  ProfileIdentityStrip,
  ProfileInlineAlert,
  ProfileOverviewSection,
} from '../../components/profile/profileOverviewUi';
import { ProfileKpiCard, ProfileKpiSkeleton, ProfileStatusChip } from '../../components/profile/profileDesign';
import { HR_SELF_SERVICE_PATH } from '../../lib/hrSelfServiceRoutes';
import { leaveTypeLabel } from '../../lib/hrLeaveUi';
import { myProfileOverviewFetchPlan } from '../../lib/myProfileOverviewFetch';
import { computeLoanEligibility } from '../../lib/hrLoanEligibility';
import { fetchStaffLoanSchedule } from '../../lib/hrMasterData';
import { ProfileProbationBanner } from '../../components/profile/ProfileProbationBanner';

export default function MyProfileOverview() {
  const { cohort: layoutCohort } = useMyProfileCohort();
  const { hr, user, me, completeness, error, initialLoading, loanPolicy } = useUserProfile();
  const cohort = layoutCohort || 'employee';
  const ws = useWorkspace();
  const sensitive = useHrSensitiveAccess();
  const showSensitiveInline = canViewOrgSensitiveHr(ws?.permissions);

  const [loading, setLoading] = useState(true);
  const [balances, setBalances] = useState([]);
  const [payslips, setPayslips] = useState([]);
  const [requests, setRequests] = useState([]);
  const [attendance, setAttendance] = useState(null);
  const [loanOutstandingNgn, setLoanOutstandingNgn] = useState(0);
  const hasDashboardDataRef = useRef(false);
  const userId = ws?.session?.user?.id || user?.id;

  useEffect(() => {
    const plan = myProfileOverviewFetchPlan(cohort);
    if (!plan.leaveBalances && !plan.payslips && !plan.requests && !plan.attendance && !plan.loanSchedule) {
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    (async () => {
      if (!hasDashboardDataRef.current) setLoading(true);
      const fetcher = showSensitiveInline || sensitive.isUnlocked ? sensitive.fetchWithSensitive : apiFetch;

      const [balancesRes, payslipsRes, requestsRes, attendanceRes, loanSchedRes] = await Promise.all([
        plan.leaveBalances
          ? apiFetch('/api/hr/leave/balances').catch(() => ({ ok: false }))
          : Promise.resolve({ ok: false }),
        plan.payslips
          ? fetcher('/api/hr/payslips').catch(() => ({ ok: false, data: null }))
          : Promise.resolve({ ok: false, data: null }),
        plan.requests
          ? apiFetch('/api/hr/requests?scope=mine&limit=8').catch(() => ({ ok: false, data: null }))
          : Promise.resolve({ ok: false, data: null }),
        plan.attendance
          ? apiFetch('/api/hr/me/attendance-summary').catch(() => ({ ok: false, data: null }))
          : Promise.resolve({ ok: false, data: null }),
        plan.loanSchedule && userId
          ? fetchStaffLoanSchedule(userId).catch(() => ({ ok: false, data: null }))
          : Promise.resolve({ ok: false, data: null }),
      ]);

      if (cancelled) return;

      if (balancesRes.ok && balancesRes.data?.ok) setBalances(balancesRes.data.balances || []);
      else setBalances([]);
      if (payslipsRes.ok && payslipsRes.data?.ok) setPayslips(payslipsRes.data.payslips || []);
      else setPayslips([]);
      if (requestsRes.ok && requestsRes.data?.ok) setRequests(requestsRes.data.requests || []);
      else setRequests([]);
      if (attendanceRes.ok && attendanceRes.data?.ok) setAttendance(attendanceRes.data);
      else setAttendance(null);
      if (loanSchedRes.ok && loanSchedRes.data?.ok) {
        const schedule = loanSchedRes.data.schedule || [];
        const outstanding = schedule
          .filter((l) => l.status === 'active' || Number(l.outstandingNgn) > 0)
          .reduce((sum, l) => sum + (Number(l.outstandingNgn) || 0), 0);
        setLoanOutstandingNgn(outstanding);
      } else {
        setLoanOutstandingNgn(0);
      }

      hasDashboardDataRef.current = true;
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [cohort, sensitive.isUnlocked, showSensitiveInline, sensitive.fetchWithSensitive, userId]);

  if (cohort === 'scholarship') return <ScholarshipSchoolProfile />;
  if (cohort === 'domestic') return <DomesticStaffHub />;

  if (initialLoading && !hr) {
    return (
      <div className="space-y-6">
        <ProfileHeroSkeleton />
        <ProfileKpiSkeleton count={3} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <ProfileInlineAlert variant="error">{error}</ProfileInlineAlert>
      </div>
    );
  }

  const lastPayslip = payslips[0] || null;
  const pendingRequests = requests.filter(
    (r) => !['approved', 'rejected', 'cancelled', 'draft'].includes(String(r.status || '').toLowerCase())
  );
  const hasGuarantorDoc = (me?.documents || []).some((d) => d.docKind === 'guarantor_form');
  const loanEligibility = useMemo(
    () =>
      computeLoanEligibility({
        hr,
        loanPolicy,
        hasGuarantorDoc,
        activeLoanOutstandingNgn: loanOutstandingNgn,
      }),
    [hr, loanPolicy, hasGuarantorDoc, loanOutstandingNgn]
  );
  const metricCount = cohort === 'employee' || cohort === 'special' ? 5 : 2;

  const summarySection = loading ? (
    <ProfileKpiSkeleton count={metricCount} />
  ) : (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {cohort === 'employee' || cohort === 'special' ? (
        <ProfileKpiCard label="Leave balances" to={HR_SELF_SERVICE_PATH.leave} actionLabel="Apply for leave">
          {balances.length === 0 ? (
            <ProfileEmptyState
              title="No leave balances"
              description="HR may still be setting up your leave record."
              actionTo={HR_SELF_SERVICE_PATH.leave}
              actionLabel="Apply for leave"
            />
          ) : (
            <ul className="space-y-2">
              {balances.map((b) => (
                <li key={b.leaveType} className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-slate-700">{leaveTypeLabel(b.leaveType)}</span>
                  <span className="font-black tabular-nums text-slate-900">{b.closingDays ?? b.balance ?? 0} days</span>
                </li>
              ))}
            </ul>
          )}
        </ProfileKpiCard>
      ) : null}

      {cohort === 'employee' || cohort === 'special' ? (
        <ProfileKpiCard label="Attendance" to={HR_SELF_SERVICE_PATH.attendance} actionLabel="View details">
          {!attendance ? (
            <ProfileEmptyState
              title="No roll data"
              description="Daily attendance for this month is not recorded yet."
              actionTo={HR_SELF_SERVICE_PATH.attendance}
              actionLabel="Attendance"
            />
          ) : (
            <>
              <p className="text-sm text-slate-700">
                <strong>{attendance.absentDays ?? 0}</strong> absent · <strong>{attendance.lateDays ?? 0}</strong> late
              </p>
              <p className="mt-2 text-lg font-black tabular-nums text-[#134e4a]">
                {formatNgn(attendance.deductionNgn || 0)}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Est. deduction</p>
            </>
          )}
        </ProfileKpiCard>
      ) : null}

      {cohort === 'employee' || cohort === 'special' ? (
        <ProfileKpiCard label="Staff loans" to={HR_SELF_SERVICE_PATH.loans} actionLabel="Apply for loan">
          {!hr ? (
            <ProfileEmptyState
              title="Employment record pending"
              description="Loan eligibility appears once HR sets up your profile."
              actionTo={HR_SELF_SERVICE_PATH.loans}
              actionLabel="Loans"
            />
          ) : (
            <>
              <ProfileStatusChip variant={loanEligibility.eligible ? 'approved' : 'pending'}>
                {loanEligibility.eligible ? 'Eligible' : 'Action needed'}
              </ProfileStatusChip>
              <p className="mt-2 text-sm text-slate-700">
                ~{loanEligibility.serviceYears.toFixed(1)} years service
                {loanEligibility.maxLoanNgn ? (
                  <>
                    {' '}
                    · max <strong>{formatNgn(loanEligibility.maxLoanNgn)}</strong>
                  </>
                ) : null}
              </p>
              {loanEligibility.issues[0] ? (
                <p className="mt-2 text-xs text-amber-900">{loanEligibility.issues[0]}</p>
              ) : (
                <p className="mt-2 text-xs text-slate-500">You meet standard policy checks.</p>
              )}
              {loanOutstandingNgn > 0 ? (
                <p className="mt-1 text-xs font-semibold text-slate-600">
                  Outstanding: {formatNgn(loanOutstandingNgn)}
                </p>
              ) : null}
            </>
          )}
        </ProfileKpiCard>
      ) : null}

      <ProfileKpiCard label="Last payslip" to={HR_SELF_SERVICE_PATH.payslips} actionLabel="All payslips">
        {!lastPayslip ? (
          <ProfileEmptyState
            title="No payslips yet"
            description="Payslips appear after payroll is locked."
            actionTo={HR_SELF_SERVICE_PATH.payslips}
            actionLabel="View payslips"
          />
        ) : (
          <>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
              {formatPeriodYyyymm(lastPayslip.periodYyyymm)} · {lastPayslip.runStatus}
            </p>
            {lastPayslip.amountsRedacted || (!showSensitiveInline && !sensitive.isUnlocked) ? (
              <p className="mt-2 text-sm italic text-slate-500">Unlock payslips to view amount</p>
            ) : (
              <>
                <p className="mt-2 text-2xl font-black tabular-nums tracking-tight text-slate-900">
                  {formatNgn(lastPayslip.netNgn)}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Net pay</p>
              </>
            )}
            {lastPayslip.attendanceDeductionNgn > 0 ? (
              <p className="mt-2 text-xs text-amber-800">
                Attendance deduction:{' '}
                {lastPayslip.amountsRedacted || (!showSensitiveInline && !sensitive.isUnlocked)
                  ? '•••••• (unlock to view)'
                  : formatNgn(lastPayslip.attendanceDeductionNgn)}
              </p>
            ) : null}
          </>
        )}
      </ProfileKpiCard>

      <ProfileKpiCard label="Recent requests">
        {requests.length === 0 ? (
          <ProfileEmptyState
            title="No requests yet"
            description="Leave, loan, and profile requests appear here."
            actionTo={HR_SELF_SERVICE_PATH.leave}
            actionLabel="Apply for leave"
          />
        ) : (
          <ul className="space-y-2">
            {requests.slice(0, 5).map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 truncate text-slate-700">{r.title || r.kind || 'Request'}</span>
                <ProfileStatusChip
                  variant={
                    r.status === 'approved' ? 'approved' : r.status === 'rejected' ? 'rejected' : 'pending'
                  }
                >
                  {String(r.status || 'pending').replace(/_/g, ' ')}
                </ProfileStatusChip>
              </li>
            ))}
          </ul>
        )}
        {pendingRequests.length > 0 ? (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
            {pendingRequests.length} awaiting review
          </p>
        ) : null}
      </ProfileKpiCard>
    </div>
  );

  const employmentBody =
    hr && cohort !== 'domestic' ? (
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
        <div className="z-list-row-compact">
          <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Job title</dt>
          <dd className="mt-1 font-semibold text-slate-900">{hr.jobTitle || '—'}</dd>
        </div>
        <div className="z-list-row-compact">
          <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Date joined</dt>
          <dd className="mt-1 font-semibold text-slate-900">{hr.dateJoinedIso || '—'}</dd>
        </div>
        <div className="z-list-row-compact">
          <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Employment type</dt>
          <dd className="mt-1 font-semibold capitalize text-slate-900">{hr.employmentType || '—'}</dd>
        </div>
        {hr.compensationRedacted ? (
          <div className="sm:col-span-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs leading-relaxed text-slate-600">
            Compensation is hidden. Unlock sensitive data to view salary and bank details.
          </div>
        ) : (
          <>
            <div className="z-list-row-compact">
              <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Base salary (monthly)</dt>
              <dd className="mt-1 font-black tabular-nums text-slate-900">
                {hr.baseSalaryNgn != null ? formatNgn(hr.baseSalaryNgn) : '—'}
              </dd>
            </div>
            <div className="z-list-row-compact">
              <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Bank</dt>
              <dd className="mt-1 font-semibold text-slate-900">
                {hr.bankName || '—'}
                {hr.bankAccountNoMasked ? ` · ${hr.bankAccountNoMasked}` : ''}
              </dd>
            </div>
          </>
        )}
      </dl>
    ) : null;

  return (
    <div className="space-y-6">
      <ProfileIdentityStrip user={user} hr={hr} cohort={cohort} />

      <ProfileProbationBanner />

      <ProfileSetupRow
        completeness={completeness}
        documentSummary={me?.documentSummary}
        pendingProfileRequests={me?.pendingProfileRequests}
        unreadNotifications={me?.unreadNotifications}
        compact
      />

      <ProfileOverviewSection title="At a glance" subtitle="Leave, pay, and requests">
        {summarySection}
      </ProfileOverviewSection>

      {employmentBody ? (
        <ProfileOverviewSection
          title="Employment"
          subtitle="Job and compensation summary"
          actionTo={HR_SELF_SERVICE_PATH.employment}
          actionLabel="Full record"
        >
          {showSensitiveInline || !hr?.compensationRedacted ? (
            employmentBody
          ) : (
            <HrSensitiveGate scope="compensation" label="View compensation and bank details">
              {employmentBody}
            </HrSensitiveGate>
          )}
        </ProfileOverviewSection>
      ) : null}
    </div>
  );
}
