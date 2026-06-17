import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { BarChart3, Building2, Clock, Fuel, Inbox, Wrench } from 'lucide-react';
import { PageShell } from '../components/layout';
import { useWorkspace } from '../context/WorkspaceContext';
import { apiFetch } from '../lib/apiBase';
import { WS_SECTION_LABEL } from '../lib/workspaceUiTokens';
import { userMayViewWorkspaceMonitoring } from '../lib/workspaceMonitoringAccess';

function SummaryCard({ label, value, tone = 'slate' }) {
  const tones = {
    teal: 'border-teal-100 bg-teal-50/50',
    amber: 'border-amber-100 bg-amber-50/50',
    rose: 'border-rose-100 bg-rose-50/50',
    slate: 'border-slate-200 bg-white',
  };
  return (
    <div className={`rounded-xl border p-4 shadow-sm ${tones[tone] || tones.slate}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{value}</p>
    </div>
  );
}

function PlaceholderCard({ title, description, icon }) {
  return (
    <section className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-4">
      <h2 className={`mb-2 flex items-center gap-2 ${WS_SECTION_LABEL}`}>
        {icon}
        {title}
      </h2>
      <p className="text-xs leading-relaxed text-slate-600">{description}</p>
    </section>
  );
}

export default function WorkspaceMonitoring() {
  const ws = useWorkspace();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const mayView = userMayViewWorkspaceMonitoring(ws?.session?.user?.roleKey, ws?.permissions);

  useEffect(() => {
    if (!mayView) return undefined;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { ok, data: payload } = await apiFetch('/api/workspace/monitoring');
      if (cancelled) return;
      setLoading(false);
      if (ok && payload?.ok) setData(payload);
      else setData(null);
    })();
    return () => {
      cancelled = true;
    };
  }, [mayView, ws?.refreshEpoch]);

  if (!mayView) {
    return <Navigate to="/access-denied" replace state={{ moduleKey: 'workspace_monitoring' }} />;
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-6xl space-y-6 px-1 pb-10">
        <header className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-200/90 bg-white px-4 py-4 shadow-sm sm:px-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">HQ / Manager</p>
            <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Workspace Monitoring</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Branch workload, pending approvals, overdue items, and operational bottlenecks.
            </p>
          </div>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-teal-900 hover:bg-teal-50"
          >
            <Inbox size={14} aria-hidden />
            Back to Workspace
          </Link>
        </header>

        {loading ? (
          <p className="text-sm text-slate-500" role="status">
            Loading monitoring data…
          </p>
        ) : !data ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
            Monitoring data is not available for your role or branch scope.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              <SummaryCard label="Branches" value={data.totals?.branches ?? 0} />
              <SummaryCard label="Action required" value={data.totals?.actionRequired ?? 0} tone="teal" />
              <SummaryCard label="Overdue" value={data.totals?.overdue ?? 0} tone={data.totals?.overdue > 0 ? 'rose' : 'slate'} />
              <SummaryCard label="Unfiled" value={data.totals?.unfiled ?? 0} tone="amber" />
              <SummaryCard label="Pending approvals" value={data.totals?.pendingApprovals ?? 0} tone="amber" />
              <SummaryCard label="Open memos" value={data.totals?.memos ?? 0} />
            </div>

            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <h2 className={`mb-3 flex items-center gap-2 ${WS_SECTION_LABEL}`}>
                <Building2 size={14} aria-hidden />
                Branch workload
              </h2>
              {(data.branchWorkload || []).length === 0 ? (
                <p className="text-xs text-slate-500">Branch comparison will appear when workload data is available.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        <th className="py-2 pr-4">Branch</th>
                        <th className="py-2 pr-4">Action</th>
                        <th className="py-2 pr-4">Overdue</th>
                        <th className="py-2">Memos</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(data.branchWorkload || []).map((row) => (
                        <tr key={row.branchId}>
                          <td className="py-2.5 pr-4 font-medium text-slate-800">{row.branchId}</td>
                          <td className="py-2.5 pr-4 tabular-nums text-slate-700">{row.actionRequired}</td>
                          <td className="py-2.5 pr-4 tabular-nums text-slate-700">{row.overdue}</td>
                          <td className="py-2.5 tabular-nums text-slate-700">{row.memos}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <h2 className={`mb-3 flex items-center gap-2 ${WS_SECTION_LABEL}`}>
                <BarChart3 size={14} aria-hidden />
                Memo volume by branch
              </h2>
              {(data.memoVolumeByBranch || []).length === 0 ? (
                <p className="text-xs text-slate-500">Memo volume breakdown will appear when data is available.</p>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {(data.memoVolumeByBranch || []).map((row) => (
                    <li
                      key={row.branchId}
                      className="rounded-lg bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 ring-1 ring-slate-200"
                    >
                      {row.branchId}: {row.count}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <PlaceholderCard
                title="Finance pending"
                description="Payment requests and refund queues awaiting branch or HQ action will appear here."
                icon={<Clock size={14} className="text-slate-500" />}
              />
              <PlaceholderCard
                title="Production attention"
                description="Open production jobs and material requests needing follow-up will appear here."
                icon={<Wrench size={14} className="text-slate-500" />}
              />
              <PlaceholderCard
                title="Procurement delays"
                description="Purchase orders and supplier follow-ups with overdue milestones will appear here."
                icon={<BarChart3 size={14} className="text-slate-500" />}
              />
              <PlaceholderCard
                title="Maintenance & fuel"
                description="Open maintenance requests and diesel/fuel memos requiring attention will appear here."
                icon={<Fuel size={14} className="text-slate-500" />}
              />
            </div>
          </>
        )}
      </div>
    </PageShell>
  );
}
