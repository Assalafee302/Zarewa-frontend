import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../lib/apiBase';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useUserProfile } from '../../context/UserProfileContext';
import { HrSensitiveGate } from '../../components/hr/HrSensitiveGate';
import { useHrSensitiveAccess } from '../../hooks/useHrSensitiveAccess';
import { canViewOrgSensitiveHr } from '../../lib/hrAccess';
import { formatNgn } from '../../lib/hrFormat';
import { formatPeriodYyyymm } from '../../lib/hrPayroll';
import { ProfileCompletionPanel } from '../../components/profile/ProfileCompletionPanel';
import { ProfileHeroCard } from '../../components/profile/ProfileHeroCard';
import { ProfileActionGrid } from '../../components/profile/ProfileActionGrid';
import { HR_SELF_SERVICE_PATH, hrSelfServicePathForTab } from '../../lib/hrSelfServiceRoutes';

function QuickActionBtn({ to, children, icon }) {
  const cls =
    'flex min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs font-bold uppercase tracking-wider text-[#134e4a] shadow-sm active:border-[#134e4a] active:bg-teal-50/50 transition-colors no-underline sm:text-[10px]';
  return (
    <Link to={to} className={cls}>
      <span className="text-lg">{icon}</span>
      {children}
    </Link>
  );
}

function SummaryCard({ title, children }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">{title}</h3>
      {children}
    </div>
  );
}

function ScholarshipOverviewTeaser() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { ok, data } = await apiFetch('/api/hr/me/school-profile');
      if (!cancelled) {
        setProfile(ok && data?.ok ? data.profile : null);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50/80 to-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="text-sm font-black text-slate-900">School & stipend</h3>
          <p className="text-xs text-slate-500 mt-0.5">Your scholarship profile at a glance</p>
        </div>
        <Link to={HR_SELF_SERVICE_PATH.school} className="text-[11px] font-bold uppercase text-violet-700 hover:underline">
          Full school profile →
        </Link>
      </div>
      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : profile ? (
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          <div>
            <dt className="text-[10px] font-black uppercase tracking-widest text-slate-400">School</dt>
            <dd className="mt-1 font-semibold text-slate-900">{profile.schoolName || '—'}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-black uppercase tracking-widest text-slate-400">Class / level</dt>
            <dd className="mt-1 font-semibold text-slate-900">{profile.classLevel || '—'}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-black uppercase tracking-widest text-slate-400">School fees</dt>
            <dd className="mt-1 font-semibold tabular-nums text-slate-900">
              {profile.schoolFeesNgn != null ? formatNgn(profile.schoolFeesNgn) : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-black uppercase tracking-widest text-slate-400">Stipend step</dt>
            <dd className="mt-1 font-semibold text-slate-900">
              {profile.salaryStep != null ? `Step ${profile.salaryStep}` : '—'}
            </dd>
          </div>
        </dl>
      ) : (
        <p className="text-sm text-slate-500">Open My school to view your scholarship details.</p>
      )}
    </section>
  );
}

function EmployeeOverviewDashboard() {
  const navigate = useNavigate();
  const ws = useWorkspace();
  const { hr, cohort, error: meError, completeness, documentSummary, pendingProfileRequests } = useUserProfile();
  const sensitive = useHrSensitiveAccess();
  const showSensitiveInline = canViewOrgSensitiveHr(ws?.permissions);

  const [loading, setLoading] = useState(true);
  const [balances, setBalances] = useState([]);
  const [payslips, setPayslips] = useState([]);
  const [requests, setRequests] = useState([]);
  const hasDashboardDataRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!hasDashboardDataRef.current) setLoading(true);
      const fetcher = showSensitiveInline || sensitive.isUnlocked ? sensitive.fetchWithSensitive : apiFetch;

      const [balancesRes, payslipsRes, requestsRes] = await Promise.all([
        apiFetch('/api/hr/leave/balances').catch(() => ({ ok: false })),
        fetcher('/api/hr/payslips').catch(() => ({ ok: false })),
        apiFetch('/api/hr/requests?scope=mine&limit=8').catch(() => ({ ok: false })),
      ]);

      if (cancelled) return;

      if (balancesRes.ok && balancesRes.data?.ok) setBalances(balancesRes.data.balances || []);
      if (payslipsRes.ok && payslipsRes.data?.ok) setPayslips(payslipsRes.data.payslips || []);
      if (requestsRes.ok && requestsRes.data?.ok) setRequests(requestsRes.data.requests || []);
      hasDashboardDataRef.current = true;
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [sensitive.isUnlocked, showSensitiveInline, sensitive.fetchWithSensitive]);

  if (meError) {
    return (
      <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{meError}</div>
    );
  }

  const lastPayslip = payslips[0] || null;
  const pendingRequests = requests.filter(
    (r) => !['approved', 'rejected', 'cancelled', 'draft'].includes(String(r.status || '').toLowerCase())
  );

  const quickActions = (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5">
      {cohort !== 'domestic' && cohort !== 'special' ? (
        <QuickActionBtn to="/my-profile/leave" icon="🏖️">
          {cohort === 'employee' ? 'Leave & attendance' : 'Leave'}
        </QuickActionBtn>
      ) : null}
      {cohort === 'employee' || cohort === 'special' ? (
        <QuickActionBtn to="/my-profile/loans" icon="💰">
          Apply loan
        </QuickActionBtn>
      ) : null}
      <QuickActionBtn to="/my-profile/payslips" icon="📄">
        Payslips
      </QuickActionBtn>
      <QuickActionBtn to="/my-profile/documents" icon="📂">
        Documents
      </QuickActionBtn>
      {cohort !== 'domestic' ? (
        <>
          <QuickActionBtn to="/my-profile/policies" icon="📋">
            Policies
          </QuickActionBtn>
          <QuickActionBtn to="/my-profile/id-card" icon="🪪">
            ID card
          </QuickActionBtn>
        </>
      ) : null}
    </div>
  );

  const summarySection = (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cohort === 'employee' || cohort === 'special' ? (
        <SummaryCard title="Leave balances">
          {loading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : balances.length === 0 ? (
            <p className="text-sm text-slate-500">No leave balances on record.</p>
          ) : (
            <ul className="space-y-1.5">
              {balances.map((b) => (
                <li key={b.leaveType} className="flex items-center justify-between text-sm">
                  <span className="capitalize text-slate-700">{b.leaveType} leave</span>
                  <span className="font-black tabular-nums text-[#134e4a]">{b.closingDays ?? b.balance ?? 0} days</span>
                </li>
              ))}
            </ul>
          )}
          <Link to="/my-profile/leave" className="mt-3 block text-[11px] font-bold uppercase text-[#134e4a] hover:underline">
            Apply for leave →
          </Link>
        </SummaryCard>
      ) : null}

      <SummaryCard title="Last payslip">
        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : !lastPayslip ? (
          <p className="text-sm text-slate-500">No payslips on file yet.</p>
        ) : (
          <>
            <p className="text-[11px] text-slate-500">
              {formatPeriodYyyymm(lastPayslip.periodYyyymm)} · {lastPayslip.runStatus}
            </p>
            {lastPayslip.amountsRedacted ? (
              <p className="mt-1 text-sm text-slate-500 italic">Unlock to view amount</p>
            ) : (
              <>
                <p className="mt-1 text-lg font-black tabular-nums text-slate-900">{formatNgn(lastPayslip.netNgn)}</p>
                <p className="text-[11px] text-slate-500">Net pay</p>
              </>
            )}
          </>
        )}
        <Link to="/my-profile/payslips" className="mt-3 block text-[11px] font-bold uppercase text-[#134e4a] hover:underline">
          All payslips →
        </Link>
      </SummaryCard>

      <SummaryCard title="Recent requests">
        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : requests.length === 0 ? (
          <p className="text-sm text-slate-500">No requests submitted yet.</p>
        ) : (
          <ul className="space-y-1.5">
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
          <p className="mt-3 text-xs text-amber-800 bg-amber-50 rounded-lg px-3 py-2 border border-amber-100">
            {pendingRequests.length} awaiting review
          </p>
        ) : null}
      </SummaryCard>
    </div>
  );

  const employmentDetails =
    hr && cohort !== 'domestic' ? (
      <SummaryCard title="Employment summary">
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
            <div className="sm:col-span-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              Compensation figures are hidden. Unlock sensitive data to view salary and bank details.
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
        <Link to="/my-profile/employment" className="mt-3 block text-[11px] font-bold uppercase text-[#134e4a] hover:underline">
          Full employment record →
        </Link>
      </SummaryCard>
    ) : null;

  return (
    <div className="space-y-5">
      {completeness ? (
        <ProfileCompletionPanel
          completeness={completeness}
          documentSummary={documentSummary}
          pendingProfileRequests={pendingProfileRequests}
          onFixSection={(tabId) => {
            navigate(hrSelfServicePathForTab(tabId));
          }}
        />
      ) : null}
      {quickActions}
      {summarySection}
      {showSensitiveInline || !hr?.compensationRedacted ? (
        employmentDetails
      ) : (
        <HrSensitiveGate scope="compensation" label="View compensation and bank details">
          {employmentDetails}
        </HrSensitiveGate>
      )}
    </div>
  );
}

export default function ProfileOverview() {
  const { cohort, hasHrSelfService, initialLoading, documentSummary, pendingProfileRequests } = useUserProfile();

  if (initialLoading && hasHrSelfService) {
    return (
      <div className="space-y-6">
        <ProfileHeroCard />
        <p className="text-sm text-slate-600">Loading your profile…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ProfileHeroCard />

      {hasHrSelfService && cohort !== 'account_only' ? (
        <Link
          to={HR_SELF_SERVICE_PATH.overview}
          className="block rounded-2xl border border-teal-100 bg-gradient-to-br from-teal-50/80 to-white p-4 no-underline shadow-sm transition hover:border-teal-200"
        >
          <p className="text-sm font-black text-[#134e4a]">HR self-service</p>
          <p className="mt-1 text-xs text-slate-600">
            Leave, payslips, employment forms, documents, and policies — open the full HR hub →
          </p>
        </Link>
      ) : null}

      <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 className="text-sm font-black text-slate-900">Quick actions</h3>
            <p className="text-xs text-slate-500 mt-0.5">Open the exact form or page for each action</p>
          </div>
          <Link to="/me/services" className="text-[11px] font-bold uppercase text-[#134e4a] hover:underline">
            All services →
          </Link>
        </div>
        <ProfileActionGrid compact excludeWorkspace />
      </section>

      {cohort === 'scholarship' ? <ScholarshipOverviewTeaser /> : null}

      {hasHrSelfService && cohort === 'scholarship' ? (
        <ProfileCompletionPanel
          variant="scholarship"
          documentSummary={documentSummary}
          pendingProfileRequests={pendingProfileRequests}
        />
      ) : null}

      {hasHrSelfService && cohort !== 'scholarship' && cohort !== 'account_only' ? (
        <EmployeeOverviewDashboard />
      ) : null}

      {cohort === 'account_only' ? (
        <section>
          <Link
            to="/me/account"
            className="block rounded-2xl border border-slate-200 bg-slate-50/80 p-4 no-underline hover:border-teal-200 hover:bg-teal-50/40 transition-colors"
          >
            <p className="text-sm font-bold text-slate-900">Account & security</p>
            <p className="mt-1 text-xs text-slate-600">Profile details, access info, and password</p>
          </Link>
        </section>
      ) : null}
    </div>
  );
}
