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

function parseUnclearedOffsetFromPaymentNote(refund) {
  const note = String(refund?.paymentNote ?? refund?.payment_note ?? '');
  const match = note.match(/uncleared receipts offset\s*[₦N]?\s*([\d,]+)/i);
  if (!match) return 0;
  return roundRefundStaffMoney(String(match[1] || '').replace(/,/g, ''));
}

/** Cash still owed from till/bank — excludes company cut and uncleared-receipt offsets settled at approval. */
function payeeTillCashDueNgn(row, { treasuryPaidToPayeeNgn = 0, extraUnclearedOffsetNgn = 0 } = {}) {
  const offset = roundRefundStaffMoney(row?.unclearedReceiptOffsetNgn) + extraUnclearedOffsetNgn;
  const tillOwed = Math.max(0, roundRefundStaffMoney(row?.netPayoutNgn) - offset);
  return Math.max(0, tillOwed - roundRefundStaffMoney(treasuryPaidToPayeeNgn));
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
  const breakdownUncleared = breakdown.reduce(
    (sum, row) => sum + row.unclearedReceiptOffsetNgn,
    0
  );
  const noteUncleared = parseUnclearedOffsetFromPaymentNote(refund);
  const unclearedOffsetNgn = Math.max(breakdownUncleared, noteUncleared);
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

/** Normalized till/bank payout lines for finance registers and audit. */
export function refundPayoutRegisterLines(refund) {
  const history = Array.isArray(refund?.payoutHistory) ? refund.payoutHistory : [];
  return history
    .map((line) => ({
      postedAtISO: String(line?.postedAtISO ?? line?.posted_at_iso ?? '').trim(),
      accountName: String(line?.accountName ?? line?.account_name ?? '').trim(),
      amountNgn: roundRefundStaffMoney(line?.amountNgn ?? line?.amount_ngn),
      reference: String(line?.reference ?? '').trim(),
      note: String(line?.note ?? '').trim(),
    }))
    .filter((line) => line.amountNgn > 0);
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
      payeeBankName: String(
        row?.payoutAccount?.payeeBankName ?? row?.payeeBankName ?? row?.payee_bank_name ?? ''
      ).trim(),
      payeeAccountNo: String(
        row?.payoutAccount?.payeeAccountNo ?? row?.payeeAccountNo ?? row?.payee_account_no ?? ''
      ).trim(),
    };
  });
}

/**
 * One Finance desk row per payee still owed cash (after company cut settled at approval).
 * @returns {Array<{
 *   queueKey: string,
 *   refundID: string,
 *   parentRefund: object,
 *   recipientKind: string,
 *   recipientLabel: string,
 *   payeeName: string,
 *   payeeBankName: string,
 *   payeeAccountNo: string,
 *   grossNgn: number,
 *   companyDeductionNgn: number,
 *   netPayoutNgn: number,
 *   treasuryPaidToPayeeNgn: number,
 *   amountDueNgn: number,
 * }>}
 */
function buildRefundPayeePayoutLines(refund) {
  const story = refundCashierMoneyStory(refund);
  if (story.cashDueNgn <= 0) return { story, lines: [] };

  const rid = String(refund?.refundID ?? refund?.refund_id ?? '').trim();
  let breakdown = story.splitBreakdown.filter((row) => row.netPayoutNgn > 0);
  if (!breakdown.length) return { story, lines: [] };

  breakdown = [...breakdown].sort((a, b) => {
    if (a.recipientKind === b.recipientKind) return 0;
    return a.recipientKind === 'customer' ? -1 : 1;
  });

  const noteUncleared = parseUnclearedOffsetFromPaymentNote(refund);
  const breakdownUncleared = breakdown.reduce(
    (sum, row) => sum + roundRefundStaffMoney(row.unclearedReceiptOffsetNgn),
    0
  );
  let staffUnclearedExtra = Math.max(0, noteUncleared - breakdownUncleared);

  let treasuryRemaining = story.treasuryPaidNgn;
  const lines = breakdown.map((row, idx) => {
    const extraUnclearedOffsetNgn =
      row.recipientKind === 'associated_staff'
        ? Math.min(staffUnclearedExtra, roundRefundStaffMoney(row.netPayoutNgn))
        : 0;
    if (extraUnclearedOffsetNgn > 0) {
      staffUnclearedExtra -= extraUnclearedOffsetNgn;
    }
    const treasuryPaidToPayeeNgn = Math.min(
      payeeTillCashDueNgn(row, { extraUnclearedOffsetNgn: extraUnclearedOffsetNgn }),
      Math.max(0, treasuryRemaining)
    );
    treasuryRemaining -= treasuryPaidToPayeeNgn;
    const amountDueNgn = payeeTillCashDueNgn(row, {
      treasuryPaidToPayeeNgn,
      extraUnclearedOffsetNgn: extraUnclearedOffsetNgn,
    });
    const kindSlug = row.recipientKind === 'associated_staff' ? 'staff' : 'customer';
    const queueKey = `${kindSlug}-${idx}`;
    const payeeBankName =
      row.payeeBankName ||
      (row.recipientKind === 'customer'
        ? String(refund?.payeeBankName ?? refund?.payee_bank_name ?? '').trim()
        : '');
    const payeeAccountNo =
      row.payeeAccountNo ||
      (row.recipientKind === 'customer'
        ? String(refund?.payeeAccountNo ?? refund?.payee_account_no ?? '').trim()
        : '');
    const payeeName =
      row.payeeName ||
      (row.recipientKind === 'customer'
        ? String(refund?.payeeName ?? refund?.payee_name ?? '').trim()
        : row.recipientLabel);
    const unclearedReceiptOffsetNgn =
      roundRefundStaffMoney(row.unclearedReceiptOffsetNgn) + extraUnclearedOffsetNgn;
    return {
      queueKey,
      refundID: rid,
      parentRefund: refund,
      recipientKind: row.recipientKind,
      recipientLabel: row.recipientLabel,
      payeeName,
      payeeBankName,
      payeeAccountNo,
      grossNgn: row.grossNgn,
      companyDeductionNgn: row.companyDeductionNgn,
      unclearedReceiptOffsetNgn,
      netPayoutNgn: row.netPayoutNgn,
      treasuryPaidToPayeeNgn,
      amountDueNgn,
      settledAtApprovalNgn: story.settledAtApprovalNgn,
    };
  });

  let cashRemaining = story.cashDueNgn;
  const capped = lines.map((line) => {
    const amountDueNgn = Math.min(line.amountDueNgn, Math.max(0, cashRemaining));
    cashRemaining -= amountDueNgn;
    return { ...line, amountDueNgn };
  });

  return { story, lines: capped };
}

/** Per-recipient till status for refund detail — includes payees with ₦0 till due. */
export function refundRecipientTillPayoutRows(refund) {
  const { lines } = buildRefundPayeePayoutLines(refund);
  return lines.map((line) => {
    let payoutStatus = 'none';
    let payoutStatusLabel = 'No till payout';
    if (line.amountDueNgn > 0) {
      payoutStatus = 'till_due';
      payoutStatusLabel = 'Pay from till / bank';
    } else if (line.treasuryPaidToPayeeNgn > 0) {
      payoutStatus = 'paid';
      payoutStatusLabel = 'Paid from till / bank';
    } else if (line.unclearedReceiptOffsetNgn > 0) {
      payoutStatus = 'offset_at_approval';
      payoutStatusLabel = 'Cleared at approval (uncleared receipts)';
    } else if (line.companyDeductionNgn > 0) {
      payoutStatus = 'company_cut';
      payoutStatusLabel = 'Company cut retained at approval';
    }
    return { ...line, payoutStatus, payoutStatusLabel };
  });
}

export function refundPayeePayoutQueueLines(refund) {
  const { lines } = buildRefundPayeePayoutLines(refund);
  return lines.filter((line) => line.amountDueNgn > 0);
}

/** Expand approved refunds into individual payee payout queue rows. */
export function flattenRefundPayeePayoutQueue(refunds) {
  const list = Array.isArray(refunds) ? refunds : [];
  const lines = [];
  for (const refund of list) {
    const payeeLines = refundPayeePayoutQueueLines(refund);
    if (payeeLines.length) {
      lines.push(...payeeLines);
      continue;
    }
    const due = refundOutstandingAmount(refund);
    if (due <= 0) continue;
    const rid = String(refund?.refundID ?? '').trim();
    lines.push({
      queueKey: 'customer-0',
      refundID: rid,
      parentRefund: refund,
      recipientKind: 'customer',
      recipientLabel: String(refund?.customer ?? refund?.payeeName ?? 'Customer').trim() || 'Customer',
      payeeName: String(refund?.payeeName ?? '').trim(),
      payeeBankName: String(refund?.payeeBankName ?? '').trim(),
      payeeAccountNo: String(refund?.payeeAccountNo ?? '').trim(),
      grossNgn: refundApprovedAmount(refund),
      companyDeductionNgn: 0,
      unclearedReceiptOffsetNgn: 0,
      netPayoutNgn: due,
      treasuryPaidToPayeeNgn: 0,
      amountDueNgn: due,
      settledAtApprovalNgn: 0,
    });
  }
  return lines;
}

const REFUND_PAYOUT_CAUTION_COPY = {
  missing_bank: 'Bank details missing — confirm pay-to account before payout.',
  multi_payee: 'Split payout — pay each recipient their net line separately.',
  splits_incomplete:
    'Payee split may be incomplete on this snapshot — open payout to refresh amounts.',
  quotation_blocked: 'Refunds are blocked on this quotation — payout will be rejected.',
};

/**
 * Cashier desk hint when a refund payout row may fail or needs extra care.
 * @returns {{ level: 'none'|'info'|'warn'|'block', tone: 'amber'|'violet'|'rose', title: string, codes: string[] }}
 */
export function refundPayeePayoutCaution(refund, payeeLine, { siblingPayeeLines = [] } = {}) {
  const codes = [];
  const rid = String(payeeLine?.refundID ?? refund?.refundID ?? '').trim();
  const siblings = (Array.isArray(siblingPayeeLines) ? siblingPayeeLines : []).filter(
    (line) => String(line?.refundID ?? '').trim() === rid
  );

  const acct = String(
    payeeLine?.payeeAccountNo ||
      refund?.payeeAccountNo ||
      refund?.payee_account_no ||
      ''
  ).trim();
  const bank = String(
    payeeLine?.payeeBankName ||
      refund?.payeeBankName ||
      refund?.payee_bank_name ||
      ''
  ).trim();
  if (!acct || !bank) codes.push('missing_bank');

  if (siblings.length > 1) codes.push('multi_payee');

  const splits = refundSplitRows(refund);
  const story = refundCashierMoneyStory(refund);
  const settledNote = refundPaymentNoteSettledAtApproval(refund);
  const paidNgn = Math.round(Number(refund?.paidAmountNgn ?? refund?.paid_amount_ngn) || 0);
  const splitPayeeCount = splits.filter((row) => row.amountNgn > 0).length;
  if (
    (!splits.length && (settledNote || paidNgn > 0)) ||
    (splitPayeeCount > 1 && siblings.length === 1) ||
    (story.hasStaffSplit && siblings.length === 1 && payeeLine?.recipientKind === 'customer')
  ) {
    codes.push('splits_incomplete');
  }

  if (
    String(
      refund?.quotationRefundsBlockedAtISO ?? refund?.quotation_refunds_blocked_at_iso ?? ''
    ).trim()
  ) {
    codes.push('quotation_blocked');
  }

  if (!codes.length) {
    return { level: 'none', tone: 'amber', title: '', codes: [] };
  }

  let level = 'info';
  let tone = 'violet';
  if (codes.includes('quotation_blocked')) {
    level = 'block';
    tone = 'rose';
  } else if (codes.includes('missing_bank') || codes.includes('splits_incomplete')) {
    level = 'warn';
    tone = 'amber';
  }

  const title = codes.map((code) => REFUND_PAYOUT_CAUTION_COPY[code] || code).join(' · ');
  return { level, tone, title, codes };
}

/** Default till payout for one payee — uses queue line cash due, not proportional guess. */
export function refundDefaultTreasuryPayoutNgn(refund, payeeQueueKey = null) {
  const lines = refundPayeePayoutQueueLines(refund);
  if (payeeQueueKey) {
    return lines.find((line) => line.queueKey === payeeQueueKey)?.amountDueNgn ?? 0;
  }
  const customerLine = lines.find((line) => line.recipientKind === 'customer');
  if (customerLine) return customerLine.amountDueNgn;
  if (lines.length === 1) return lines[0].amountDueNgn;

  const story = refundCashierMoneyStory(refund);
  return story.cashDueNgn;
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
