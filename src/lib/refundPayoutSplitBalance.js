/**
 * Refund split-line balance: only rows with a chosen payee count toward the total.
 * Quote-customer remainder updates when staff amounts change.
 */

export function roundRefundSplitAmount(value) {
  const n = Number(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(n) ? Math.round(n) : 0;
}

export function refundSplitRowHasPayee(row) {
  const kind = String(row?.recipientKind || '').trim().toLowerCase();
  const staffId = String(row?.recipientAssociatedStaffID || '').trim();
  const customerId = String(row?.recipientCustomerID || '').trim();
  const userId = String(row?.recipientUserId || '').trim();
  if (kind === 'associated_staff' || kind === 'staff') return Boolean(staffId);
  return Boolean(customerId || userId);
}

export function isQuoteCustomerSplitRow(row, quoteCustomerId) {
  const quoteId = String(quoteCustomerId || '').trim();
  if (!quoteId) return false;
  const kind = String(row?.recipientKind || 'customer').trim().toLowerCase();
  if (kind === 'associated_staff' || kind === 'staff') return false;
  return String(row?.recipientCustomerID || '').trim() === quoteId;
}

export function allocatedRefundSplitGrossNgn(rows) {
  return (Array.isArray(rows) ? rows : []).reduce((sum, row) => {
    if (!refundSplitRowHasPayee(row)) return sum;
    return sum + Math.max(0, roundRefundSplitAmount(row.amountNgn));
  }, 0);
}

export function remainingRefundSplitNgn(rows, refundTotal, { excludeIndex = -1 } = {}) {
  const total = Math.max(0, roundRefundSplitAmount(refundTotal));
  const allocated = (Array.isArray(rows) ? rows : []).reduce((sum, row, i) => {
    if (i === excludeIndex) return sum;
    if (!refundSplitRowHasPayee(row)) return sum;
    return sum + Math.max(0, roundRefundSplitAmount(row.amountNgn));
  }, 0);
  return total - allocated;
}

/**
 * Keep the quote-customer line equal to leftover after other payee lines.
 * Incomplete (no payee) rows are ignored so they cannot fake a balanced split.
 */
export function rebalanceQuoteCustomerRemainder(rows, refundTotal, quoteCustomerId) {
  const list = Array.isArray(rows) ? rows.map((r) => ({ ...r })) : [];
  const quoteId = String(quoteCustomerId || '').trim();
  if (!quoteId) return list;
  const quoteIdx = list.findIndex((r) => isQuoteCustomerSplitRow(r, quoteId));
  if (quoteIdx < 0) return list;
  const leftover = remainingRefundSplitNgn(list, refundTotal, { excludeIndex: quoteIdx });
  list[quoteIdx] = {
    ...list[quoteIdx],
    amountNgn: leftover > 0 ? String(leftover) : '0',
  };
  return list;
}

export function withFilledSplitAmountIfEmpty(row, leftoverNgn) {
  const leftover = Math.max(0, roundRefundSplitAmount(leftoverNgn));
  const current = String(row?.amountNgn ?? '').trim();
  if (current !== '') return row;
  if (leftover <= 0) return row;
  return { ...row, amountNgn: String(leftover) };
}
