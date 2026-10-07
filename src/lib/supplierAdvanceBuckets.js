/**
 * Split a supplier-advance report into goods still outstanding, goods received
 * with no value (accessories), and cash paid above a valued receipt.
 */

function paidOf(row) {
  return Math.max(0, Math.round(Number(row?.supplierPaidNgn ?? row?.paidNgn) || 0));
}

function receivedValueOf(row) {
  return Math.max(0, Math.round(Number(row?.receivedValueNgn) || 0));
}

function qtyOf(row) {
  if (row?.qtyReceived != null && row.qtyReceived !== '') return Number(row.qtyReceived) || 0;
  const lines = Array.isArray(row?.lines) ? row.lines : [];
  return lines.reduce((s, line) => s + (Number(line?.qtyReceived ?? line?.qty_received) || 0), 0);
}

function statusSaysReceived(row) {
  return /received|partial|closed|complete|grn/.test(String(row?.status || '').toLowerCase());
}

export function advanceBucketForRow(row) {
  const paid = paidOf(row);
  const advance = Math.max(0, Math.round(Number(row?.supplierAdvanceNgn) || 0));
  if (paid <= 0 && advance <= 0) return null;
  const receivedValue = receivedValueOf(row);
  const qty = qtyOf(row);
  const unvalued =
    row?.receivedUnvalued === true || ((qty > 0 || statusSaysReceived(row)) && receivedValue <= 0 && paid > 0);
  if (unvalued && receivedValue <= 0) return 'receivedNotValued';
  if (receivedValue <= 0 && paid > 0 && qty <= 0 && !statusSaysReceived(row)) return 'paidNotReceived';
  if (paid > receivedValue && receivedValue > 0) return 'trueOverpayment';
  if (advance > 0 && receivedValue > 0) return 'trueOverpayment';
  return null;
}

export function splitSupplierAdvanceRows(rows) {
  const paidNotReceived = [];
  const receivedNotValued = [];
  const trueOverpayment = [];
  for (const row of rows || []) {
    const bucket = advanceBucketForRow(row);
    if (bucket === 'paidNotReceived') paidNotReceived.push(row);
    else if (bucket === 'receivedNotValued') receivedNotValued.push(row);
    else if (bucket === 'trueOverpayment') trueOverpayment.push(row);
  }
  return { paidNotReceived, receivedNotValued, trueOverpayment };
}

export function sumNgn(rows, field = 'supplierPaidNgn') {
  return (rows || []).reduce((s, row) => {
    if (field === 'supplierAdvanceNgn') return s + (Math.round(Number(row?.supplierAdvanceNgn) || 0));
    return s + paidOf(row);
  }, 0);
}

/** Dashboard card: POs paid while no goods have been received. */
export function summarizePaidNotReceivedPos(purchaseOrders) {
  const rows = [];
  for (const po of purchaseOrders || []) {
    if (String(po?.status || '').toLowerCase() === 'rejected') continue;
    const asRow = {
      ...po,
      supplierPaidNgn: po.supplierPaidNgn ?? po.paidNgn,
      poId: po.poId || po.poID,
    };
    if (advanceBucketForRow(asRow) === 'paidNotReceived') rows.push(asRow);
  }
  return { count: rows.length, ngn: sumNgn(rows), rows };
}
