const ROW_ID_KEYS = [
  'id',
  'refundID',
  'quotationId',
  'receiptId',
  'poId',
  'poID',
  'coilNo',
  'jobId',
  'customerID',
];

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

function rowHasQuotationLines(row) {
  const ql = row?.quotationLines;
  return Boolean(
    ql &&
      typeof ql === 'object' &&
      (Array.isArray(ql.products) || Array.isArray(ql.accessories) || Array.isArray(ql.services))
  );
}

/**
 * Merge poll row onto previous row. Slim quotation list payloads omit quotationLines —
 * never wipe lines already hydrated from GET /api/quotations/:id or a fat snapshot.
 */
export function mergePollRow(prevRow, pollRow) {
  if (!pollRow || typeof pollRow !== 'object') return prevRow;
  if (!prevRow || typeof prevRow !== 'object') return pollRow;
  const next = { ...prevRow, ...pollRow };
  if (rowHasQuotationLines(prevRow) && !rowHasQuotationLines(pollRow)) {
    next.quotationLines = prevRow.quotationLines;
  }
  return next;
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
      return mergePollRow(row, pollByKey.get(k));
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
 * Prefer keeping previously loaded desk rows when a shell/dashboard poll sends [].
 */
export function mergeDashboardPollIntoSnapshot(prev, poll) {
  if (!poll || poll.ok !== true) return poll;
  if (!prev || prev.ok !== true) return poll;

  const merged = {
    ...prev,
    ...poll,
    session: { ...(prev.session || {}), ...(poll.session || {}) },
    permissions: poll.permissions ?? prev.permissions,
    bootstrapMeta: {
      ...(prev.bootstrapMeta || {}),
      ...(poll.bootstrapMeta || {}),
      deferredDeskArrays: Array.isArray(poll.bootstrapMeta?.deferredDeskArrays)
        ? poll.bootstrapMeta.deferredDeskArrays
        : prev.bootstrapMeta?.deferredDeskArrays,
      truncated: {
        ...(prev.bootstrapMeta?.truncated || {}),
        ...(poll.bootstrapMeta?.truncated || {}),
      },
    },
  };

  for (const field of BOOTSTRAP_POLL_MERGE_ARRAYS) {
    const prevArr = prev[field];
    const pollArr = poll[field];
    if (!Array.isArray(pollArr)) continue;
    if (!Array.isArray(prevArr) || prevArr.length === 0) {
      merged[field] = pollArr;
      continue;
    }
    // Shell polls intentionally send empty desk arrays — never wipe domain-loaded data.
    if (pollArr.length === 0) {
      merged[field] = prevArr;
      continue;
    }
    // Always key-merge so slim quotation rows cannot wipe previously hydrated lines.
    if (field === 'quotations') {
      merged[field] = mergeRowsByKey(prevArr, pollArr);
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
