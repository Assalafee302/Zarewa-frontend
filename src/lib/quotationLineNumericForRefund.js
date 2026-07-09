/** Mirror of Zarewa-backend-main/shared/lib/quotationLineNumericForRefund.js */

export function quotationLineQtyNumber(line) {
  return Number(String(line?.qty ?? line?.quantity ?? '').replace(/,/g, '')) || 0;
}
