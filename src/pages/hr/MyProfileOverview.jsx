import React, { useEffect, useRef, useState } from 'react';
import DomesticStaffHub from '../../components/hr/DomesticStaffHub';
import ScholarshipSchoolProfile from '../../components/hr/ScholarshipSchoolProfile';
import { useMyProfileCohort } from './MyProfile';
import { apiFetch } from '../../lib/apiBase';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useUserProfile } from '../../context/UserProfileContext';
import { HrSensitiveGate } from '../../components/hr/HrSensitiveGate';
import { useHrSensitiveAccess } from '../../hooks/useHrSensitiveAccess';
import { canViewOrgSensitiveHr } from '../../lib/hrAccess';
import { formatNgn } from '../../lib/hrFormat';
import { formatPeriodYyyymm } from '../../lib/hrPayroll';
import { ProfileHealthPanel } from '../../components/profile/ProfileHealthPanel';
import {
  ProfileEmptyState,
  ProfileHeroSkeleton,
  ProfileIdentityStrip,
  ProfileInlineAlert,
  ProfileOverviewSection,
} from '../../components/profile/profileOverviewUi';
import { ProfileKpiCard, ProfileKpiSkeleton, ProfileStatusChip } from '../../components/profile/profileDesign';
import { HR_SELF_SERVICE_PATH } from '../../lib/hrSelfServiceRoutes';
import { myProfileOverviewFetchPlan } from '../../lib/myProfileOverviewFetch';
import { ProfileOnboardingWizard } from '../../components/profile/ProfileOnboardingWizard';
import { ProfileProbationBanner } from '../../components/profile/ProfileProbationBanner';

export default function MyProfileOverview() {
  const { cohort: layoutCohort } = useMyProfileCohort();
  const { hr, user, me, completeness, error, initialLoading } = useUserProfile();
  const cohort = layoutCohort || 'employee';
  const ws = useWorkspace();
  const sensitive = useHrSensitiveAccess();
  const showSensitiveInline = canViewOrgSensitiveHr(ws?.permissions);

  const [loading, setLoading] = useState(true);
  const [balances, setBalances] = useState([]);
  const [payslips, setPayslips] = useState([]);
  const [requests, setRequests] = useState([]);
  const hasDashboardDataRef = useRef(false);

  useEffect(() => {
    const plan = myProfileOverviewFetchPlan(cohort);
    if (!plan.leaveBalances && !plan.payslips && !plan.requests) {
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    (async () => {
      if (!hasDashboardDataRef.current) setLoading(true);
      const fetcher = showSensitiveInline || sensitive.isUnlocked ? sensitive.fetchWithSensitive : apiFetch;

      const [balancesRes, payslipsRes, requestsRes] = await Promise.all([
        plan.leaveBalances
          ? apiFetch('/api/hr/leave/balances').catch(() => ({ ok: false }))
          : Promise.resolve({ ok: false }),
        plan.payslips
          ? fetcher('/api/hr/payslips').catch(() => ({ ok: false, data: null }))
          : Promise.resolve({ ok: false, data: null }),
        plan.requests
          ? apiFetch('/api/hr/requests?scope=mine&limit=8').catch(() => ({ ok: false, data: null }))
          : Promise.resolve({ ok: false, data: null }),
      ]);

      if (cancelled) return;

      if (balancesRes.ok && balancesRes.data?.ok) setBalances(balancesRes.data.balances || []);
      else setBalances([]);
      if (payslipsRes.ok && payslipsRes.data?.ok) setPayslips(payslipsRes.data.payslips || []);
      else setPayslips([]);
      if (requestsRes.ok && requestsRes.data?.ok) setRequests(requestsRes.data.requests || []);
      else setRequests([]);

      hasDashboardDataRef.current = true;
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [cohort, sensitive.isUnlocked, showSensitiveInline, sensitive.fetchWithSensitive]);

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
  const metricCount = cohort === 'employee' || cohort === 'special' ? 3 : 2;

  const summarySection = loading ? (
    <ProfileKpiSkeleton count={metricCount} />
  ) : (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                  <span className="capitalize text-slate-700">{b.leaveType} leave</span>
                  <span className="font-black tabular-nums text-slate-900">{b.closingDays ?? b.balance ?? 0} days</span>
                </li>
              ))}
            </ul>
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
            {lastPayslip.amountsRedacted ? (
              <p className="mt-2 text-sm italic text-slate-500">Unlock to view amount</p>
            ) : (
              <>
                <p className="mt-2 text-2xl font-black tabular-nums tracking-tight text-slate-900">
                  {formatNgn(lastPayslip.netNgn)}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Net pay</p>
              </>
            )}
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

      <ProfileOnboardingWizard />
      <ProfileProbationBanner />

      <ProfileHealthPanel
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
