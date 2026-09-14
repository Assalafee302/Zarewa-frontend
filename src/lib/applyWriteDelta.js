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
 * Ids of the rows a delta carried, per bag.
 *
 * Mirrors the server's `entityIdsFromWriteBody` field chain deliberately, including the
 * order: the stream says which entities moved using those names, and a set built from any
 * other field would simply never match, quietly turning the echo check below into "always
 * refetch". Kept beside the merge so the two stay in step.
 *
 * @param {Record<string, unknown[]> | null | undefined} delta
 * @returns {Map<string, Set<string>>} bag → ids
 */
export function entityIdsFromDelta(delta) {
  /** @type {Map<string, Set<string>>} */
  const out = new Map();
  if (!delta || typeof delta !== 'object') return out;
  for (const [bag, rows] of Object.entries(delta)) {
    if (!Array.isArray(rows) || !rows.length) continue;
    const ids = new Set();
    for (const row of rows) {
      if (!row || typeof row !== 'object') continue;
      const r = /** @type {Record<string, unknown>} */ (row);
      const id = String(r.id || r.jobID || r.refundID || r.quotationId || r.poID || '').trim();
      if (id) ids.add(id);
    }
    if (ids.size) out.set(bag, ids);
  }
  return out;
}

/**
 * Whether a `workspace.data` event describes only rows this browser just wrote itself.
 *
 * This is what separates "my own save echoing back" from "a colleague saved something".
 * Suppressing the first is the point of the delta path — the writer has already merged the
 * row and must not wait on a full pack. Suppressing the second is the bug that put a
 * colleague's quotation out of sight until the ninety-second poll.
 *
 * Unprovable means not ours: an event with no ids, or carrying one id we do not recognise,
 * is treated as somebody else's and refetched. The one case this still swallows is two
 * people editing the *same* record inside the window, which the poll then repairs.
 *
 * @param {unknown} eventEntityIds `entityIds` from the event: bag → ids
 * @param {Map<string, Set<string>>} ownIds ids merged from our own writes, still in window
 */
export function eventIsOwnWriteEcho(eventEntityIds, ownIds) {
  if (!eventEntityIds || typeof eventEntityIds !== 'object') return false;
  if (!(ownIds instanceof Map) || ownIds.size === 0) return false;
  let sawAny = false;
  for (const [bag, list] of Object.entries(eventEntityIds)) {
    if (!Array.isArray(list) || !list.length) continue;
    const mine = ownIds.get(bag);
    if (!mine) return false;
    for (const raw of list) {
      const id = String(raw ?? '').trim();
      if (!id) continue;
      sawAny = true;
      if (!mine.has(id)) return false;
    }
  }
  return sawAny;
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
