import React from 'react';
import { formatNgn } from '../../lib/formatNgn';
import { SURFACE, TEXT } from '../../lib/designTokens';
import { buildMaintenanceEnvelope } from '../../shared/lib/maintenanceCostEnvelope';

/**
 * Estimate vs spent for a work order. Shop-floor and money clocks are independent.
 */
export function MaintenanceEnvelopeStrip({ workOrder, className = '' }) {
  const env =
    workOrder?.envelope ||
    buildMaintenanceEnvelope({
      estimatedCostNgn: workOrder?.estimatedCostNgn,
      spentNgn: workOrder?.spentNgn,
      returnedToProductionAtIso: workOrder?.returnedToProductionAtIso,
      costClosedAtIso: workOrder?.costClosedAtIso,
      status: workOrder?.status,
    });
  const remaining = env.remainingNgn;
  return (
    <div className={`${SURFACE.muted} p-3 ${className}`}>
      <p className={TEXT.labelCaps}>Cost envelope</p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <div>
          <p className={TEXT.label}>Estimated</p>
          <p className="z-stencil text-sm font-semibold text-zarewa-teal">
            {env.estimatedNgn > 0 ? formatNgn(env.estimatedNgn) : '—'}
          </p>
        </div>
        <div>
          <p className={TEXT.label}>Spent</p>
          <p className="z-stencil text-sm font-semibold text-[var(--z-text)]">{formatNgn(env.spentNgn || 0)}</p>
        </div>
        <div>
          <p className={TEXT.label}>Remaining</p>
          <p
            className={`z-stencil text-sm font-semibold ${
              env.overEnvelope ? 'text-rose-800' : 'text-[var(--z-text)]'
            }`}
          >
            {remaining == null ? '—' : formatNgn(remaining)}
          </p>
        </div>
      </div>
      <p className={`mt-2 font-medium ${TEXT.label}`}>
        {env.shopFloorOpen ? 'Machine still off the line' : 'Machine back on the line'}
        {' · '}
        {env.costOpen ? 'Costs still open' : 'Finances closed'}
      </p>
      {env.estimatedNgn <= 0 && env.costOpen ? (
        <p className={`mt-1 ${TEXT.label}`}>
          No estimate yet — spend still posts against this job.
        </p>
      ) : null}
    </div>
  );
}
