/**
 * Pure apply step for QuotationModal workbook auto-price refresh.
 * Must return the same `prev` reference when nothing changed — rewriting rows
 * every time caused React #185 (product select → options → refresh → rows → …).
 *
 * Default unit price = branch workbook **floor** (minimum ₦/m). Sales may raise
 * toward/above list freely. Below-floor quotes stay editable (MD approval gates
 * cutting list / production). Auto-refresh only fills empty lines, or (for **new**
 * quotes) lines still on the previous floor default. Existing saved quotes pass
 * `rollForwardFloorDefaults: false` so a later publish cannot reprice them.
 * recommendedPricePerMeter stores the branch **list** (floor+commission) for the
 * List badge; floorPricePerMeter is the roll-forward default.
 */

import { isMeterSheetProductLine } from './materialWorkbookQuotationPrice.js';
import {
  defaultGirthMmForTrimProduct,
  isQuotationTrimProductLine,
  normQuoteProductLineName,
} from './cuttingListBlankConsumption.js';

/** @param {unknown} name */
export function productUsesWorkbookAutoPrice(name) {
  const n = normQuoteProductLineName(name);
  return isMeterSheetProductLine(name) || n === 'cladding' || isQuotationTrimProductLine(name);
}

/**
 * @param {object[]} prev
 * @param {{
 *   options: { name: string }[];
 *   resolveUnitPrice: (name: string, option: object | null, opts?: { girthMm?: string }) => number;
 *   resolveWorkbookLineMeta: (name: string, opts?: { girthMm?: string | number }) => null | { floorPerMeter?: number; suggestedListPerMeter?: number };
 *   rollForwardFloorDefaults?: boolean;
 * }} ctx
 * @returns {object[]}
 */
export function applyWorkbookPricesToProductRows(prev, ctx) {
  const options = Array.isArray(ctx.options) ? ctx.options : [];
  const priceOf = ctx.resolveUnitPrice;
  const metaOf = ctx.resolveWorkbookLineMeta;
  if (typeof priceOf !== 'function' || typeof metaOf !== 'function') return prev;
  // Existing quotes: fill empty units only — never roll a saved floor forward after a later publish.
  const rollForwardFloorDefaults = ctx.rollForwardFloorDefaults !== false;

  let anyChange = false;
  const next = prev.map((row) => {
    const name = String(row.name ?? '').trim();
    if (!name || !productUsesWorkbookAutoPrice(name)) return row;
    const option = options.find((o) => o.name === name) || null;
    const girthMm =
      row.girthMm || (isQuotationTrimProductLine(name) ? String(defaultGirthMmForTrimProduct(name)) : '');
    const price = priceOf(name, option, { girthMm });
    if (!(price > 0)) return row;
    const wbMeta = metaOf(name, { girthMm });
    const nextGirthMm =
      isQuotationTrimProductLine(name) && !row.girthMm && girthMm ? girthMm : row.girthMm;
    const floorUnit = String(price);
    const nextFloorStr =
      wbMeta?.floorPerMeter != null && Number(wbMeta.floorPerMeter) > 0
        ? String(wbMeta.floorPerMeter)
        : floorUnit;
    // List badge / commission reference — not the default unit.
    const nextRecStr =
      wbMeta?.suggestedListPerMeter != null && Number(wbMeta.suggestedListPerMeter) > 0
        ? String(wbMeta.suggestedListPerMeter)
        : '';
    const prevFloorStr =
      row.floorPricePerMeter != null && row.floorPricePerMeter !== ''
        ? String(row.floorPricePerMeter)
        : '';
    const prevRecStr =
      row.recommendedPricePerMeter != null && row.recommendedPricePerMeter !== ''
        ? String(row.recommendedPricePerMeter)
        : '';
    const prevUnit = String(row.unitPrice ?? '');
    const prevUnitNum = Number(prevUnit);
    const emptyUnit = !(prevUnitNum > 0);
    // Still on the prior floor default → safe to roll forward when floor changes (new quotes only).
    const trackingFloorDefault = prevFloorStr !== '' && prevUnit === prevFloorStr;
    const shouldApplyFloorDefault =
      emptyUnit || (rollForwardFloorDefaults && trackingFloorDefault);
    const nextUnit = shouldApplyFloorDefault ? floorUnit : prevUnit;
    // Existing saved quotes freeze their stamped floor; new quotes may refresh the badge floor.
    const stampedFloorStr =
      !rollForwardFloorDefaults && prevFloorStr
        ? prevFloorStr
        : nextFloorStr || prevFloorStr;
    const floorSame = stampedFloorStr === '' || prevFloorStr === stampedFloorStr;
    const recSame = nextRecStr === '' || prevRecStr === nextRecStr;
    if (
      prevUnit === nextUnit &&
      String(row.girthMm ?? '') === String(nextGirthMm ?? '') &&
      floorSame &&
      recSame
    ) {
      return row;
    }
    anyChange = true;
    const nextRecNum = Number(nextRecStr);
    const stampedFloorNum = Number(stampedFloorStr);
    return {
      ...row,
      unitPrice: nextUnit,
      ...(nextGirthMm && nextGirthMm !== row.girthMm ? { girthMm: nextGirthMm } : {}),
      ...(stampedFloorNum > 0 ? { floorPricePerMeter: stampedFloorNum } : {}),
      ...(nextRecNum > 0
        ? { recommendedPricePerMeter: nextRecNum }
        : prevRecStr
          ? {}
          : {}),
    };
  });
  return anyChange ? next : prev;
}
