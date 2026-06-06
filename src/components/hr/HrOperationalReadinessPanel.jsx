import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchHrOperationalReadiness } from '../../lib/hrReportsCatalog';
import { HR_EMPLOYEES } from '../../lib/hrRoutes';
import { HrCard, HrEmptyState } from './hrPageUi';

export function HrOperationalReadinessPanel() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    setError('');
    fetchHrOperationalReadiness().then(({ ok, data: d }) => {
      setLoading(false);
      if (!ok || !d?.ok) {
        setData(null);
        setError(d?.error || 'Could not load readiness checks.');
        return;
      }
      setData(d);
    });
  };

  useEffect(() => { load(); }, []);

  if (loading && !data) return <p className="text-sm text-slate-600">Checking HR data quality…</p>;
  if (error) {
    return (
      <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">
        {error}
        <button type="button" className="ml-2 underline" onClick={load}>Retry</button>
      </div>
    );
  }
  if (!data) return null;

  const issues = (data.checks || []).filter((c) => c.count > 0);

  return (
    <HrCard
      title="Operational readiness"
      subtitle={data.readyForOperations ? 'All checks passed' : `${data.totalIssues} data quality item(s) need attention`}
    >
      {issues.length === 0 ? (
        <HrEmptyState title="HR data looks ready" description="No blocking data quality issues detected." />
      ) : (
        <ul className="space-y-3">
          {issues.map((c) => (
            <li key={c.id} className="rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className={`text-xs font-bold uppercase ${
                  c.severity === 'high' ? 'text-red-800' : c.severity === 'low' ? 'text-slate-600' : 'text-amber-900'
                }`}>
                  {c.label}
                </span>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                    c.severity === 'high' ? 'bg-red-100 text-red-900' : c.severity === 'low' ? 'bg-slate-100 text-slate-600' : 'bg-amber-100 text-amber-900'
                  }`}>{c.severity || 'medium'}</span>
                  <span className="rounded-full bg-white border border-slate-200 px-2 py-0.5 text-[10px] font-black tabular-nums">
                    {c.count}
                  </span>
                </div>
              </div>
              {c.fixPath ? (
                <Link to={c.fixPath} className="mt-2 inline-block text-[10px] font-bold uppercase text-[#134e4a] hover:underline">
                  Fix in module →
                </Link>
              ) : null}
              {c.items?.length ? (
                <ul className="mt-2 space-y-1 text-xs text-slate-600">
                  {c.items.slice(0, 5).map((item, i) => (
                    <li key={i}>
                      {item.userId ? (
                        <Link to={`${HR_EMPLOYEES}/${encodeURIComponent(item.userId)}`} className="text-[#134e4a] hover:underline">
                          {item.displayName || item.userId}
                        </Link>
                      ) : (
                        item.displayName || item.periodYyyymm || JSON.stringify(item)
                      )}
                    </li>
                  ))}
                  {c.count > 5 ? <li className="text-slate-400">+{c.count - 5} more</li> : null}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </HrCard>
  );
}

export default HrOperationalReadinessPanel;
