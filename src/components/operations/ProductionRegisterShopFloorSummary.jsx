import React from 'react';
import { PROD_REG } from '../../lib/productionRegisterUi';
import { ProductionRegisterMetricStrip } from './ProductionRegisterMetricStrip';
import { ProductionRegisterDateFields } from './ProductionRegisterDateFields';

/**
 * Compact shop-floor summary: dates + live KPIs in one block (no nested “Job & target” card).
 */
export function ProductionRegisterShopFloorSummary({
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
  plannedBreakdown,
  formatKg,
  formatMeters,
}) {
  const showDates =
    !readOnly &&
    jobSt !== 'Completed' &&
    jobSt !== 'Cancelled';

  return (
    <div className="space-y-2">
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
      <ProductionRegisterMetricStrip
        compact
        reservedKg={reservedKg}
        usedKg={usedKg}
        plannedM={plannedM}
        outputM={outputM}
        outputPostedM={outputPostedM}
        alertState={alertState}
        plannedBreakdown={plannedBreakdown}
        formatKg={formatKg}
        formatMeters={formatMeters}
      />
    </div>
  );
}
