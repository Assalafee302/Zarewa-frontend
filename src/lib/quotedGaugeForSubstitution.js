/**
 * Mirror of backend `shared/lib/quotedGaugeForSubstitution.js` — keep in sync for refund UI labels.
 */

export function firstGaugeMmFromLabel(label) {
  const m = String(label ?? '').match(/(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : null;
}

export function quotedGaugeLabelForSubstitutionComparison(linesJson) {
  const labels = [];
  try {
    const j = typeof linesJson === 'string' ? JSON.parse(linesJson || '{}') : linesJson;
    if (!j || typeof j !== 'object') return '';
    if (typeof j.materialGauge === 'string' && j.materialGauge.trim()) labels.push(j.materialGauge.trim());
    if (Array.isArray(j.products)) {
      for (const p of j.products) {
        const g = String(p?.materialGauge ?? p?.gauge ?? '').trim();
        if (g) labels.push(g);
      }
    }
  } catch {
    return '';
  }
  if (labels.length === 0) return '';
  let best = labels[0];
  let bestMm = firstGaugeMmFromLabel(best);
  if (bestMm == null) bestMm = Number.NEGATIVE_INFINITY;
  for (let i = 1; i < labels.length; i++) {
    const L = labels[i];
    const mm = firstGaugeMmFromLabel(L);
    if (mm != null && (bestMm === Number.NEGATIVE_INFINITY || mm > bestMm)) {
      bestMm = mm;
      best = L;
    }
  }
  if (bestMm === Number.NEGATIVE_INFINITY) return labels[0];
  return best;
}

/** Build lines_json-shaped object from workspace quotation row for gauge helper. */
export function quotationLinesJsonShapeForGauge(q) {
  if (!q) return null;
  const ql = q.quotationLines;
  if (ql && typeof ql === 'object') {
    return {
      materialGauge: q.materialGauge ?? q.material_gauge,
      materialColor: q.materialColor ?? q.material_color,
      materialDesign: q.materialDesign ?? q.material_design,
      materialTypeId: q.materialTypeId ?? q.material_type_id,
      products: ql.products || [],
      accessories: ql.accessories || [],
      services: ql.services || [],
    };
  }
  return null;
}
