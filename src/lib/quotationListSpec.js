import {
  quotationLinesJsonShapeForGauge,
  quotedGaugeLabelForSubstitutionComparison,
} from './quotedGaugeForSubstitution.js';

/**
 * Colour on a sales-list quotation (header first).
 * @param {object | null | undefined} q
 * @returns {string}
 */
export function quotationListColour(q) {
  if (!q) return '';
  const shape = quotationLinesJsonShapeForGauge(q);
  const fromShape = String(shape?.materialColor ?? '').trim();
  if (fromShape) return fromShape;
  const ql = q.quotationLines;
  if (ql && typeof ql === 'object') {
    const nested = String(ql.materialColor ?? ql.material_color ?? '').trim();
    if (nested) return nested;
  }
  return String(q.materialColor ?? q.material_color ?? '').trim();
}

/**
 * Gauge on a sales-list quotation (strictest header/line gauge).
 * @param {object | null | undefined} q
 * @returns {string}
 */
export function quotationListGauge(q) {
  if (!q) return '';
  const shape = quotationLinesJsonShapeForGauge(q);
  if (shape) {
    const g = quotedGaugeLabelForSubstitutionComparison(shape);
    if (g) return g;
  }
  const raw = q.quotationLines ?? q.linesJson;
  return quotedGaugeLabelForSubstitutionComparison(raw) || String(q.materialGauge ?? q.material_gauge ?? '').trim();
}
