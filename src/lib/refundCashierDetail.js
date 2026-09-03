import { refundApprovedAmount, refundOutstandingAmount, refundLooksPaidWithoutTillPayout } from './refundsStore';
import { refundCategoriesAreOverpaymentOnly } from '../shared/lib/refundCreditApply.js';
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

/**
 * Cashiers cannot till-pay while the payee has unconfirmed receipts.
 * Admin may override at payout.
 */
export function actorMayOverrideRefundUnclearedPayoutHold(actor, hasPermission) {
  if (typeof hasPermission === 'function' && hasPermission('*')) return true;
  const perms = Array.isArray(actor?.permissions) ? actor.permissions : [];
  if (perms.includes('*')) return true;
  const rk = String(actor?.roleKey || actor?.role_key || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
  return rk === 'admin';
}

function refundWalletOpenNgn(refund) {
  return Math.max(0, Math.round(Number(refund?.walletOpenNgn ?? refund?.wallet_open_ngn) || 0));
}

function refundSplitLooksUnclearedHeld(split) {
  return (
    Boolean(split?.payoutHeldForUnclearedReceipts) ||
    Math.round(Number(split?.unclearedReceiptHoldNgn ?? split?.uncleared_receipt_hold_ngn) || 0) > 0
  );
}

/** Snapshot/API flag that a payee net is held for unconfirmed receipts. */
export function refundHasUnclearedPayoutHold(refund) {
  const splits = refundSplitRows(refund);
  if (splits.some(refundSplitLooksUnclearedHeld)) return true;
  return (
    Math.round(Number(refund?.heldNetNgn ?? refund?.held_net_ngn) || 0) > 0 ||
    Math.round(Number(refund?.unclearedReceiptHoldNgn ?? refund?.uncleared_receipt_hold_ngn) || 0) > 0
  );
}

/**
 * Slice of a payee's net payout that stays withheld for unconfirmed receipts — capped at the
 * payee's own uncleared total, never the whole net (so any surplus above what they actually
 * owe in unconfirmed receipts pays out now, and unrelated payees/refunds are never touched).
 */
function payeeUnclearedWithheldNgn(row) {
  if (!row?.payoutHeldForUnclearedReceipts) return 0;
  return Math.max(
    0,
    Math.min(roundRefundStaffMoney(row?.netPayoutNgn), roundRefundStaffMoney(row?.unclearedReceiptHoldNgn))
  );
}

/** Cash still owed from till/bank — excludes company cut settled at approval. */
function payeeTillCashDueNgn(row, { treasuryPaidToPayeeNgn = 0, overrideUnclearedHold = false } = {}) {
  const withheldNgn = overrideUnclearedHold ? 0 : payeeUnclearedWithheldNgn(row);
  const tillOwed = Math.max(0, roundRefundStaffMoney(row?.netPayoutNgn) - withheldNgn);
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
    walletOpenNgn: apiRefund.walletOpenNgn ?? apiRefund.wallet_open_ngn ?? row?.walletOpenNgn,
    heldNetNgn: apiRefund.heldNetNgn ?? apiRefund.held_net_ngn ?? row?.heldNetNgn,
  };
}

function refundPaymentNoteSettledAtApproval(refund) {
  return /settled at approval/i.test(String(refund?.paymentNote ?? refund?.payment_note ?? ''));
}

function refundSettledAtApprovalNgn(refund, breakdown) {
  const paidNgn = Math.round(Number(refund?.paidAmountNgn ?? refund?.paid_amount_ngn) || 0);
  const companyCutNgn = breakdown.reduce((sum, row) => sum + row.companyDeductionNgn, 0);
  let settledAtApprovalNgn = Math.max(0, companyCutNgn);
  if (settledAtApprovalNgn <= 0 && refundPaymentNoteSettledAtApproval(refund) && paidNgn > 0) {
    const noteCompanyCut = parseCompanyCutFromPaymentNote(refund);
    settledAtApprovalNgn = noteCompanyCut > 0 ? noteCompanyCut : Math.min(paidNgn, refundApprovedAmount(refund));
  }
  return settledAtApprovalNgn;
}

/** Treasury cash posted from Finance — excludes company cut / legacy offsets settled at BM approval. */
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
  const legacyUnclearedOffsetNgn = parseUnclearedOffsetFromPaymentNote(refund);
  const nonTreasurySettlementNgn = settledAtApprovalNgn + legacyUnclearedOffsetNgn;
  if (nonTreasurySettlementNgn > 0 || refundPaymentNoteSettledAtApproval(refund)) {
    return Math.max(0, paidNgn - nonTreasurySettlementNgn);
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
  let calculationLines = refund?.calculationLines;
  if (!Array.isArray(calculationLines)) {
    try {
      calculationLines = JSON.parse(String(refund?.calculation_lines_json ?? '[]'));
    } catch {
      calculationLines = [];
    }
  }
  const overpaymentOnly = refundCategoriesAreOverpaymentOnly(
    refund?.reasonCategory ?? refund?.reason_category,
    calculationLines
  );

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
      overpaymentOnly,
      unclearedReceiptHoldNgn:
        roundRefundStaffMoney(row?.unclearedReceiptHoldNgn ?? row?.uncleared_receipt_hold_ngn) ||
        roundRefundStaffMoney(row?.unclearedReceiptOffsetNgn ?? row?.uncleared_receipt_offset_ngn),
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
      unclearedReceiptHoldNgn: roundRefundStaffMoney(row?.unclearedReceiptHoldNgn),
      unclearedReceiptOffsetNgn: 0,
      payoutHeldForUnclearedReceipts: Boolean(row?.payoutHeldForUnclearedReceipts),
      overpaymentCashierReferralAvailable: Boolean(row?.overpaymentCashierReferralAvailable),
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
function buildRefundPayeePayoutLines(refund, { overrideUnclearedHold = false } = {}) {
  const story = refundCashierMoneyStory(refund);
  if (story.cashDueNgn <= 0 && !overrideUnclearedHold) return { story, lines: [] };

  const rid = String(refund?.refundID ?? refund?.refund_id ?? '').trim();
  let breakdown = story.splitBreakdown.filter((row) => row.netPayoutNgn > 0);
  if (!breakdown.length) return { story, lines: [] };

  breakdown = [...breakdown].sort((a, b) => {
    if (a.recipientKind === b.recipientKind) return 0;
    return a.recipientKind === 'customer' ? -1 : 1;
  });

  const noteUncleared = parseUnclearedOffsetFromPaymentNote(refund);
  const breakdownUncleared = breakdown.reduce(
    (sum, row) => sum + roundRefundStaffMoney(row.unclearedReceiptHoldNgn),
    0
  );
  let staffUnclearedExtra = Math.max(0, noteUncleared - breakdownUncleared);

  let treasuryRemaining = story.treasuryPaidNgn;
  const lines = breakdown.map((row, idx) => {
    const treasuryPaidToPayeeNgn = Math.min(
      payeeTillCashDueNgn(row, { overrideUnclearedHold }),
      Math.max(0, treasuryRemaining)
    );
    treasuryRemaining -= treasuryPaidToPayeeNgn;
    const amountDueNgn = payeeTillCashDueNgn(row, { treasuryPaidToPayeeNgn, overrideUnclearedHold });
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
    const unclearedReceiptHoldNgn =
      roundRefundStaffMoney(row.unclearedReceiptHoldNgn) +
      (row.recipientKind === 'associated_staff' && staffUnclearedExtra > 0
        ? Math.min(staffUnclearedExtra, roundRefundStaffMoney(row.netPayoutNgn))
        : 0);
    if (row.recipientKind === 'associated_staff' && staffUnclearedExtra > 0) {
      staffUnclearedExtra = Math.max(
        0,
        staffUnclearedExtra - roundRefundStaffMoney(row.unclearedReceiptHoldNgn)
      );
    }
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
      unclearedReceiptHoldNgn,
      payoutHeldForUnclearedReceipts: Boolean(row.payoutHeldForUnclearedReceipts),
      unclearedWithheldNgn: payeeUnclearedWithheldNgn(row),
      overpaymentCashierReferralAvailable: Boolean(row.overpaymentCashierReferralAvailable),
      netPayoutNgn: row.netPayoutNgn,
      treasuryPaidToPayeeNgn,
      amountDueNgn,
      settledAtApprovalNgn: story.settledAtApprovalNgn,
    };
  });

  let cashRemaining = story.cashDueNgn;
  const capped = overrideUnclearedHold
    ? lines
    : lines.map((line) => {
        const amountDueNgn = Math.min(line.amountDueNgn, Math.max(0, cashRemaining));
        cashRemaining -= amountDueNgn;
        return { ...line, amountDueNgn };
      });

  const walletOpenNgn = refundWalletOpenNgn(refund);
  if (walletOpenNgn <= 0) return { story, lines: capped };

  // Open partner-wallet credit is withdrawn from the wallet desk — not till.
  // Admin may still till-pay the held-for-uncleared slice that never hit the wallet.
  return {
    story,
    lines: capped.map((line) => {
      if (overrideUnclearedHold && line.payoutHeldForUnclearedReceipts && line.amountDueNgn > 0) {
        return line;
      }
      return { ...line, amountDueNgn: 0 };
    }),
  };
}

/** Per-recipient till status for refund detail — includes payees with ₦0 till due. */
export function refundRecipientTillPayoutRows(refund, { overrideUnclearedHold = false } = {}) {
  const { lines } = buildRefundPayeePayoutLines(refund, { overrideUnclearedHold });
  return lines.map((line) => {
    let payoutStatus = 'none';
    let payoutStatusLabel = 'No till payout';
    if (line.amountDueNgn > 0 && line.payoutHeldForUnclearedReceipts && overrideUnclearedHold) {
      payoutStatus = 'admin_override_uncleared';
      payoutStatusLabel = 'Admin exception — pay despite unconfirmed receipts';
    } else if (line.amountDueNgn > 0 && line.unclearedWithheldNgn > 0) {
      payoutStatus = 'till_due_partial_held';
      payoutStatusLabel = 'Pay available balance — part held for uncleared receipts';
    } else if (line.amountDueNgn > 0) {
      payoutStatus = 'till_due';
      payoutStatusLabel = 'Pay from till / bank';
    } else if (line.treasuryPaidToPayeeNgn > 0) {
      payoutStatus = 'paid';
      payoutStatusLabel = 'Paid from till / bank';
    } else if (line.overpaymentCashierReferralAvailable && line.netPayoutNgn > 0) {
      payoutStatus = 'referral_available';
      payoutStatusLabel = 'Available for cashier referral / confirmation';
    } else if (line.payoutHeldForUnclearedReceipts && line.netPayoutNgn > 0) {
      payoutStatus = 'held_uncleared';
      payoutStatusLabel = 'Held — uncleared receipts pending';
    } else if (line.companyDeductionNgn > 0) {
      payoutStatus = 'company_cut';
      payoutStatusLabel = 'Company cut retained at approval';
    }
    return { ...line, payoutStatus, payoutStatusLabel };
  });
}

export function refundPayeePayoutQueueLines(refund, { overrideUnclearedHold = false } = {}) {
  const { lines } = buildRefundPayeePayoutLines(refund, { overrideUnclearedHold });
  return lines.filter((line) => line.amountDueNgn > 0);
}

/** Expand approved refunds into till-due payee rows only (cash to pay now). */
export function flattenRefundPayeePayoutQueue(refunds, { overrideUnclearedHold = false } = {}) {
  const list = Array.isArray(refunds) ? refunds : [];
  const lines = [];
  for (const refund of list) {
    const payeeLines = refundPayeePayoutQueueLines(refund, { overrideUnclearedHold });
    if (payeeLines.length) {
      lines.push(...payeeLines);
      continue;
    }
    // When splits exist but every payee is held / referral-only / already paid,
    // do not invent a customer till line that bypasses uncleared holds.
    const { lines: allPayeeLines } = buildRefundPayeePayoutLines(refund, { overrideUnclearedHold });
    if (allPayeeLines.length > 0) continue;
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

/**
 * Finance desk list — till due plus held / referral rows so pending money is never hidden.
 */
export function flattenRefundDeskQueue(refunds, { overrideUnclearedHold = false } = {}) {
  const list = Array.isArray(refunds) ? refunds : [];
  const lines = [];
  for (const refund of list) {
    const rows = refundRecipientTillPayoutRows(refund, { overrideUnclearedHold }).filter((row) =>
      [
        'till_due',
        'till_due_partial_held',
        'held_uncleared',
        'referral_available',
        'admin_override_uncleared',
      ].includes(row.payoutStatus)
    );
    if (rows.length) {
      lines.push(...rows.map((row) => ({ ...row, parentRefund: refund })));
      continue;
    }
    const tillOnly = flattenRefundPayeePayoutQueue([refund], { overrideUnclearedHold });
    if (tillOnly.length) {
      lines.push(...tillOnly.map((row) => ({ ...row, payoutStatus: 'till_due', payoutStatusLabel: 'Pay from till / bank' })));
      continue;
    }
    if (refundLooksPaidWithoutTillPayout(refund)) {
      const rid = String(refund?.refundID ?? '').trim();
      lines.push({
        queueKey: 'attention-0',
        refundID: rid,
        parentRefund: refund,
        recipientKind: 'customer',
        recipientLabel: String(refund?.customer ?? refund?.payeeName ?? 'Customer').trim() || 'Customer',
        payeeName: String(refund?.payeeName ?? '').trim(),
        payeeBankName: String(refund?.payeeBankName ?? '').trim(),
        payeeAccountNo: String(refund?.payeeAccountNo ?? '').trim(),
        grossNgn: refundApprovedAmount(refund),
        companyDeductionNgn: 0,
        netPayoutNgn: refundApprovedAmount(refund),
        amountDueNgn: 0,
        payoutStatus: 'needs_review',
        payoutStatusLabel: 'Shows paid — no till payout posted',
      });
    }
  }
  return lines;
}

const REFUND_PAYOUT_CAUTION_COPY = {
  missing_bank: 'Bank details missing — confirm pay-to account before payout.',
  multi_payee: 'Split payout — pay each recipient their net line separately.',
  splits_incomplete:
    'Payee split may be incomplete on this snapshot — open payout to refresh amounts.',
  quotation_blocked: 'Refunds are blocked on this quotation — payout will be rejected.',
  uncleared_receipts:
    'Payee has unconfirmed receipts — till payout is held until cashier confirms them.',
  uncleared_receipts_partial:
    'Part of this payout is held for the payee\'s unconfirmed receipts — the rest is payable now.',
  admin_uncleared_override:
    'Admin exception: payee has unconfirmed receipts — payout is allowed for this login only.',
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

  if (payeeLine?.payoutHeldForUnclearedReceipts && roundRefundStaffMoney(payeeLine?.unclearedWithheldNgn) > 0) {
    codes.push(
      payeeLine?.payoutStatus === 'admin_override_uncleared'
        ? 'admin_uncleared_override'
        : payeeLine?.payoutStatus === 'till_due_partial_held'
          ? 'uncleared_receipts_partial'
          : 'uncleared_receipts'
    );
  }

  if (!codes.length) {
    return { level: 'none', tone: 'amber', title: '', codes: [] };
  }

  let level = 'info';
  let tone = 'violet';
  if (codes.includes('quotation_blocked')) {
    level = 'block';
    tone = 'rose';
  } else if (
    codes.includes('missing_bank') ||
    codes.includes('splits_incomplete') ||
    codes.includes('uncleared_receipts') ||
    codes.includes('uncleared_receipts_partial') ||
    codes.includes('admin_uncleared_override')
  ) {
    level = 'warn';
    tone = 'amber';
  }

  const title = codes.map((code) => REFUND_PAYOUT_CAUTION_COPY[code] || code).join(' · ');
  return { level, tone, title, codes };
}

/** Default till payout for one payee — uses queue line cash due, not proportional guess. */
export function refundDefaultTreasuryPayoutNgn(refund, payeeQueueKey = null, { overrideUnclearedHold = false } = {}) {
  const lines = refundPayeePayoutQueueLines(refund, { overrideUnclearedHold });
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
  const unclearedHoldNgn = breakdown.reduce((sum, row) => sum + row.unclearedReceiptHoldNgn, 0);
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
    unclearedHoldNgn,
    /** @deprecated use unclearedHoldNgn — holds are not auto-settled */
    unclearedOffsetNgn: unclearedHoldNgn,
    settledAtApprovalNgn,
    customerNetNgn,
    staffNetNgn,
    splitBreakdown: breakdown,
    hasStaffSplit: staffNetNgn > 0,
  };
}

/**
 * Remaining overpayment on the quote after other refunds. 0 means do not pay more cash.
 * @param {number} [creditAppliedOutNgn] overpayment already redirected as credit to another
 *   quotation (not via a refund record) — from GET /api/refunds/intelligence. The server's
 *   pay-time check subtracts this; omitting it here can show a live "Pay" button the server
 *   then rejects with REFUND_OVERPAYMENT_ALREADY_SETTLED.
 */
export function refundCashierOverpayResidualNgn({
  cashInNgn,
  quoteTotalNgn,
  refunds,
  excludeRefundId,
  creditAppliedOutNgn = 0,
} = {}) {
  return quotationOverpaymentResidualNgn({
    cashInNgn,
    quoteTotalNgn,
    overpaymentAlreadyRefundedNgn: overpaymentAlreadyRefundedNgn(refunds, excludeRefundId),
    creditAppliedOutNgn,
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
