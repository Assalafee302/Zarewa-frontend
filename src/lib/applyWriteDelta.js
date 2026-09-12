/**
 * Merge additive write `delta` bags into a workspace snapshot (pure).
 * Backend withWriteDelta returns bags like quotations / receipts / refunds / productionJobs.
 */
import { workspaceIdField } from './workspaceEntityLookup.js';
import { mergePollRow } from './bootstrapPollMerge.js';
import { formatPersonName } from './formatPersonName.js';

const DELTA_BAGS = [
  'quotations',
  'receipts',
  'cuttingLists',
  'refunds',
  'productionJobs',
  'ledgerEntries',
  'customers',
  'purchaseOrders',
  'products',
];

/**
 * Domains touched by each delta bag — used to skip self-triggered SSE pack reloads.
 * @type {Readonly<Record<string, ReadonlyArray<string>>>}
 */
export const DELTA_BAG_DOMAINS = Object.freeze({
  quotations: ['sales'],
  receipts: ['sales', 'finance'],
  cuttingLists: ['sales', 'operations'],
  refunds: ['sales', 'finance'],
  productionJobs: ['operations'],
  ledgerEntries: ['sales', 'finance'],
  customers: ['sales'],
  purchaseOrders: ['procurement', 'operations'],
  products: ['procurement', 'operations'],
});

/**
 * @param {unknown} delta
 * @returns {string[]}
 */
export function domainsTouchedByDelta(delta) {
  if (!delta || typeof delta !== 'object') return [];
  const out = new Set();
  for (const [bag, rows] of Object.entries(delta)) {
    if (!Array.isArray(rows) || !rows.length) continue;
    for (const d of DELTA_BAG_DOMAINS[bag] || []) out.add(d);
  }
  return [...out];
}

/**
 * @param {object | null | undefined} prevSnapshot
 * @param {Record<string, unknown[]> | null | undefined} delta
 * @returns {{ next: object | null, changed: boolean, domains: string[] }}
 */
export function mergeWriteDeltaIntoSnapshot(prevSnapshot, delta) {
  if (!prevSnapshot || prevSnapshot.ok !== true) {
    return { next: prevSnapshot ?? null, changed: false, domains: [] };
  }
  if (!delta || typeof delta !== 'object') {
    return { next: prevSnapshot, changed: false, domains: [] };
  }

  let next = prevSnapshot;
  let changed = false;
  const domains = new Set();

  for (const bag of DELTA_BAGS) {
    const rows = delta[bag];
    if (!Array.isArray(rows) || !rows.length) continue;
    const idField = workspaceIdField(bag);
    const prevRows = Array.isArray(next[bag]) ? next[bag] : [];
    const byKey = new Map();
    for (const row of prevRows) {
      const key = String(row?.[idField] ?? '').trim();
      if (key) byKey.set(key, row);
    }
    let bagChanged = false;
    for (const incoming of rows) {
      if (!incoming || typeof incoming !== 'object') continue;
      const key = String(incoming[idField] ?? '').trim();
      if (!key) continue;
      const prevRow = byKey.get(key);
      let merged = prevRow ? mergePollRow(prevRow, incoming) : { ...incoming };
      if (bag === 'quotations' && merged.customer) {
        merged = { ...merged, customer: formatPersonName(merged.customer) };
      }
      if (bag === 'customers' && merged.name) {
        merged = { ...merged, name: formatPersonName(merged.name) };
      }
      if (prevRow !== merged) bagChanged = true;
      byKey.set(key, merged);
    }
    if (!bagChanged) continue;
    const keptOrder = [];
    const seen = new Set();
    for (const incoming of rows) {
      const key = String(incoming?.[idField] ?? '').trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      keptOrder.push(byKey.get(key));
    }
    for (const row of prevRows) {
      const key = String(row?.[idField] ?? '').trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      keptOrder.push(row);
    }
    next = { ...next, [bag]: keptOrder };
    changed = true;
    for (const d of DELTA_BAG_DOMAINS[bag] || []) domains.add(d);
  }

  return { next: changed ? next : prevSnapshot, changed, domains: [...domains] };
}
