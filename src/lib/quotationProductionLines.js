/**
 * Quotation line extraction for production register (mirrors server accessoryFulfillment / writeOps).
 */

export function parseLineQty(value) {
  const n = Number(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

/** Normalized products / accessories / services arrays from snapshot quotation row. */
export function quotationLinesGrouped(q) {
  if (!q) return { products: [], accessories: [], services: [] };
  const ql = q.quotationLines;
  if (ql && typeof ql === 'object') {
    return {
      products: Array.isArray(ql.products) ? ql.products : [],
      accessories: Array.isArray(ql.accessories) ? ql.accessories : [],
      services: Array.isArray(ql.services) ? ql.services : [],
    };
  }
  const raw = q.linesJson ?? q.lines_json;
  if (raw) {
    try {
      const j = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (j && typeof j === 'object') {
        return {
          products: Array.isArray(j.products) ? j.products : [],
          accessories: Array.isArray(j.accessories) ? j.accessories : [],
          services: Array.isArray(j.services) ? j.services : [],
        };
      }
    } catch {
      /* ignore */
    }
  }
  return { products: [], accessories: [], services: [] };
}

export function quotationHasPositiveCategoryLines(q, category) {
  const arr = quotationLinesGrouped(q)[category];
  return arr.some((row) => String(row?.name ?? '').trim() && parseLineQty(row?.qty) > 0);
}

/** Quote has accessory or service lines with qty but no roofing / flat-sheet product metres. */
export function quotationIsAccessoriesOnlyForProduction(q) {
  return (
    (quotationHasPositiveCategoryLines(q, 'accessories') ||
      quotationHasPositiveCategoryLines(q, 'services')) &&
    !quotationHasPositiveCategoryLines(q, 'products')
  );
}

/**
 * Accessory lines for production completion UI.
 * @returns {{ quoteLineId: string; name: string; ordered: number }[]}
 */
export function quotedAccessoryLinesForProduction(q) {
  const { accessories } = quotationLinesGrouped(q);
  return accessories
    .filter((r) => {
      const n = String(r?.name ?? '').trim();
      const qn = parseLineQty(r?.qty);
      return n && qn > 0;
    })
    .map((r) => ({
      quoteLineId: String(r.id ?? r.lineId ?? '').trim(),
      name: String(r.name ?? '').trim(),
      ordered: parseLineQty(r?.qty),
    }));
}
