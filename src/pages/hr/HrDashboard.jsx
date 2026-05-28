import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../lib/apiBase';
import { useWorkspace } from '../../context/WorkspaceContext';
import { hrRequestStatusClass } from '../../lib/hrFormat';
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
  const cls = `rounded-2xl border px-4 py-4 shadow-sm block ${tones[tone] || tones.slate} ${to ? 'hover:border-[#134e4a]/30 transition-colors' : ''}`;
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [obs, setObs] = useState(null);
  const [inbox, setInbox] = useState(null);
  const [staffCounts, setStaffCounts] = useState(null);
  const [recentRequests, setRecentRequests] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      const { ok, data } = await apiFetch('/api/hr/dashboard');
      if (cancelled) return;
      if (!ok || !data?.ok) {
        setError(data?.error || 'Could not load HR dashboard.');
        setObs(null);
        setInbox(null);
        setStaffCounts(null);
        setRecentRequests([]);
      } else {
        setObs(data.observability);
        setInbox(data.inbox);
        setStaffCounts(data.staffCounts);
        setRecentRequests(data.recentRequests || []);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [ws?.refreshEpoch]);

  if (loading) {
    return <p className="text-sm text-slate-600">Loading HR dashboard…</p>;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
    );
  }

  const summary = obs?.summary || {};
  const counts = inbox?.counts || {};
  const staff = staffCounts || {};

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-500">Overview</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
        <p className="mt-2 text-xs text-slate-500 tabular-nums">
          {staff.total ?? '—'} total staff · {staff.inactive ?? 0} inactive
        </p>
      </section>

      <section>
        <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-500">Today&apos;s HR actions</h2>
        <div className="mt-3 rounded-2xl border border-slate-100 bg-white p-4 text-sm text-slate-700 shadow-sm">
          <ul className="space-y-2">
            <li>
              <span className="font-semibold text-[#134e4a]">HR queue:</span>{' '}
              {counts.pendingHrReview ?? 0} awaiting HR review
            </li>
            <li>
              <span className="font-semibold text-[#134e4a]">Branch endorsements:</span>{' '}
              {counts.pendingBranchEndorse ?? summary.pendingBranchEndorse ?? 0}
            </li>
            <li>
              <span className="font-semibold text-[#134e4a]">GM HR final:</span>{' '}
              {counts.pendingGmHrReview ?? summary.pendingGmHrReview ?? 0}
            </li>
            <li>
              <span className="font-semibold text-[#134e4a]">Draft payroll runs:</span>{' '}
              {counts.draftPayrollRuns ?? 0}
            </li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              to="/hr/staff"
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[#134e4a] hover:bg-slate-50"
            >
              Staff directory
            </Link>
            <Link
              to="/hr/requests"
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[#134e4a] hover:bg-slate-50"
            >
              HR requests
            </Link>
            <Link
              to="/hr/payroll"
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[#134e4a] hover:bg-slate-50"
            >
              Payroll
            </Link>
          </div>
        </div>
      </section>

      {recentRequests.length > 0 ? (
        <section>
          <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-500">Recent requests</h2>
          <div className="mt-3">
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
          </div>
        </section>
      ) : null}

      <p className="text-xs text-slate-500">
        HQ payroll is prepared centrally. Branch salary contributions are tracked for MD review and do not block payroll
        payment.
      </p>
    </div>
  );
}
