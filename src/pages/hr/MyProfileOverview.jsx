import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../lib/apiBase';
import { useWorkspace } from '../../context/WorkspaceContext';
import { HrSensitiveGate } from '../../components/hr/HrSensitiveGate';
import { useHrSensitiveAccess } from '../../hooks/useHrSensitiveAccess';
import { canViewOrgSensitiveHr } from '../../lib/hrAccess';
import { formatNgn } from '../../lib/hrFormat';
import { formatPeriodYyyymm } from '../../lib/hrPayroll';
import { HrProfileCompleteness } from '../../components/hr/HrProfileCompleteness';

function QuickActionBtn({ to, onClick, children, icon }) {
  const cls =
    'flex flex-col items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#134e4a] shadow-sm hover:border-[#134e4a] hover:bg-teal-50/50 transition-colors';
  if (to) {
    return (
      <Link to={to} className={cls}>
        <span className="text-lg">{icon}</span>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      <span className="text-lg">{icon}</span>
      {children}
    </button>
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

export default function MyProfileOverview() {
  const ws = useWorkspace();
  const navigate = useNavigate();
  const sensitive = useHrSensitiveAccess();
  const perms = ws?.permissions || [];
  const showSensitiveInline = canViewOrgSensitiveHr(perms);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState(null);
  const [balances, setBalances] = useState([]);
  const [payslips, setPayslips] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loans, setLoans] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const fetcher = showSensitiveInline || sensitive.isUnlocked ? sensitive.fetchWithSensitive : apiFetch;

      const [profileRes, balancesRes, payslipsRes, requestsRes] = await Promise.all([
        fetcher('/api/hr/me'),
        apiFetch('/api/hr/leave/balances'),
        fetcher('/api/hr/payslips').catch(() => ({ ok: false, data: null })),
        apiFetch('/api/hr/requests?scope=mine&limit=5').catch(() => ({ ok: false, data: null })),
      ]);

      if (cancelled) return;

      if (!profileRes.ok || !profileRes.data?.ok) {
        setError(profileRes.data?.error || 'Could not load your HR profile.');
        setLoading(false);
        return;
      }

      setProfile(profileRes.data);
      setError('');

      if (balancesRes.ok && balancesRes.data?.ok) setBalances(balancesRes.data.balances || []);
      if (payslipsRes.ok && payslipsRes.data?.ok) {
        const slips = payslipsRes.data.payslips || [];
        setPayslips(slips);
        // Extract active loans from payslip deductions if available
        const activeLoans = slips.filter((s) => s.loanDeductionNgn > 0).slice(0, 1);
        setLoans(activeLoans);
      }
      if (requestsRes.ok && requestsRes.data?.ok) {
        setRequests(requestsRes.data.requests || []);
      }

      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [sensitive.isUnlocked, showSensitiveInline, sensitive.fetchWithSensitive]);

  if (loading && !profile) return <p className="text-sm text-slate-600">Loading your profile…</p>;
  if (error) {
    return (
      <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
    );
  }

  const hr = profile?.hr;
  const user = profile?.user;
  const annualBalance = balances.find((b) => b.leaveType === 'annual');
  const lastPayslip = payslips[0] || null;
  const pendingRequests = requests.filter(
    (r) => r.status === 'hr_review' || r.status === 'gm_hr_review' || r.status === 'branch_manager_review',
  );

  const initials = (user?.displayName || 'U')
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const welcomeCard = (
    <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-[#134e4a]/20 bg-gradient-to-br from-[#134e4a]/5 to-teal-50 p-5 shadow-sm">
      {/* Avatar */}
      {hr?.photoUrl ? (
        <img
          src={hr.photoUrl}
          alt={user?.displayName}
          className="h-16 w-16 rounded-full border-2 border-[#134e4a]/30 object-cover shadow"
        />
      ) : (
        <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#134e4a]/30 bg-[#134e4a] text-xl font-black text-white shadow">
          {initials}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-xl font-black text-slate-900">{user?.displayName || '—'}</p>
        <p className="mt-0.5 text-sm text-slate-600">{hr?.jobTitle || '—'}</p>
        <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-slate-500">
          {hr?.employeeNo ? (
            <span>
              Emp. no. <strong className="text-slate-700">{hr.employeeNo}</strong>
            </span>
          ) : null}
          {hr?.branchId ? (
            <span>
              Branch <strong className="text-slate-700">{hr.branchId}</strong>
            </span>
          ) : null}
          {hr?.department ? (
            <span>
              Dept <strong className="text-slate-700">{hr.department}</strong>
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );

  const quickActions = (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5">
      <QuickActionBtn to="/my-profile/leave" icon="🏖️">
        Apply leave
      </QuickActionBtn>
      <QuickActionBtn to="/my-profile/loans" icon="💰">
        Apply loan
      </QuickActionBtn>
      <QuickActionBtn to="/my-profile/payslips" icon="📄">
        View payslip
      </QuickActionBtn>
      <QuickActionBtn to="/my-profile/documents" icon="📂">
        Upload document
      </QuickActionBtn>
      <QuickActionBtn to="/my-profile/policies" icon="📋">
        Policies
      </QuickActionBtn>
      <QuickActionBtn to="/my-profile/attendance" icon="🕐">
        Attendance
      </QuickActionBtn>
      <QuickActionBtn to="/my-profile/benefits" icon="🎁">
        Benefits
      </QuickActionBtn>
      <QuickActionBtn to="/my-profile/id-card" icon="🪪">
        ID card
      </QuickActionBtn>
    </div>
  );

  const summarySection = (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {/* Leave balances */}
      <SummaryCard title="Leave balances">
        {balances.length === 0 ? (
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
        <Link
          to="/my-profile/leave"
          className="mt-3 block text-[11px] font-bold uppercase text-[#134e4a] hover:underline"
        >
          Apply for leave →
        </Link>
      </SummaryCard>

      {/* Last payslip */}
      <SummaryCard title="Last payslip">
        {!lastPayslip ? (
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
                <p className="mt-1 text-lg font-black tabular-nums text-slate-900">
                  {formatNgn(lastPayslip.netNgn)}
                </p>
                <p className="text-[11px] text-slate-500">Net pay</p>
              </>
            )}
          </>
        )}
        <Link
          to="/my-profile/payslips"
          className="mt-3 block text-[11px] font-bold uppercase text-[#134e4a] hover:underline"
        >
          All payslips →
        </Link>
      </SummaryCard>

      {/* Pending requests */}
      <SummaryCard title="Pending requests">
        {pendingRequests.length === 0 ? (
          <p className="text-sm text-slate-500">No pending requests.</p>
        ) : (
          <ul className="space-y-1.5">
            {pendingRequests.slice(0, 4).map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 truncate text-slate-700">{r.title || r.kind || 'Request'}</span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    r.status === 'approved'
                      ? 'bg-emerald-50 text-emerald-800'
                      : r.status === 'rejected'
                        ? 'bg-red-50 text-red-800'
                        : 'bg-amber-50 text-amber-800'
                  }`}
                >
                  {r.status?.replace(/_/g, ' ')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </SummaryCard>
    </div>
  );

  // Employment details (wrapped in sensitive gate where needed)
  const employmentDetails = (
    <SummaryCard title="Employment summary">
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
        <div>
          <dt className="text-[10px] font-black uppercase tracking-widest text-slate-400">Date joined</dt>
          <dd className="mt-1 font-semibold text-slate-900">{hr?.dateJoinedIso || '—'}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-black uppercase tracking-widest text-slate-400">Employment type</dt>
          <dd className="mt-1 font-semibold text-slate-900">{hr?.employmentType || '—'}</dd>
        </div>
        {hr?.compensationRedacted ? (
          <div className="sm:col-span-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            Compensation figures are hidden. Unlock your sensitive data to view.
          </div>
        ) : (
          <>
            <div>
              <dt className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Base salary (monthly)
              </dt>
              <dd className="mt-1 font-semibold tabular-nums text-slate-900">
                {hr?.baseSalaryNgn != null ? formatNgn(hr.baseSalaryNgn) : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-black uppercase tracking-widest text-slate-400">Bank</dt>
              <dd className="mt-1 font-semibold text-slate-900">
                {hr?.bankName || '—'}
                {hr?.bankAccountNoMasked ? ` · ${hr.bankAccountNoMasked}` : ''}
              </dd>
            </div>
          </>
        )}
      </dl>
    </SummaryCard>
  );

  const content = (
    <div className="space-y-5">
      {welcomeCard}
      {profile?.completeness ? (
        <HrProfileCompleteness
          completeness={profile.completeness}
          compact
          onFixSection={(tabId) => {
            const map = { documents: '/my-profile/documents', employment: '/my-profile/employment', policies: '/my-profile/policies' };
            navigate(map[tabId] || '/my-profile/documents');
          }}
        />
      ) : null}
      {quickActions}
      {summarySection}
      {employmentDetails}
    </div>
  );

  if (showSensitiveInline) return content;
  return <HrSensitiveGate label="View your compensation and bank details">{content}</HrSensitiveGate>;
}
