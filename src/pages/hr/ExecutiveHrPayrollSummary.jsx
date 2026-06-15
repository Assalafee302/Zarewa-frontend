import React from 'react';
import { Link } from 'react-router-dom';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { apiFetch } from '../../lib/apiBase';
import { formatPeriodYyyymm } from '../../lib/hrPayroll';

export default function ExecutiveHrPayrollSummary() {
  const [runs, setRuns] = React.useState([]);

  const { loading, error } = useHrListLoad(async () => {
    const { ok, data } = await apiFetch('/api/hr/payroll-runs');
    if (!ok || !data?.ok) {
      setRuns([]);
      return { error: data?.error || 'Could not load payroll.', hasData: false };
    }
    setRuns(data.runs || []);
    return { hasData: true };
  }, []);

  const draft = runs.filter((r) => r.status === 'draft');
  const locked = runs.filter((r) => r.status === 'locked');
  const paid = runs.filter((r) => r.status === 'paid');

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Payroll run status across HQ. Use Human Resources → Payroll for full run management.
      </p>
      {error ? <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-amber-100 bg-amber-50/50 px-4 py-3">
          <p className="text-[10px] font-black uppercase text-amber-800">Draft</p>
          <p className="text-2xl font-black">{draft.length}</p>
        </div>
        <div className="rounded-xl border border-blue-100 bg-blue-50/50 px-4 py-3">
          <p className="text-[10px] font-black uppercase text-blue-800">Locked</p>
          <p className="text-2xl font-black">{locked.length}</p>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 px-4 py-3">
          <p className="text-[10px] font-black uppercase text-emerald-800">Paid</p>
          <p className="text-2xl font-black">{paid.length}</p>
        </div>
      </div>
      <ul className="text-sm divide-y divide-slate-100 rounded-xl border border-slate-100 bg-white">
        {runs.slice(0, 8).map((r) => (
          <li key={r.id} className="flex justify-between px-4 py-2">
            <span>{formatPeriodYyyymm(r.periodYyyymm)}</span>
            <span className="capitalize font-semibold">{r.status}</span>
          </li>
        ))}
      </ul>
      <Link to="/hr/payroll" className="text-sm font-bold text-[#134e4a] hover:underline">
        Open payroll module →
      </Link>
      {loading ? <p className="text-sm text-slate-500">Loading…</p> : null}
    </div>
  );
}
