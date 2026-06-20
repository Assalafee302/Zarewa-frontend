/** @typedef {'creditor' | 'debtor'} RegisterSide */

/**
 * Per-side copy, KPI → section mapping, and empty-state guidance.
 */
export const ACCOUNTING_REGISTER_CONFIG = {
  creditor: {
    title: 'Money owed to us',
    eyebrow: 'Creditors register · receivables & prepayments',
    description: 'Amounts owed to the company — staff loans, trade receivables, supplier prepayments, and opening balances.',
    helpPoints: [
      'Customer receivables include quotations with completed production only; balances below ₦1,000 are omitted.',
      'Supplier prepayments are payments before GRN — verify in Procurement before clearing.',
      'Staff loans and purchase credit live in HR — use External loan for non-staff borrowers (directors, contractors).',
      'Use Add legacy line for pre-system balances not captured in live transactions.',
    ],
    kpis: [
      { key: 'staffLoansNgn', sectionId: 'staff_loans', label: 'Staff loans', tone: 'default' },
      { key: 'customerReceivablesNgn', sectionId: 'customer_receivables', label: 'Customer receivables', tone: 'default' },
      { key: 'supplierPrepaymentsNgn', sectionId: 'supplier_prepayments', label: 'Supplier prepayments', tone: 'teal' },
      { key: 'interBranchReceivableNgn', sectionId: 'inter_branch_receivable', label: 'Inter-branch receivable', tone: 'default' },
      { key: 'externalLoansNgn', sectionId: 'external_loans', label: 'External loans', tone: 'amber' },
      { key: 'legacyInheritedNgn', sectionId: 'legacy_inherited', label: 'Inherited / manual', tone: 'amber' },
    ],
    emptySectionHints: {
      staff_loans: 'No outstanding staff loans in scope. New loans are created in HR → Payroll.',
      customer_receivables: 'No customer trade receivables — all completed jobs may be fully paid.',
      supplier_prepayments: 'No supplier prepayments — paid amounts match received goods.',
      inter_branch_receivable: 'No inter-branch receivables for this branch scope.',
      external_loans: 'No external loans recorded. Add a line for non-staff borrowers — collect via register settlement.',
      legacy_inherited: 'No inherited receivables recorded. Add a line for pre-system balances.',
    },
    legacyQuickAdd: {
      category: 'external_loan',
      description: 'Non-staff loan — director, contractor, or other non-payroll borrower',
      reference: 'External loan',
    },
  },
  debtor: {
    title: 'Money we owe',
    eyebrow: 'Debtors register · payables & credits',
    description: 'Amounts the company owes — supplier AP, customer deposits, refundable overpayments, and opening balances.',
    helpPoints: [
      'Record pre-system overpayments (e.g. April project ~₦8M) via Add legacy line → Project overpayment.',
      'Pre-production deposits are cleared quote payments before production completes — customer deposit liability (Policy v1).',
      'Refund commitments list pending/approved refunds on closed jobs; treasury “Record pay” is only for approved, unblocked payouts.',
      'Overpayment credits show economic excess (cash in minus quote total) on finance-cleared quotes only, capped by the ledger pool — matches refund preview.',
      'Unallocated receipts and unlinked bank deposits are suspense until matched — not trade payables.',
      'Receipts pending finance clearance appear in the notice above; they are not part of this register total.',
    ],
    kpis: [
      { key: 'supplierPayablesNgn', sectionId: 'supplier_payables', label: 'Supplier payables', tone: 'default' },
      { key: 'customerDepositsNgn', sectionId: 'customer_deposits', label: 'Customer deposits', tone: 'teal' },
      { key: 'preProductionDepositsNgn', sectionId: 'pre_production_deposits', label: 'Pre-production deposits', tone: 'teal' },
      { key: 'customerRefundCommitmentsNgn', sectionId: 'customer_refund_commitments', label: 'Refund commitments', tone: 'rose' },
      { key: 'overpaymentCreditsNgn', sectionId: 'overpayment_credits', label: 'Overpayment credits', tone: 'amber' },
      { key: 'unallocatedReceiptsNgn', sectionId: 'unallocated_receipts', label: 'Unallocated receipts', tone: 'default' },
      { key: 'bankDepositSuspenseNgn', sectionId: 'bank_deposit_suspense', label: 'Bank suspense (2150)', tone: 'teal' },
      { key: 'interBranchPayableNgn', sectionId: 'inter_branch_payable', label: 'Inter-branch payable', tone: 'default' },
      { key: 'legacyInheritedNgn', sectionId: 'legacy_inherited', label: 'Inherited / manual', tone: 'amber' },
    ],
    emptySectionHints: {
      supplier_payables: 'No open supplier AP in scope — check Procurement payables for settled items.',
      customer_deposits: 'No voluntary customer deposits on ledger.',
      pre_production_deposits: 'No cleared pre-production quote deposits in scope.',
      customer_refund_commitments: 'No open refund commitments on closed production.',
      overpayment_credits: 'No refundable overpayment credit — economic excess is zero or already applied/refunded.',
      unallocated_receipts: 'All sales receipts are linked to quotations.',
      bank_deposit_suspense: 'No open unlinked bank deposits — Finance pool is fully allocated.',
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
  external_loan: 'External / non-staff loan',
  customer_ar: 'Customer receivable',
  supplier_prepay: 'Supplier prepayment',
  inter_branch: 'Inter-branch',
  project_overpayment: 'Project overpayment',
  customer_deposit: 'Customer deposit',
  supplier_ap: 'Supplier payable',
};
