import React from 'react';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { apiFetch } from '../../lib/apiBase';
import { formatNgn } from '../../lib/hrFormat';
import { formatPeriodYyyymm } from '../../lib/hrPayroll';

export default function ExecutiveHrVariance() {
  const [rows, setRows] = React.useState([]);

  const { loading, error } = useHrListLoad(async () => {
    const { ok, data } = await apiFetch('/api/hr/payroll-runs');
    if (!ok || !data?.ok) {
      setRows([]);
      return { error: data?.error || 'Could not load runs.', hasData: false };
    }
    const runs = (data.runs || []).slice(0, 6);
    const out = [];
    for (const run of runs) {
      const t = await apiFetch(`/api/hr/payroll-runs/${encodeURIComponent(run.id)}/totals`);
      if (t.ok && t.data?.ok && t.data.totals && !t.data.totals.amountsRedacted) {
        out.push({
          id: run.id,
          period: formatPeriodYyyymm(run.periodYyyymm),
          status: run.status,
          gross: t.data.totals.grossNgn,
          net: t.data.totals.netNgn,
          headcount: t.data.totals.headcount,
        });
      }
    }
    setRows(out);
    return { hasData: true };
  }, []);

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">Payroll run totals comparison (recent periods). Unlock sensitive HR if amounts are hidden.</p>
      {error ? <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}
      <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100 bg-white text-sm">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-wrap justify-between gap-2 px-4 py-3">
            <span className="font-semibold">
              {r.period} <span className="text-slate-500 capitalize">({r.status})</span>
            </span>
            <span className="tabular-nums">
              {r.headcount} staff · Gross {formatNgn(r.gross)} · Net {formatNgn(r.net)}
            </span>
          </li>
        ))}
      </ul>
      {!rows.length && !loading ? <p className="text-sm text-slate-500">No comparable run totals available.</p> : null}
      {loading ? <p className="text-sm text-slate-500">Loading…</p> : null}
    </div>
  );
}
