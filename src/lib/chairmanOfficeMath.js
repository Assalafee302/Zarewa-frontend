/** Cash left if pending drawings and this request both pay out. Keep in sync with server/finance/chairmanOfficeOps.js */
export function remainingCashAfterDraw(treasuryCashNgn, pendingDrawingsNgn, requestedNgn = 0) {
  return Math.round(Number(treasuryCashNgn) || 0) - Math.round(Number(pendingDrawingsNgn) || 0) - Math.round(Number(requestedNgn) || 0);
}
