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

/** Button label for transport action on a PO preview. */
export function purchaseOrderTransportActionLabel(po) {
  if (!po) return 'Assign transport';
  const st = String(po.status || '').trim();
  if (st === 'On loading' || (st === 'In Transit' && Number(po.transportAmountNgn) > 0)) {
    return 'Edit transport';
  }
  return 'Assign transport';
}
