import { canonicalColourName } from './stockCheckMasterOptions.js';
import { materialFamilyKeyForConversion } from '../shared/lib/coilMaterialFamily.js';

/** @param {object} lot */
export function liveCoilWeightKgForOverview(lot) {
  if (lot.currentWeightKg != null && lot.currentWeightKg !== '') {
    const cw = Number(lot.currentWeightKg);
    if (Number.isFinite(cw)) return Math.max(0, cw);
  }
  if (lot.qtyRemaining != null && lot.qtyRemaining !== '') {
    const qr = Number(lot.qtyRemaining);
    if (Number.isFinite(qr)) return Math.max(0, qr);
  }
  const w = Number(lot.weightKg);
  if (Number.isFinite(w) && w > 0) return w;
  const q = Number(lot.qtyReceived);
  return Number.isFinite(q) ? Math.max(0, q) : 0;
}

/**
 * Kg on this coil that is not already reserved to a job — what a store keeper can actually
 * hand out or a purchase suggestion should treat as "still available". Using the gross figure
 * here (liveCoilWeightKgForOverview) makes a fully-reserved coil read as full stock and
 * suppresses purchase suggestions for material that is already spoken for.
 * @param {object} lot
 */
export function freeCoilWeightKgForOverview(lot) {
  const gross = liveCoilWeightKgForOverview(lot);
  const reserved = Number(lot.qtyReserved) || 0;
  return Math.max(0, gross - Math.max(0, reserved));
}

/**
 * Coarse family bucket for the stock overview. Anything that isn't clearly aluminium or
 * aluzinc (galvanised, stone-coated, or a coil with a blank/unrecognized material_type_name)
 * goes into "unclassified" rather than being silently counted as aluzinc — that previously
 * skewed the Aluzinc tonnage and its auto-generated purchase suggestions.
 */
function coilFamily(materialTypeName) {
  const key = materialFamilyKeyForConversion(materialTypeName);
  if (key === 'aluminium' || key === 'aluzinc') return key;
  return 'unclassified';
}

function emptyFamilyBucket() {
  return { totalKg: 0, lowCount: 0, buckets: new Map() };
}

/**
 * @param {object[]} coilLots
 * @param {{ colours?: object[] } | null | undefined} [masterData]
 */
export function buildCoilStockOverview(coilLots, masterData = null) {
  const active = (coilLots || []).filter((c) => c.currentStatus !== 'Consumed');
  const families = {
    aluminium: emptyFamilyBucket(),
    aluzinc: emptyFamilyBucket(),
    unclassified: emptyFamilyBucket(),
  };

  for (const c of active) {
    const kg = liveCoilWeightKgForOverview(c);
    const freeKg = freeCoilWeightKgForOverview(c);
    const fam = coilFamily(c.materialTypeName);
    const bucket = families[fam];
    // totalKg/lowCount stay gross — this is "how much material is physically here", which is
    // still true of a reserved coil. freeKg (tracked per gauge/colour bucket below) is what
    // purchase suggestions should use instead, so a fully-reserved coil doesn't read as
    // available stock and suppress a suggestion to buy more.
    bucket.totalKg += kg;
    if (kg > 0 && kg < 85) bucket.lowCount += 1;

    const gauge = c.gaugeLabel || '—';
    const colour = canonicalColourName(masterData, c.colour || '') || c.colour || '—';
    const key = `${gauge}|${colour}`;
    const prev = bucket.buckets.get(key) || { gauge, colour, kg: 0, freeKg: 0, coilCount: 0 };
    prev.kg += kg;
    prev.freeKg += freeKg;
    prev.coilCount += 1;
    bucket.buckets.set(key, prev);
  }

  const topBuckets = (map) =>
    [...map.values()].sort((a, b) => b.kg - a.kg).slice(0, 6);

  return {
    totalKg: families.aluminium.totalKg + families.aluzinc.totalKg + families.unclassified.totalKg,
    aluminium: { ...families.aluminium, top: topBuckets(families.aluminium.buckets) },
    aluzinc: { ...families.aluzinc, top: topBuckets(families.aluzinc.buckets) },
    unclassified: { ...families.unclassified, top: topBuckets(families.unclassified.buckets) },
    lowCoilsTotal: families.aluminium.lowCount + families.aluzinc.lowCount + families.unclassified.lowCount,
  };
}

/** Highest on-hand first; zero or negative balances last. */
export function compareSkuStockDisplay(a, b) {
  const sa = Number(a?.stockLevel ?? a?.stock) || 0;
  const sb = Number(b?.stockLevel ?? b?.stock) || 0;
  const aZero = sa <= 0;
  const bZero = sb <= 0;
  if (aZero !== bZero) return aZero ? 1 : -1;
  if (sb !== sa) return sb - sa;
  return String(a?.name || a?.productID || '').localeCompare(String(b?.name || b?.productID || ''));
}

/**
 * One row per product_id — branch-scoped accessories/stone SKUs are summed for display.
 * @param {object[]} products bootstrap / inventory rows
 * @param {(p: object) => boolean} filterPred
 */
export function rollupSkuStockDisplayRows(products, filterPred) {
  const byPid = new Map();
  for (const p of products || []) {
    if (!filterPred(p)) continue;
    const pid = String(p.productID || '').trim();
    if (!pid) continue;
    const stock = Number(p.stockLevel) || 0;
    const prev = byPid.get(pid);
    if (prev) {
      prev.stockLevel = (Number(prev.stockLevel) || 0) + stock;
    } else {
      byPid.set(pid, { ...p, stockLevel: stock });
    }
  }
  return [...byPid.values()].sort(compareSkuStockDisplay);
}

/**
 * @param {object[]} products
 * @param {'stone'|'accessory'} kind
 */
export function buildSkuStockOverview(products, kind) {
  const pred =
    kind === 'stone'
      ? (p) => /^STONE-/i.test(String(p.productID || ''))
      : (p) => /^ACC-/i.test(String(p.productID || ''));

  const rows = rollupSkuStockDisplayRows(products, pred).map((p) => {
    const stock = Number(p.stockLevel) || 0;
    const threshold = Number(p.lowStockThreshold) || 0;
    return {
      productID: p.productID,
      name: p.name || p.productID,
      stock,
      unit: p.unit || '',
      low: threshold > 0 && stock < threshold,
      reorderQty: Number(p.reorderQty) || 0,
    };
  });

  const lowCount = rows.filter((r) => r.low).length;
  const totalOnHand = rows.reduce((s, r) => s + r.stock, 0);
  return { rows: rows.slice(0, 12), lowCount, totalOnHand, totalSkus: rows.length };
}

/**
 * Pending = cutting lists not on production register + active jobs needing coil.
 * @param {object} params
 */
export function buildPendingProductionsOverview({
  cuttingLists,
  productionQueueModel,
  hasWorkspaceData,
}) {
  const pending = [];

  if (!hasWorkspaceData) {
    const offline = productionQueueModel?.sections?.flatMap((s) => s.rows || []) || [];
    for (const row of offline.slice(0, 12)) {
      pending.push({
        id: row.id,
        customer: row.customer,
        label: row.spec || 'Cutting list',
        reason: 'Not registered for production',
        severity: 'high',
      });
    }
    return pending;
  }

  for (const cl of cuttingLists || []) {
    if (cl.productionRegistered) continue;
    pending.push({
      id: cl.id,
      customer: cl.customer || '—',
      label: cl.quotationRef ? `Quote ${cl.quotationRef}` : 'Cutting list',
      reason: 'Awaiting production registration',
      severity: 'high',
    });
  }

  const active =
    productionQueueModel?.sections?.find((s) => s.key === 'active')?.rows ||
    productionQueueModel?.sections?.flatMap((s) => s.rows || []) ||
    [];

  for (const row of active) {
    if (row.needsCoil) {
      pending.push({
        id: row.id,
        customer: row.customer,
        label: row.spec,
        reason: 'Coils not allocated — shop floor blocked',
        severity: 'critical',
      });
    } else if (row.managerReviewRequired) {
      pending.push({
        id: row.id,
        customer: row.customer,
        label: row.spec,
        reason: 'Manager conversion review',
        severity: 'warn',
      });
    } else if (row.overdue) {
      pending.push({
        id: row.id,
        customer: row.customer,
        label: row.spec,
        reason: 'Past due date',
        severity: 'warn',
      });
    }
  }

  return pending.slice(0, 14);
}

/**
 * Suggest coil purchases from low stock buckets + jobs waiting for coil.
 */
export function buildCoilPurchaseSuggestions({ coilStock, pendingProductions, coilLots }) {
  const suggestions = [];
  const seen = new Set();

  for (const row of pendingProductions) {
    if (!String(row.reason || '').toLowerCase().includes('coil')) continue;
    const key = `job:${row.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    suggestions.push({
      key,
      family: 'Check quote material',
      gauge: '—',
      colour: '—',
      kgOnHand: null,
      note: `${row.id} · ${row.label} — allocate or buy coil before start`,
      priority: 'critical',
    });
  }

  for (const fam of ['aluminium', 'aluzinc']) {
    const block = coilStock[fam];
    for (const b of block.top || []) {
      // Judge low-stock purely on free (unreserved) kg — a bucket that's technically full but
      // fully reserved to running jobs is not "available" for a new order and should still
      // prompt a purchase suggestion.
      const free = b.freeKg ?? b.kg;
      if (free >= 500) continue;
      const key = `${fam}|${b.gauge}|${b.colour}`;
      if (seen.has(key)) continue;
      seen.add(key);
      suggestions.push({
        key,
        family: fam === 'aluminium' ? 'Aluminium' : 'Aluzinc',
        gauge: b.gauge,
        colour: b.colour,
        kgOnHand: free,
        coilCount: b.coilCount,
        note:
          free < 100
            ? 'Critically low — prioritise purchase'
            : 'Below 500 kg free — consider replenishing',
        priority: free < 100 ? 'critical' : 'medium',
      });
    }
  }

  const familyLabel = { aluminium: 'Aluminium', aluzinc: 'Aluzinc', unclassified: 'Unclassified' };
  const active = (coilLots || []).filter((c) => c.currentStatus !== 'Consumed');
  for (const c of active) {
    const free = freeCoilWeightKgForOverview(c);
    if (free >= 100) continue;
    const fam = coilFamily(c.materialTypeName);
    const key = `coil:${c.coilNo || c.coilID}`;
    if (seen.has(key)) continue;
    seen.add(key);
    suggestions.push({
      key,
      family: familyLabel[fam] || 'Unclassified',
      gauge: c.gaugeLabel || '—',
      colour: c.colour || '—',
      kgOnHand: free,
      coilCount: 1,
      note: `Coil ${c.coilNo || c.coilID} under 100 kg free`,
      priority: 'critical',
    });
    if (suggestions.length >= 10) break;
  }

  return suggestions.slice(0, 10);
}
