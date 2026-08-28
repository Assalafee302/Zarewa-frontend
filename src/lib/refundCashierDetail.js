import { refundApprovedAmount, refundOutstandingAmount } from './refundsStore';
import {
  overpaymentAlreadyRefundedNgn,
  quotationOverpaymentResidualNgn,
} from '../shared/lib/refundQuotationMoney.js';
import {
  applyRefundStaffAllocationDeduction,
  REFUND_STAFF_ALLOCATION_DEDUCTION_RATE,
  refundSplitTakesStaffDeduction,
  roundRefundStaffMoney,
} from '../shared/lib/refundStaffAllocationDeduction.js';

function normalizeRefundSplitRow(raw) {
  const kindRaw = String(raw?.recipientKind ?? raw?.recipient_kind ?? '').trim().toLowerCase();
  const staffId = String(
    raw?.recipientAssociatedStaffID ?? raw?.recipient_associated_staff_id ?? ''
  ).trim();
  const customerId = String(
    raw?.recipientCustomerID ?? raw?.recipient_customer_id ?? raw?.recipientId ?? ''
  ).trim();
  const asStaff =
    kindRaw === 'associated_staff' || kindRaw === 'staff' || (Boolean(staffId) && !customerId);
  return {
    ...raw,
    recipientKind: asStaff ? 'associated_staff' : 'customer',
    recipientAssociatedStaffID: asStaff ? staffId || customerId : '',
    recipientCustomerID: asStaff ? '' : customerId,
    amountNgn: roundRefundStaffMoney(raw?.amountNgn ?? raw?.amount_ngn),
    companyCutWaived: Boolean(
      raw?.companyCutWaived === true ||
        raw?.company_cut_waived === true ||
        raw?.waiveCompanyCut === true
    ),
    payoutAccount: raw?.payoutAccount ?? raw?.payout_account ?? null,
    payeeName: String(raw?.payeeName ?? raw?.payee_name ?? '').trim(),
  };
}

function refundSplitRows(refund) {
  const fromList = (list) =>
    (Array.isArray(list) ? list : [])
      .map(normalizeRefundSplitRow)
      .filter((s) => s.amountNgn > 0);
  if (Array.isArray(refund?.splitDistributions) && refund.splitDistributions.length) {
    return fromList(refund.splitDistributions);
  }
  if (Array.isArray(refund?.refundSplits) && refund.refundSplits.length) {
    return fromList(refund.refundSplits);
  }
  if (typeof refund?.split_distributions_json === 'string' && refund.split_distributions_json.trim()) {
    try {
      const parsed = JSON.parse(refund.split_distributions_json);
      if (Array.isArray(parsed) && parsed.length) return fromList(parsed);
    } catch {
      /* ignore */
    }
  }
  return [];
}

function parseCompanyCutFromPaymentNote(refund) {
  const note = String(refund?.paymentNote ?? refund?.payment_note ?? '');
  const match = note.match(/company cut\s*[₦N]?\s*([\d,]+)/i);
  if (!match) return 0;
  return roundRefundStaffMoney(String(match[1] || '').replace(/,/g, ''));
}

/** Merge API / snapshot rows so payout math always sees split_distributions_json. */
export function enrichRefundForCashierPayout(row, apiRefund) {
  if (!apiRefund || typeof apiRefund !== 'object') return row;
  let splits = refundSplitRows(row);
  const apiSplits = refundSplitRows(apiRefund);
  if (apiSplits.length) splits = apiSplits;
  return {
    ...row,
    refundID: apiRefund.refundID ?? apiRefund.refund_id ?? row?.refundID,
    customerID: apiRefund.customerID ?? apiRefund.customer_id ?? row?.customerID,
    customer: apiRefund.customer ?? apiRefund.customer_name ?? row?.customer,
    paymentNote: apiRefund.paymentNote ?? apiRefund.payment_note ?? row?.paymentNote,
    paidAmountNgn:
      apiRefund.paidAmountNgn ?? apiRefund.paid_amount_ngn ?? row?.paidAmountNgn,
    approvedAmountNgn:
      apiRefund.approvedAmountNgn ?? apiRefund.approved_amount_ngn ?? row?.approvedAmountNgn,
    amountNgn: apiRefund.amountNgn ?? apiRefund.amount_ngn ?? row?.amountNgn,
    payeeName: apiRefund.payeeName ?? apiRefund.payee_name ?? row?.payeeName,
    payeeAccountNo: apiRefund.payeeAccountNo ?? apiRefund.payee_account_no ?? row?.payeeAccountNo,
    payeeBankName: apiRefund.payeeBankName ?? apiRefund.payee_bank_name ?? row?.payeeBankName,
    splitDistributions: splits,
    refundSplits: splits,
    payoutHistory: Array.isArray(apiRefund.payoutHistory)
      ? apiRefund.payoutHistory
      : row?.payoutHistory,
  };
}

function refundPaymentNoteSettledAtApproval(refund) {
  return /settled at approval/i.test(String(refund?.paymentNote ?? refund?.payment_note ?? ''));
}

function refundSettledAtApprovalNgn(refund, breakdown) {
  const approvedNgn = refundApprovedAmount(refund);
  const paidNgn = Math.round(Number(refund?.paidAmountNgn ?? refund?.paid_amount_ngn) || 0);
  const companyCutNgn = breakdown.reduce((sum, row) => sum + row.companyDeductionNgn, 0);
  const unclearedOffsetNgn = breakdown.reduce((sum, row) => sum + row.unclearedReceiptOffsetNgn, 0);
  let settledAtApprovalNgn = Math.max(0, companyCutNgn + unclearedOffsetNgn);
  if (settledAtApprovalNgn <= 0 && refundPaymentNoteSettledAtApproval(refund) && paidNgn > 0) {
    settledAtApprovalNgn = Math.min(paidNgn, approvedNgn);
  }
  return settledAtApprovalNgn;
}

/** Treasury cash posted from Finance — excludes company cut / offsets settled at BM approval. */
export function refundTreasuryPaidNgn(refund) {
  const history = Array.isArray(refund?.payoutHistory) ? refund.payoutHistory : [];
  const fromHistory = history.reduce(
    (sum, line) => sum + Math.round(Number(line?.amountNgn ?? line?.amount_ngn) || 0),
    0
  );
  if (fromHistory > 0) return fromHistory;
  const paidNgn = Math.round(Number(refund?.paidAmountNgn ?? refund?.paid_amount_ngn) || 0);
  if (paidNgn <= 0) return 0;
  const breakdown = refundCashierSplitBreakdown(refund);
  const settledAtApprovalNgn = refundSettledAtApprovalNgn(refund, breakdown);
  if (settledAtApprovalNgn > 0 || refundPaymentNoteSettledAtApproval(refund)) {
    return Math.max(0, paidNgn - settledAtApprovalNgn);
  }
  return paidNgn;
}

/**
 * Gross splits scaled to approved amount, with company cut / net payout computed per recipient.
 * @returns {Array<{
 *   recipientKind: string,
 *   recipientLabel: string,
 *   grossNgn: number,
 *   companyDeductionNgn: number,
 *   unclearedReceiptOffsetNgn: number,
 *   netPayoutNgn: number,
 *   payeeName: string,
 * }>}
 */
export function refundCashierSplitBreakdown(refund) {
  const approvedNgn = refundApprovedAmount(refund);
  if (approvedNgn <= 0) return [];

  const rawSplits = refundSplitRows(refund).filter((s) => s.amountNgn > 0);

  const quoteCustomerId = String(refund?.customerID ?? refund?.customer_id ?? '').trim();

  if (!rawSplits.length) {
    return [
      {
        recipientKind: 'customer',
        recipientLabel: String(refund?.customer ?? refund?.payeeName ?? 'Customer').trim() || 'Customer',
        grossNgn: approvedNgn,
        companyDeductionNgn: 0,
        unclearedReceiptOffsetNgn: 0,
        netPayoutNgn: approvedNgn,
        payeeName: String(refund?.payeeName ?? refund?.payee_name ?? '').trim(),
      },
    ];
  }

  const splitSum = rawSplits.reduce((sum, row) => sum + row.amountNgn, 0) || 1;
  let allocated = 0;
  const scaled = rawSplits.map((row, idx) => {
    const isLast = idx === rawSplits.length - 1;
    const share = isLast
      ? Math.max(0, approvedNgn - allocated)
      : roundRefundStaffMoney((approvedNgn * row.amountNgn) / splitSum);
    allocated += share;
    return applyRefundStaffAllocationDeduction({ ...row, amountNgn: share }, quoteCustomerId, {
      honorCompanyCutWaiver: true,
    });
  });

  return scaled.map((row) => {
    const kind = String(row?.recipientKind || row?.payoutAccount?.partyKind || 'customer')
      .trim()
      .toLowerCase();
    const isStaff =
      kind === 'associated_staff' ||
      kind === 'staff' ||
      refundSplitTakesStaffDeduction(row, quoteCustomerId) ||
      roundRefundStaffMoney(row?.companyDeductionNgn) > 0;
    const payeeName = String(
      row?.payoutAccount?.payeeName ?? row?.payeeName ?? row?.payee_name ?? ''
    ).trim();
    const staffName = String(row?.recipientAssociatedStaffName ?? row?.associatedStaffName ?? '').trim();
    const customerName = String(refund?.customer ?? '').trim();
    let recipientLabel = payeeName || customerName || 'Recipient';
    if (isStaff) {
      recipientLabel = staffName || payeeName || 'Associated staff';
    } else if (customerName && !payeeName) {
      recipientLabel = customerName;
    }
    return {
      recipientKind: isStaff ? 'associated_staff' : 'customer',
      recipientLabel,
      grossNgn: roundRefundStaffMoney(row?.grossNgn ?? row?.amountNgn),
      companyDeductionNgn: roundRefundStaffMoney(row?.companyDeductionNgn),
      unclearedReceiptOffsetNgn: roundRefundStaffMoney(row?.unclearedReceiptOffsetNgn),
      netPayoutNgn: roundRefundStaffMoney(row?.netPayoutNgn ?? row?.amountNgn),
      payeeName: payeeName || recipientLabel,
    };
  });
}

/** Default till payout for the primary customer bank — not the full refund when staff splits exist. */
export function refundDefaultTreasuryPayoutNgn(refund) {
  const story = refundCashierMoneyStory(refund);
  const cashDueNgn = story.cashDueNgn;
  if (cashDueNgn <= 0) return 0;

  if (story.staffNetNgn > 0 && story.customerNetNgn > 0) {
    const totalNet = story.customerNetNgn + story.staffNetNgn;
    const customerDue = roundRefundStaffMoney((cashDueNgn * story.customerNetNgn) / totalNet);
    return Math.max(0, Math.min(customerDue, story.customerNetNgn, cashDueNgn));
  }

  const companyCutNgn =
    story.companyCutNgn ||
    parseCompanyCutFromPaymentNote(refund) ||
    (story.settledAtApprovalNgn > 0 ? story.settledAtApprovalNgn : 0);

  if (companyCutNgn > 0 && cashDueNgn < story.approvedNgn) {
    const staffGross = roundRefundStaffMoney(companyCutNgn / REFUND_STAFF_ALLOCATION_DEDUCTION_RATE);
    const customerNet = Math.max(0, story.approvedNgn - staffGross);
    if (customerNet > 0 && customerNet < cashDueNgn) {
      return Math.min(customerNet, cashDueNgn);
    }
  }

  return cashDueNgn;
}

/**
 * Cashier-facing split of a refund: requested vs applied onto another quote vs till payout.
 * Credit apply is not a treasury payout — leftover cash can still sit in the pay-out queue.
 */
export function refundCashierMoneyStory(refund) {
  const requestedNgn = Math.round(Number(refund?.amountNgn ?? refund?.amount_ngn) || 0);
  const appliedNgn = Math.round(Number(refund?.creditAppliedNgn ?? refund?.credit_applied_ngn) || 0);
  const appliedToQuote = String(
    refund?.creditAppliedToQuotationRef ?? refund?.credit_applied_to_quotation_ref ?? ''
  ).trim();
  const approvedNgn = refundApprovedAmount(refund);
  const paidNgn = Math.round(Number(refund?.paidAmountNgn ?? refund?.paid_amount_ngn) || 0);
  const cashDueNgn = refundOutstandingAmount(refund);

  const breakdown = refundCashierSplitBreakdown(refund);
  const companyCutNgn = breakdown.reduce((sum, row) => sum + row.companyDeductionNgn, 0);
  const unclearedOffsetNgn = breakdown.reduce((sum, row) => sum + row.unclearedReceiptOffsetNgn, 0);
  const settledAtApprovalNgn = refundSettledAtApprovalNgn(refund, breakdown);
  const treasuryPaidNgn = refundTreasuryPaidNgn(refund);
  const netCashApprovedNgn = Math.max(0, approvedNgn - settledAtApprovalNgn);
  const customerNetNgn = breakdown
    .filter((row) => row.recipientKind === 'customer')
    .reduce((sum, row) => sum + row.netPayoutNgn, 0);
  const staffNetNgn = breakdown
    .filter((row) => row.recipientKind === 'associated_staff')
    .reduce((sum, row) => sum + row.netPayoutNgn, 0);

  return {
    requestedNgn,
    appliedNgn,
    appliedToQuote,
    approvedNgn,
    paidNgn,
    treasuryPaidNgn,
    cashDueNgn,
    netCashApprovedNgn,
    companyCutNgn,
    unclearedOffsetNgn,
    settledAtApprovalNgn,
    customerNetNgn,
    staffNetNgn,
    splitBreakdown: breakdown,
    hasStaffSplit: staffNetNgn > 0,
  };
}

/**
 * Remaining overpayment on the quote after other refunds. 0 means do not pay more cash.
 */
export function refundCashierOverpayResidualNgn({
  cashInNgn,
  quoteTotalNgn,
  refunds,
  excludeRefundId,
} = {}) {
  return quotationOverpaymentResidualNgn({
    cashInNgn,
    quoteTotalNgn,
    overpaymentAlreadyRefundedNgn: overpaymentAlreadyRefundedNgn(refunds, excludeRefundId),
  });
}

export function refundCashierCustomerName(refund, quote) {
  const candidates = [
    refund?.customer,
    refund?.customerName,
    refund?.customer_name,
    quote?.customer,
    quote?.customerName,
    quote?.customer_name,
  ];
  for (const c of candidates) {
    const s = String(c || '').trim();
    if (s && s !== '—') return s;
  }
  return '—';
}
