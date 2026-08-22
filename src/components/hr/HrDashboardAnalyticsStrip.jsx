import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchHrAnalyticsDashboard } from '../../lib/hrMasterData';
import { ProfileInlineAlert } from '../profile/profileOverviewUi';

function MiniBar({ label, value, max }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between gap-2 text-xs">
        <span className="truncate font-medium text-slate-700">{label}</span>
        <span className="z-stencil shrink-0 text-slate-800">{value}</span>
      </div>
      <div className="h-1 overflow-hidden rounded-sm bg-slate-100">
        <div className="h-full bg-slate-700" style={{ width: `${pct}%` }} />
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

  const tiles = [
    { label: 'Hires (12 mo)', value: data.movement?.hires ?? '—' },
    { label: 'Transfers (12 mo)', value: data.movement?.transfers ?? '—' },
    { label: 'Training records', value: data.compliance?.trainingRecords ?? '—' },
    { label: 'Active headcount', value: data.headcount?.total ?? '—' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-slate-200 bg-slate-200 sm:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="bg-white p-3">
            <p className="text-ui-xs font-medium text-slate-500">{t.label}</p>
            <p className="z-stencil mt-1 text-xl text-slate-900">{t.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3 rounded-md border border-slate-200 bg-white p-4">
          <p className="text-ui-xs font-medium text-slate-500">Headcount by department</p>
          {deptRows.length ? deptRows.map((r) => <MiniBar key={r.label} label={r.label} value={Number(r.count) || 0} max={deptMax} />) : (
            <p className="text-sm text-slate-500">No department breakdown.</p>
          )}
        </div>
        <div className="space-y-3 rounded-md border border-slate-200 bg-white p-4">
          <p className="text-ui-xs font-medium text-slate-500">Leave usage by department</p>
          {leaveRows.length ? leaveRows.map((r) => <MiniBar key={r.department} label={r.department} value={Number(r.count) || 0} max={leaveMax} />) : (
            <p className="text-sm text-slate-500">No leave usage data.</p>
          )}
          <Link to="/hr/analytics" className="inline-block text-xs font-medium text-slate-700 hover:underline">
            Open full analytics
          </Link>
        </div>
      </div>
    </div>
  );
}
