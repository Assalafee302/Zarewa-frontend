/**
 * Procurement PO workflow helpers (transport linking, status gates).
 */

/** @param {{ status?: string, transportAgentId?: string, transportAgentName?: string, transportAmountNgn?: number }} po */
export function purchaseOrderCanAssignTransport(po) {
  if (!po) return false;
  const st = String(po.status || '').trim();
  if (st === 'Approved' || st === 'On loading') return true;
  if (st !== 'In Transit') return false;
  const hasAgent = Boolean(
    String(po.transportAgentId || po.transportAgentName || '').trim()
  );
  const fee = Number(po.transportAmountNgn) || 0;
  return !hasAgent || fee <= 0;
}

/** @param {{ status?: string, transportAgentId?: string, transportAgentName?: string, transportAmountNgn?: number }} po */
export function purchaseOrderNeedsTransportLink(po) {
  return purchaseOrderCanAssignTransport(po);
}

/** Human-readable gap for procurement transport attention banners. */
export function purchaseOrderTransportGapLabel(po) {
  if (!po) return 'Assign haulier and fee';
  const hasAgent = Boolean(String(po.transportAgentId || po.transportAgentName || '').trim());
  const fee = Number(po.transportAmountNgn) || 0;
  if (!hasAgent && fee <= 0) return 'No haulier or fee';
  if (!hasAgent) return 'No haulier assigned';
  if (fee <= 0) return 'Transport fee missing';
  return 'Transport incomplete';
}

/** Whether haulier and quoted fee are on the PO (Finance can pay from here). */
export function purchaseOrderHasTransportLink(po) {
  if (!po) return false;
  const hasAgent = Boolean(String(po.transportAgentId || po.transportAgentName || '').trim());
  const fee = Number(po.transportAmountNgn) || 0;
  return hasAgent && fee > 0;
}

/** Confirm message when marking in transit without transport on record; null when ready. */
export function purchaseOrderInTransitTransportWarning(po) {
  if (purchaseOrderHasTransportLink(po)) return null;
  const gap = purchaseOrderTransportGapLabel(po);
  return `${gap} on this PO. Material may move without haulage on record.\n\nMark in transit anyway? You can link transport later from Procurement.`;
}

/** Button label for transport action on a PO preview. */
export function purchaseOrderTransportActionLabel(po) {
  if (!po) return 'Assign transport';
  const st = String(po.status || '').trim();
  if (st === 'On loading' || (st === 'In Transit' && Number(po.transportAmountNgn) > 0)) {
    return 'Edit transport';
  }
  return 'Assign transport';
}
