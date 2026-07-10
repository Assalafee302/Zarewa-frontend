const ROW_ID_KEYS = ['id', 'quotationId', 'receiptId', 'poId', 'poID', 'coilNo', 'jobId', 'customerID'];

/** Bootstrap array fields that may arrive trimmed on dashboard poll. */
export const BOOTSTRAP_POLL_MERGE_ARRAYS = [
  'customers',
  'quotations',
  'receipts',
  'cuttingLists',
  'purchaseOrders',
  'deliveries',
  'refunds',
  'expenses',
  'paymentRequests',
  'treasuryMovements',
  'movements',
  'coilControlEvents',
  'productionJobs',
  'productionJobCoils',
  'productionConversionChecks',
  'productionCompletionAdjustments',
  'unifiedWorkItems',
  'materialRequests',
  'inTransitLoads',
  'machines',
  'maintenancePlans',
  'maintenanceWorkOrders',
  'hrPerformanceReviews',
  'ledgerEntries',
  'coilLots',
  'products',
  'materialIncidents',
  'bankReconciliation',
  'registerSettlementsAwaitingPayment',
];

const DOMAIN_PACK_KEYS = [
  'accountingCreditors',
  'accountingDebtors',
  'accountingAssets',
];

function rowKey(row) {
  if (!row || typeof row !== 'object') return '';
  for (const k of ROW_ID_KEYS) {
    const v = row[k];
    if (v != null && String(v).trim() !== '') return `${k}:${String(v).trim()}`;
  }
  return '';
}

export function mergeRowsByKey(prevArr, pollArr) {
  if (!Array.isArray(prevArr) || prevArr.length === 0) return pollArr;
  if (!Array.isArray(pollArr) || pollArr.length === 0) return prevArr;

  const pollByKey = new Map();
  for (const row of pollArr) {
    const k = rowKey(row);
    if (k) pollByKey.set(k, row);
  }
  if (pollByKey.size === 0) return prevArr;

  const seen = new Set();
  const out = prevArr.map((row) => {
    const k = rowKey(row);
    if (k && pollByKey.has(k)) {
      seen.add(k);
      return { ...row, ...pollByKey.get(k) };
    }
    return row;
  });

  for (const row of pollArr) {
    const k = rowKey(row);
    if (k) {
      if (!seen.has(k)) {
        seen.add(k);
        out.push(row);
      }
    } else {
      out.push(row);
    }
  }
  return out;
}

/**
 * Merge a dashboard-mode poll payload into an existing snapshot without truncating
 * arrays that were loaded from a full bootstrap or domain snapshot.
 */
export function mergeDashboardPollIntoSnapshot(prev, poll) {
  if (!poll || poll.ok !== true) return poll;
  if (!prev || prev.ok !== true) return poll;

  const merged = {
    ...prev,
    ...poll,
    session: { ...(prev.session || {}), ...(poll.session || {}) },
    permissions: poll.permissions ?? prev.permissions,
  };

  for (const field of BOOTSTRAP_POLL_MERGE_ARRAYS) {
    const prevArr = prev[field];
    const pollArr = poll[field];
    if (!Array.isArray(pollArr)) continue;
    if (!Array.isArray(prevArr) || prevArr.length === 0) {
      merged[field] = pollArr;
      continue;
    }
    if (pollArr.length >= prevArr.length) {
      merged[field] = pollArr;
      continue;
    }
    merged[field] = mergeRowsByKey(prevArr, pollArr);
  }

  for (const key of DOMAIN_PACK_KEYS) {
    if (prev[key] && !poll[key]) merged[key] = prev[key];
  }

  if (prev.materialPoolSummary && !poll.materialPoolSummary) {
    merged.materialPoolSummary = prev.materialPoolSummary;
  }
  if (prev.wipByProduct && !poll.wipByProduct) {
    merged.wipByProduct = prev.wipByProduct;
  }

  return merged;
}
