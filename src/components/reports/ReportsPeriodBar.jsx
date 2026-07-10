import React, { useEffect, useMemo, useState } from 'react';
import {
  PERIOD_PRESETS,
  detectPeriodPreset,
  formatPeriodLabel,
  periodRangeForPreset,
} from '../../lib/reportsExportCatalog.js';

/**
 * Sticky period + branch context.
 * Draft dates until Apply (avoids thrashing snapshot loads).
 */
export function ReportsPeriodBar({
  startDate,
  endDate,
  onApplyRange,
  branchLabel,
  periodValid,
  updating = false,
  branches = [],
  stockBranchId = '',
  onStockBranchChange,
  showStockBranchPicker = false,
}) {
  const [draftStart, setDraftStart] = useState(startDate);
  const [draftEnd, setDraftEnd] = useState(endDate);

  useEffect(() => {
    setDraftStart(startDate);
    setDraftEnd(endDate);
  }, [startDate, endDate]);

  const preset = useMemo(() => detectPeriodPreset(draftStart, draftEnd), [draftStart, draftEnd]);
  const human = formatPeriodLabel(startDate, endDate);
  const dirty = draftStart !== startDate || draftEnd !== endDate;
  const draftValid = Boolean(draftStart && draftEnd && draftStart <= draftEnd);

  const applyPreset = (id) => {
    if (id === 'custom') return;
    const range = periodRangeForPreset(id);
    if (!range) return;
    setDraftStart(range.startDate);
    setDraftEnd(range.endDate);
    onApplyRange(range.startDate, range.endDate);
  };

  const applyDraft = () => {
    if (!draftValid) return;
    onApplyRange(draftStart, draftEnd);
  };

  return (
    <div className="sticky top-0 z-20 -mx-4 sm:-mx-8 px-4 sm:px-8 py-3 mb-2 bg-white/95 backdrop-blur-md border-b border-slate-100">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-ui-xs font-semibold tracking-wide text-slate-500">Period</p>
            <span className="text-sm font-bold text-zarewa-teal tabular-nums">{human}</span>
            {branchLabel ? (
              <span className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-ui-xs font-semibold text-slate-700">
                {branchLabel}
              </span>
            ) : null}
            {updating ? (
              <span className="text-ui-xs font-semibold text-slate-500 animate-pulse">Updating…</span>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Period presets">
            {PERIOD_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p.id)}
                className={`rounded-lg px-2.5 py-1.5 text-ui-xs font-semibold transition-colors ${
                  preset === p.id
                    ? 'bg-zarewa-teal text-white'
                    : 'bg-slate-50 text-slate-600 border border-slate-200 hover:border-teal-200 hover:text-teal-800'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-end w-full lg:w-auto">
          <div className="grid grid-cols-2 gap-2 sm:max-w-md w-full">
            <div>
              <label htmlFor="rep-start" className="z-field-label !text-ui-xs">
                Start
              </label>
              <input
                id="rep-start"
                type="date"
                value={draftStart}
                onChange={(e) => setDraftStart(e.target.value)}
                className="z-input !py-2 !text-sm"
              />
            </div>
            <div>
              <label htmlFor="rep-end" className="z-field-label !text-ui-xs">
                End (as-at)
              </label>
              <input
                id="rep-end"
                type="date"
                value={draftEnd}
                onChange={(e) => setDraftEnd(e.target.value)}
                className="z-input !py-2 !text-sm"
              />
            </div>
          </div>
          <button
            type="button"
            disabled={!dirty || !draftValid}
            onClick={applyDraft}
            className="z-btn-primary !text-xs !py-2 shrink-0 disabled:opacity-40"
          >
            Apply
          </button>
        </div>
      </div>

      {showStockBranchPicker ? (
        <div className="mt-3 max-w-sm">
          <label htmlFor="rep-stock-branch" className="z-field-label !text-ui-xs">
            Stock register branch
          </label>
          <select
            id="rep-stock-branch"
            className="z-input !py-2 !text-sm"
            value={stockBranchId}
            onChange={(e) => onStockBranchChange?.(e.target.value)}
          >
            <option value="">Select branch…</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name || b.id}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {!periodValid || !draftValid ? (
        <p className="mt-2 text-xs font-semibold text-rose-700" role="alert">
          Start date must be on or before end date. Exports stay disabled until fixed.
        </p>
      ) : null}
      {dirty && draftValid ? (
        <p className="mt-2 text-ui-xs font-semibold text-amber-800">
          Dates changed — click Apply to refresh KPIs and exports.
        </p>
      ) : (
        <p className="mt-2 text-ui-xs text-slate-500">
          Exports use this range. Stock register uses the <span className="font-semibold">end date</span> as as-at.
        </p>
      )}
    </div>
  );
}
