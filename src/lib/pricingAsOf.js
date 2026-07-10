/**
 * Mirror of Zarewa-backend-main/server/pricingAsOf.js (selectPriceListRowsAsOf + helpers).
 * Keep in sync when changing as-of collapse rules.
 */

const DEFAULT_EFFECTIVE_FROM = '2020-01-01';

function normKey(s) {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/** @param {string | null | undefined} iso */
export function normalizePricingAsAtIso(iso) {
  const t = String(iso ?? '').trim().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Local calendar YYYY-MM-DD (avoids UTC midnight shifting the business day). */
export function localCalendarDateIso(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** @param {Record<string, unknown>} row */
function priceListRowEffectiveFrom(row) {
  const e = String(row.effective_from_iso ?? row.effectiveFromIso ?? '').trim().slice(0, 10);
  return e || DEFAULT_EFFECTIVE_FROM;
}

/** @param {Record<string, unknown>} row */
function priceListScopeKey(row) {
  const branch = row.branch_id != null && String(row.branch_id).trim()
    ? String(row.branch_id).trim()
    : row.branchId != null && String(row.branchId).trim()
      ? String(row.branchId).trim()
      : '';
  return [
    normKey(row.gauge_key ?? row.gaugeKey),
    normKey(row.design_key ?? row.designKey),
    branch,
    normKey(row.material_type_key ?? row.materialTypeKey ?? ''),
    normKey(row.colour_key ?? row.colourKey ?? ''),
    normKey(row.profile_key ?? row.profileKey ?? ''),
  ].join('\0');
}

/**
 * Collapse price list rows to one per scope — latest effective_from on/before asAt.
 * @param {Record<string, unknown>[]} allRows
 * @param {string} asAtIso
 */
export function selectPriceListRowsAsOf(allRows, asAtIso) {
  const asAt = normalizePricingAsAtIso(asAtIso);
  /** @type {Map<string, Record<string, unknown>>} */
  const bestByScope = new Map();
  for (const r of allRows || []) {
    const eff = priceListRowEffectiveFrom(r);
    if (eff > asAt) continue;
    const key = priceListScopeKey(r);
    const prev = bestByScope.get(key);
    if (!prev || priceListRowEffectiveFrom(prev) < eff) {
      bestByScope.set(key, r);
    }
  }
  return [...bestByScope.values()];
}
