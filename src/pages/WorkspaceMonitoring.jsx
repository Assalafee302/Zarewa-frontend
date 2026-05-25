import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, Building2, Inbox } from 'lucide-react';
import { PageShell } from '../components/layout';
import { useWorkspace } from '../context/WorkspaceContext';
import { apiFetch } from '../lib/apiBase';

export default function WorkspaceMonitoring() {
  const ws = useWorkspace();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
  }, [ws?.refreshEpoch]);

  return (
    <PageShell>
      <div className="mx-auto max-w-5xl space-y-6 px-1 pb-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">HQ / Manager</p>
            <h1 className="text-xl font-bold text-slate-900">Workspace Monitoring</h1>
            <p className="mt-1 text-sm text-slate-600">Branch workload, memo volume, and operational bottlenecks.</p>
          </div>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-teal-900 hover:bg-teal-50"
          >
            <Inbox size={14} />
            Back to Workspace
          </Link>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Loading monitoring data…</p>
        ) : !data ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Monitoring data is not available for your role or branch scope.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ['Branches', data.totals?.branches ?? 0],
                ['Action required', data.totals?.actionRequired ?? 0],
                ['Overdue', data.totals?.overdue ?? 0],
                ['Unfiled', data.totals?.unfiled ?? 0],
              ].map(([label, val]) => (
                <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-[10px] font-semibold uppercase text-slate-500">{label}</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">{val}</p>
                </div>
              ))}
            </div>

            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
                <Building2 size={16} />
                Branch workload
              </h2>
              <ul className="divide-y divide-slate-100">
                {(data.branchWorkload || []).map((row) => (
                  <li key={row.branchId} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                    <span className="font-medium text-slate-800">{row.branchId}</span>
                    <span className="text-xs text-slate-600">
                      {row.actionRequired} action · {row.overdue} overdue · {row.memos} memos
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
                <BarChart3 size={16} />
                Memo volume by branch
              </h2>
              <ul className="flex flex-wrap gap-2">
                {(data.memoVolumeByBranch || []).map((row) => (
                  <li
                    key={row.branchId}
                    className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-900 ring-1 ring-teal-100"
                  >
                    {row.branchId}: {row.count}
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </div>
    </PageShell>
  );
}
