import { useCallback, useEffect, useState } from 'react';
import { fetchDisciplineCaseDashboard } from '../../lib/hrDisciplineCases';
import { fetchHrIncidentMemos } from '../../lib/hrExtended';
import { fetchIncidents } from '../../lib/hrIncidents';

export default function HrAccountabilityOverview({ canManage, onViewMemos, onViewRegistry, onViewCases }) {
  const [stats, setStats] = useState({ openCases: 0, openMemos: 0, openRegistry: 0 });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    const [dash, memos, registry] = await Promise.all([
      fetchDisciplineCaseDashboard(),
      canManage ? fetchHrIncidentMemos() : Promise.resolve({ ok: true, data: { ok: true, memos: [] } }),
      fetchIncidents({ openOnly: '1' }),
    ]);
    setBusy(false);
    setStats({
      openCases: dash.ok && dash.data?.ok ? Number(dash.data.dashboard?.openCount) || 0 : 0,
      openMemos:
        memos.ok && memos.data?.ok
          ? (memos.data.memos || []).filter((m) => m.status === 'open').length
          : 0,
      openRegistry: registry.ok && registry.data?.ok ? (registry.data.incidents || []).length : 0,
    });
  }, [canManage]);

  useEffect(() => {
    load();
  }, [load]);

  const tiles = [
    {
      label: 'Open cases',
      value: stats.openCases,
      action: onViewCases,
      tone: 'border-teal-200 bg-teal-50/50 text-teal-950',
    },
    {
      label: 'Open registry',
      value: stats.openRegistry,
      action: onViewRegistry,
      tone: 'border-slate-200 bg-slate-50 text-slate-800',
    },
  ];

  if (canManage) {
    tiles.splice(1, 0, {
      label: 'Memos awaiting escalation',
      value: stats.openMemos,
      action: onViewMemos,
      tone: 'border-amber-200 bg-amber-50 text-amber-950',
    });
  }

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {tiles.map((t) => (
        <button
          key={t.label}
          type="button"
          onClick={t.action}
          disabled={busy}
          className={`rounded-xl border px-4 py-3 text-left transition hover:shadow-sm ${t.tone}`}
        >
          <div className="text-2xl font-bold tabular-nums">{busy ? '…' : t.value}</div>
          <div className="text-xs font-semibold uppercase tracking-wide mt-1 opacity-80">{t.label}</div>
        </button>
      ))}
    </div>
  );
}
