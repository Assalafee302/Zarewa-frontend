/**
 * Stone Spec board — Design × Colour × Gauge (metres).
 * Cover: free + in-transit − reserved vs org stoneRestockMinM (default 400 m).
 */

import { canonicalColourName } from './stockCheckMasterOptions.js';
import { DEFAULT_STONE_RESTOCK_MIN_M } from './orgStoreRestock.js';

export { DEFAULT_STONE_RESTOCK_MIN_M };

function normalizeGauge(raw) {
  const s = String(raw || '').trim();
  if (!s) return '—';
  const m = s.match(/(\d+(?:\.\d+)?)/);
  return m ? m[1] : s;
}

function isStoneMetreProduct(p) {
  const pid = String(p?.productID || p?.product_id || '').toUpperCase();
  if (/^STONE-FS-/i.test(pid)) return false;
  const attrs = p?.dashboardAttrs || {};
  if (attrs.inventoryModel === 'stone_meter') return true;
  if (attrs.stoneDesign && !attrs.stoneFlatsheet) return true;
  if (pid.startsWith('STONE-') && !pid.startsWith('STONE-FS-')) return true;
  const unit = String(p?.unit || '').toLowerCase();
  if (unit === 'm' && String(attrs.materialType || '').toLowerCase().includes('stone')) return true;
  return false;
}

/**
 * Parse design from SKU / name when attrs.stoneDesign missing.
 * e.g. STONE-milano-black-0.40mm → Milano
 */
export function inferStoneDesign(product) {
  const attrs = product?.dashboardAttrs || {};
  const fromAttr = String(attrs.stoneDesign || '').trim();
  if (fromAttr) return fromAttr;
  const pid = String(product?.productID || '');
  const m = pid.match(/^STONE-([^-]+)/i);
  if (m && !/^FS$/i.test(m[1])) {
    const raw = m[1].replace(/_/g, ' ');
    return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
  }
  const name = String(product?.name || '');
  const nm = name.match(/stone\s*coated\s+([^/]+)/i);
  if (nm) return nm[1].trim();
  return '—';
}

/**
 * Spec key: stone|design|colour|gauge
 */
export function stoneSpecKey(design, colour, gauge) {
  return `stone|${design || '—'}|${colour || '—'}|${normalizeGauge(gauge)}`;
}

/**
 * @param {object[]} products
 * @param {{ colours?: object[] } | null} [masterData]
 * @param {{
 *   restockMinM?: number,
 *   transitBySpec?: Map<string, number> | Record<string, number>,
 * }} [opts]
 */
export function buildStoneSpecBoardRows(products, masterData = null, opts = {}) {
  const minRaw = Number(opts.restockMinM);
  const restockMinM = Number.isFinite(minRaw) && minRaw > 0 ? minRaw : DEFAULT_STONE_RESTOCK_MIN_M;
  const transitMap =
    opts.transitBySpec instanceof Map ? opts.transitBySpec : new Map(Object.entries(opts.transitBySpec || {}));

  /** @type {Map<string, object>} */
  const byKey = new Map();

  for (const p of products || []) {
    if (!isStoneMetreProduct(p)) continue;
    const onHand = Number(p.stockLevel) || 0;
    const reserved = Math.max(0, Number(p.qtyReserved) || 0);
    const free = Math.max(0, onHand - reserved);

    const design = inferStoneDesign(p);
    const colour =
      canonicalColourName(masterData, p.dashboardAttrs?.colour || '') ||
      String(p.dashboardAttrs?.colour || '').trim() ||
      '—';
    const gauge = normalizeGauge(p.dashboardAttrs?.gauge);
    const key = stoneSpecKey(design, colour, gauge);

    let row = byKey.get(key);
    if (!row) {
      row = {
        key,
        family: 'stone',
        familyLabel: 'Stone',
        design,
        colour,
        gauge,
        onHandM: 0,
        reservedM: 0,
        freeM: 0,
        inTransitM: 0,
        skuCount: 0,
        skus: [],
        restockMinM,
      };
      byKey.set(key, row);
    }

    row.onHandM += onHand;
    row.reservedM += reserved;
    row.freeM += free;
    row.skuCount += 1;
    row.skus.push({
      productID: p.productID,
      name: p.name || p.productID,
      onHandM: onHand,
      reservedM: reserved,
      freeM: free,
    });
  }

  for (const [key, m] of transitMap.entries()) {
    const n = Number(m) || 0;
    if (n <= 0 || !String(key).startsWith('stone|')) continue;
    let row = byKey.get(key);
    if (!row) {
      const parts = String(key).split('|');
      const design = parts[1] || '—';
      const colour = parts[2] || '—';
      const gauge = parts[3] || '—';
      row = {
        key,
        family: 'stone',
        familyLabel: 'Stone',
        design,
        colour,
        gauge,
        onHandM: 0,
        reservedM: 0,
        freeM: 0,
        inTransitM: 0,
        skuCount: 0,
        skus: [],
        restockMinM,
      };
      byKey.set(key, row);
    }
    row.inTransitM += n;
  }

  const rows = [...byKey.values()]
    .filter((row) => row.onHandM > 0 || row.inTransitM > 0 || row.freeM > 0)
    .map((row) => {
      row.skus.sort((a, b) => String(a.productID || '').localeCompare(String(b.productID || '')));
      const available = row.freeM + row.inTransitM;
      const shortfall = Math.max(0, restockMinM - available);
      return {
        ...row,
        availableM: available,
        shortfallM: shortfall,
        belowMin: available < restockMinM,
        restockMinM,
      };
    });

  rows.sort((a, b) => {
    if (a.belowMin !== b.belowMin) return a.belowMin ? -1 : 1;
    if (b.freeM !== a.freeM) return b.freeM - a.freeM;
    return `${a.design}|${a.colour}|${a.gauge}`.localeCompare(`${b.design}|${b.colour}|${b.gauge}`);
  });

  return rows;
}

/**
 * In-transit stone metres by Design × Colour × Gauge.
 */
export function buildTransitMByStoneSpec(purchaseOrders, masterData = null, isReceivable = () => true) {
  /** @type {Map<string, number>} */
  const map = new Map();
  for (const po of purchaseOrders || []) {
    if (!isReceivable(po)) continue;
    for (const line of po.lines || []) {
      const pid = String(line.productID || '').toUpperCase();
      if (!pid.startsWith('STONE') || pid.startsWith('STONE-FS-')) continue;
      const design =
        String(line.designLabel || line.stoneDesign || line.design || '').trim() ||
        inferStoneDesign({ productID: line.productID, name: line.productName, dashboardAttrs: {} });
      const colour =
        canonicalColourName(masterData, line.color || line.colour || '') ||
        String(line.color || line.colour || '').trim() ||
        '—';
      const gauge = normalizeGauge(line.gauge || line.gaugeLabel);
      const ordered = Number(line.qtyOrdered ?? line.quantity ?? line.qty) || 0;
      const received = Number(line.qtyReceived ?? line.receivedQty) || 0;
      const open = Math.max(0, ordered - received);
      if (open <= 0) continue;
      const key = stoneSpecKey(design, colour, gauge);
      map.set(key, (map.get(key) || 0) + open);
    }
  }
  return map;
}

/**
 * @param {object[]} rows
 * @param {{ filter?: 'all'|'below_min'|'heroes', query?: string }} [opts]
 */
export function filterStoneSpecBoardRows(rows, opts = {}) {
  const filter = opts.filter || 'all';
  const q = String(opts.query || '')
    .trim()
    .toLowerCase();
  const tokens = q ? q.split(/\s+/).filter(Boolean) : [];

  return (rows || []).filter((row) => {
    if (filter === 'below_min' && !row.belowMin) return false;
    if (!tokens.length) return true;
    const blob = `${row.design} ${row.colour} ${row.gauge} stone`.toLowerCase();
    return tokens.every((t) => blob.includes(t));
  });
}

export function summarizeStoneSpecBoard(rows) {
  const list = rows || [];
  return {
    specCount: list.length,
    belowMinCount: list.filter((r) => r.belowMin).length,
    freeMTotal: list.reduce((s, r) => s + (Number(r.freeM) || 0), 0),
  };
}
