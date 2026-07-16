/**
 * Pure apply step for QuotationModal workbook auto-price refresh.
 * Must return the same `prev` reference when nothing changed — rewriting rows
 * every time caused React #185 (product select → options → refresh → rows → …).
 *
 * Default unit price = published/suggested list. Sales may edit above list freely.
 * Below-floor quotes stay editable (MD approval gates cutting list / production).
 * Auto-refresh only fills empty lines or lines still on the previous list default;
 * it must not overwrite a custom unit price.
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
 * }} ctx
 * @returns {object[]}
 */
export function applyWorkbookPricesToProductRows(prev, ctx) {
  const options = Array.isArray(ctx.options) ? ctx.options : [];
  const priceOf = ctx.resolveUnitPrice;
  const metaOf = ctx.resolveWorkbookLineMeta;
  if (typeof priceOf !== 'function' || typeof metaOf !== 'function') return prev;

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
    const listUnit = String(price);
    const nextFloorStr = wbMeta?.floorPerMeter != null ? String(wbMeta.floorPerMeter) : '';
    const nextRecStr =
      wbMeta?.suggestedListPerMeter != null ? String(wbMeta.suggestedListPerMeter) : '';
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
    // Still on the prior list default → safe to roll forward when list changes.
    const trackingListDefault = prevRecStr !== '' && prevUnit === prevRecStr;
    const shouldApplyListDefault = emptyUnit || trackingListDefault;
    const nextUnit = shouldApplyListDefault ? listUnit : prevUnit;
    const floorSame = nextFloorStr === '' || prevFloorStr === nextFloorStr;
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
    return {
      ...row,
      unitPrice: nextUnit,
      ...(nextGirthMm && nextGirthMm !== row.girthMm ? { girthMm: nextGirthMm } : {}),
      ...(wbMeta?.floorPerMeter ? { floorPricePerMeter: wbMeta.floorPerMeter } : {}),
      ...(wbMeta?.suggestedListPerMeter
        ? { recommendedPricePerMeter: wbMeta.suggestedListPerMeter }
        : {}),
    };
  });
  return anyChange ? next : prev;
}
