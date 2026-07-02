import {
  treasuryOutflowLinesForAccountsPayable,
  treasuryOutflowLinesForPurchaseOrder,
  treasuryOutflowPaymentTableRows,
  TREASURY_STATEMENT_TYPE_LABEL,
} from './accountCore.js';

/**
 * @param {string} poId
 * @param {Array<object>} accountsPayable
 */
export function findAccountsPayableForPo(poId, accountsPayable) {
  const pid = String(poId || '').trim();
  if (!pid || !Array.isArray(accountsPayable)) return null;
  return accountsPayable.find((ap) => String(ap?.poRef || '').trim() === pid) || null;
}

/**
 * Treasury and AP payment history for a purchase order preview.
 * @param {{
 *   po: object,
 *   treasuryMovements?: object[],
 *   accountsPayable?: object[],
 *   movements?: object[],
 * }} ctx
 */
export function buildPoPaymentPreview(ctx) {
  const poId = String(ctx?.po?.poID || '').trim();
  if (!poId) {
    return { payable: null, supplierPayments: [], transportPayments: [], stockPayments: [] };
  }

  const treasuryMovements = Array.isArray(ctx?.treasuryMovements) ? ctx.treasuryMovements : [];
  const movements = Array.isArray(ctx?.movements) ? ctx.movements : [];
  const payable = findAccountsPayableForPo(poId, ctx?.accountsPayable);

  const poSupplierTreasury = treasuryOutflowLinesForPurchaseOrder(poId, treasuryMovements, {
    types: ['SUPPLIER_PAYMENT'],
  });
  const poTransportTreasury = treasuryOutflowLinesForPurchaseOrder(poId, treasuryMovements, {
    types: ['TRANSPORT_PAYMENT'],
  });
  const apTreasury = payable
    ? treasuryOutflowLinesForAccountsPayable(payable.apID, treasuryMovements)
    : [];

  const seen = new Set();
  const mergedSupplierTreasury = [];
  for (const row of [...poSupplierTreasury, ...apTreasury]) {
    const id = String(row?.id || '').trim();
    if (id && seen.has(id)) continue;
    if (id) seen.add(id);
    mergedSupplierTreasury.push(row);
  }

  const mapRows = (rows) =>
    treasuryOutflowPaymentTableRows(rows)
      .map((row) => ({
        ...row,
        typeLabel: TREASURY_STATEMENT_TYPE_LABEL[row.type] || row.type || 'Payment',
      }))
      .sort((a, b) => String(b.postedAtISO).localeCompare(String(a.postedAtISO)));

  const supplierPayments = mapRows(mergedSupplierTreasury);
  const transportPayments = mapRows(poTransportTreasury);

  const stockPayments = movements
    .filter(
      (m) =>
        String(m?.type || '') === 'PO_SUPPLIER_PAYMENT' && String(m?.ref || '').trim() === poId
    )
    .map((m) => ({
      atISO: String(m.atISO || m.dateISO || ''),
      detail: String(m.detail || '').trim(),
    }))
    .sort((a, b) => String(b.atISO).localeCompare(String(a.atISO)));

  return { payable, supplierPayments, transportPayments, stockPayments };
}
