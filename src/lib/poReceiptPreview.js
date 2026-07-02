/**
 * Purchase order receipt / GRN summary for procurement preview and diagnostics.
 */
import { procurementKindFromPo } from './procurementPoKind.js';
import {
  inferLineTypeFromProduct,
  poLineIsOpenForReceiving,
  poLineOpenQtyForReceiving,
} from './poLineTypes.js';
import { normalizePoStatusKey, shouldShowPoInTransit } from './inTransitVisibility.js';

const GRN_MOVEMENT_TYPES = new Set([
  'STORE_GRN',
  'STORE_GRN_STONE',
  'STORE_GRN_STONE_FLATSHEET',
  'STORE_GRN_ACCESSORY',
  'RECEIPT_IN',
]);

function lineUnitLabel(lineType) {
  if (lineType === 'stone_meter' || lineType === 'coil_meter') return 'm';
  if (lineType === 'stone_flatsheet') return 'sheets';
  if (lineType === 'accessory') return 'units';
  return 'kg';
}

function fmtQty(n, unit) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '—';
  return `${v.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${unit}`;
}

/**
 * @param {object} line
 * @param {'coil'|'stone'|'accessory'|'mixed'} poKind
 */
export function poLineReceiptProgress(line, poKind) {
  const lt = String(line?.lineType || '').trim() || inferLineTypeFromProduct(line?.productID, poKind, line);
  const unit = lineUnitLabel(lt);
  const ordered = Number(line?.qtyOrdered) || 0;
  const received = Number(line?.qtyReceived) || 0;
  const open = poLineOpenQtyForReceiving(line, lt);
  const complete = ordered > 0 && !poLineIsOpenForReceiving(line);
  const partial = received > 0 && open > 0;
  return {
    lineKey: line?.lineKey,
    productID: line?.productID,
    productName: line?.productName,
    unit,
    ordered,
    received,
    open,
    complete,
    partial,
    notStarted: received <= 0 && ordered > 0,
  };
}

/**
 * @param {{
 *   po: object,
 *   coilLots?: object[],
 *   movements?: object[],
 *   inTransitLoads?: object[],
 * }} ctx
 */
export function buildPoReceiptPreview(ctx) {
  const po = ctx?.po;
  const poId = String(po?.poID || '').trim();
  if (!poId) {
    return {
      lineProgress: [],
      coils: [],
      grnMovements: [],
      inTransitLoad: null,
      totals: { ordered: 0, received: 0, open: 0 },
      receivableInStock: false,
      diagnosis: { tone: 'neutral', message: 'No purchase order selected.' },
    };
  }

  const kind = procurementKindFromPo(po);
  const lines = Array.isArray(po?.lines) ? po.lines : [];

  const coils = (ctx?.coilLots || []).filter((c) => String(c?.poID || '').trim() === poId);
  const coilsByLineKey = coils.reduce((acc, coil) => {
    const lk = String(coil?.lineKey || '').trim() || '__unassigned__';
    if (!acc[lk]) acc[lk] = [];
    acc[lk].push(coil);
    return acc;
  }, /** @type {Record<string, object[]>} */ ({}));

  const lineProgress = lines.map((line) => {
    const progress = poLineReceiptProgress(line, kind);
    const lineKey = String(line?.lineKey || '').trim();
    const lineCoils = lineKey ? coilsByLineKey[lineKey] || [] : [];
    return {
      ...progress,
      coils: lineCoils,
      coilNos: lineCoils.map((c) => c.coilNo).filter(Boolean),
    };
  });

  const grnMovements = (ctx?.movements || []).filter((m) => {
    if (String(m?.ref || '').trim() !== poId) return false;
    return GRN_MOVEMENT_TYPES.has(String(m?.type || '').trim());
  });

  const inTransitLoad =
    (ctx?.inTransitLoads || []).find((load) => String(load?.purchaseOrderId || '').trim() === poId) || null;

  const totals = lineProgress.reduce(
    (acc, row) => ({
      ordered: acc.ordered + row.ordered,
      received: acc.received + row.received,
      open: acc.open + row.open,
    }),
    { ordered: 0, received: 0, open: 0 }
  );

  const receivableInStock = shouldShowPoInTransit(po);
  const statusKey = normalizePoStatusKey(po?.status);
  const hasStockEvidence = coils.length > 0 || grnMovements.length > 0;
  const anyLineReceived = totals.received > 0;
  const fullyReceivedOnLines = lines.length > 0 && lineProgress.every((r) => r.complete);

  let diagnosis = { tone: 'neutral', message: '' };

  if (statusKey === 'received' && !anyLineReceived) {
    diagnosis = {
      tone: 'warn',
      message:
        'Status is Received but every line still shows zero received. The PO may have been closed without a store GRN — re-open with support or post receipt from Stock Management if still in transit.',
    };
  } else if (statusKey === 'received' && anyLineReceived && !hasStockEvidence && kind === 'coil') {
    diagnosis = {
      tone: 'warn',
      message:
        'Lines show received weight but no coil lots exist for this PO in your branch. Check branch workspace, or whether GRN failed after updating the PO.',
    };
  } else if (statusKey === 'received' && anyLineReceived && !hasStockEvidence && kind !== 'coil') {
    diagnosis = {
      tone: 'warn',
      message:
        'Lines show received quantity but no GRN stock movements were found for this PO. SKU receipt may not have posted to inventory.',
    };
  } else if (receivableInStock) {
    diagnosis = {
      tone: 'info',
      message:
        'This PO is still open for store receipt. Go to Operations → Stock Management → Receive (goods in transit) to post GRN and create stock.',
    };
  } else if (fullyReceivedOnLines && hasStockEvidence) {
    diagnosis = {
      tone: 'ok',
      message: 'Receipt is posted to stock. Coils or GRN movements for this PO are listed below.',
    };
  } else if (anyLineReceived && totals.open > 0) {
    diagnosis = {
      tone: 'info',
      message: `Partial receipt — ${fmtQty(totals.open, kind === 'coil' ? 'kg' : kind === 'stone' ? 'm' : 'units')} still open on the PO. Post remaining quantity in Stock Management when goods arrive.`,
    };
  } else if (!anyLineReceived && ['approved', 'on loading', 'in transit'].includes(statusKey)) {
    diagnosis = {
      tone: 'info',
      message: 'Nothing received yet. When goods arrive, post GRN from Stock Management (Receive panel).',
    };
  } else if (statusKey === 'received' && fullyReceivedOnLines) {
    diagnosis = {
      tone: 'ok',
      message: 'PO lines are fully received. See stock detail below or search coils by PO in Operations.',
    };
  } else {
    diagnosis = {
      tone: 'neutral',
      message: 'Review ordered vs received quantities and stock created below.',
    };
  }

  return {
    lineProgress,
    coils,
    coilsByLineKey,
    grnMovements,
    inTransitLoad,
    totals,
    receivableInStock,
    fullyReceivedOnLines,
    hasStockEvidence,
    diagnosis,
  };
}

export { fmtQty as poReceiptFmtQty };
