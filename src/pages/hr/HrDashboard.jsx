import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/apiBase';
import { useWorkspace } from '../../context/WorkspaceContext';

function StatCard({ label, value, tone = 'slate' }) {
  const tones = {
    slate: 'border-slate-100 bg-white text-slate-900',
    amber: 'border-amber-100 bg-amber-50/50 text-amber-950',
    emerald: 'border-emerald-100 bg-emerald-50/40 text-emerald-950',
    red: 'border-red-100 bg-red-50/40 text-red-950',
  };
  return (
    <div className={`rounded-2xl border px-4 py-4 shadow-sm ${tones[tone] || tones.slate}`}>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black tabular-nums">{value}</p>
    </div>
  );
}

export default function HrDashboard() {
  const ws = useWorkspace();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [obs, setObs] = useState(null);
  const [inbox, setInbox] = useState(null);

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
      } else {
        setObs(data.observability);
        setInbox(data.inbox);
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
  const staff = obs?.staffCounts || {};

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-500">Overview</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Active staff" value={staff.active ?? summary.activeStaff ?? '—'} />
          <StatCard
            label="Pending HR review"
            value={summary.pendingHrReview ?? 0}
            tone={Number(summary.pendingHrReview) > 0 ? 'amber' : 'slate'}
          />
          <StatCard
            label="Pending endorsements"
            value={summary.pendingManagerReview ?? 0}
            tone={Number(summary.pendingManagerReview) > 0 ? 'amber' : 'slate'}
          />
          <StatCard
            label="Overdue requests"
            value={summary.overdueRequests ?? 0}
            tone={Number(summary.overdueRequests) > 0 ? 'red' : 'emerald'}
          />
        </div>
      </section>

      {inbox ? (
        <section>
          <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-500">Today&apos;s HR actions</h2>
          <div className="mt-3 rounded-2xl border border-slate-100 bg-white p-4 text-sm text-slate-700 shadow-sm">
            <ul className="space-y-2">
              <li>
                <span className="font-semibold text-[#134e4a]">HR queue:</span>{' '}
                {inbox.pendingHrReview ?? 0} awaiting HR review
              </li>
              <li>
                <span className="font-semibold text-[#134e4a]">Branch endorsements:</span>{' '}
                {inbox.pendingBranchEndorse ?? inbox.pendingManagerReview ?? 0}
              </li>
              <li>
                <span className="font-semibold text-[#134e4a]">GM HR final:</span>{' '}
                {inbox.pendingGmHr ?? 0}
              </li>
            </ul>
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
