import React, { memo, useCallback, useMemo } from 'react';
import { AlertTriangle, CircleHelp, Trash2 } from 'lucide-react';
import { draftRowConversionPreviewReady } from '../../lib/productionRegisterCoilDraft';
import { PROD_REG } from '../../lib/productionRegisterUi';
import { Input, Select, FieldLabel } from '../ui/Input';

function formatKg(value) {
  const next = Number(value);
  return Number.isFinite(next) ? `${Math.round(next)} kg` : '—';
}

const coilInputClass =
  'z-stencil text-xs font-bold tabular-nums text-zarewa-teal sm:py-1.5 sm:text-xs';

/**
 * Coil `<select>` with recommended / other optgroups — memoized so typing in other rows
 * does not rebuild every `<option>`.
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
    <Select
      size="compact"
      disabled={disabled}
      title={title}
      value={value}
      onChange={handleChange}
      className={`${coilInputClass} font-semibold`}
    >
      <option value="">Select coil…</option>
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
    </Select>
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
  canUndoFinishRoll = false,
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
  const finishCoilLocked =
    jobSt === 'Completed' && Number(row.finishCoilTailKg) > 0.05 && !canUndoFinishRoll;
  const hasUnsavedCoilData =
    draftRow &&
    Boolean(
      String(row.coilNo ?? '').trim() ||
        String(row.openingWeightKg ?? '').trim() ||
        String(row.closingWeightKg ?? '').trim() ||
        String(row.metersProduced ?? '').trim() ||
        String(row.note ?? '').trim()
    );

  const rowBorder = hasUnsavedCoilData
    ? PROD_REG.coilRowUnsaved
    : draftRowConversionPreviewReady(row)
      ? PROD_REG.coilRowPreviewReady
      : PROD_REG.coilRowBorder;

  return (
    <div className={`${inModal ? PROD_REG.coilRowInModal : PROD_REG.coilRow} ${inModal ? '' : 'p-2.5 sm:p-3'} ${rowBorder}`}>
      {hasUnsavedCoilData ? (
        <p
          className="mb-2 flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-ui-xs font-semibold text-amber-950"
          title={
            jobSt === 'Planned'
              ? 'Not saved yet — use Save and start production.'
              : 'Not saved yet — use Save while running.'
          }
        >
          <AlertTriangle size={13} className="shrink-0" aria-hidden />
          Unsaved — save before completing
        </p>
      ) : null}

      <div
        className={`min-w-0 flex flex-col gap-2 pb-0.5 lg:overflow-visible ${
          inModal
            ? PROD_REG.coilGridRowModal
            : 'lg:grid lg:items-end lg:gap-x-2 lg:grid-cols-[2rem_4rem_minmax(0,1.1fr)_4rem_4rem_4rem_minmax(0,1fr)_2.75rem_2rem]'
        }`}
      >
        {inModal ? (
          <span
            className="z-stencil shrink-0 self-end pb-1 text-right text-xs font-bold tabular-nums text-[var(--z-text-muted)] lg:pb-1.5"
            title={`Row ${index + 1}`}
          >
            {index + 1}
          </span>
        ) : (
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zarewa-teal text-ui-xs font-black text-white shadow-sm lg:h-7 lg:w-7"
            title={`Coil line ${index + 1}`}
          >
            {index + 1}
          </span>
        )}

        {lot ? (
          <span
            className="max-w-full truncate text-ui-xs leading-tight text-[var(--z-text-muted)] lg:max-w-[4.5rem] lg:shrink-0 lg:pb-1.5"
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

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <FieldLabel className="lg:sr-only">Coil</FieldLabel>
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
          <div className="flex min-w-0 flex-col gap-1 lg:w-[4.25rem] lg:shrink-0">
            <FieldLabel className="lg:sr-only">Open kg</FieldLabel>
            <Input
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              size="compact"
              disabled={!canPickCoilAndOpening}
              value={row.openingWeightKg}
              onChange={(e) => onFieldChange(row.id, { openingWeightKg: e.target.value })}
              title="Whole kg only"
              className={coilInputClass}
            />
          </div>

          <div className="flex min-w-0 flex-col gap-1 lg:w-[4.25rem] lg:shrink-0">
            <FieldLabel className="lg:sr-only">Close kg</FieldLabel>
            <Input
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              size="compact"
              disabled={!(canCaptureRun || canEditCompletedCoilCorrections)}
              value={row.closingWeightKg}
              onChange={(e) => onFieldChange(row.id, { closingWeightKg: e.target.value })}
              title="Whole kg only"
              className={coilInputClass}
            />
          </div>

          <div className="flex min-w-0 flex-col gap-1 lg:w-[4.25rem] lg:shrink-0">
            <FieldLabel className="lg:sr-only">Metres</FieldLabel>
            <Input
              type="number"
              min="0"
              step="0.01"
              size="compact"
              disabled={!(canCaptureRun || canEditCompletedCoilCorrections)}
              value={row.metersProduced}
              onChange={(e) => onFieldChange(row.id, { metersProduced: e.target.value })}
              className={coilInputClass}
            />
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <FieldLabel className="lg:sr-only">
            Note <span className="font-normal normal-case tracking-normal text-[var(--z-text-muted)]">(optional)</span>
          </FieldLabel>
          <Input
            type="text"
            size="compact"
            value={row.note}
            onChange={(e) => onFieldChange(row.id, { note: e.target.value })}
            disabled={(readOnly && !canEditCompletedCoilCorrections) || (jobSt === 'Running' && !draftRow && !canCaptureRun)}
            placeholder="Optional note"
            className="text-xs font-medium sm:py-1.5"
          />
        </div>

        <div className="flex w-full flex-col gap-0.5 text-center lg:w-[3.25rem] lg:shrink-0">
          <span className="whitespace-nowrap text-[10px] font-bold uppercase tracking-wide text-zarewa-teal/90 lg:sr-only">
            Used
          </span>
          <span className="z-stencil text-sm font-black tabular-nums leading-none text-zarewa-teal">
            {Number(row.openingWeightKg) >= Number(row.closingWeightKg || 0) && row.closingWeightKg !== ''
              ? formatKg(Number(row.openingWeightKg) - Number(row.closingWeightKg || 0))
              : '—'}
          </span>
        </div>

        {showRemove ? (
          <button
            type="button"
            onClick={() => onRemove(row.id)}
            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center self-end rounded-lg border border-transparent text-[var(--z-text-muted)] transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200 lg:mb-px lg:min-h-0 lg:min-w-0 lg:self-auto lg:p-1.5"
            aria-label="Remove coil row"
            title={
              draftRow
                ? 'Remove this coil line'
                : jobSt === 'Planned'
                  ? 'Remove this coil and release its reserved kg back to free stock'
                  : jobSt === 'Running'
                    ? 'Return to plan first to remove a saved start coil'
                    : 'Remove coil line'
            }
          >
            <Trash2 size={16} />
          </button>
        ) : null}
      </div>

      {((canCaptureRun || canEditCompletedCoilCorrections) &&
      row.coilNo?.trim() &&
      Number(row.openingWeightKg) > 0 &&
      Number.isFinite(Number(row.closingWeightKg)) &&
      Number(row.closingWeightKg) >= 0 &&
      Number(row.closingWeightKg) < coilTailFinishMaxKg &&
      Number(row.closingWeightKg) <= Number(row.openingWeightKg)) ? (
        <label className="mt-3 flex cursor-pointer items-start gap-2.5 rounded-lg border border-amber-200/90 bg-amber-50/80 px-3 py-2.5 text-xs font-medium text-amber-950">
          <input
            type="checkbox"
            checked={Boolean(row.finishCoil)}
            disabled={Boolean(finishCoilLocked)}
            onChange={(e) => onFieldChange(row.id, { finishCoil: e.target.checked })}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-amber-400 text-zarewa-teal focus:ring-2 focus:ring-zarewa-teal/30 disabled:opacity-60"
          />
          <span className="min-w-0 flex-1 leading-snug">
            <strong className="font-semibold">Finish roll</strong>
            <span className="text-amber-900/90"> (&lt;{coilTailFinishMaxKg} kg tail)</span>
            {jobSt === 'Completed' && Number(row.finishCoilTailKg) > 0.05 ? (
              <span className="mt-1 block text-[10px] font-semibold text-amber-900/80">
                {canUndoFinishRoll
                  ? 'Uncheck to restore the cleared tail (branch manager confirm on Save).'
                  : 'Checked on book — ask a branch manager to uncheck and confirm restore.'}
              </span>
            ) : null}
          </span>
          <button
            type="button"
            className="shrink-0 rounded-full p-1 text-amber-800/80 hover:bg-amber-100"
            title="Tick only when the tail is unusable and should leave coil stock. Leave unchecked if usable steel remains."
            aria-label="About finish roll"
          >
            <CircleHelp className="size-4" strokeWidth={2} />
          </button>
        </label>
      ) : null}

      {row.specMismatch || specWarn ? (
        <div className="mt-2 space-y-1.5 border-t border-[var(--z-border-subtle)] pt-2">
          {row.specMismatch ? (
            <p className="flex items-start gap-1.5 rounded-lg border border-amber-300 bg-amber-100/90 px-2.5 py-1 text-ui-xs font-bold uppercase tracking-wide text-amber-950">
              <AlertTriangle size={12} className="mt-0.5 shrink-0" aria-hidden />
              Saved as spec exception — manager review
            </p>
          ) : null}
          {specWarn ? (
            <p className="flex items-start gap-1.5 rounded-lg border border-amber-200 bg-amber-50/90 px-2.5 py-1 text-ui-xs font-semibold text-amber-950">
              <AlertTriangle size={12} className="mt-0.5 shrink-0" aria-hidden />
              {specWarn}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
});
