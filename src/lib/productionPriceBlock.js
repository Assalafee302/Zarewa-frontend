/**
 * Production start blocked when quoted ₦/m is below current workbook floor.
 */

export function isProductionPriceListBlockCode(code) {
  return code === 'PRICE_LIST_BM_APPROVAL_REQUIRED' || code === 'PRICE_LIST_MD_APPROVAL_REQUIRED';
}

/**
 * @param {{ error?: string; code?: string; violations?: Array<Record<string, unknown>> } | null | undefined} data
 * @param {string} [fallback]
 */
export function formatProductionPriceBlockMessage(data, fallback) {
  const base =
    (data && typeof data.error === 'string' && data.error.trim()) ||
    fallback ||
    'Production could not be started — quoted price is below the current workbook floor.';
  if (!data || !isProductionPriceListBlockCode(data.code)) return base;
  const violations = Array.isArray(data.violations) ? data.violations : [];
  if (!violations.length) return base;
  const detail = violations
    .map((v) => {
      const quoted = v.quotedPerMeter ?? v.quoted_per_meter;
      const min = v.minAllowedPerMeter ?? v.min_allowed_per_meter ?? v.floorPerMeter ?? v.floor_per_meter;
      return `${v.lineCategory || 'line'} #${Number(v.lineIndex) + 1}: quoted ₦${quoted}/m < min ₦${min}/m`;
    })
    .join(' · ');
  return `${base} — ${detail}`;
}
