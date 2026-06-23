/** Parity with shared/lib/execApprovalTier.js (client display). */

export const EXEC_APPROVAL_TIER_MD_ONLY = 'md_only';
export const EXEC_APPROVAL_TIER_SHARED = 'shared';

const MD_ONLY_KINDS = new Set([
  'price_exception',
  'payroll',
  'inter_branch_loan',
  'stock_register',
  'staff_purchase_credit',
]);

const DEFAULT_REFUND_MD_THRESHOLD_NGN = 1_000_000;
const DEFAULT_EXPENSE_MD_THRESHOLD_NGN = 200_000;

export function approvalTierChipClass(tier) {
  if (tier === EXEC_APPROVAL_TIER_MD_ONLY) {
    return 'bg-violet-100 text-violet-950 ring-violet-200';
  }
  return 'bg-sky-50 text-sky-900 ring-sky-200';
}

export function classifyExecWorkTrayApprovalTier(item, limits = {}) {
  const kind = String(item?.kind || '').trim().toLowerCase();
  const row = item?.reviewContext?.row || item?.row || {};
  const amt = Math.round(
    Number(item?.amountNgn ?? row.amount_ngn ?? row.amount_requested_ngn ?? 0) || 0
  );
  const refundHi = Number(limits.refundExecutiveThresholdNgn) || DEFAULT_REFUND_MD_THRESHOLD_NGN;
  const expenseHi = Number(limits.expenseExecutiveThresholdNgn) || DEFAULT_EXPENSE_MD_THRESHOLD_NGN;

  if (MD_ONLY_KINDS.has(kind)) {
    return { tier: EXEC_APPROVAL_TIER_MD_ONLY, label: 'MD only' };
  }

  if (kind === 'refunds') {
    if (amt >= refundHi) {
      return { tier: EXEC_APPROVAL_TIER_MD_ONLY, label: 'MD only', reason: 'Above refund threshold' };
    }
    return { tier: EXEC_APPROVAL_TIER_SHARED, label: 'BM or MD' };
  }

  if (kind === 'register_settlement') {
    if (amt >= refundHi) {
      return { tier: EXEC_APPROVAL_TIER_MD_ONLY, label: 'MD only', reason: 'Above withdrawal threshold' };
    }
    return { tier: EXEC_APPROVAL_TIER_SHARED, label: 'Finance / MD' };
  }

  if (kind === 'payments') {
    if (amt >= expenseHi) {
      return { tier: EXEC_APPROVAL_TIER_MD_ONLY, label: 'MD only', reason: 'Large payment' };
    }
    return { tier: EXEC_APPROVAL_TIER_SHARED, label: 'Finance / BM' };
  }

  if (kind === 'production') {
    const paid = Math.round(Number(row.paid_ngn ?? row.paidNgn) || 0);
    if (paid <= 0) {
      return { tier: EXEC_APPROVAL_TIER_MD_ONLY, label: 'MD only', reason: 'Zero payment' };
    }
    return { tier: EXEC_APPROVAL_TIER_SHARED, label: 'BM or MD' };
  }

  if (kind === 'governance') {
    return { tier: EXEC_APPROVAL_TIER_MD_ONLY, label: 'MD oversight' };
  }

  if (kind === 'clearance' || kind === 'flagged') {
    return { tier: EXEC_APPROVAL_TIER_SHARED, label: 'Branch Manager' };
  }

  if (kind === 'conversions') {
    return { tier: EXEC_APPROVAL_TIER_SHARED, label: 'BM or MD' };
  }

  if (kind === 'material') {
    return { tier: EXEC_APPROVAL_TIER_SHARED, label: 'Operations / BM' };
  }

  if (kind === 'edit_approvals') {
    return { tier: EXEC_APPROVAL_TIER_SHARED, label: 'Designated approver' };
  }

  if (kind === 'office_memo' || kind === 'work_item') {
    if (amt >= expenseHi) {
      return { tier: EXEC_APPROVAL_TIER_MD_ONLY, label: 'MD only', reason: 'Large amount' };
    }
    return { tier: EXEC_APPROVAL_TIER_SHARED, label: 'Executive queue' };
  }

  if (item?.summaryOnly) {
    return { tier: EXEC_APPROVAL_TIER_SHARED, label: 'Summary' };
  }

  return { tier: EXEC_APPROVAL_TIER_SHARED, label: 'Review' };
}
