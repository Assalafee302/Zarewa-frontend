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

function alertBadgeClass(state) {
  switch (state) {
    case 'OK':
      return 'bg-emerald-50 text-emerald-800 border border-emerald-200/80';
    case 'High':
    case 'Low':
      return 'bg-amber-100 text-amber-950 border border-amber-300 font-black';
    case 'Watch':
      return 'bg-sky-50 text-sky-800 border border-sky-200';
    default:
      return 'bg-slate-100 text-slate-700 border border-slate-200';
  }
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
  stoneHybrid = false,
  stoneMeters = 0,
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

  const roofPlan = Number(plannedRoofM) > 0 ? Number(plannedRoofM) : Number(plannedM) || 0;
  const roofLive = Number(stoneMeters) || 0;
  const barRecorded = stoneHybrid ? roofLive : Number(recordedMeters) || 0;
  const barPlanned = stoneHybrid ? roofPlan : Number(plannedMetersValue) || 0;
  const showPlanBar = hasPlannedMeters && (jobSt === 'Running' || jobSt === 'Planned');

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
        {stoneHybrid ? (
          <>
            <span title="Stone roofing metres drawn from stone stock. Not coil flatsheet.">
              <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--z-text-muted)]">Roof </span>
              <span className="font-bold text-zarewa-teal">
                {numM(roofLive)} / {numM(roofPlan)} m
              </span>
            </span>
            <Dot />
            <span title="Coil metres plus offcut flatsheet. Stone roofing is not included.">
              <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--z-text-muted)]">Sheet </span>
              <span className="font-bold text-zarewa-teal">
                {metresMatch ? `${numM(liveM)} m` : `${numM(liveM)} / ${numM(postedM)} m`}
              </span>
            </span>
          </>
        ) : (
          <>
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
          </>
        )}
        <Dot />
        <span className="inline-flex items-center gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--z-text-muted)]">QC </span>
          <span className={`rounded px-1.5 py-0.2 text-[10px] uppercase ${alertBadgeClass(alertState)}`}>
            {alertState || 'Pending'}
          </span>
        </span>
      </p>

      {/* Thin vs-plan bar only — metres already in KPI line */}
      {showPlanBar ? (
        <div
          className="h-1 overflow-hidden rounded-full bg-[var(--z-border-subtle)]"
          title={
            stoneHybrid
              ? `Roof ${formatMeters(barRecorded)} / ${formatMeters(barPlanned)}`
              : `${formatMeters(recordedMeters)} / ${formatMeters(plannedMetersValue)}${
                  planProgressPct != null ? ` (${planProgressPct}%)` : ''
                }`
          }
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
