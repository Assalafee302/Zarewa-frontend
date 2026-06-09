/**
 * In-transit PO visibility — keep in sync with Zarewa-backend-main/shared/lib/inTransitVisibility.js
 */
import { poLineIsOpenForReceiving } from './poLineTypes.js';

export function normalizePoStatusKey(status) {
  return String(status || '').trim().toLowerCase();
}

export const RECEIPT_PENDING_PO_STATUS_KEYS = new Set(['approved', 'on loading', 'in transit']);

export const OPEN_IN_TRANSIT_LOAD_STATUS_KEYS = new Set([
  'in_transit',
  'loading_confirmed',
  'partial_receipt',
  'on_loading',
]);

export function mapPoLineFromApi(line) {
  return {
    lineType: line.lineType,
    productID: line.productID,
    qtyOrdered: line.qtyOrdered,
    qtyReceived: line.qtyReceived,
    metersOffered: line.metersOffered,
    unitPricePerKgNgn: line.unitPricePerKgNgn,
  };
}

export function poLinesFullyReceived(lines, mapLine = mapPoLineFromApi) {
  const rows = Array.isArray(lines) ? lines : [];
  if (!rows.length) return false;
  return rows.every((line) => !poLineIsOpenForReceiving(mapLine(line)));
}

export function isOpenInTransitLoadStatus(status) {
  return OPEN_IN_TRANSIT_LOAD_STATUS_KEYS.has(normalizePoStatusKey(status));
}

export function shouldShowPoInTransit(po) {
  const st = normalizePoStatusKey(po?.status);
  if (['received', 'closed', 'cancelled', 'rejected'].includes(st)) return false;
  if (!RECEIPT_PENDING_PO_STATUS_KEYS.has(st)) return false;
  return !poLinesFullyReceived(po?.lines || [], mapPoLineFromApi);
}

function loadDisplayStatus(load, po) {
  if (load?.status === 'loading_confirmed') return 'On loading';
  if (load?.status === 'in_transit') return 'In Transit';
  return po?.status || load?.status || 'In Transit';
}

export function buildTransitDisplayRows({ purchaseOrders = [], inTransitLoads = [] }) {
  const poMap = new Map((purchaseOrders || []).map((p) => [p.poID, p]));
  const seen = new Set();
  const rows = [];

  for (const load of inTransitLoads || []) {
    if (!isOpenInTransitLoadStatus(load?.status)) continue;
    const poId = String(load.purchaseOrderId || '').trim();
    if (!poId || seen.has(poId)) continue;
    const po = poMap.get(poId);
    if (po && !shouldShowPoInTransit(po)) continue;
    seen.add(poId);
    rows.push({
      poID: poId,
      supplierName: po?.supplierName || load.data?.supplierName || 'Linked PO',
      transportAgentName: load.transportAgentName || po?.transportAgentName || '',
      transportReference: load.transportReference || po?.transportReference || '',
      transportNote: load.exceptionNote || load.delayReason || po?.transportNote || '',
      status: loadDisplayStatus(load, po),
    });
  }

  for (const po of purchaseOrders || []) {
    const poId = String(po.poID || '').trim();
    if (!poId || seen.has(poId)) continue;
    if (!shouldShowPoInTransit(po)) continue;
    seen.add(poId);
    rows.push({
      poID: poId,
      supplierName: po.supplierName,
      transportAgentName: po.transportAgentName || '',
      transportReference: po.transportReference || '',
      transportNote: po.transportNote || '',
      status: po.status,
    });
  }

  return rows;
}
