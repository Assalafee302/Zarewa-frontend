import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { HrProfileCompleteness } from '../../components/hr/HrProfileCompleteness';
import { HrPageBody } from '../../components/hr/hrPageUi';
import {
  ProfileEmptyState,
  ProfileHeroSkeleton,
  ProfileIdentityStrip,
  ProfileInlineAlert,
  ProfileMetricCard,
  ProfileMetricSkeleton,
  ProfileOverviewSection,
} from '../../components/profile/profileOverviewUi';
import { HR_SELF_SERVICE_PATH, hrSelfServicePathForTab } from '../../lib/hrSelfServiceRoutes';
import { myProfileOverviewFetchPlan } from '../../lib/myProfileOverviewFetch';

export default function MyProfileOverview() {
  const { cohort: layoutCohort } = useMyProfileCohort();
  const { hr, user, completeness, error, initialLoading } = useUserProfile();
  const cohort = layoutCohort || 'employee';
  const ws = useWorkspace();
  const navigate = useNavigate();
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
      <HrPageBody>
        <ProfileHeroSkeleton />
        <ProfileMetricSkeleton count={cohort === 'domestic' ? 2 : 3} />
      </HrPageBody>
    );
  }

  if (error) {
    return (
      <HrPageBody>
        <ProfileInlineAlert variant="error">{error}</ProfileInlineAlert>
      </HrPageBody>
    );
  }

  const lastPayslip = payslips[0] || null;
  const pendingRequests = requests.filter(
    (r) => !['approved', 'rejected', 'cancelled', 'draft'].includes(String(r.status || '').toLowerCase())
  );
  const metricCount = cohort === 'employee' || cohort === 'special' ? 3 : 2;

  const summarySection = loading ? (
    <ProfileMetricSkeleton count={metricCount} />
  ) : (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cohort === 'employee' || cohort === 'special' ? (
        <ProfileMetricCard title="Leave balances" footerTo={HR_SELF_SERVICE_PATH.leave} footerLabel="Apply for leave">
          {balances.length === 0 ? (
            <ProfileEmptyState
              title="No leave balances"
              description="HR may still be setting up your leave record. You can still submit a request."
              actionTo={HR_SELF_SERVICE_PATH.leave}
              actionLabel="Apply for leave"
            />
          ) : (
            <ul className="space-y-2">
              {balances.map((b) => (
                <li key={b.leaveType} className="flex items-center justify-between gap-2 text-sm">
                  <span className="capitalize text-slate-700">{b.leaveType} leave</span>
                  <span className="font-semibold tabular-nums text-slate-900">
                    {b.closingDays ?? b.balance ?? 0} days
                  </span>
                </li>
              ))}
            </ul>
          )}
        </ProfileMetricCard>
      ) : null}

      <ProfileMetricCard title="Last payslip" footerTo={HR_SELF_SERVICE_PATH.payslips} footerLabel="All payslips">
        {!lastPayslip ? (
          <ProfileEmptyState
            title="No payslips yet"
            description="Payslips appear after payroll is locked for a period."
            actionTo={HR_SELF_SERVICE_PATH.payslips}
            actionLabel="View payslips"
          />
        ) : (
          <>
            <p className="text-[11px] text-slate-500">
              {formatPeriodYyyymm(lastPayslip.periodYyyymm)} · {lastPayslip.runStatus}
            </p>
            {lastPayslip.amountsRedacted ? (
              <p className="mt-2 text-sm italic text-slate-500">Unlock to view amount</p>
            ) : (
              <>
                <p className="mt-2 text-xl font-black tabular-nums text-slate-900">{formatNgn(lastPayslip.netNgn)}</p>
                <p className="text-[11px] text-slate-500">Net pay</p>
              </>
            )}
          </>
        )}
      </ProfileMetricCard>

      <ProfileMetricCard title="Recent requests">
        {requests.length === 0 ? (
          <ProfileEmptyState
            title="No requests yet"
            description="Leave, loan, and profile change requests will show here once submitted."
            actionTo={HR_SELF_SERVICE_PATH.leave}
            actionLabel="Apply for leave"
          />
        ) : (
          <ul className="space-y-2">
            {requests.slice(0, 5).map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 truncate text-slate-700">{r.title || r.kind || 'Request'}</span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                    r.status === 'approved'
                      ? 'bg-emerald-50 text-emerald-800'
                      : r.status === 'rejected'
                        ? 'bg-red-50 text-red-800'
                        : 'bg-amber-50 text-amber-800'
                  }`}
                >
                  {String(r.status || 'pending').replace(/_/g, ' ')}
                </span>
              </li>
            ))}
          </ul>
        )}
        {pendingRequests.length > 0 ? (
          <p className="mt-3 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
            {pendingRequests.length} awaiting review
          </p>
        ) : null}
      </ProfileMetricCard>
    </div>
  );

  const employmentBody =
    hr && cohort !== 'domestic' ? (
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
        <div>
          <dt className="text-[10px] font-black uppercase tracking-widest text-slate-400">Job title</dt>
          <dd className="mt-1 font-semibold text-slate-900">{hr.jobTitle || '—'}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-black uppercase tracking-widest text-slate-400">Date joined</dt>
          <dd className="mt-1 font-semibold text-slate-900">{hr.dateJoinedIso || '—'}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-black uppercase tracking-widest text-slate-400">Employment type</dt>
          <dd className="mt-1 font-semibold text-slate-900">{hr.employmentType || '—'}</dd>
        </div>
        {hr.compensationRedacted ? (
          <div className="sm:col-span-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-xs leading-relaxed text-slate-600">
            Compensation figures are hidden. Unlock your sensitive data to view salary and bank details.
          </div>
        ) : (
          <>
            <div>
              <dt className="text-[10px] font-black uppercase tracking-widest text-slate-400">Base salary (monthly)</dt>
              <dd className="mt-1 font-semibold tabular-nums text-slate-900">
                {hr.baseSalaryNgn != null ? formatNgn(hr.baseSalaryNgn) : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-black uppercase tracking-widest text-slate-400">Bank</dt>
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
    <HrPageBody>
      <ProfileIdentityStrip user={user} hr={hr} cohort={cohort} />

      {completeness ? (
        <HrProfileCompleteness
          completeness={completeness}
          compact
          onFixSection={(tabId) => {
            navigate(hrSelfServicePathForTab(tabId));
          }}
        />
      ) : null}

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
    </HrPageBody>
  );
}
