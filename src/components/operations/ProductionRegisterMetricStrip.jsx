import React from 'react';
import { PROD_REG } from '../../lib/productionRegisterUi';

/**
 * Shop-floor KPI strip — readable labels (min 10px) for the production register modal.
 */
export function ProductionRegisterMetricStrip({
  reservedKg,
  usedKg,
  plannedM,
  outputM,
  outputPostedM,
  alertState,
  plannedBreakdown,
  formatKg,
  formatMeters,
  compact = false,
}) {
  const postedM = Number(outputPostedM ?? 0);
  const liveM = Number(outputM ?? 0);
  const metresMatch =
    Number.isFinite(postedM) && Number.isFinite(liveM) && Math.abs(postedM - liveM) < 1e-4;

  const cells = [
    {
      key: 'rsvd',
      label: 'Reserved',
      value: formatKg(reservedKg),
      unit: 'kg',
      title: 'Coil kg reserved for this job',
      accent: true,
    },
    {
      key: 'used',
      label: 'Used',
      value: formatKg(usedKg),
      unit: 'kg',
      title: 'Production consumed (opening − closing). Incident scrap is separate.',
      accent: false,
    },
    {
      key: 'plan',
      label: 'Plan',
      value: formatMeters(plannedM),
      unit: 'm',
      title: 'Planned job metres from quotation',
      accent: true,
      sub: plannedBreakdown,
    },
    {
      key: 'output',
      label: 'Output',
      value: metresMatch ? formatMeters(liveM) : `${formatMeters(liveM)} / ${formatMeters(postedM)}`,
      unit: metresMatch ? 'm' : '',
      title: metresMatch
        ? 'Run log matches posted actual'
        : `Run log ${formatMeters(liveM)} · posted ${formatMeters(postedM)}`,
      accent: true,
    },
    {
      key: 'alert',
      label: 'Alert',
      value: alertState || 'Pending',
      unit: '',
      title: 'Conversion alert state after completion',
      accent: false,
      text: true,
    },
  ];

  return (
    <div
      className={compact ? PROD_REG.metricGridCompact : PROD_REG.metricGrid}
      aria-label="Run weights, output, and plan summary"
    >
      {cells.map((cell) => (
        <div
          key={cell.key}
          className={compact ? PROD_REG.metricCellCompact : PROD_REG.metricCell}
          title={cell.title}
        >
          <p className={PROD_REG.metricLabel}>{cell.label}</p>
          <p className={cell.accent ? PROD_REG.metricValue : PROD_REG.metricValueNeutral}>
            {cell.text ? (
              <span className="truncate text-sm font-bold normal-case tracking-normal text-[var(--z-text)]">
                {cell.value}
              </span>
            ) : (
              <>
                {cell.value}
                {cell.unit ? <span className={PROD_REG.metricUnit}>{cell.unit}</span> : null}
              </>
            )}
          </p>
          {cell.sub ? (
            <p className="mt-0.5 truncate text-[10px] font-semibold tabular-nums text-[var(--z-text-muted)]">
              {cell.sub}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
