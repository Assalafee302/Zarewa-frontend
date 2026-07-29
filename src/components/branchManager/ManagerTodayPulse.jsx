import React, { useMemo } from 'react';
import { formatNgn } from '../../lib/formatNgn';

/**
 * Today pulse — period KPIs (sales, collections, open actions, health, metres).
 * Synthetic sparklines removed; live ops posture lives on ManagerOpsStrip above.
 */
export function ManagerTodayPulse({
  salesProduced = 0,
  cashCleared = 0,
  metresProduced = 0,
  metresCuttingLists = 0,
  openActions = 0,
  healthScore = null,
  salesTarget = 0,
  metresTarget = 0,
  periodLabel = 'This period',
  loading = false,
}) {
  const salesPct = salesTarget > 0 ? Math.round((salesProduced / salesTarget) * 100) : null;
  const metresPct = metresTarget > 0 ? Math.round((metresProduced / metresTarget) * 100) : null;
  const health = healthScore?.score ?? null;
  const healthTone = healthScore?.tone || 'emerald';

  const sideTiles = useMemo(
    () => [
      {
        key: 'sales',
        label: 'Sales produced',
        value: formatNgn(salesProduced),
        meta: salesPct != null ? `${salesPct}% of target` : periodLabel,
        tone: 'teal',
      },
      {
        key: 'cash',
        label: 'Collected on quotes',
        value: formatNgn(cashCleared),
        meta: periodLabel,
        tone: 'teal',
      },
      {
        key: 'open',
        label: 'Open actions',
        value: String(openActions),
        meta: openActions > 0 ? 'Needs your decision' : 'Queue clear',
        tone: openActions > 0 ? 'amber' : 'emerald',
      },
      {
        key: 'health',
        label: 'Branch health',
        value: health != null ? String(health) : '—',
        meta: healthScore?.status || 'Working indicator (not SOP policy)',
        tone: healthTone,
      },
    ],
    [
      cashCleared,
      health,
      healthScore?.status,
      healthTone,
      openActions,
      periodLabel,
      salesPct,
      salesProduced,
    ]
  );

  return (
    <section className="mb-5 space-y-3" aria-label="Today pulse">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {sideTiles.map((t) => (
          <div
            key={t.key}
            className="rounded-zarewa border border-slate-200/75 bg-white p-4 shadow-[var(--shadow-sequence)]"
          >
            <p className="text-ui-xs font-bold uppercase tracking-[0.12em] text-slate-500">{t.label}</p>
            <p
              className={`mt-1.5 text-lg font-black tabular-nums tracking-tight ${
                t.tone === 'amber'
                  ? 'text-amber-800'
                  : t.tone === 'rose'
                    ? 'text-rose-800'
                    : t.tone === 'emerald'
                      ? 'text-emerald-800'
                      : 'text-zarewa-teal'
              }`}
            >
              {loading ? '…' : t.value}
            </p>
            <p className="mt-0.5 text-ui-xs text-slate-500">{t.meta}</p>
          </div>
        ))}
      </div>

      <div className="rounded-zarewa border border-slate-200/75 bg-white p-4 sm:p-5 shadow-[var(--shadow-sequence)]">
        <div className="min-w-0">
          <p className="text-ui-xs font-bold uppercase tracking-[0.12em] text-slate-500">
            Metres · {periodLabel}
          </p>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-ui-xs font-bold uppercase tracking-wide text-slate-500">
                Metres produced (completed jobs)
              </p>
              <p className="mt-1 text-2xl font-black tabular-nums tracking-tight text-zarewa-teal">
                {loading ? '…' : `${Number(metresProduced || 0).toLocaleString()} m`}
              </p>
              {metresPct != null ? (
                <p className="mt-1 text-ui-xs font-semibold text-slate-500 tabular-nums">
                  {metresPct}% of target
                </p>
              ) : null}
            </div>
            <div>
              <p className="text-ui-xs font-bold uppercase tracking-wide text-slate-500">
                Cutting lists (dated in period)
              </p>
              <p className="mt-1 text-2xl font-black tabular-nums tracking-tight text-zarewa-teal">
                {loading ? '…' : `${Number(metresCuttingLists || 0).toLocaleString()} m`}
              </p>
              <p className="mt-1 text-ui-xs font-semibold text-slate-500">
                Metres on cutting lists in this period
              </p>
            </div>
          </div>
        </div>
        {metresTarget > 0 ? (
          <div className="mt-4">
            <div className="flex justify-between text-ui-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5">
              <span>Production metres vs target</span>
              <span className="tabular-nums">{metresPct ?? 0}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${Math.min(100, metresPct ?? 0)}%` }}
              />
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
