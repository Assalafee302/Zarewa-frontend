/**
 * Read-only GL / treasury impact hints for refund breakdown categories (payout stage).
 * Mirrors server payout policy in ap1cReversalRefundOps — informational for finance review.
 */

/** @type {Record<string, { posting: string; note: string }>} */
export const REFUND_CATEGORY_GL_HINTS = {
  Overpayment: {
    posting: 'Dr 2500 Customer deposits · Cr 1000 Cash/Bank',
    note: 'Economic excess on this quotation only — reduces deposit pool, not recognised revenue.',
  },
  'Order cancellation': {
    posting: 'Dr 2500 · revenue/AR review if post-production',
    note: 'May require manual journals if production revenue was already recognised.',
  },
  'Unproduced meterage': {
    posting: 'Dr 2500 · Dr 4100/1200 review if post-production',
    note: 'Credit for metres not produced; reconcile with production logs before payout.',
  },
  'Transport issue': {
    posting: 'Dr 2500 · service revenue review',
    note: 'Transport/service income may need a compensating revenue line post-production.',
  },
  'Installation issue': {
    posting: 'Dr 2500 · service revenue review',
    note: 'Installation service refund — verify delivery/install sign-off.',
  },
  'Additional services': {
    posting: 'Dr 2500 · ancillary revenue review',
    note: 'Non-roofing service lines — map to the service revenue account used on the quote.',
  },
  'Accessory shortfall': {
    posting: 'Dr 2500 · product revenue review',
    note: 'Accessory shortfall credit — ties to fulfilled accessory quantities.',
  },
  'Stone flatsheet shortfall': {
    posting: 'Dr 2500 · product revenue review',
    note: 'Stone flatsheet m² shortfall — uses production supplied + deduction basis.',
  },
  'Calculation error': {
    posting: 'Dr 2500 · AR/revenue review',
    note: 'Pricing or quantity correction — document the error in reason notes.',
  },
  'Substitution Difference': {
    posting: 'Dr 2500 · material margin review',
    note: 'Gauge substitution credit — quoted ₦/m minus workbook floor for allocated coil.',
  },
  'Customer commission': {
    posting: 'Dr 2500 · selling expense / margin review',
    note: 'Agent commission — capped by minimum selling ₦/m and refundable headroom.',
  },
  Other: {
    posting: 'Dr 2500 · manual GL review',
    note: 'Classify with Finance before payout if amount is material.',
  },
};

const DEFAULT_GL_HINT = REFUND_CATEGORY_GL_HINTS.Other;

/**
 * @param {string[]} categories
 * @param {{ hasCompletedProduction?: boolean }} [ctx]
 * @returns {{ category: string; posting: string; note: string; revenueReview?: boolean }[]}
 */
export function refundGlImpactRows(categories, ctx = {}) {
  const uniq = [...new Set((categories || []).map((c) => String(c || '').trim()).filter(Boolean))];
  const postProd = Boolean(ctx.hasCompletedProduction);
  return uniq.map((category) => {
    const hint = REFUND_CATEGORY_GL_HINTS[category] || DEFAULT_GL_HINT;
    const revenueReview =
      postProd && category !== 'Overpayment' && !String(hint.posting).includes('2500 only');
    return {
      category,
      posting: hint.posting,
      note: revenueReview
        ? `${hint.note} Treasury posts Dr 2500/Cr 1000; revenue or AR correction may need a separate journal.`
        : hint.note,
      revenueReview,
    };
  });
}

/**
 * @param {object[]} calculationLines
 * @param {{ hasCompletedProduction?: boolean }} [ctx]
 */
export function refundGlImpactFromLines(calculationLines, ctx = {}) {
  const cats = [];
  for (const line of calculationLines || []) {
    if (line?.include === false) continue;
    const amt = Number(String(line?.amountNgn ?? '').replace(/,/g, ''));
    if (!Number.isFinite(amt) || amt <= 0) continue;
    const multi = line.appliesToCategories;
    if (Array.isArray(multi) && multi.length) {
      for (const c of multi) {
        if (c) cats.push(String(c).trim());
      }
    } else if (line.category) {
      cats.push(String(line.category).trim());
    }
  }
  return refundGlImpactRows(cats, ctx);
}
