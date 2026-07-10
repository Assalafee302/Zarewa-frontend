import React from 'react';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { apiFetch } from '../../lib/apiBase';
import { HrExecutiveStructureHub } from '../../components/hr/HrExecutiveStructureHub';
import { formatNgn } from '../../lib/hrFormat';

export default function ExecutiveHrSalaryStructure() {
  const [insights, setInsights] = React.useState(null);

  const { loading, error } = useHrListLoad(async () => {
    const { ok, data } = await apiFetch('/api/hr/compensation-insights');
    if (!ok || !data?.ok) {
      setInsights(null);
      return { error: data?.error || 'Could not load insights.', hasData: false };
    }
    setInsights(data.insights);
    return { hasData: true };
  }, []);

  return (
    <div className="space-y-6">
      {insights ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-100 bg-white px-4 py-3">
            <p className="text-ui-xs font-black uppercase text-slate-400">Median base</p>
            <p className="text-xl font-black">{formatNgn(insights.medianBaseSalaryNgn)}</p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-white px-4 py-3">
            <p className="text-ui-xs font-black uppercase text-slate-400">P90</p>
            <p className="text-xl font-black">{formatNgn(insights.p90BaseSalaryNgn)}</p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-white px-4 py-3">
            <p className="text-ui-xs font-black uppercase text-slate-400">Staff in scope</p>
            <p className="text-xl font-black">{insights.headcount ?? '—'}</p>
          </div>
        </div>
      ) : null}
      {error ? <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}
      {loading && !insights ? <p className="text-sm text-slate-500">Loading compensation insights…</p> : null}
      <HrExecutiveStructureHub defaultSection="matrix" embedded />
    </div>
  );
}
