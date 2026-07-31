/**
 * Org store restock thresholds (Admin/MD editable).
 * Blob: org.store_restock.v1
 *
 * {
 *   coilRestockMinKg: 700,
 *   stoneRestockMinM: 400,
 *   specMinOverrides: [{ family, colour, gauge, minKg }]
 * }
 */

export const DEFAULT_COIL_RESTOCK_MIN_KG = 700;
export const DEFAULT_STONE_RESTOCK_MIN_M = 400;

function normalizeGauge(raw) {
  const s = String(raw || '').trim();
  if (!s) return '—';
  const m = s.match(/(\d+(?:\.\d+)?)/);
  return m ? m[1] : s;
}

function normalizeFamily(raw) {
  const s = String(raw || '').toLowerCase();
  if (s.includes('alumin')) return 'aluminium';
  if (s.includes('aluzinc') || s === 'aluzinc') return 'aluzinc';
  return s === 'aluminium' ? 'aluminium' : 'aluzinc';
}

/**
 * @param {unknown} raw
 * @returns {{ family: string, colour: string, gauge: string, minKg: number, key: string }[]}
 */
export function normalizeSpecMinOverrides(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const colour = String(row.colour || row.color || '').trim();
    const gauge = normalizeGauge(row.gauge || row.gaugeLabel);
    const minKg = Number(row.minKg ?? row.min_kg);
    if (!colour || colour === '—' || gauge === '—' || !Number.isFinite(minKg) || minKg <= 0) continue;
    const family = normalizeFamily(row.family || row.materialType || 'aluzinc');
    const key = `${family}|${colour}|${gauge}`;
    out.push({ family, colour, gauge, minKg, key });
  }
  // Deduplicate by key — last wins
  const map = new Map(out.map((r) => [r.key, r]));
  return [...map.values()];
}

/**
 * @param {unknown} raw
 */
export function normalizeOrgStoreRestock(raw) {
  if (!raw || typeof raw !== 'object') {
    return {
      coilRestockMinKg: DEFAULT_COIL_RESTOCK_MIN_KG,
      stoneRestockMinM: DEFAULT_STONE_RESTOCK_MIN_M,
      specMinOverrides: [],
    };
  }
  const coil = Number(raw.coilRestockMinKg ?? raw.coil_restock_min_kg);
  const stone = Number(raw.stoneRestockMinM ?? raw.stone_restock_min_m);
  return {
    coilRestockMinKg:
      Number.isFinite(coil) && coil > 0 ? coil : DEFAULT_COIL_RESTOCK_MIN_KG,
    stoneRestockMinM:
      Number.isFinite(stone) && stone > 0 ? stone : DEFAULT_STONE_RESTOCK_MIN_M,
    specMinOverrides: normalizeSpecMinOverrides(raw.specMinOverrides ?? raw.spec_min_overrides),
  };
}

/**
 * @param {object} prev
 * @param {object} body
 */
export function mergeOrgStoreRestockBlob(prev, body) {
  const base = normalizeOrgStoreRestock(prev);
  const next = { ...base };
  if (body && typeof body === 'object') {
    if (body.coilRestockMinKg != null || body.coil_restock_min_kg != null) {
      const n = Number(body.coilRestockMinKg ?? body.coil_restock_min_kg);
      if (Number.isFinite(n) && n > 0) next.coilRestockMinKg = n;
    }
    if (body.stoneRestockMinM != null || body.stone_restock_min_m != null) {
      const n = Number(body.stoneRestockMinM ?? body.stone_restock_min_m);
      if (Number.isFinite(n) && n > 0) next.stoneRestockMinM = n;
    }
    if (body.specMinOverrides != null || body.spec_min_overrides != null) {
      next.specMinOverrides = normalizeSpecMinOverrides(
        body.specMinOverrides ?? body.spec_min_overrides
      );
    }
  }
  return next;
}

/**
 * Resolve min kg for a spec (override wins).
 * @param {number} defaultMinKg
 * @param {Array<{ key?: string, family?: string, colour?: string, gauge?: string, minKg: number }>} overrides
 * @param {{ family: string, colour: string, gauge: string }} spec
 */
export function resolveCoilRestockMinKg(defaultMinKg, overrides, spec) {
  const fallback = Number(defaultMinKg) > 0 ? Number(defaultMinKg) : DEFAULT_COIL_RESTOCK_MIN_KG;
  const family = normalizeFamily(spec?.family);
  const colour = String(spec?.colour || '').trim();
  const gauge = normalizeGauge(spec?.gauge);
  const key = `${family}|${colour}|${gauge}`;
  const list = Array.isArray(overrides) ? overrides : [];
  const hit = list.find((r) => r.key === key || (`${normalizeFamily(r.family)}|${r.colour}|${normalizeGauge(r.gauge)}` === key));
  if (hit && Number(hit.minKg) > 0) return Number(hit.minKg);
  return fallback;
}
