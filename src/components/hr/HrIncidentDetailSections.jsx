import { useMemo } from 'react';
import { formatIncidentDetailSections } from '../../lib/hrIncidentDetailView';

export default function HrIncidentDetailSections({ registry, detail }) {
  const rows = useMemo(() => formatIncidentDetailSections(registry, detail), [registry, detail]);
  if (!rows.length) return null;

  return (
    <div>
      <h4 className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-2">Source record</h4>
      <dl className="grid gap-2 sm:grid-cols-2 text-sm rounded-xl border border-slate-100 bg-slate-50 p-3">
        {rows.map((r) => (
          <div key={r.label} className={r.label === 'Description' || r.label === 'Summary' ? 'sm:col-span-2' : ''}>
            <dt className="text-slate-500">{r.label}</dt>
            <dd className="font-medium text-slate-800 whitespace-pre-wrap">{r.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
