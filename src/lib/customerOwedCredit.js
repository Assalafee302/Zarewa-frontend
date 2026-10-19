/**
 * Finance Phase A (A6): what we already owe the customer, read from the refund-credit
 * eligibility the confirm card loads (`/api/ledger/refund-credit-eligible`).
 * Information only — Confirm stays the primary action and the credit route is never pre-selected.
 */
import { formatNgn } from '../Data/mockData';

function money(n) {
  return Math.max(0, Math.round(Number(n) || 0));
}

function isRefundSource(s) {
  return s?.kind === 'refund' || String(s?.id || '').startsWith('refund:');
}

/**
 * @param {{ sources?: object[], unavailableSources?: object[] } | null} eligible
 * @returns {{ approvedRefundsNgn: number, approvedRefundCount: number, unappliedCreditNgn: number, totalNgn: number }}
 */
export function customerOwedCreditSummary(eligible) {
  const sources = Array.isArray(eligible?.sources) ? eligible.sources : [];
  const unavailable = Array.isArray(eligible?.unavailableSources) ? eligible.unavailableSources : [];
  const seen = new Set();
  let approvedRefundsNgn = 0;
  let approvedRefundCount = 0;
  for (const s of [...sources, ...unavailable]) {
    if (!isRefundSource(s)) continue;
    const key = String(s.refundId || s.id || '');
    if (seen.has(key)) continue;
    const open = money(s.availableNgn);
    if (open <= 0 || !/approved|partial/i.test(String(s.status || ''))) continue;
    seen.add(key);
    approvedRefundsNgn += open;
    approvedRefundCount += 1;
  }
  const unappliedCreditNgn = sources.filter((s) => !isRefundSource(s)).reduce((sum, s) => sum + money(s.availableNgn), 0);
  return { approvedRefundsNgn, approvedRefundCount, unappliedCreditNgn, totalNgn: approvedRefundsNgn + unappliedCreditNgn };
}

/** "Customer has ₦x approved refunds / ₦y unapplied credit", or '' when we owe nothing. */
export function customerOwedCreditLine(summary) {
  if (!summary || summary.totalNgn <= 0) return '';
  return `Customer has ${formatNgn(summary.approvedRefundsNgn)} approved refunds / ${formatNgn(summary.unappliedCreditNgn)} unapplied credit`;
}
