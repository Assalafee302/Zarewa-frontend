import React from 'react';
import { ProductionRegisterDateFields } from './ProductionRegisterDateFields';

function numKg(value) {
  const n = Number(value);
  return Number.isFinite(n) ? `${Math.round(n)}` : '—';
}

function numM(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : '—';
}

function Dot() {
  return <span className="mx-1 text-[var(--z-border)]" aria-hidden>·</span>;
}

/**
 * Modal register summary — refs + KPIs on two tight lines; vs-plan as a thin bar (no card stack).
 */
export function ProductionRegisterCompactHeader({
  jobSt,
  startDateISO,
  productionDateIso,
  completionDateIso,
  onProductionDateChange,
  onCompletionDateChange,
  readOnly,
  reservedKg,
  usedKg,
  plannedM,
  outputM,
  outputPostedM,
  alertState,
  plannedRoofM,
  plannedCladdingM,
  plannedFlatsheetM,
  hasPlannedMeters,
  plannedMetersValue,
  recordedMeters,
  planProgressPct,
  quotationMaterialSpec,
  quotationRef,
  machineName,
  productName,
  formatMeters,
}) {
  const postedM = Number(outputPostedM ?? 0);
  const liveM = Number(outputM ?? 0);
  const metresMatch =
    Number.isFinite(postedM) && Number.isFinite(liveM) && Math.abs(postedM - liveM) < 1e-4;

  const showDates =
    !readOnly && jobSt !== 'Completed' && jobSt !== 'Cancelled';

  const hasRcf =
    Number(plannedRoofM) > 0 || Number(plannedCladdingM) > 0 || Number(plannedFlatsheetM) > 0;
  const rcfTitle = hasRcf
    ? `Roof ${numM(plannedRoofM)} · Cladding ${numM(plannedCladdingM)} · Flatsheet ${numM(plannedFlatsheetM)}`
    : undefined;

  const specParts = [
    quotationMaterialSpec?.gauge,
    quotationMaterialSpec?.colour,
    quotationMaterialSpec?.materialType,
    quotationMaterialSpec?.design,
  ].filter(Boolean);

  const showPlanBar =
    hasPlannedMeters && (jobSt === 'Running' || jobSt === 'Planned');

  return (
    <div className="space-y-1 text-ui-xs leading-snug">
      {/* Line 1 — dates · quote · machine · product · spec (single wrap row) */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[var(--z-text-muted)]">
        {showDates ? (
          <ProductionRegisterDateFields
            inline
            jobSt={jobSt}
            startDateISO={startDateISO}
            productionDateIso={productionDateIso}
            completionDateIso={completionDateIso}
            onProductionDateChange={onProductionDateChange}
            onCompletionDateChange={onCompletionDateChange}
          />
        ) : null}
        {quotationRef ? (
          <span>
            Quote <span className="font-mono font-semibold text-zarewa-teal">{quotationRef}</span>
          </span>
        ) : null}
        {machineName ? <span>{machineName}</span> : null}
        {productName ? (
          <span className="max-w-[12rem] truncate" title={productName}>
            {productName}
          </span>
        ) : null}
        {specParts.length > 0 ? (
          <>
            <Dot />
            <span className="min-w-0 max-w-[18rem] truncate" title={specParts.join(' · ')}>
              <span className="text-[10px] font-bold uppercase tracking-wide text-zarewa-teal">Spec </span>
              <span className="font-medium text-[var(--z-text)]">{specParts.join(' · ')}</span>
            </span>
          </>
        ) : null}
      </div>

      {/* Line 2 — live KPIs (+ plan % inline when running) */}
      <p className="z-stencil flex flex-wrap items-baseline gap-x-0 tabular-nums text-[var(--z-text)]">
        <span>
          <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--z-text-muted)]">Rsvd </span>
          <span className="font-bold text-zarewa-teal">{numKg(reservedKg)} kg</span>
        </span>
        <Dot />
        <span>
          <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--z-text-muted)]">Used </span>
          <span className="font-bold">{numKg(usedKg)} kg</span>
        </span>
        <Dot />
        <span title={rcfTitle}>
          <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--z-text-muted)]">Plan </span>
          <span className="font-bold text-zarewa-teal">{numM(plannedM)} m</span>
          {showPlanBar && planProgressPct != null ? (
            <span className="ml-1 font-bold text-zarewa-teal">({planProgressPct}%)</span>
          ) : null}
        </span>
        <Dot />
        <span>
          <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--z-text-muted)]">Out </span>
          <span className="font-bold text-zarewa-teal">
            {metresMatch ? `${numM(liveM)} m` : `${numM(liveM)} / ${numM(postedM)} m`}
          </span>
        </span>
        <Dot />
        <span>
          <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--z-text-muted)]">Alert </span>
          <span className="font-semibold">{alertState || 'Pending'}</span>
        </span>
      </p>

      {/* Thin vs-plan bar only — metres already in KPI line */}
      {showPlanBar ? (
        <div
          className="h-1 overflow-hidden rounded-full bg-[var(--z-border-subtle)]"
          title={`${formatMeters(recordedMeters)} / ${formatMeters(plannedMetersValue)}${
            planProgressPct != null ? ` (${planProgressPct}%)` : ''
          }`}
          role="progressbar"
          aria-valuenow={planProgressPct != null ? planProgressPct : 0}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progress versus plan"
        >
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              planProgressPct != null && planProgressPct > 100
                ? 'bg-amber-500'
                : 'bg-gradient-to-r from-teal-500 to-zarewa-teal'
            }`}
            style={{
              width: `${Math.min(100, planProgressPct != null ? planProgressPct : 0)}%`,
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
