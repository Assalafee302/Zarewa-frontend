import React, { useMemo } from 'react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import { formatNgn } from '../../lib/formatNgn';

function Spark({ data, stroke = '#134e4a' }) {
  if (!data?.length) {
    return <div className="h-10 w-full rounded bg-slate-50" aria-hidden />;
  }
  return (
    <div className="h-10 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <Area type="monotone" dataKey="v" stroke={stroke} fill={stroke} fillOpacity={0.12} strokeWidth={1.5} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function syntheticSpark(seed = 1, points = 7) {
  const out = [];
  let v = 40 + (seed % 20);
  for (let i = 0; i < points; i += 1) {
    v = Math.max(8, Math.min(100, v + ((i * seed) % 7) - 3));
    out.push({ i, v });
  }
  return out;
}

/**
 * Today pulse row — five flat Sequence KPI tiles with sparklines.
 */
export function ManagerTodayPulse({
  salesProduced = 0,
  cashCleared = 0,
  metres = 0,
  openActions = 0,
  healthScore = null,
  salesTarget = 0,
  metresTarget = 0,
  loading = false,
}) {
  const tiles = useMemo(() => {
    const salesPct = salesTarget > 0 ? Math.round((salesProduced / salesTarget) * 100) : null;
    const metresPct = metresTarget > 0 ? Math.round((metres / metresTarget) * 100) : null;
    const health = healthScore?.score ?? null;
    const healthTone = healthScore?.tone || 'emerald';

    return [
      {
        key: 'sales',
        label: 'Sales produced',
        value: formatNgn(salesProduced),
        meta: salesPct != null ? `${salesPct}% of target` : 'MTD',
        spark: syntheticSpark(3),
        tone: 'teal',
      },
      {
        key: 'cash',
        label: 'Collected on quotes',
        value: formatNgn(cashCleared),
        meta: 'Liquidity snapshot',
        spark: syntheticSpark(5),
        tone: 'teal',
      },
      {
        key: 'metres',
        label: 'Production metres',
        value: `${Number(metres || 0).toLocaleString()} m`,
        meta: metresPct != null ? `${metresPct}% of target` : 'MTD',
        spark: syntheticSpark(7),
        tone: 'teal',
      },
      {
        key: 'open',
        label: 'Open actions',
        value: String(openActions),
        meta: openActions > 0 ? 'Needs your decision' : 'Queue clear',
        spark: syntheticSpark(2),
        tone: openActions > 0 ? 'amber' : 'emerald',
      },
      {
        key: 'health',
        label: 'Branch health',
        value: health != null ? String(health) : '—',
        meta: healthScore?.status || 'Indicator',
        spark: syntheticSpark(11),
        tone: healthTone,
      },
    ];
  }, [cashCleared, healthScore, metres, metresTarget, openActions, salesProduced, salesTarget]);

  return (
    <section className="mb-5" aria-label="Today pulse">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {tiles.map((t) => (
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
            <div className="mt-2">
              <Spark data={t.spark} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
