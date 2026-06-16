/** @typedef {'pending_md' | 'active' | 'closed' | 'rejected'} InterBranchLoanStatus */

export const INTER_BRANCH_STATUS_META = {
  pending_md: { label: 'Pending MD', tone: 'amber' },
  active: { label: 'Active', tone: 'teal' },
  closed: { label: 'Closed', tone: 'slate' },
  rejected: { label: 'Rejected', tone: 'rose' },
};

/**
 * @param {string} status
 */
export function interBranchStatusMeta(status) {
  return INTER_BRANCH_STATUS_META[String(status || '').trim()] || {
    label: String(status || '—'),
    tone: 'slate',
  };
}

/**
 * @param {string} tone
 */
export function interBranchStatusClass(tone) {
  if (tone === 'amber') return 'bg-amber-100 text-amber-900 border-amber-200';
  if (tone === 'teal') return 'bg-teal-100 text-teal-900 border-teal-200';
  if (tone === 'rose') return 'bg-rose-100 text-rose-900 border-rose-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
}

/**
 * @param {Array<{ dueDateISO?: string; amountNgn?: number; note?: string }>} plan
 */
export function sumRepaymentPlanNgn(plan) {
  return (Array.isArray(plan) ? plan : []).reduce(
    (s, line) => s + (Math.round(Number(line?.amountNgn) || 0) || 0),
    0
  );
}

export function emptyRepaymentPlanRow() {
  return { dueDateISO: '', amountNgn: '', note: '' };
}

export function emptyProposeForm(workspaceBranchId = '') {
  return {
    lenderBranchId: workspaceBranchId || '',
    borrowerBranchId: '',
    fromTreasuryAccountId: '',
    toTreasuryAccountId: '',
    principalNgn: '',
    dateISO: new Date().toISOString().slice(0, 10),
    reference: '',
    proposedNote: '',
    repaymentPlan: [emptyRepaymentPlanRow()],
  };
}
