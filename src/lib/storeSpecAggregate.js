import { canonicalColourName } from './stockCheckMasterOptions.js';
import { liveCoilWeightKgForOverview } from './operationsProductionOverviewCore.js';
import { enrichLotIdle } from './storeIdle.js';
import { resolveCoilRestockMinKg, DEFAULT_COIL_RESTOCK_MIN_KG as ORG_DEFAULT_COIL_MIN } from './orgStoreRestock.js';

/** Default coil restock min (kg). Prefer org settings via opts.restockMinKg. */
export const DEFAULT_COIL_RESTOCK_MIN_KG = ORG_DEFAULT_COIL_MIN;

/** Thin / finish-roll threshold (SOP). */
export const THIN_COIL_KG = 85;

function coilFamily(materialTypeName) {
  const mt = String(materialTypeName || '').toLowerCase();
  if (mt.includes('alumin')) return 'aluminium';
  return 'aluzinc';
}

function familyLabel(fam) {
  return fam === 'aluminium' ? 'Aluminium' : 'Aluzinc';
}

function normalizeGauge(raw) {
  const s = String(raw || '').trim();
  if (!s) return '—';
  const m = s.match(/(\d+(?:\.\d+)?)/);
  return m ? m[1] : s;
}

/**
 * Aggregate coil lots into Colour × Gauge × Material rows.
 * freeKg = onHand − reserved (never negative).
 *
 * @param {object[]} coilLots
 * @param {{ colours?: object[] } | null} [masterData]
 * @param {{
 *   restockMinKg?: number,
 *   specMinOverrides?: Array<{ key?: string, family?: string, colour?: string, gauge?: string, minKg: number }>,
 *   transitBySpec?: Map<string, number> | Record<string, number>,
 *   lastUsedByCoil?: Map<string, string>,
 *   asOfISO?: string,
 * }} [opts]
 */
export function buildCoilSpecBoardRows(coilLots, masterData = null, opts = {}) {
  const minKg = Number(opts.restockMinKg);
  const defaultRestockMinKg = Number.isFinite(minKg) && minKg > 0 ? minKg : DEFAULT_COIL_RESTOCK_MIN_KG;
  const overrides = Array.isArray(opts.specMinOverrides) ? opts.specMinOverrides : [];
  const transitMap = opts.transitBySpec instanceof Map ? opts.transitBySpec : new Map(Object.entries(opts.transitBySpec || {}));
  const lastUsedByCoil = opts.lastUsedByCoil instanceof Map ? opts.lastUsedByCoil : new Map();
  const asOfISO = opts.asOfISO;

  /** @type {Map<string, object>} */
  const byKey = new Map();

  for (const lot of coilLots || []) {
    const status = String(lot.currentStatus || '');
    if (status === 'Consumed' || status === 'Finished') continue;

    const onHand = liveCoilWeightKgForOverview(lot);
    const reserved = Math.max(0, Number(lot.qtyReserved) || 0);
    const free = Math.max(0, onHand - reserved);
    const fam = coilFamily(lot.materialTypeName);
    const colour = canonicalColourName(masterData, lot.colour || '') || String(lot.colour || '').trim() || '—';
    const gauge = normalizeGauge(lot.gaugeLabel);
    const key = `${fam}|${colour}|${gauge}`;

    let row = byKey.get(key);
    if (!row) {
      row = {
        key,
        family: fam,
        familyLabel: familyLabel(fam),
        colour,
        gauge,
        onHandKg: 0,
        reservedKg: 0,
        freeKg: 0,
        inTransitKg: 0,
        lotCount: 0,
        thinLotCount: 0,
        idleLotCount: 0,
        idleCriticalCount: 0,
        maxIdleDays: 0,
        lots: [],
        restockMinKg: resolveCoilRestockMinKg(defaultRestockMinKg, overrides, {
          family: fam,
          colour,
          gauge,
        }),
      };
      byKey.set(key, row);
    }

    row.onHandKg += onHand;
    row.reservedKg += reserved;
    row.freeKg += free;
    row.lotCount += 1;
    if (onHand > 0 && onHand < THIN_COIL_KG) row.thinLotCount += 1;
    const idleLot = enrichLotIdle(lot, lastUsedByCoil, asOfISO);
    if (idleLot.idleBand === 'warn' || idleLot.idleBand === 'critical') {
      row.idleLotCount = (row.idleLotCount || 0) + 1;
      if (idleLot.idleBand === 'critical') row.idleCriticalCount = (row.idleCriticalCount || 0) + 1;
      row.maxIdleDays = Math.max(Number(row.maxIdleDays) || 0, Number(idleLot.idleDays) || 0);
    }
    row.lots.push({
      coilNo: lot.coilNo,
      onHandKg: onHand,
      reservedKg: reserved,
      freeKg: free,
      receivedAtISO: lot.receivedAtISO || '',
      status: status || 'Available',
      thin: onHand > 0 && onHand < THIN_COIL_KG,
      lastUsedISO: idleLot.lastUsedISO,
      idleDays: idleLot.idleDays,
      idleBand: idleLot.idleBand,
    });
  }

  for (const [key, kg] of transitMap.entries()) {
    const n = Number(kg) || 0;
    if (n <= 0) continue;
    let row = byKey.get(key);
    if (!row) {
      const [fam, colour, gauge] = String(key).split('|');
      row = {
        key,
        family: fam === 'aluminium' ? 'aluminium' : 'aluzinc',
        familyLabel: familyLabel(fam === 'aluminium' ? 'aluminium' : 'aluzinc'),
        colour: colour || '—',
        gauge: gauge || '—',
        onHandKg: 0,
        reservedKg: 0,
        freeKg: 0,
        inTransitKg: 0,
        lotCount: 0,
        thinLotCount: 0,
        idleLotCount: 0,
        idleCriticalCount: 0,
        maxIdleDays: 0,
        lots: [],
        restockMinKg: resolveCoilRestockMinKg(defaultRestockMinKg, overrides, {
          family: fam === 'aluminium' ? 'aluminium' : 'aluzinc',
          colour: colour || '—',
          gauge: gauge || '—',
        }),
      };
      byKey.set(key, row);
    }
    row.inTransitKg += n;
  }

  const rows = [...byKey.values()].map((row) => {
    row.lots.sort((a, b) => {
      const ta = String(a.receivedAtISO || '');
      const tb = String(b.receivedAtISO || '');
      if (ta !== tb) return ta.localeCompare(tb);
      return String(a.coilNo || '').localeCompare(String(b.coilNo || ''));
    });
    const rowMin = resolveCoilRestockMinKg(defaultRestockMinKg, overrides, {
      family: row.family,
      colour: row.colour,
      gauge: row.gauge,
    });
    const available = row.freeKg + row.inTransitKg;
    const shortfall = Math.max(0, rowMin - available);
    return {
      ...row,
      availableKg: available,
      shortfallKg: shortfall,
      belowMin: available < rowMin,
      restockMinKg: rowMin,
      hasSpecMinOverride: rowMin !== defaultRestockMinKg,
    };
  });

  rows.sort((a, b) => {
    if (a.belowMin !== b.belowMin) return a.belowMin ? -1 : 1;
    if (b.freeKg !== a.freeKg) return b.freeKg - a.freeKg;
    return `${a.colour}|${a.gauge}`.localeCompare(`${b.colour}|${b.gauge}`);
  });

  return rows;
}

/**
 * Build transit kg by spec key from receivable POs.
 * @param {object[]} purchaseOrders
 * @param {{ colours?: object[] } | null} [masterData]
 * @param {(po: object) => boolean} [isReceivable]
 */
export function buildTransitKgBySpec(purchaseOrders, masterData = null, isReceivable = () => true) {
  /** @type {Map<string, number>} */
  const map = new Map();
  for (const po of purchaseOrders || []) {
    if (!isReceivable(po)) continue;
    for (const line of po.lines || []) {
      const pid = String(line.productID || '').toUpperCase();
      if (pid.startsWith('STONE') || pid.startsWith('ACC-') || pid.startsWith('ACC')) continue;
      const colour =
        canonicalColourName(masterData, line.color || line.colour || '') ||
        String(line.color || line.colour || '').trim() ||
        '—';
      const gauge = normalizeGauge(line.gauge || line.gaugeLabel);
      if (colour === '—' && gauge === '—') continue;
      const fam = coilFamily(line.materialTypeName || line.materialType || line.productName || '');
      const ordered = Number(line.qtyOrdered ?? line.quantity ?? line.qty) || 0;
      const received = Number(line.qtyReceived ?? line.receivedQty) || 0;
      const open = Math.max(0, ordered - received);
      if (open <= 0) continue;
      const key = `${fam}|${colour}|${gauge}`;
      map.set(key, (map.get(key) || 0) + open);
    }
  }
  return map;
}

/**
 * Filter / search spec board rows.
 * @param {object[]} rows
 * @param {{
 *   family?: 'all'|'aluminium'|'aluzinc',
 *   filter?: 'all'|'below_min'|'thin'|'idle',
 *   query?: string,
 * }} opts
 */
export function filterCoilSpecBoardRows(rows, opts = {}) {
  const family = opts.family || 'all';
  const filter = opts.filter || 'all';
  const q = String(opts.query || '')
    .trim()
    .toLowerCase();
  const tokens = q ? q.split(/\s+/).filter(Boolean) : [];

  return (rows || []).filter((row) => {
    if (family !== 'all' && row.family !== family) return false;
    if (filter === 'below_min' && !row.belowMin) return false;
    if (filter === 'thin' && !(row.thinLotCount > 0)) return false;
    if (filter === 'idle' && !(row.idleLotCount > 0)) return false;
    if (!tokens.length) return true;
    const blob = `${row.colour} ${row.gauge} ${row.familyLabel} ${row.family}`.toLowerCase();
    return tokens.every((t) => blob.includes(t));
  });
}

/**
 * Summary chips for Spec board header.
 */
export function summarizeCoilSpecBoard(rows) {
  const list = rows || [];
  return {
    specCount: list.length,
    belowMinCount: list.filter((r) => r.belowMin).length,
    thinLotCount: list.reduce((s, r) => s + (Number(r.thinLotCount) || 0), 0),
    idleLotCount: list.reduce((s, r) => s + (Number(r.idleLotCount) || 0), 0),
    freeKgTotal: list.reduce((s, r) => s + (Number(r.freeKg) || 0), 0),
  };
}
