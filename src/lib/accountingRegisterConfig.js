/** @typedef {'creditor' | 'debtor'} RegisterSide */

/**
 * Per-side copy, KPI → section mapping, and empty-state guidance.
 */
export const ACCOUNTING_REGISTER_CONFIG = {
  creditor: {
    title: 'Creditors register',
    eyebrow: 'Receivables & prepayments',
    description: 'Amounts owed to the company — staff loans, trade receivables, supplier prepayments, and opening balances.',
    helpPoints: [
      'Customer receivables include quotations with completed production only.',
      'Supplier prepayments are payments before GRN — verify in Procurement before clearing.',
      'Use Add legacy line for pre-system balances not captured in live transactions.',
    ],
    kpis: [
      { key: 'staffLoansNgn', sectionId: 'staff_loans', label: 'Staff loans', tone: 'default' },
      { key: 'customerReceivablesNgn', sectionId: 'customer_receivables', label: 'Customer receivables', tone: 'default' },
      { key: 'supplierPrepaymentsNgn', sectionId: 'supplier_prepayments', label: 'Supplier prepayments', tone: 'teal' },
      { key: 'interBranchReceivableNgn', sectionId: 'inter_branch_receivable', label: 'Inter-branch receivable', tone: 'default' },
      { key: 'legacyInheritedNgn', sectionId: 'legacy_inherited', label: 'Inherited / manual', tone: 'amber' },
    ],
    emptySectionHints: {
      staff_loans: 'No outstanding staff loans in scope. New loans are created in HR → Payroll.',
      customer_receivables: 'No customer trade receivables — all completed jobs may be fully paid.',
      supplier_prepayments: 'No supplier prepayments — paid amounts match received goods.',
      inter_branch_receivable: 'No inter-branch receivables for this branch scope.',
      legacy_inherited: 'No inherited receivables recorded. Add a line for pre-system balances.',
    },
  },
  debtor: {
    title: 'Debtors register',
    eyebrow: 'Payables & credits',
    description: 'Amounts the company owes — supplier AP, customer deposits, refundable overpayments, and opening balances.',
    helpPoints: [
      'Record pre-system overpayments (e.g. April project ~₦8M) via Add legacy line → Project overpayment.',
      'Significant overpayments should be reviewed for refund or re-application to the correct quotation.',
      'Unlinked receipts may need matching in Finance → Receipts or Sales.',
    ],
    kpis: [
      { key: 'supplierPayablesNgn', sectionId: 'supplier_payables', label: 'Supplier payables', tone: 'default' },
      { key: 'customerDepositsNgn', sectionId: 'customer_deposits', label: 'Customer deposits', tone: 'teal' },
      { key: 'overpaymentCreditsNgn', sectionId: 'overpayment_credits', label: 'Overpayment credits', tone: 'amber' },
      { key: 'unlinkedPaymentsNgn', sectionId: 'unlinked_payments', label: 'Unlinked receipts', tone: 'default' },
      { key: 'interBranchPayableNgn', sectionId: 'inter_branch_payable', label: 'Inter-branch payable', tone: 'default' },
      { key: 'legacyInheritedNgn', sectionId: 'legacy_inherited', label: 'Inherited / manual', tone: 'amber' },
    ],
    emptySectionHints: {
      supplier_payables: 'No open supplier AP in scope — check Procurement payables for settled items.',
      customer_deposits: 'No voluntary customer deposits on ledger.',
      overpayment_credits: 'No customer overpayment credits — balances are applied or refunded.',
      unlinked_payments: 'All receipts are linked to quotations and cleared in finance.',
      inter_branch_payable: 'No inter-branch payables for this branch scope.',
      legacy_inherited: 'No inherited payables recorded. Add a line for pre-system overpayments or opening AP.',
    },
    legacyQuickAdd: {
      category: 'project_overpayment',
      description: 'Pre-system project overpayment — refundable to customer (select customer below)',
      reference: 'April project overpayment',
    },
  },
};

/** @param {RegisterSide} side */
export function registerConfigFor(side) {
  return ACCOUNTING_REGISTER_CONFIG[side] || ACCOUNTING_REGISTER_CONFIG.creditor;
}

export const REGISTER_CATEGORY_LABELS = {
  legacy: 'General inherited',
  staff_loan: 'Staff loan',
  customer_ar: 'Customer receivable',
  supplier_prepay: 'Supplier prepayment',
  inter_branch: 'Inter-branch',
  project_overpayment: 'Project overpayment',
  customer_deposit: 'Customer deposit',
  supplier_ap: 'Supplier payable',
};
