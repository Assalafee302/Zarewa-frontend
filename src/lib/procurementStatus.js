/** Client mirror of server procurement PO status normalization. */
export function normalizeProcurementStatus(raw) {
  const s = String(raw || '').trim().toLowerCase();
  if (!s) return 'requested';
  if (['draft', 'pending', 'pending approval', 'requested'].includes(s)) return 'requested';
  if (['approved'].includes(s)) return 'approved';
  if (['ordered'].includes(s)) return 'ordered';
  if (['on loading', 'in transit', 'dispatched'].includes(s)) return 'dispatched';
  if (['received'].includes(s)) return 'received';
  if (['closed'].includes(s)) return 'closed';
  if (['cancelled', 'canceled'].includes(s)) return 'cancelled';
  if (['rejected'].includes(s)) return 'rejected';
  return 'ordered';
}

export function purchaseOrderIsPendingApproval(po) {
  return normalizeProcurementStatus(po?.status) === 'requested';
}

export function purchaseOrderLineTotalNgn(po) {
  const lines = Array.isArray(po?.lines) ? po.lines : [];
  return lines.reduce((sum, line) => {
    const qty = Number(line?.qtyOrdered ?? line?.qty) || 0;
    const unit = Number(line?.unitPriceNgn ?? line?.unitPricePerKgNgn ?? line?.unit_price_ngn) || 0;
    return sum + qty * unit;
  }, 0);
}
