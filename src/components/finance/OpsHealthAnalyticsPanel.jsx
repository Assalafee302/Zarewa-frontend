import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { apiFetch } from '../../lib/apiBase';
import { csatStarString, formatDurationHm } from '../../lib/opsUiChrome';
import { FinanceSequencePanel } from '../layout';

const TONE = {
  green: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  amber: 'border-amber-200 bg-amber-50 text-amber-900',
  red: 'border-rose-200 bg-rose-50 text-rose-900',
};

function DqLine({ label, count }) {
  return <li className="flex justify-between gap-3 border-b border-slate-100 py-1.5 text-xs last:border-0"><span className="text-slate-700">{label}</span><span className="font-black tabular-nums text-zarewa-teal">{count}</span></li>;
}

/** Shared operations-health report for Accounting and branch oversight. */
export function OpsHealthAnalyticsPanel({ branchId = '', deskLayout = false, compact = false }) {
  const [pack, setPack] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const query = useMemo(() => {
    const qs = new URLSearchParams();
    if (branchId && branchId !== 'ALL') qs.set('branchId', branchId);
    return qs.toString();
  }, [branchId]);
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const res = await apiFetch(`/api/analytics/ops-health${query ? `?${query}` : ''}`).catch(() => ({ ok: false }));
    setLoading(false);
    if (!res.ok || res.data?.ok === false) {
      setPack(null);
      setError(res.data?.error || 'Could not load operations health.');
      return;
    }
    setPack(res.data);
  }, [query]);
  useEffect(() => { void load(); }, [load]);

  const summary = pack?.summary || {};
  const dq = pack?.dataQuality || {};
  const csvHref = `/api/analytics/ops-health.csv${query ? `?${query}` : ''}`;
  const body = (
    <>
      <div className="flex flex-wrap gap-2">
        {['green', 'amber', 'red'].map((tone) => (
          <span key={tone} className={`rounded-full border px-2.5 py-1 text-ui-xs font-black uppercase ${TONE[tone]}`}>
            {tone} {summary[tone] ?? 0}
          </span>
        ))}
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-ui-xs font-black tabular-nums text-slate-700">Score {summary.score ?? '—'}</span>
      </div>
      {loading ? <p className="py-6 text-center text-xs text-slate-500">Loading health checks…</p> : null}
      {error ? <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs text-amber-950">{error}</p> : null}
      {!loading && pack ? (
        <div className={compact ? 'mt-3 space-y-3' : 'mt-4 grid gap-4 lg:grid-cols-2'}>
          <section className="rounded-xl border border-slate-200 p-3">
            <p className="text-ui-xs font-bold uppercase tracking-wide text-slate-500">Data quality checks</p>
            <ul className="mt-1">
              <DqLine label="Present without worked minutes" count={dq.presentWithoutWorkedMinutes?.length || 0} />
              <DqLine label="Delivered without CSAT" count={dq.deliveredWithoutCsat?.length || 0} />
              <DqLine label="Cost lines missing vendor" count={dq.costLinesMissingVendor?.length || 0} />
            </ul>
          </section>
          <section className="rounded-xl border border-slate-200 p-3">
            <p className="text-ui-xs font-bold uppercase tracking-wide text-slate-500">Customer satisfaction</p>
            <p className="mt-1 text-lg font-black text-zarewa-teal">{pack.csat?.average == null ? 'No scores yet' : `${pack.csat.average}/5 ${csatStarString(pack.csat.average)}`}</p>
            <p className="mt-1 text-ui-xs text-slate-500">{pack.csat?.scoredCount || 0} scored of {pack.csat?.deliveredCount || 0} delivered · OT {formatDurationHm((pack.attendance?.overtimeHours || 0) * 60)}</p>
          </section>
          {!compact && pack.signals?.length ? <section className="lg:col-span-2"><p className="mb-1 text-ui-xs font-bold uppercase text-slate-500">Signals</p><div className="flex flex-wrap gap-2">{pack.signals.map((signal) => <span key={signal.code} className={`rounded-lg border px-2 py-1 text-ui-xs font-semibold ${TONE[signal.severity] || TONE.amber}`}>{signal.message}</span>)}</div></section> : null}
        </div>
      ) : null}
    </>
  );

  return (
    <FinanceSequencePanel className={`!min-h-0 sm:!min-h-0 bg-white ${deskLayout ? 'p-5' : 'p-4'}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div><h3 className="text-sm font-black tracking-tight text-zarewa-teal">Operations health</h3><p className="mt-0.5 text-xs text-slate-500">Attendance, CSAT, pricing and maintenance data quality</p></div>
        <div className="flex gap-2">
          <a href={csvHref} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-ui-xs font-bold uppercase text-slate-600 hover:border-zarewa-teal"><Download size={13} /> CSV</a>
          <button type="button" onClick={() => void load()} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-ui-xs font-bold uppercase text-slate-600 hover:border-zarewa-teal"><RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh</button>
        </div>
      </div>
      <div className="mt-3">{body}</div>
    </FinanceSequencePanel>
  );
}
