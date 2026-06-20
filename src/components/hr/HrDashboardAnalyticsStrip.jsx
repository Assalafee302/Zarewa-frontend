import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchHrAnalyticsDashboard } from '../../lib/hrMasterData';
import { ProfileInlineAlert } from '../profile/profileOverviewUi';

function MiniBar({ label, value, max }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between gap-2 text-[11px]">
        <span className="truncate font-medium text-slate-700">{label}</span>
        <span className="shrink-0 font-bold tabular-nums text-[#134e4a]">{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full rounded-full bg-[#134e4a]/80" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/**
 * Compact workforce analytics for HQ dashboard (subset of HrAnalytics).
 */
export default function HrDashboardAnalyticsStrip() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { ok, data: d } = await fetchHrAnalyticsDashboard();
      setLoading(false);
      if (!ok || !d?.ok) {
        setError(d?.error || 'Could not load workforce analytics.');
        return;
      }
      setData(d.analytics);
    })();
  }, []);

  if (loading) return <p className="text-sm text-slate-500">Loading workforce trends…</p>;
  if (error) return <ProfileInlineAlert variant="warning">{error}</ProfileInlineAlert>;
  if (!data) return null;

  const deptRows = (data.headcount?.byDepartment || []).slice(0, 5);
  const deptMax = Math.max(...deptRows.map((r) => Number(r.count) || 0), 1);
  const leaveRows = (data.leaveUsage?.byDepartment || []).slice(0, 5);
  const leaveMax = Math.max(...leaveRows.map((r) => Number(r.count) || 0), 1);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">Hires (12 mo)</p>
          <p className="mt-1 text-xl font-black tabular-nums text-[#134e4a]">{data.movement?.hires ?? '—'}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">Transfers (12 mo)</p>
          <p className="mt-1 text-xl font-black tabular-nums text-[#134e4a]">{data.movement?.transfers ?? '—'}</p>
        </div>
        <div className="rounded-xl border border-teal-200 bg-teal-50/40 p-3">
          <p className="text-[9px] font-bold uppercase tracking-wide text-teal-700">Training records</p>
          <p className="mt-1 text-xl font-black tabular-nums text-[#134e4a]">{data.compliance?.trainingRecords ?? '—'}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">Active headcount</p>
          <p className="mt-1 text-xl font-black tabular-nums text-[#134e4a]">{data.headcount?.total ?? '—'}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Headcount by department</p>
          {deptRows.length ? deptRows.map((r) => <MiniBar key={r.label} label={r.label} value={Number(r.count) || 0} max={deptMax} />) : (
            <p className="text-sm text-slate-500">No department breakdown.</p>
          )}
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Leave usage by department</p>
          {leaveRows.length ? leaveRows.map((r) => <MiniBar key={r.department} label={r.department} value={Number(r.count) || 0} max={leaveMax} />) : (
            <p className="text-sm text-slate-500">No leave usage data.</p>
          )}
          <Link to="/hr/analytics" className="inline-block text-xs font-bold text-[#134e4a] hover:underline">
            Open full analytics →
          </Link>
        </div>
      </div>
    </div>
  );
}
