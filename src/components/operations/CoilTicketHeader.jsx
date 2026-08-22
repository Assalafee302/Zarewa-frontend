import React from 'react';
import { GaugeStamp } from '../ui/MillColourChip.jsx';

/**
 * Coil file thesis: stencil number, colour, remaining metres.
 */
export function CoilTicketHeader({
  coilNo,
  colour,
  gauge,
  remainingM,
  onHandKg,
  freeKg,
  productId,
  actions,
}) {
  const metresLabel =
    remainingM != null && Number.isFinite(remainingM)
      ? remainingM.toLocaleString(undefined, { maximumFractionDigits: 1 })
      : null;

  return (
    <header className="mb-4 sm:mb-5">
      <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-slate-500">Coil</p>
          <h1 className="z-page-title-stencil">{coilNo}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <GaugeStamp gauge={gauge} />
            {colour ? <span className="text-sm text-slate-700">{colour}</span> : null}
            {productId ? <span className="text-xs text-slate-500">{productId}</span> : null}
          </div>
        </div>
        <div className="flex min-w-0 flex-wrap items-end gap-6 lg:justify-end">
          <div>
            <p className="text-[11px] font-medium text-slate-500">
              {metresLabel != null ? 'Remaining' : 'On hand'}
            </p>
            {metresLabel != null ? (
              <>
                <p className="z-stencil text-2xl text-slate-900 sm:text-3xl">{metresLabel} m</p>
                <p className="mt-0.5 text-xs tabular-nums text-slate-500">
                  {Number(onHandKg).toLocaleString(undefined, { maximumFractionDigits: 1 })} kg on
                  hand
                  {freeKg != null
                    ? ` · ${Number(freeKg).toLocaleString(undefined, { maximumFractionDigits: 1 })} kg free`
                    : ''}
                </p>
              </>
            ) : (
              <p className="z-stencil text-2xl text-slate-900 sm:text-3xl tabular-nums">
                {Number(onHandKg).toLocaleString(undefined, { maximumFractionDigits: 1 })} kg
              </p>
            )}
          </div>
        </div>
      </div>
      {actions ? (
        <div className="mt-3 flex min-w-0 w-full flex-wrap items-center justify-start gap-2 sm:justify-end">
          {actions}
        </div>
      ) : null}
    </header>
  );
}
