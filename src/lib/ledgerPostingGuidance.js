import { explainHelpError } from './helpErrorExplain.js';

/**
 * @param {string | undefined} voucherDateIso
 * @param {Array<{ periodKey?: string }> | undefined} periodLocks
 */
export function isVoucherDateInLockedPeriod(voucherDateIso, periodLocks) {
  const pk = String(voucherDateIso || '').trim().slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(pk)) return false;
  const locks = Array.isArray(periodLocks) ? periodLocks : [];
  return locks.some((l) => String(l.periodKey || '').trim() === pk);
}

/**
 * Single-line message for toast/UI when a ledger POST fails.
 * @param {{ ok?: boolean; code?: string; error?: string; message?: string } | null | undefined} body
 * @param {number | undefined} httpStatus
 * @param {string} [fallback]
 */
export function formatLedgerApiError(body, httpStatus, fallback = 'Request failed.') {
  const code = String(body?.code || '').trim();
  const primary = String(body?.error || body?.message || '').trim();
  const zare = explainHelpError(code || primary);
  let out = zare?.explanation || primary || fallback;
  if (code && !out.toLowerCase().includes(code.toLowerCase())) {
    out = `${out} (${code})`;
  }
  if (httpStatus != null && httpStatus >= 400 && !out.includes('HTTP')) {
    out = `${out} · HTTP ${httpStatus}`;
  }
  return out;
}

/**
 * Maps ledger posting API errors to user-facing copy and in-app navigation targets.
 * @param {{ code?: string; error?: string; message?: string } | null | undefined} body
 * @returns {{
 *   title: string;
 *   detail: string;
 *   steps: string[];
 *   links: Array<{ label: string; to: string }>;
 * } | null}
 */
export function guidanceForLedgerPostFailure(body) {
  const code = String(body?.code || '').trim();
  const msg = String(body?.error || body?.message || '').trim();

  if (code === 'PERIOD_LOCKED' || /locked period|period is locked|falls in locked period/i.test(msg)) {
    return {
      title: 'Accounting period is closed',
      detail:
        msg ||
        'This voucher date falls in a month that finance has locked. Posting is blocked until the period is reopened or you use an open period date.',
      steps: [
        'Confirm the receipt date — it must fall in an open accounting month.',
        'If the business month is still open, ask finance to unlock the period in Settings → Governance.',
        'If the payment truly belongs in a closed month, use your escalation path (MD / finance) before any manual workaround.',
      ],
      links: [
        { label: 'Settings — period controls', to: '/settings/governance' },
        { label: 'Accounting overview', to: '/accounts' },
      ],
    };
  }

  if (code === 'LEDGER_POST_BLOCKED' || /flagged for review|refund request|cleared by manager/i.test(msg)) {
    return {
      title: 'Customer ledger posting is paused',
      detail:
        msg ||
        'This customer or quotation is blocked from new ledger receipts until the compliance hold is cleared.',
      steps: [
        'Open the Manager dashboard and review Transaction Intel for this customer or quotation.',
        'If a refund is in progress, finish or withdraw it before posting new cash.',
        'When the hold is cleared, try the receipt again from the same quotation.',
      ],
      links: [
        { label: 'Manager dashboard', to: '/manager' },
        { label: 'Sales — customers', to: '/sales?tab=customers' },
      ],
    };
  }

  if (code === 'RATE_LIMIT' || /too many requests/i.test(msg)) {
    return {
      title: 'Too many postings in a short time',
      detail: msg || 'The server rate-limits money postings per user to protect the ledger.',
      steps: [
        'Wait a minute, then post again (the limit resets on a rolling window).',
        'For bulk entry, split work across time or ask IT about higher limits for trusted automation.',
      ],
      links: [],
    };
  }

  if (/failed to record receipt|record receipt failed|receipt post failed/i.test(msg)) {
    return {
      title: 'Receipt was not saved on the server',
      detail:
        msg ||
        'The API rejected this receipt. The message above is from the server; your team may need to check API logs for the same request time.',
      steps: [
        'Confirm you are on the correct branch (top bar) if your org uses multiple locations.',
        'Open browser DevTools → Network, retry the receipt, and inspect the JSON body of the failed POST /api/ledger/receipt for a more specific `code` or `details` field.',
        'Ensure the backend is the same version as this frontend and that `VITE_API_BASE` in the Hostinger build points at that API (not an old host).',
      ],
      links: [
        { label: 'Accounting overview', to: '/accounts' },
        { label: 'Settings', to: '/settings' },
      ],
    };
  }

  return null;
}
