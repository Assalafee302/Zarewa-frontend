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
  return <span className="mx-1.5 text-[var(--z-border)]" aria-hidden>·</span>;
}

/**
 * Modal register summary — 3 text lines + vs-plan bar (line 4).
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

  const specParts = [
    quotationMaterialSpec?.gauge,
    quotationMaterialSpec?.colour,
    quotationMaterialSpec?.materialType,
    quotationMaterialSpec?.design,
  ].filter(Boolean);

  return (
    <div className="space-y-1.5 text-ui-xs leading-snug">
      {/* Line 1 — dates + refs */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[var(--z-text-muted)]">
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
          <span className="max-w-[14rem] truncate" title={productName}>
            {productName}
          </span>
        ) : null}
      </div>

      {/* Line 2 — live KPIs (single row, no cards) */}
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
        <span>
          <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--z-text-muted)]">Plan </span>
          <span className="font-bold text-zarewa-teal">{numM(plannedM)} m</span>
          {hasRcf ? (
            <span className="ml-1 font-medium text-[var(--z-text-muted)]">
              (R {numM(plannedRoofM)} · C {numM(plannedCladdingM)} · F {numM(plannedFlatsheetM)})
            </span>
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

      {/* Line 3 — target spec */}
      {specParts.length > 0 ? (
        <p className="truncate text-[var(--z-text-muted)]">
          <span className="text-[10px] font-bold uppercase tracking-wide text-zarewa-teal">Spec </span>
          <span className="font-medium text-[var(--z-text)]">{specParts.join(' · ')}</span>
        </p>
      ) : null}

      {/* Line 4 — vs plan (user requested) */}
      {hasPlannedMeters && (jobSt === 'Running' || jobSt === 'Planned') ? (
        <div className="rounded-md border border-[var(--z-border-subtle)] bg-[var(--z-surface-muted)]/40 px-2 py-1.5">
          <div className="flex items-center justify-between gap-2 font-semibold text-[var(--z-text-muted)]">
            <span className="text-[10px] font-bold uppercase tracking-wide">vs plan</span>
            <span className="z-stencil tabular-nums text-[var(--z-text)]">
              {formatMeters(recordedMeters)} / {formatMeters(plannedMetersValue)}
              {planProgressPct != null ? (
                <span className="ml-1 font-bold text-zarewa-teal">({planProgressPct}%)</span>
              ) : null}
            </span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--z-border-subtle)]">
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
        </div>
      ) : null}
    </div>
  );
}
