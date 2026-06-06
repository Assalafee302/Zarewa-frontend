import React from 'react';
import { Link } from 'react-router-dom';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { apiFetch } from '../../lib/apiBase';
import { formatNgn } from '../../lib/hrFormat';
import { formatPeriodYyyymm } from '../../lib/hrPayroll';
import { HrCard } from '../../components/hr/hrPageUi';

const ALERT_LABELS = {
  new_staff: 'New staff',
  missing_staff: 'Missing from run',
  increase: 'Gross increase',
  decrease: 'Gross decrease',
};

export default function ExecutiveHrVariance() {
  const [runs, setRuns] = React.useState([]);
  const [alertsByRun, setAlertsByRun] = React.useState({});

  const { loading, error } = useHrListLoad(async () => {
    const { ok, data } = await apiFetch('/api/hr/payroll-runs');
    if (!ok || !data?.ok) {
      setRuns([]);
      return { error: data?.error || 'Could not load payroll runs.', hasData: false };
    }
    const recent = (data.runs || []).slice(0, 6);
    setRuns(recent);

    const alertMap = {};
    await Promise.all(
      recent.map(async (run) => {
        const [varRes, totRes] = await Promise.all([
          apiFetch(`/api/hr/payroll-runs/${encodeURIComponent(run.id)}/variance-alerts?threshold=15`),
          apiFetch(`/api/hr/payroll-runs/${encodeURIComponent(run.id)}/totals`),
        ]);
        alertMap[run.id] = {
          alerts: varRes.ok && varRes.data?.ok ? varRes.data.alerts || [] : [],
          totals: totRes.ok && totRes.data?.ok ? totRes.data.totals : null,
          note: varRes.data?.note,
        };
      })
    );
    setAlertsByRun(alertMap);
    return { hasData: true };
  }, []);

  const totalAlerts = Object.values(alertsByRun).reduce((n, r) => n + (r.alerts?.length || 0), 0);

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Payroll variance monitoring across recent periods. Alerts flag staff with &gt;15% gross change vs the prior run, new joiners, or missing staff.
      </p>
      {error ? <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}
      {loading ? <p className="text-sm text-slate-500">Loading variance data…</p> : null}

      {!loading && !error ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Runs reviewed" value={runs.length} />
            <Stat label="Total alerts" value={totalAlerts} tone={totalAlerts ? 'amber' : 'ok'} />
            <Stat
              label="Action"
              value={
                <Link to="/hr/payroll" className="text-[#134e4a] font-bold hover:underline">
                  Open payroll →
                </Link>
              }
            />
          </div>

          {runs.map((run) => {
            const block = alertsByRun[run.id] || {};
            const alerts = block.alerts || [];
            const totals = block.totals;
            return (
              <HrCard
                key={run.id}
                title={formatPeriodYyyymm(run.periodYyyymm)}
                subtitle={`Status: ${run.status}${totals && !totals.amountsRedacted ? ` · ${totals.headcount} staff · Net ${formatNgn(totals.netNgn)}` : ''}`}
              >
                {block.note ? <p className="mb-2 text-xs text-slate-500">{block.note}</p> : null}
                {!alerts.length ? (
                  <p className="text-sm font-semibold text-emerald-700">No significant variances detected.</p>
                ) : (
                  <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100 bg-white text-sm">
                    {alerts.slice(0, 12).map((a, i) => (
                      <li key={i} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                        <span>
                          <span className="font-semibold text-slate-800">{a.displayName || a.userId}</span>
                          <span className="ml-2 inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold uppercase">
                            {ALERT_LABELS[a.type || a.alertType] || a.type || a.alertType}
                          </span>
                          {a.note ? <span className="ml-2 text-xs text-slate-500">{a.note}</span> : null}
                        </span>
                        {a.changePct != null ? (
                          <span className={`tabular-nums text-xs font-bold ${Math.abs(a.changePct) >= 20 ? 'text-red-700' : 'text-amber-700'}`}>
                            {a.changePct > 0 ? '+' : ''}{a.changePct}%
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
                {alerts.length > 12 ? <p className="mt-2 text-xs text-slate-500">+{alerts.length - 12} more — open payroll run for full list.</p> : null}
              </HrCard>
            );
          })}

          {!runs.length ? <p className="text-sm text-slate-500">No payroll runs available for comparison.</p> : null}
        </>
      ) : null}
    </div>
  );
}

function Stat({ label, value, tone }) {
  const cls = tone === 'amber' ? 'text-amber-800' : tone === 'ok' ? 'text-emerald-700' : 'text-[#134e4a]';
  return (
    <div className="rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className={`mt-1 text-lg font-black ${cls}`}>{value}</p>
    </div>
  );
}
