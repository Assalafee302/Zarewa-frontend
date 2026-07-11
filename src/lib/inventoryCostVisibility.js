/**
 * Strip purchase / landed cost fields from inventory payloads for non-finance roles.
 * @param {object|null|undefined} row
 * @param {{ allowCosts?: boolean }} [opts]
 */
export function stripInventoryCostFields(row, opts = {}) {
  if (!row || typeof row !== 'object' || opts.allowCosts) return row;
  const out = { ...row };
  const keys = [
    'unitCostNgnPerKg',
    'unit_cost_ngn_per_kg',
    'landedCostNgn',
    'landed_cost_ngn',
    'valueNgn',
    'value_ngn',
    'unitPriceNgn',
    'unit_price_ngn',
    'unitPriceNgnPerM',
    'totalClosingValueNgn',
  ];
  for (const k of keys) {
    if (k in out) delete out[k];
  }
  return out;
}

/**
 * @param {'store'|'manager'|'procurement'|'finance'|string} viewMode
 */
export function viewModeAllowsInventoryCosts(viewMode) {
  const v = String(viewMode || '').toLowerCase();
  return v === 'finance' || v === 'procurement' || v === 'reports';
}
