/**
 * Classify purchase orders for UI (coil kg vs stone metres vs accessories).
 * Mirrors server/procurementPoKind.js for bootstrap payloads that omit procurementKind.
 */

import {
  deriveProcurementKindFromLineTypes,
  deriveProcurementKindFromPoLines,
  inferLineTypeFromProduct,
  poLinePriceSuffix,
} from './poLineTypes.js';

export function poLineKindForRow(line, poKind = 'coil') {
  const lt = String(line?.lineType || '').trim();
  if (lt === 'stone_meter' || lt === 'stone_flatsheet') return 'stone';
  if (lt === 'accessory') return 'accessory';
  if (lt === 'service') return 'accessory';
  if (lt === 'coil_meter' || lt === 'coil_kg') return 'coil';
  if (poKind === 'mixed') {
    const inferred = inferLineTypeFromProduct(line?.productID, null, line);
    if (inferred === 'stone_meter' || inferred === 'stone_flatsheet') return 'stone';
    if (inferred === 'accessory') return 'accessory';
    return 'coil';
  }
  return poKind;
}

export function deriveProcurementKindFromProductIds(productIds) {
  const ids = (productIds || []).map((x) => String(x ?? '').trim()).filter(Boolean);
  if (ids.length === 0) return 'coil';
  const lineTypes = ids.map((id) => inferLineTypeFromProduct(id));
  return deriveProcurementKindFromLineTypes(lineTypes);
}

/** @param {{ procurementKind?: string; lines?: { productID?: string }[] }} po */
export function procurementKindFromPo(po) {
  const k = String(po?.procurementKind || '').trim().toLowerCase();
  if (k === 'stone' || k === 'accessory' || k === 'coil' || k === 'mixed') return k;
  const lines = po?.lines || [];
  if (lines.length) return deriveProcurementKindFromPoLines(lines);
  const pids = lines.map((l) => l.productID).filter(Boolean);
  return deriveProcurementKindFromProductIds(pids);
}

/**
 * Unit price used for comparisons and labels: ₦/kg (coil), ₦/m (stone), ₦/unit (accessory).
 * Falls back across `unitPricePerKgNgn` / `unitPriceNgn` when one is zero (legacy rows).
 * @param {'coil' | 'stone' | 'accessory'} kind
 */
export function poLineBenchmarkPriceNgn(line, kind) {
  const rowKind = kind === 'mixed' ? poLineKindForRow(line, kind) : kind;
  const up = Math.round(Number(line?.unitPriceNgn) || 0);
  const upkg = Math.round(Number(line?.unitPricePerKgNgn) || 0);
  if (rowKind === 'stone') return up > 0 ? up : upkg;
  if (rowKind === 'accessory') return up > 0 ? up : upkg;
  return upkg > 0 ? upkg : up;
}

/** @param {'coil' | 'stone' | 'accessory' | 'mixed'} kind */
export function poLineQtyLabel(line, kind) {
  const q = Number(line?.qtyOrdered) || 0;
  const lt = String(line?.lineType || '').trim();
  if (lt === 'stone_meter' || (kind === 'stone' && lt !== 'stone_flatsheet')) return `${q.toLocaleString()} m`;
  if (lt === 'stone_flatsheet') return `${q.toLocaleString()} sheets`;
  if (lt === 'service') return `${q.toLocaleString()} lot`;
  if (lt === 'accessory' || kind === 'accessory') return `${q.toLocaleString()} units`;
  if (lt === 'coil_meter') return `${q.toLocaleString()} m`;
  if (kind === 'stone') return `${q.toLocaleString()} m`;
  if (kind === 'accessory') return `${q.toLocaleString()} units`;
  return `${q.toLocaleString()} kg`;
}

/** @param {'coil' | 'stone' | 'accessory' | 'mixed'} kind */
export function poLinePriceSuffixForRow(line, kind) {
  const lt = String(line?.lineType || '').trim();
  if (lt) return poLinePriceSuffix(lt);
  if (kind === 'stone') return '/m';
  if (kind === 'accessory') return '/unit';
  return '/kg';
}

/** Header-level PO kind suffix (legacy callers). */
export { poLinePriceSuffix };
