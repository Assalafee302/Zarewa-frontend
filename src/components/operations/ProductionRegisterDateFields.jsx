import React from 'react';
import { Input, FieldLabel } from '../ui/Input';

/**
 * Production / completion dates — single source for the register modal.
 */
export function ProductionRegisterDateFields({
  jobSt,
  startDateISO,
  productionDateIso,
  completionDateIso,
  onProductionDateChange,
  onCompletionDateChange,
  inline = false,
}) {
  const showProductionPicker =
    (jobSt === 'Planned' || jobSt === 'Running') && !startDateISO;
  const showRunningDates = jobSt === 'Running';
  const startedLabel = startDateISO ? String(startDateISO).slice(0, 10) : null;

  if (!showProductionPicker && !showRunningDates && !startedLabel) return null;

  const wrapClass = inline
    ? 'flex flex-wrap items-end gap-x-3 gap-y-1'
    : 'flex flex-wrap items-end gap-3';

  const fieldWrap = inline ? 'min-w-[8.5rem]' : '';

  return (
    <div className={wrapClass}>
      {showProductionPicker ? (
        <div className={fieldWrap}>
          <FieldLabel>Production date</FieldLabel>
          <Input
            type="date"
            size="compact"
            className="mt-0.5 py-1 text-xs"
            value={productionDateIso}
            onChange={(e) => onProductionDateChange(e.target.value)}
          />
        </div>
      ) : startedLabel && jobSt !== 'Running' ? (
        <p className="text-ui-xs text-[var(--z-text-muted)]">
          Started <strong className="text-[var(--z-text)]">{startedLabel}</strong>
        </p>
      ) : null}
      {showRunningDates ? (
        <>
          {startedLabel ? (
            <p className="self-center text-ui-xs text-[var(--z-text-muted)]">
              Started <strong className="text-[var(--z-text)]">{startedLabel}</strong>
            </p>
          ) : null}
          <div className={fieldWrap}>
            <FieldLabel>Business date</FieldLabel>
            <Input
              type="date"
              size="compact"
              className="mt-0.5 py-1 text-xs"
              value={productionDateIso}
              onChange={(e) => onProductionDateChange(e.target.value)}
            />
          </div>
          <div className={fieldWrap}>
            <FieldLabel>Complete date</FieldLabel>
            <Input
              type="date"
              size="compact"
              className="mt-0.5 py-1 text-xs"
              value={completionDateIso}
              onChange={(e) => onCompletionDateChange(e.target.value)}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
