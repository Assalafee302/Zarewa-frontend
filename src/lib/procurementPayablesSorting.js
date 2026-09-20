/** Sort options for Procurement → Supplier payables lists (open + settled). */
export const PAYABLES_SORT_FIELDS = [
  { id: 'due', label: 'Due date' },
  { id: 'supplier', label: 'Supplier' },
  { id: 'amount', label: 'Invoice amount' },
  { id: 'outstanding', label: 'Outstanding' },
  { id: 'paid', label: 'Paid' },
  { id: 'id', label: 'AP ID' },
];

function cmpStr(a, b) {
  return String(a ?? '').localeCompare(String(b ?? ''));
}

function cmpNum(a, b) {
  return (Number(a) || 0) - (Number(b) || 0);
}

function cmpDate(a, b) {
  const da = String(a ?? '').trim();
  const db = String(b ?? '').trim();
  if (!da && !db) return 0;
  if (!da) return 1;
  if (!db) return -1;
  return da.localeCompare(db);
}

/**
 * @param {object[]} items accountsPayable-shaped rows
 * @param {string} field PAYABLES_SORT_FIELDS id
 * @param {'asc'|'desc'} dir
 */
export function sortAccountsPayableList(items, field, dir) {
  const m = [...(items || [])];
  const sign = dir === 'asc' ? 1 : -1;
  m.sort((x, y) => {
    const amtX = Number(x.amountNgn) || 0;
    const amtY = Number(y.amountNgn) || 0;
    const paidX = Number(x.paidNgn) || 0;
    const paidY = Number(y.paidNgn) || 0;
    const outX = Math.max(0, amtX - paidX);
    const outY = Math.max(0, amtY - paidY);
    let c = 0;
    switch (field) {
      case 'id':
        c = cmpStr(x.apID, y.apID);
        break;
      case 'supplier':
        c = cmpStr(x.supplierName, y.supplierName);
        break;
      case 'amount':
        c = cmpNum(amtX, amtY);
        break;
      case 'due':
        c = cmpDate(x.dueDateISO, y.dueDateISO);
        break;
      case 'paid':
        c = cmpNum(paidX, paidY);
        break;
      case 'outstanding':
        c = cmpNum(outX, outY);
        break;
      default:
        c = cmpDate(x.dueDateISO, y.dueDateISO);
    }
    return c * sign;
  });
  return m;
}

function payableOutstandingNgn(row) {
  const outstanding = Number(row?.outstandingNgn);
  if (Number.isFinite(outstanding) && outstanding > 0) return outstanding;
  return Math.max(0, (Number(row?.amountNgn) || 0) - (Number(row?.paidNgn) || 0));
}

/**
 * AP-shaped rows from unpaid purchase orders when the AP register is empty or stale.
 * @param {object[]} purchaseOrders
 */
export function payablesFromOutstandingPurchaseOrders(purchaseOrders) {
  return (purchaseOrders || [])
    .filter((po) => {
      if (String(po?.status || '').trim().toLowerCase() === 'rejected') return false;
      const amount = Number(po?.amountNgn) || Number(po?.orderedValueNgn) || 0;
      const paid = Number(po?.paidNgn) || Number(po?.supplierPaidNgn) || 0;
      const outstanding = Number(po?.outstandingNgn);
      if (Number.isFinite(outstanding)) return outstanding > 0;
      return paid < amount;
    })
    .map((po) => {
      const amountNgn = Number(po.amountNgn) || Number(po.orderedValueNgn) || 0;
      const paidNgn = Number(po.paidNgn) || Number(po.supplierPaidNgn) || 0;
      return {
        apID: `AP-PO-${po.poID}`,
        supplierName: po.supplierName,
        poRef: po.poID,
        invoiceRef: po.invoiceNo || '',
        amountNgn,
        paidNgn,
        outstandingNgn: Number(po.outstandingNgn) || Math.max(0, amountNgn - paidNgn),
        dueDateISO: po.expectedDeliveryISO || po.orderDateISO || '',
        paymentMethod: '',
        branchId: po.branchId || '',
        lines: po.lines || [],
      };
    });
}

/**
 * Union AP register, unpaid POs, and outstandingPaymentLines so MD still sees
 * Purchases outstanding payments after a finance/operations pack overwrite.
 * @param {{ accountsPayable?: object[]; purchaseOrders?: object[]; outstandingPaymentLines?: object[] }} sources
 */
export function mergeOpenPayablesSources(sources = {}) {
  const byId = new Map();
  const poRefs = new Set();
  const add = (row) => {
    const id = String(row?.apID || '').trim();
    if (!id || byId.has(id)) return;
    const poRef = String(row?.poRef || '').trim();
    if (poRef && poRefs.has(poRef)) return;
    byId.set(id, { ...row });
    if (poRef) poRefs.add(poRef);
  };
  for (const row of Array.isArray(sources.accountsPayable) ? sources.accountsPayable : []) add(row);
  for (const row of payablesFromOutstandingPurchaseOrders(sources.purchaseOrders)) add(row);
  for (const line of Array.isArray(sources.outstandingPaymentLines) ? sources.outstandingPaymentLines : []) {
    const poID = String(line?.poID || '').trim();
    if (!poID || poRefs.has(poID)) continue;
    add({
      apID: `AP-PO-${poID}`,
      supplierName: line.supplierName,
      poRef: poID,
      invoiceRef: '',
      amountNgn: Number(line.amountNgn) || Number(line.lineValueNgn) || Number(line.outstandingNgn) || 0,
      paidNgn: Number(line.paidNgn) || 0,
      outstandingNgn: payableOutstandingNgn(line),
      dueDateISO: line.orderDateISO || '',
      paymentMethod: '',
      branchId: line.branchId || '',
      lines: [line],
    });
  }
  return [...byId.values()];
}
