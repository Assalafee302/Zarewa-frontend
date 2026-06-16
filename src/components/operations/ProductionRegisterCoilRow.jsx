import React, { memo, useCallback, useMemo } from 'react';
import { AlertTriangle, CircleHelp, Trash2 } from 'lucide-react';

function formatKg(value) {
  const next = Number(value);
  return Number.isFinite(next) ? `${next.toFixed(2)} kg` : '—';
}

function draftRowConversionPreviewReady(row) {
  const coil = row.coilNo?.trim();
  const op = Number(row.openingWeightKg);
  const cl = Number(row.closingWeightKg);
  const m = Number(row.metersProduced);
  return (
    Boolean(coil) &&
    Number.isFinite(op) &&
    op > 0 &&
    Number.isFinite(cl) &&
    cl >= 0 &&
    cl <= op &&
    Number.isFinite(m) &&
    m > 0
  );
}

/**
 * Coil `<select>` with recommended / other optgroups — pattern unchanged, memoized so
 * typing in kg/metres fields on other rows does not rebuild every `<option>`.
 */
const ProductionRegisterCoilSelect = memo(function ProductionRegisterCoilSelect({
  rowId,
  value,
  onFieldChange,
  disabled,
  title,
  recommendedOptions,
  otherOptions,
  disabledCoilNos,
}) {
  const disabledSet = useMemo(() => {
    if (disabledCoilNos instanceof Set) return disabledCoilNos;
    return new Set(Array.isArray(disabledCoilNos) ? disabledCoilNos : []);
  }, [disabledCoilNos]);

  const handleChange = useCallback(
    (e) => onFieldChange(rowId, { coilNo: e.target.value }),
    [onFieldChange, rowId]
  );

  return (
    <select
      disabled={disabled}
      title={title}
      value={value}
      onChange={handleChange}
      className="min-h-11 w-full min-w-0 max-w-full rounded-md border border-slate-200 bg-white py-2 px-2 text-[11px] font-bold text-[#134e4a] outline-none transition-all focus:border-[#134e4a]/40 focus:ring-1 focus:ring-[#134e4a]/20 disabled:opacity-60 lg:min-h-0 lg:py-1.5"
    >
      <option value="">Select coil...</option>
      {recommendedOptions.length > 0 ? (
        <optgroup label="Recommended (matches quotation)">
          {recommendedOptions.map((opt) => (
            <option key={opt.coilNo} value={opt.coilNo} disabled={disabledSet.has(opt.coilNo)}>
              {opt.label}
            </option>
          ))}
        </optgroup>
      ) : null}
      {otherOptions.length > 0 ? (
        <optgroup label={recommendedOptions.length > 0 ? 'Other coils' : 'Available coils'}>
          {otherOptions.map((opt) => (
            <option key={opt.coilNo} value={opt.coilNo} disabled={disabledSet.has(opt.coilNo)}>
              {opt.label}
            </option>
          ))}
        </optgroup>
      ) : null}
    </select>
  );
});

/**
 * One production-register coil line — isolated re-renders per row.
 */
export const ProductionRegisterCoilRow = memo(function ProductionRegisterCoilRow({
  row,
  index,
  lot,
  freeKg,
  inModal,
  coilSelectTitle,
  coilSelectLockedRunningPrimary,
  canPickCoilAndOpening,
  canCaptureRun,
  canEditCompletedCoilCorrections,
  readOnly,
  jobSt,
  draftRow,
  showRemove,
  specWarn,
  coilTailFinishMaxKg,
  recommendedOptions,
  otherOptions,
  disabledCoilNos,
  onFieldChange,
  onRemove,
}) {
  const coilSelectDisabledTitle = coilSelectLockedRunningPrimary
    ? 'Primary coil is fixed while the run is open. Use Return to plan to change coils, or add a new coil row for an extra roll.'
    : coilSelectTitle;
  const lotMat = lot ? String(lot.materialTypeName || '').trim() : '';

  return (
    <div
      className={`rounded-xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/40 shadow-sm ${
        inModal ? 'p-1.5' : 'p-2'
      } ${draftRowConversionPreviewReady(row) ? 'ring-1 ring-teal-400/35' : ''}`}
    >
      <div
        className={`min-w-0 flex flex-col gap-2 pb-1 lg:grid lg:items-end lg:gap-x-2 lg:overflow-visible lg:pb-0 ${
          inModal
            ? 'lg:grid-cols-[1.25rem_3.25rem_minmax(0,1fr)_minmax(3.25rem,1fr)_minmax(3.25rem,1fr)_minmax(3.25rem,1fr)_minmax(0,1fr)_2.25rem_2rem] lg:gap-x-1.5'
            : 'lg:grid-cols-[2rem_4rem_minmax(0,1.1fr)_4rem_4rem_4rem_minmax(0,1fr)_2.75rem_2rem]'
        }`}
      >
        {inModal ? (
          <span
            className="shrink-0 self-end pb-1 text-right text-[11px] font-bold tabular-nums text-slate-600 lg:pb-1.5"
            title={`Row ${index + 1}`}
          >
            {index + 1}
          </span>
        ) : (
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#134e4a] text-[9px] font-black text-white lg:h-7 lg:w-7"
            title={`Coil line ${index + 1}`}
          >
            {index + 1}
          </span>
        )}
        {lot ? (
          <span
            className="max-w-full truncate text-[9px] leading-tight text-slate-500 lg:max-w-[4.5rem] lg:shrink-0"
            title={
              lotMat
                ? `${lot.productID} · ${lotMat} · free ${formatKg(freeKg)}`
                : `${lot.productID} · free ${formatKg(freeKg)}`
            }
          >
            {lot.productID}
          </span>
        ) : (
          <span className="hidden min-w-0 lg:block" aria-hidden />
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-px">
          <label className="whitespace-nowrap text-[8px] font-bold uppercase tracking-wide text-slate-500">
            Coil
          </label>
          <ProductionRegisterCoilSelect
            rowId={row.id}
            value={row.coilNo}
            onFieldChange={onFieldChange}
            disabled={!canPickCoilAndOpening}
            title={coilSelectDisabledTitle}
            recommendedOptions={recommendedOptions}
            otherOptions={otherOptions}
            disabledCoilNos={disabledCoilNos}
          />
        </div>

        <div className="grid min-w-0 grid-cols-3 gap-2 lg:contents">
          <div className="flex min-w-0 flex-col gap-px lg:w-[4.25rem] lg:shrink-0">
            <label className="whitespace-nowrap text-[8px] font-bold uppercase tracking-wide text-slate-500">
              Open kg
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              disabled={!canPickCoilAndOpening}
              value={row.openingWeightKg}
              onChange={(e) => onFieldChange(row.id, { openingWeightKg: e.target.value })}
              className="min-h-10 w-full rounded-md border border-slate-200 bg-white py-2 px-1.5 text-xs font-bold tabular-nums text-[#134e4a] outline-none transition-all focus:border-[#134e4a]/40 focus:ring-1 focus:ring-[#134e4a]/20 disabled:opacity-60 lg:min-h-0 lg:py-1.5"
            />
          </div>

          <div className="flex min-w-0 flex-col gap-px lg:w-[4.25rem] lg:shrink-0">
            <label className="whitespace-nowrap text-[8px] font-bold uppercase tracking-wide text-slate-500">
              Close kg
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              disabled={!(canCaptureRun || canEditCompletedCoilCorrections)}
              value={row.closingWeightKg}
              onChange={(e) => onFieldChange(row.id, { closingWeightKg: e.target.value })}
              className="min-h-10 w-full rounded-md border border-slate-200 bg-white py-2 px-1.5 text-xs font-bold tabular-nums text-[#134e4a] outline-none transition-all focus:border-[#134e4a]/40 focus:ring-1 focus:ring-[#134e4a]/20 disabled:opacity-60 lg:min-h-0 lg:py-1.5"
            />
          </div>

          <div className="flex min-w-0 flex-col gap-px lg:w-[4.25rem] lg:shrink-0">
            <label className="whitespace-nowrap text-[8px] font-bold uppercase tracking-wide text-slate-500">
              Metres
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              disabled={!(canCaptureRun || canEditCompletedCoilCorrections)}
              value={row.metersProduced}
              onChange={(e) => onFieldChange(row.id, { metersProduced: e.target.value })}
              className="min-h-10 w-full rounded-md border border-slate-200 bg-white py-2 px-1.5 text-xs font-bold tabular-nums text-[#134e4a] outline-none transition-all focus:border-[#134e4a]/40 focus:ring-1 focus:ring-[#134e4a]/20 disabled:opacity-60 lg:min-h-0 lg:py-1.5"
            />
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-px">
          <label className="whitespace-nowrap text-[8px] font-bold uppercase tracking-wide text-slate-500">
            Note
          </label>
          <input
            type="text"
            value={row.note}
            onChange={(e) => onFieldChange(row.id, { note: e.target.value })}
            disabled={(readOnly && !canEditCompletedCoilCorrections) || (jobSt === 'Running' && !draftRow && !canCaptureRun)}
            placeholder="Trim, splice…"
            className="min-h-10 min-w-0 w-full rounded-md border border-slate-200 bg-white py-2 px-2 text-[11px] font-medium text-slate-800 outline-none transition-all focus:border-slate-300 focus:ring-1 focus:ring-slate-200/80 disabled:opacity-60 lg:min-h-0 lg:py-1.5"
          />
        </div>

        <div className="flex w-full flex-col gap-px text-center lg:w-[3.25rem] lg:shrink-0">
          <span className="whitespace-nowrap text-[8px] font-bold uppercase tracking-wide text-teal-800/90">
            Used
          </span>
          <span className="text-xs font-black tabular-nums leading-none text-[#134e4a]">
            {Number(row.openingWeightKg) >= Number(row.closingWeightKg || 0) && row.closingWeightKg !== ''
              ? formatKg(Number(row.openingWeightKg) - Number(row.closingWeightKg || 0))
              : '—'}
          </span>
        </div>

        {showRemove ? (
          <button
            type="button"
            onClick={() => onRemove(row.id)}
            className="inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center self-end rounded-md border border-transparent p-2 text-slate-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 lg:mb-px lg:min-h-0 lg:min-w-0 lg:self-auto lg:p-1"
            aria-label="Remove coil row"
          >
            <Trash2 size={14} />
          </button>
        ) : null}
      </div>

      {canCaptureRun &&
      row.coilNo?.trim() &&
      Number(row.openingWeightKg) > 0 &&
      Number.isFinite(Number(row.closingWeightKg)) &&
      Number(row.closingWeightKg) >= 0 &&
      Number(row.closingWeightKg) < coilTailFinishMaxKg &&
      Number(row.closingWeightKg) <= Number(row.openingWeightKg) ? (
        <label className="mt-2 flex cursor-pointer items-center gap-2 rounded-md border border-amber-200/90 bg-amber-50/80 px-2 py-2 text-[11px] font-medium text-amber-950">
          <input
            type="checkbox"
            checked={Boolean(row.finishCoil)}
            onChange={(e) => onFieldChange(row.id, { finishCoil: e.target.checked })}
            className="h-[1.125rem] w-[1.125rem] shrink-0 rounded border-amber-400 text-[#134e4a] focus:ring-2 focus:ring-[#134e4a]/30"
          />
          <span className="min-w-0 flex-1 leading-snug">
            <strong className="font-semibold">Roll finished</strong>
            <span className="text-amber-900/90"> (tail under {coilTailFinishMaxKg} kg)</span>
          </span>
          <button
            type="button"
            className="shrink-0 rounded-full p-1 text-amber-800/80 hover:bg-amber-100"
            title="Tick only when this coil’s tail under the threshold is unusable spool/core and should be cleared from coil stock. Leave unchecked if usable steel remains on the roll — you can complete without finishing the roll."
            aria-label="About roll finished"
          >
            <CircleHelp className="size-4" strokeWidth={2} />
          </button>
        </label>
      ) : null}

      {row.specMismatch || specWarn ? (
        <div className="mt-1 space-y-1 border-t border-slate-100/80 pt-1">
          {row.specMismatch ? (
            <p className="flex items-start gap-1 rounded border border-amber-300 bg-amber-100/90 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-amber-950">
              <AlertTriangle size={12} className="mt-0.5 shrink-0" aria-hidden />
              Saved as spec exception — manager review
            </p>
          ) : null}
          {specWarn ? (
            <p className="flex items-start gap-1 rounded border border-amber-200 bg-amber-50/90 px-2 py-0.5 text-[9px] font-semibold text-amber-950">
              <AlertTriangle size={12} className="mt-0.5 shrink-0" aria-hidden />
              {specWarn}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
});
