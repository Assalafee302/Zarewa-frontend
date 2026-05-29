import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../lib/apiBase';
import { HrNotificationsPanel } from '../../components/hr/HrNotificationsPanel';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { useWorkspace } from '../../context/WorkspaceContext';
import { hrRequestStatusClass } from '../../lib/hrFormat';
import { HrAlert, HrCard, HrPageBody, HrPageIntro } from '../../components/hr/hrPageUi';
import { HR_BTN_SECONDARY } from '../../components/hr/hrFormStyles';
import {
  AppTable,
  AppTableBody,
  AppTableTd,
  AppTableTh,
  AppTableThead,
  AppTableTr,
  AppTableWrap,
} from '../../components/ui/AppDataTable';

function StatCard({ label, value, tone = 'slate', to }) {
  const tones = {
    slate: 'border-slate-100 bg-white text-slate-900',
    amber: 'border-amber-100 bg-amber-50/50 text-amber-950',
    emerald: 'border-emerald-100 bg-emerald-50/40 text-emerald-950',
    red: 'border-red-100 bg-red-50/40 text-red-950',
  };
  const inner = (
    <>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black tabular-nums">{value}</p>
    </>
  );
  const cls = `rounded-xl border px-4 py-4 shadow-sm block transition ${tones[tone] || tones.slate} ${to ? 'hover:border-[#134e4a]/30 hover:shadow-md' : ''}`;
  if (to) {
    return (
      <Link to={to} className={cls}>
        {inner}
      </Link>
    );
  }
  return <div className={cls}>{inner}</div>;
}

export default function HrDashboard() {
  const ws = useWorkspace();
  const [obs, setObs] = useState(null);
  const [inbox, setInbox] = useState(null);
  const [staffCounts, setStaffCounts] = useState(null);
  const [recentRequests, setRecentRequests] = useState([]);
  const [readiness, setReadiness] = useState(null);

  const { loading, error } = useHrListLoad(async () => {
    const { ok, data } = await apiFetch('/api/hr/dashboard');
    if (!ok || !data?.ok) {
      setObs(null);
      setInbox(null);
      setStaffCounts(null);
      setRecentRequests([]);
      return { error: data?.error || 'Could not load HR dashboard.', hasData: false };
    }
    setObs(data.observability);
    setInbox(data.inbox);
    setStaffCounts(data.staffCounts);
    setRecentRequests(data.recentRequests || []);
    setReadiness(data.readiness || null);
    return { hasData: true };
  }, []);

  if (loading && !obs) {
    return <p className="text-sm text-slate-600">Loading HR dashboard…</p>;
  }

  if (error) {
    return <HrAlert>{error}</HrAlert>;
  }

  const summary = obs?.summary || {};
  const counts = inbox?.counts || {};
  const staff = staffCounts || {};

  return (
    <HrPageBody>
      {ws?.session?.userId ? <HrNotificationsPanel /> : null}

      <HrPageIntro
        title="HR dashboard"
        description="Your command centre for staff, approvals, payroll, and production readiness."
        actions={
          <>
            <Link to="/hr/requests" className={HR_BTN_SECONDARY}>
              HR requests
            </Link>
            <Link to="/hr/staff" className={HR_BTN_SECONDARY}>
              Staff directory
            </Link>
          </>
        }
      />

      {readiness ? (
        <HrCard
          title="Production readiness"
          subtitle={
            readiness.canCutover
              ? 'Ready for UAT sign-off'
              : readiness.productionReady
                ? 'Migrations OK — resolve data gates'
                : 'Run database migration on the server'
          }
        >
          <p className="text-sm text-slate-700">
            {readiness.canCutover ? (
              <span className="font-semibold text-emerald-800">
                All infrastructure and data gates pass — proceed with the UAT smoke checklist.
              </span>
            ) : readiness.productionReady ? (
              <span className="font-semibold text-amber-800">
                Submodule tables are present. Clear the blockers below before production cutover.
              </span>
            ) : (
              <span className="font-semibold text-amber-800">
                Run <code className="rounded bg-amber-100 px-1 text-xs">npm run db:migrate</code> on the server if
                modules show missing.
              </span>
            )}
          </p>
          {readiness.modules ? (
            <div className="mt-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Infrastructure</p>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {Object.entries(readiness.modules)
                  .filter(([k]) => k !== 'allReady')
                  .map(([k, v]) => (
                    <span
                      key={k}
                      className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                        v ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'
                      }`}
                    >
                      {k}: {v ? 'ok' : 'missing'}
                    </span>
                  ))}
              </div>
            </div>
          ) : null}
          {readiness.gates ? (
            <div className="mt-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Data gates</p>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {[
                  ['Special org nodes', readiness.gates.specialNodesPresent],
                  ['Cleanup queue clear', readiness.gates.cleanupPassDone],
                  [`Profile quality ≥85% (${readiness.gates.qualityCoveragePct ?? 0}%)`, readiness.gates.qualityCoveragePct >= 85],
                  ['Sensitive masking', readiness.gates.sensitiveMaskingReady],
                ].map(([label, pass]) => (
                  <span
                    key={label}
                    className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
                      pass ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'
                    }`}
                  >
                    {label}: {pass ? 'pass' : 'action needed'}
                  </span>
                ))}
                {Number(readiness.gates.overdueRequests || 0) > 0 ? (
                  <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-[10px] font-bold text-red-800">
                    {readiness.gates.overdueRequests} overdue request(s)
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}
          {(readiness.blockers || []).length > 0 ? (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-slate-600">
              {readiness.blockers.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to="/hr/staff" className={HR_BTN_SECONDARY}>
              Staff directory
            </Link>
            <Link to="/hr/requests" className={HR_BTN_SECONDARY}>
              HR requests
            </Link>
          </div>
        </HrCard>
      ) : null}

      <HrCard title="Overview">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Active staff" value={staff.active ?? summary.activeStaff ?? '—'} to="/hr/staff" />
          <StatCard
            label="Incomplete profiles"
            value={staff.incompleteProfiles ?? 0}
            tone={Number(staff.incompleteProfiles) > 0 ? 'amber' : 'slate'}
            to="/hr/staff"
          />
          <StatCard
            label="Pending HR review"
            value={counts.pendingHrReview ?? summary.pendingHrReview ?? 0}
            tone={Number(counts.pendingHrReview ?? summary.pendingHrReview) > 0 ? 'amber' : 'slate'}
            to="/hr/requests"
          />
          <StatCard
            label="Overdue requests"
            value={counts.overdueRequests ?? summary.overdueRequests ?? 0}
            tone={Number(counts.overdueRequests ?? summary.overdueRequests) > 0 ? 'red' : 'emerald'}
            to="/hr/requests"
          />
        </div>
        <p className="mt-3 text-xs text-slate-500 tabular-nums">
          {staff.total ?? '—'} total staff · {staff.inactive ?? 0} inactive
        </p>
      </HrCard>

      <div className="grid gap-5 lg:grid-cols-2">
        <HrCard title="Today's priorities">
          <ul className="space-y-3 text-sm text-slate-700">
            <li className="flex justify-between gap-4">
              <span>HR review queue</span>
              <span className="font-bold tabular-nums text-[#134e4a]">{counts.pendingHrReview ?? 0}</span>
            </li>
            <li className="flex justify-between gap-4">
              <span>Branch endorsements</span>
              <span className="font-bold tabular-nums">{counts.pendingBranchEndorse ?? summary.pendingBranchEndorse ?? 0}</span>
            </li>
            <li className="flex justify-between gap-4">
              <span>GM HR final approval</span>
              <span className="font-bold tabular-nums">{counts.pendingGmHrReview ?? summary.pendingGmHrReview ?? 0}</span>
            </li>
            <li className="flex justify-between gap-4">
              <span>Draft payroll runs</span>
              <span className="font-bold tabular-nums">{counts.draftPayrollRuns ?? 0}</span>
            </li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to="/hr/payroll" className={HR_BTN_SECONDARY}>
              Payroll
            </Link>
            <Link to="/hr/recruiting" className={HR_BTN_SECONDARY}>
              Recruiting
            </Link>
            <Link to="/hr/reports" className={HR_BTN_SECONDARY}>
              Reports
            </Link>
          </div>
        </HrCard>

        <HrCard title="HQ payroll note">
          <p className="text-sm leading-relaxed text-slate-600">
            HQ payroll is prepared centrally. Branch salary contributions are tracked for MD review and do not block
            payroll payment.
          </p>
        </HrCard>
      </div>

      {recentRequests.length > 0 ? (
        <HrCard title="Recent requests" subtitle="Latest activity across leave, loans, and HR workflows">
          <AppTableWrap>
            <AppTable>
              <AppTableThead>
                <AppTableTh>Kind</AppTableTh>
                <AppTableTh>Employee</AppTableTh>
                <AppTableTh>Status</AppTableTh>
                <AppTableTh>Updated</AppTableTh>
              </AppTableThead>
              <AppTableBody>
                {recentRequests.map((r) => (
                  <AppTableTr key={r.id}>
                    <AppTableTd>{r.kind}</AppTableTd>
                    <AppTableTd>
                      {r.staffDisplayName ? (
                        <Link
                          to={`/hr/staff/${encodeURIComponent(r.userId)}`}
                          className="font-semibold text-[#134e4a] hover:underline"
                        >
                          {r.staffDisplayName}
                        </Link>
                      ) : (
                        r.userId
                      )}
                    </AppTableTd>
                    <AppTableTd>
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${hrRequestStatusClass(r.status)}`}
                      >
                        {r.status}
                      </span>
                    </AppTableTd>
                    <AppTableTd monospace>{r.updatedAtIso?.slice(0, 10) || '—'}</AppTableTd>
                  </AppTableTr>
                ))}
              </AppTableBody>
            </AppTable>
          </AppTableWrap>
        </HrCard>
      ) : null}
    </HrPageBody>
  );
}
