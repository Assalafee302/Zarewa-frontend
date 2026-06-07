/** Planned vs actual metre variance (mirrors backend shared/lib/productionMetreVariance.js). */
export const PRODUCTION_METRE_VARIANCE_WARN_PCT = 5;

export function metreVariancePct(plannedMeters, actualMeters) {
  const planned = Number(plannedMeters) || 0;
  const actual = Number(actualMeters) || 0;
  if (planned <= 0) return null;
  return Math.round(((actual - planned) / planned) * 1000) / 10;
}

export function metreVarianceExceedsThreshold(
  plannedMeters,
  actualMeters,
  thresholdPct = PRODUCTION_METRE_VARIANCE_WARN_PCT
) {
  const pct = metreVariancePct(plannedMeters, actualMeters);
  if (pct == null) return false;
  return Math.abs(pct) > thresholdPct;
}
