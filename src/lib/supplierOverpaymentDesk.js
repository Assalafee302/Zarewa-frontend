/** Desk math for correcting or adding supplier cash. Amounts are whole naira. */

export function parseNairaInput(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value);
  const raw = String(value ?? '').replace(/[₦,\s]/g, '');
  if (!raw) return 0;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

export function todayISO() {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

/**
 * How an extra transfer splits between the open invoice and a supplier advance.
 * @param {{ stillOwedNgn?: number, amountNgn?: number }} input
 */
export function previewExtraPayment(input) {
  const stillOwedNgn = Math.max(0, Math.round(Number(input?.stillOwedNgn) || 0));
  const amountNgn = Math.max(0, Math.round(Number(input?.amountNgn) || 0));
  const settlementNgn = Math.min(amountNgn, stillOwedNgn);
  const advanceNgn = Math.max(0, amountNgn - settlementNgn);
  return { amountNgn, settlementNgn, advanceNgn, withinInvoice: amountNgn > 0 && amountNgn <= stillOwedNgn };
}

/**
 * Paid total, balance, and excess after one posted line is restated.
 * @param {{ obligationNgn?: number, supplierPaidNgn?: number, currentLineNgn?: number, nextLineNgn?: number }} input
 */
export function previewPaymentCorrection(input) {
  const obligationNgn = Math.max(0, Math.round(Number(input?.obligationNgn) || 0));
  const supplierPaidNgn = Math.max(0, Math.round(Number(input?.supplierPaidNgn) || 0));
  const currentLineNgn = Math.max(0, Math.round(Number(input?.currentLineNgn) || 0));
  const nextLineNgn = Math.max(0, Math.round(Number(input?.nextLineNgn) || 0));
  const nextPaidNgn = Math.max(0, supplierPaidNgn + (nextLineNgn - currentLineNgn));
  return {
    nextPaidNgn,
    stillOwedNgn: Math.max(0, obligationNgn - nextPaidNgn),
    excessNgn: Math.max(0, nextPaidNgn - obligationNgn),
    unchanged: nextLineNgn === currentLineNgn,
  };
}
