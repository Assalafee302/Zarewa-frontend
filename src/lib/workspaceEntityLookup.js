/**
 * Look an entity up in the workspace snapshot without lying about what is missing.
 *
 * Desk data arrives one domain at a time, so `quotations.find(ref)` returning nothing
 * means either "no such quotation" or "the sales pack has not arrived". Screens have been
 * reading the first from the second: a cutting list whose quotation had not loaded showed
 * as having no quotation, a supplier picker showed an empty list, a stone flatsheet form
 * rendered nothing to record. All the same mistake.
 *
 * The distinction is knowable — the context tracks which domains are loaded — it just was
 * not available where the lookup happens. That is what this provides.
 */

/**
 * Which domain packs can supply each snapshot array.
 *
 * Several arrays ship in more than one pack: a finance user gets receipts without the
 * sales pack, an operations user gets cutting lists without it. The array counts as
 * loaded once *any* of its suppliers has arrived, so a cashier is not told sales data is
 * still loading when finance already delivered it.
 * @type {Readonly<Record<string, ReadonlyArray<string>>>}
 */
export const WORKSPACE_ARRAY_DOMAINS = Object.freeze({
  customers: ['sales'],
  quotations: ['sales'],
  receipts: ['sales', 'finance'],
  cuttingLists: ['sales', 'operations', 'finance'],
  refunds: ['sales', 'finance'],
  refundCreditApplications: ['sales', 'finance'],
  ledgerEntries: ['sales', 'finance'],
  advanceInEvents: ['sales', 'finance'],
  treasuryAccounts: ['sales', 'finance'],
  priceListItems: ['sales'],
  salesAvailableStock: ['sales'],

  productionJobs: ['operations'],
  deliveries: ['operations'],
  coilLots: ['operations', 'procurement'],
  coilControlEvents: ['operations'],
  materialIncidents: ['operations'],
  movements: ['operations', 'procurement'],
  yardCoilRegister: ['operations'],
  materialRequests: ['operations'],
  machines: ['operations'],
  inTransitLoads: ['operations', 'procurement'],
  coilRequests: ['operations'],

  treasuryMovements: ['finance'],
  expenses: ['finance'],
  paymentRequests: ['finance'],
  accountsPayable: ['finance'],
  bankReconciliation: ['finance'],
  registerSettlementsAwaitingPayment: ['finance'],

  suppliers: ['procurement'],
  transportAgents: ['procurement'],
  purchaseOrders: ['procurement'],
  procurementCatalog: ['procurement'],
  products: ['procurement'],
  associatedStaff: ['sales', 'procurement'],
});

/** Default id field per array, for the ones that do not use `id`. */
const ID_FIELDS = Object.freeze({
  customers: 'customerID',
  suppliers: 'supplierID',
  purchaseOrders: 'poID',
  productionJobs: 'jobID',
  transportAgents: 'agentID',
  refunds: 'refundID',
  coilLots: 'coilNo',
});

/**
 * @param {string} arrayKey
 * @returns {string} the field holding the row's identity
 */
export function workspaceIdField(arrayKey) {
  return ID_FIELDS[arrayKey] || 'id';
}

/**
 * Is this array's data here yet?
 *
 * Keyed on loaded domains rather than on the array being non-empty: a branch with no
 * suppliers at all would otherwise read as permanently loading.
 * @param {string} arrayKey
 * @param {(domain: string) => boolean} isDomainLoaded
 */
export function workspaceArrayIsLoaded(arrayKey, isDomainLoaded) {
  const domains = WORKSPACE_ARRAY_DOMAINS[arrayKey];
  // Arrays with no mapping ship on the shell, so they are present from first paint.
  if (!domains || !domains.length) return true;
  if (typeof isDomainLoaded !== 'function') return true;
  return domains.some((d) => isDomainLoaded(d));
}

/**
 * @typedef {'found' | 'absent' | 'not-loaded'} LookupState
 * @typedef {{ value: object | null, state: LookupState }} LookupResult
 */

/**
 * Find one row, reporting whether a miss means "no such row" or "not here yet".
 *
 * @param {object | null} snapshot
 * @param {string} arrayKey e.g. 'quotations'
 * @param {string} id
 * @param {{ isDomainLoaded?: (domain: string) => boolean, idField?: string, match?: (row: object) => boolean }} [opts]
 * @returns {LookupResult}
 */
export function lookupWorkspaceEntity(snapshot, arrayKey, id, opts = {}) {
  const rows = snapshot?.[arrayKey];
  const key = String(id ?? '').trim();
  const match = typeof opts.match === 'function' ? opts.match : null;

  if (!key && !match) return { value: null, state: 'absent' };

  if (Array.isArray(rows)) {
    const idField = opts.idField || workspaceIdField(arrayKey);
    const found = match
      ? rows.find((row) => match(row))
      : rows.find((row) => String(row?.[idField] ?? '').trim() === key);
    if (found) return { value: found, state: 'found' };
  }

  // A miss only means absent once the data that would contain it has arrived.
  return workspaceArrayIsLoaded(arrayKey, opts.isDomainLoaded)
    ? { value: null, state: 'absent' }
    : { value: null, state: 'not-loaded' };
}

/**
 * Whether a list is safe to present as complete — a picker showing an empty dropdown is
 * as misleading as a detail screen claiming a record does not exist.
 * @param {object | null} snapshot
 * @param {string} arrayKey
 * @param {(domain: string) => boolean} [isDomainLoaded]
 * @returns {{ rows: object[], state: 'ready' | 'not-loaded' }}
 */
export function workspaceList(snapshot, arrayKey, isDomainLoaded) {
  const rows = Array.isArray(snapshot?.[arrayKey]) ? snapshot[arrayKey] : [];
  if (rows.length > 0) return { rows, state: 'ready' };
  return workspaceArrayIsLoaded(arrayKey, isDomainLoaded)
    ? { rows, state: 'ready' }
    : { rows, state: 'not-loaded' };
}
