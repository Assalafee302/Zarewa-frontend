import { canonicalColourName } from './stockCheckMasterOptions.js';
import { stoneSpecKey, inferStoneDesign } from './storeStoneSpecAggregate.js';

/** @typedef {'quarter'|'half_year'|'year'} StoreHeroPeriod */

export const STORE_HERO_PERIODS = [
  { id: 'quarter', label: 'Quarter', months: 3 },
  { id: 'half_year', label: 'Half-year', months: 6 },
  { id: 'year', label: 'Year', months: 12 },
];

export const STORE_HERO_COUNT = 5;

function toIsoDay(value) {
  const s = String(value || '').trim();
  return s ? s.slice(0, 10) : '';
}

function coilFamilyFromQuoteOrJob(materialTypeName, productHint) {
  const blob = `${materialTypeName || ''} ${productHint || ''}`.toLowerCase();
  if (blob.includes('stone')) return 'stone';
  if (blob.includes('alumin')) return 'aluminium';
  return 'aluzinc';
}

function normalizeGauge(raw) {
  const s = String(raw || '').trim();
  if (!s) return '—';
  const m = s.match(/(\d+(?:\.\d+)?)/);
  return m ? m[1] : s;
}

function periodStartISO(periodId, asOfISO) {
  const end = toIsoDay(asOfISO) || toIsoDay(new Date().toISOString());
  const months = STORE_HERO_PERIODS.find((p) => p.id === periodId)?.months || 3;
  const d = new Date(`${end}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return end.slice(0, 8) + '01';
  d.setUTCMonth(d.getUTCMonth() - (months - 1));
  d.setUTCDate(1);
  return d.toISOString().slice(0, 10);
}

function jobCompleteISO(job) {
  return toIsoDay(
    job?.completedAtISO ||
      job?.completed_at_iso ||
      job?.endDateISO ||
      job?.end_date_iso ||
      job?.updatedAtISO ||
      job?.startDateISO ||
      job?.createdAtISO
  );
}

function quoteByRef(quotations) {
  /** @type {Map<string, object>} */
  const map = new Map();
  for (const q of quotations || []) {
    const ref = String(q.quotationRef || q.id || q.quotationID || '').trim();
    if (ref) map.set(ref, q);
  }
  return map;
}

/**
 * Aggregate metres produced by Material × Colour × Gauge for a period.
 * Coils: family|colour|gauge. Stone: stone|design|colour|gauge.
 *
 * @param {object} params
 * @param {object[]} params.productionJobs
 * @param {object[]} [params.quotations]
 * @param {StoreHeroPeriod} [params.period]
 * @param {string} [params.asOfISO]
 * @param {object|null} [params.masterData]
 * @param {'coil'|'stone'|'all'} [params.familyScope]
 */
export function buildMetresBySpec({
  productionJobs = [],
  quotations = [],
  period = 'quarter',
  asOfISO,
  masterData = null,
  familyScope = 'coil',
} = {}) {
  const end = toIsoDay(asOfISO) || toIsoDay(new Date().toISOString());
  const start = periodStartISO(period, end);
  const qMap = quoteByRef(quotations);

  /** @type {Map<string, { key: string, family: string, design?: string, colour: string, gauge: string, metres: number, jobCount: number }>} */
  const byKey = new Map();

  for (const job of productionJobs || []) {
    const st = String(job.status || '').toLowerCase();
    if (st && st !== 'completed' && st !== 'complete') continue;
    const metres = Number(job.actualMeters ?? job.actual_meters ?? job.producedMeters);
    if (!Number.isFinite(metres) || metres <= 0) continue;
    const day = jobCompleteISO(job);
    if (!day || day < start || day > end) continue;

    const q = qMap.get(String(job.quotationRef || job.quotation_ref || '').trim()) || null;
    const colourRaw = q
      ? q.materialColor ?? q.material_color ?? q.color ?? job.colour ?? job.color
      : job.colour ?? job.color;
    const gaugeRaw = q
      ? q.materialGauge ?? q.material_gauge ?? q.gauge ?? job.gaugeLabel ?? job.gauge
      : job.gaugeLabel ?? job.gauge;
    const colour = canonicalColourName(masterData, colourRaw || '') || String(colourRaw || '').trim() || '—';
    const gauge = normalizeGauge(gaugeRaw);
    const family = coilFamilyFromQuoteOrJob(
      q?.materialType ?? q?.material_type ?? job.materialTypeName,
      job.productName || job.productID
    );

    if (familyScope === 'coil' && family === 'stone') continue;
    if (familyScope === 'stone' && family !== 'stone') continue;

    let key;
    let design = '';
    if (family === 'stone') {
      design =
        String(q?.stoneDesign || q?.stone_design || q?.designLabel || job.stoneDesign || '').trim() ||
        inferStoneDesign({
          productID: job.productID,
          name: job.productName,
          dashboardAttrs: { stoneDesign: job.stoneDesign },
        });
      key = stoneSpecKey(design, colour, gauge);
    } else {
      key = `${family}|${colour}|${gauge}`;
    }

    const prev = byKey.get(key) || {
      key,
      family,
      design: design || undefined,
      colour,
      gauge,
      metres: 0,
      jobCount: 0,
    };
    prev.metres += metres;
    prev.jobCount += 1;
    byKey.set(key, prev);
  }

  return {
    startISO: start,
    endISO: end,
    period,
    rows: [...byKey.values()].sort((a, b) => b.metres - a.metres),
  };
}

/**
 * Top N heroes per family for period.
 * @param {object} metresPack
 * @param {number} [heroCount]
 * @param {{ families?: Array<'aluminium'|'aluzinc'|'stone'> }} [opts]
 */
export function pickStoreHeroes(metresPack, heroCount = STORE_HERO_COUNT, opts = {}) {
  const n = Math.max(1, Number(heroCount) || STORE_HERO_COUNT);
  const families =
    Array.isArray(opts.families) && opts.families.length ? opts.families : ['aluzinc', 'aluminium'];
  /** @type {Record<string, object[]>} */
  const byFamily = Object.fromEntries(families.map((f) => [f, []]));
  for (const row of metresPack?.rows || []) {
    if (!byFamily[row.family]) continue;
    byFamily[row.family].push(row);
  }
  const heroes = [];
  for (const fam of families) {
    heroes.push(
      ...(byFamily[fam] || []).slice(0, n).map((r, i) => ({ ...r, heroRank: i + 1, heroFamily: fam }))
    );
  }
  /** @type {Set<string>} */
  const heroKeys = new Set(heroes.map((h) => h.key));
  /** @type {Map<string, object>} */
  const metresByKey = new Map((metresPack?.rows || []).map((r) => [r.key, r]));
  return {
    heroes,
    heroKeys,
    metresByKey,
    period: metresPack?.period,
    startISO: metresPack?.startISO,
    endISO: metresPack?.endISO,
  };
}

/**
 * Restock clearance rows: below-min specs, heroes first, max N (coils, kg).
 * @param {object[]} specRows from buildCoilSpecBoardRows
 * @param {Set<string>} heroKeys
 * @param {{ max?: number }} [opts]
 */
export function buildRestockClearanceRows(specRows, heroKeys, opts = {}) {
  const max = Number(opts.max) > 0 ? Number(opts.max) : 3;
  const heroes = heroKeys instanceof Set ? heroKeys : new Set();
  const below = (specRows || []).filter((r) => r.belowMin && Number(r.shortfallKg) > 0);
  below.sort((a, b) => {
    const ha = heroes.has(a.key) ? 1 : 0;
    const hb = heroes.has(b.key) ? 1 : 0;
    if (hb !== ha) return hb - ha;
    return (Number(b.shortfallKg) || 0) - (Number(a.shortfallKg) || 0);
  });
  return below.slice(0, max).map((r) => ({
    id: `restock-${r.key}`,
    kind: 'restock',
    title: heroes.has(r.key) ? 'Restock hero' : 'Restock below min',
    detail: `${r.colour} · ${r.gauge} · ${r.familyLabel} · short ${Math.round(r.shortfallKg).toLocaleString()} kg`,
    meta: `avail ${Math.round(r.availableKg).toLocaleString()} · min ${Math.round(r.restockMinKg).toLocaleString()}`,
    refId: r.key,
    severity: heroes.has(r.key) ? 'high' : 'warn',
    score: heroes.has(r.key) ? 72 : 65,
    cta: 'Request stock',
    action: 'restock',
    restock: {
      colour: r.colour,
      gauge: r.gauge,
      materialType: r.familyLabel,
      requestedKg: Math.max(1, Math.ceil(Number(r.shortfallKg) || 0)),
      family: r.family,
    },
  }));
}

/**
 * Stone restock clearance (metres). Merges with coil rows at caller (max shared ≤3).
 */
export function buildStoneRestockClearanceRows(specRows, heroKeys, opts = {}) {
  const max = Number(opts.max) > 0 ? Number(opts.max) : 3;
  const heroes = heroKeys instanceof Set ? heroKeys : new Set();
  const below = (specRows || []).filter((r) => r.belowMin && Number(r.shortfallM) > 0);
  below.sort((a, b) => {
    const ha = heroes.has(a.key) ? 1 : 0;
    const hb = heroes.has(b.key) ? 1 : 0;
    if (hb !== ha) return hb - ha;
    return (Number(b.shortfallM) || 0) - (Number(a.shortfallM) || 0);
  });
  return below.slice(0, max).map((r) => ({
    id: `restock-stone-${r.key}`,
    kind: 'restock',
    title: heroes.has(r.key) ? 'Restock stone hero' : 'Restock stone below min',
    detail: `${r.design} · ${r.colour} · ${r.gauge} · short ${Math.round(r.shortfallM).toLocaleString()} m`,
    meta: `avail ${Math.round(r.availableM).toLocaleString()} m · min ${Math.round(r.restockMinM).toLocaleString()} m`,
    refId: r.key,
    severity: heroes.has(r.key) ? 'high' : 'warn',
    score: heroes.has(r.key) ? 71 : 64,
    cta: 'Request stock',
    action: 'restock',
    restock: {
      colour: r.colour,
      gauge: r.gauge,
      materialType: `Stone · ${r.design}`,
      requestedKg: Math.max(1, Math.ceil(Number(r.shortfallM) || 0)),
      family: 'stone',
      unit: 'm',
      design: r.design,
    },
  }));
}
