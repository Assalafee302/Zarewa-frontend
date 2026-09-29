/**
 * Picture of one Payment register line: this till/bank debit, the other legs
 * on the same source, and what the source document still owes.
 */
import { formatNgn } from './formatNgn.js';
import {
  TREASURY_SOURCE_KIND_LABEL,
  TREASURY_STATEMENT_TYPE_LABEL,
  buildPaymentRequestAuditTrail,
} from './accountCore.js';
import { expenseCashierMoneyStory } from './expenseCashierDetail.js';
import { refundCashierMoneyStory } from './refundCashierDetail.js';
import { refundPublicStatusLabel } from './refundsStore.js';

function text(value) {
  return String(value ?? '').trim();
}

function money(value) {
  return Math.round(Number(value) || 0);
}

function typeLabel(type) {
  const key = text(type);
  return TREASURY_STATEMENT_TYPE_LABEL[key] || key || 'Treasury line';
}

function sourceKindLabel(kind) {
  const key = text(kind);
  return TREASURY_SOURCE_KIND_LABEL[key] || key || 'Source';
}

function sameSource(movement, sourceKind, sourceId) {
  return text(movement?.sourceKind) === sourceKind && text(movement?.sourceId) === sourceId;
}

function legDirection(movement) {
  const reverses = text(movement?.reversesMovementId);
  const amount = money(movement?.amountNgn);
  if (reverses || amount > 0) return 'back';
  return 'out';
}

/**
 * @param {Array<object>} movements
 * @param {string} sourceKind
 * @param {string} sourceId
 */
export function paymentRegisterSourceLegs(movements, sourceKind, sourceId) {
  const sk = text(sourceKind);
  const sid = text(sourceId);
  if (!sk || !sid || !Array.isArray(movements)) return [];
  return movements
    .filter((movement) => sameSource(movement, sk, sid))
    .slice()
    .sort((a, b) => text(b.postedAtISO).localeCompare(text(a.postedAtISO)));
}

function pushMoney(rows, label, amountNgn, tone) {
  const amount = money(amountNgn);
  if (!label) return;
  rows.push({ label, amountNgn: amount, tone: tone || 'slate' });
}

function refundPicture(refund, sentences, moneyRows, facts) {
  const story = refundCashierMoneyStory(refund);
  const customer = text(refund.customer || refund.payeeName || refund.customerName);
  const quote = text(refund.quotationRef || refund.quotation_ref);
  const reason = text(refund.reason);
  const category = text(refund.reasonCategory || refund.reason_category);
  const status = refundPublicStatusLabel(refund);

  if (customer) facts.push({ label: 'Customer', value: customer });
  if (status) facts.push({ label: 'Refund status', value: status });
  if (quote) facts.push({ label: 'Quotation', value: quote });
  if (category) facts.push({ label: 'Reason', value: category });
  if (reason && reason !== category) facts.push({ label: 'Note', value: reason });

  if (story.approvedNgn > 0) {
    sentences.push(`Manager approved ${formatNgn(story.approvedNgn)} on ${text(refund.refundID) || 'this refund'}.`);
    pushMoney(moneyRows, 'Approved', story.approvedNgn, 'slate');
  }
  if (story.companyCutNgn > 0) {
    sentences.push(`${formatNgn(story.companyCutNgn)} stayed with the company and was never paid out.`);
    pushMoney(moneyRows, 'Company kept', story.companyCutNgn, 'violet');
  }
  if (story.appliedNgn > 0) {
    sentences.push(
      story.appliedToQuote
        ? `${formatNgn(story.appliedNgn)} was used from this refund onto quotation ${story.appliedToQuote}.`
        : `${formatNgn(story.appliedNgn)} was used from this refund onto another quotation.`
    );
    pushMoney(moneyRows, 'Used on another quote', story.appliedNgn, 'amber');
  }
  if (story.unclearedHoldNgn > 0) {
    const ids = (story.unclearedReceiptIds || []).filter(Boolean);
    sentences.push(
      ids.length
        ? `${formatNgn(story.unclearedHoldNgn)} is held until receipt ${ids.join(', ')} is confirmed.`
        : `${formatNgn(story.unclearedHoldNgn)} is held until unconfirmed receipts on this quotation are confirmed.`
    );
    pushMoney(moneyRows, 'Held for receipts', story.unclearedHoldNgn, 'amber');
  }
  if (story.walletOpenNgn > 0) {
    sentences.push(`${formatNgn(story.walletOpenNgn)} is still on partner wallet for this refund.`);
    pushMoney(moneyRows, 'Partner wallet open', story.walletOpenNgn, 'amber');
  }
  if (story.walletWithdrawnNgn > 0) {
    sentences.push(`${formatNgn(story.walletWithdrawnNgn)} was released from partner wallet.`);
    pushMoney(moneyRows, 'Wallet released', story.walletWithdrawnNgn, 'emerald');
  }
  if (story.cashDueNgn > 0) {
    sentences.push(`${formatNgn(story.cashDueNgn)} is still to pay from till or bank.`);
    pushMoney(moneyRows, 'Still to pay', story.cashDueNgn, 'rose');
  } else if (story.approvedNgn > 0 || story.treasuryPaidNgn > 0 || story.appliedNgn > 0) {
    sentences.push('Nothing is left to pay from till or bank on this refund.');
    pushMoney(moneyRows, 'Still to pay', 0, 'emerald');
  }

  const splits = (story.splitBreakdown || [])
    .filter((row) => money(row.netPayoutNgn) > 0 || money(row.grossNgn) > 0)
    .map((row) => ({
      label: text(row.recipientLabel) || 'Recipient',
      kind: text(row.recipientKind) || 'customer',
      grossNgn: money(row.grossNgn),
      companyNgn: money(row.companyDeductionNgn),
      netNgn: money(row.netPayoutNgn),
    }));

  return { splits, payee: customer };
}

function requestPicture(req, sentences, moneyRows, facts) {
  const story = expenseCashierMoneyStory(req);
  const payee = text(req.payeeName);
  const category = text(req.expenseCategory);
  const memo = text(req.description);
  const status = text(req.approvalStatus);
  if (payee) facts.push({ label: 'Payee', value: payee });
  if (status) facts.push({ label: 'Request status', value: status });
  if (category) facts.push({ label: 'Category', value: category });
  const bank = [text(req.payeeBankName), text(req.payeeAccountNo)].filter(Boolean).join(' · ');
  if (bank) facts.push({ label: 'Payee account', value: bank });
  if (memo) facts.push({ label: 'Memo', value: memo });

  sentences.push(
    `Request ${text(req.requestID) || '—'} is ${formatNgn(story.requestedNgn)}, with ${formatNgn(story.paidNgn)} already paid from till or bank.`
  );
  if (story.dueNgn > 0) {
    sentences.push(`${formatNgn(story.dueNgn)} is still to pay on this request.`);
  } else if (story.requestedNgn > 0) {
    sentences.push('This request has no till or bank balance left to pay.');
  }
  pushMoney(moneyRows, 'Requested', story.requestedNgn, 'slate');
  pushMoney(moneyRows, 'Paid from till / bank', story.paidNgn, 'emerald');
  pushMoney(moneyRows, 'Still to pay', story.dueNgn, story.dueNgn > 0 ? 'rose' : 'emerald');

  const trail = buildPaymentRequestAuditTrail(req).map((step) => ({
    label: step.label,
    value: [text(step.who), text(step.at).slice(0, 16).replace('T', ' ')].filter((bit) => bit && bit !== '—').join(' · '),
  }));
  return { trail, payee };
}

function expensePicture(expense, sentences, moneyRows, facts, lineAmountNgn) {
  const amount = money(expense.amountNgn);
  const category = text(expense.category);
  const kind = text(expense.expenseType);
  const when = text(expense.date).slice(0, 10);
  if (kind) facts.push({ label: 'Expense', value: kind });
  if (category) facts.push({ label: 'Category', value: category });
  if (when) facts.push({ label: 'Expense date', value: when });
  if (text(expense.paymentMethod)) facts.push({ label: 'Method', value: text(expense.paymentMethod) });
  if (text(expense.reference)) facts.push({ label: 'Expense reference', value: text(expense.reference) });
  if (text(expense.requestID)) facts.push({ label: 'Payment request', value: text(expense.requestID) });

  sentences.push(
    amount > 0
      ? `Posted expense ${text(expense.expenseID) || '—'} is ${formatNgn(amount)}${category ? ` (${category})` : ''}.`
      : `Posted expense ${text(expense.expenseID) || '—'} is linked to this line.`
  );
  if (amount > 0 && lineAmountNgn > 0 && amount !== lineAmountNgn) {
    sentences.push(
      `This register line is ${formatNgn(lineAmountNgn)}. The expense card is ${formatNgn(amount)} — other lines may share that card.`
    );
  }
  if (amount > 0) pushMoney(moneyRows, 'Expense card', amount, 'slate');
  return { payee: text(expense.payeeName) };
}

/**
 * @param {{
 *   row: object;
 *   movements?: object[];
 *   refund?: object | null;
 *   paymentRequest?: object | null;
 *   expense?: object | null;
 * }} input
 */
export function buildPaymentRegisterLineDetail({
  row,
  movements = [],
  refund = null,
  paymentRequest = null,
  expense = null,
} = {}) {
  const movementId = text(row?.movementId);
  const movement =
    (Array.isArray(movements) ? movements : []).find((item) => text(item?.id) === movementId) || null;
  const sourceKind = text(movement?.sourceKind || row?.sourceKind);
  const sourceId = text(movement?.sourceId || row?.sourceId);
  const signed = movement ? money(movement.amountNgn) : -money(row?.amountAbs);
  const amountAbs = Math.abs(signed);
  const accountName = text(movement?.accountName || row?.accountName);
  const accountDetail = [text(movement?.bankName), text(movement?.accountNo)].filter(Boolean).join(' · ');
  const postedAtISO = text(movement?.postedAtISO || row?.postedAtISO);
  const reference = text(movement?.reference || row?.reference);
  const note = text(movement?.note);
  const postedBy = text(movement?.createdBy);
  const label = typeLabel(movement?.type || row?.type);

  const legs = paymentRegisterSourceLegs(movements, sourceKind, sourceId).map((item) => {
    const amountNgn = money(item.amountNgn);
    return {
      movementId: text(item.id),
      postedAtISO: text(item.postedAtISO),
      accountName: text(item.accountName),
      amountNgn,
      amountAbs: Math.abs(amountNgn),
      direction: legDirection(item),
      reference: text(item.reference),
      note: text(item.note),
      postedBy: text(item.createdBy),
      typeLabel: typeLabel(item.type),
      isThisLine: text(item.id) === movementId,
      reversesMovementId: text(item.reversesMovementId),
    };
  });

  const outflowLegs = legs.filter((leg) => leg.direction === 'out');
  const reversalLegs = legs.filter((leg) => leg.direction === 'back');
  const outflowNgn = outflowLegs.reduce((sum, leg) => sum + leg.amountAbs, 0);
  const reversedNgn = reversalLegs.reduce((sum, leg) => sum + leg.amountAbs, 0);
  const netLeftNgn = Math.max(0, outflowNgn - reversedNgn);

  const sentences = [];
  const day = postedAtISO.slice(0, 10) || 'the posted date';
  sentences.push(
    accountName
      ? `This line took ${formatNgn(amountAbs)} from ${accountName} on ${day}.`
      : `This line took ${formatNgn(amountAbs)} from till or bank on ${day}.`
  );
  if (note) sentences.push(note);
  if (reference) sentences.push(`Reference on this debit: ${reference}.`);

  if (outflowLegs.length > 1) {
    const bits = outflowLegs.map((leg) => formatNgn(leg.amountAbs));
    sentences.push(
      `${sourceId || 'This source'} was paid in ${outflowLegs.length} separate till/bank debits (${bits.join(' and ')}). This row is one of those debits.`
    );
  }
  if (reversalLegs.length > 0) {
    sentences.push(
      `${formatNgn(reversedNgn)} was posted back into till or bank${reversalLegs.length === 1 ? '' : ` across ${reversalLegs.length} reversal lines`}. Net still out is ${formatNgn(netLeftNgn)}.`
    );
  } else if (legs.length > 1) {
    sentences.push(`Together those debits left ${formatNgn(netLeftNgn)}.`);
  }

  const moneyRows = [{ label: 'This line', amountNgn: amountAbs, tone: 'teal' }];
  if (legs.length > 1) pushMoney(moneyRows, 'All till/bank debits', outflowNgn, 'slate');
  if (reversedNgn > 0) pushMoney(moneyRows, 'Posted back', reversedNgn, 'amber');
  if (legs.length > 1 || reversedNgn > 0) pushMoney(moneyRows, 'Net left till / bank', netLeftNgn, 'teal');

  const facts = [];
  if (sourceId) facts.push({ label: 'Source', value: sourceId });
  facts.push({ label: 'Kind', value: sourceKind ? sourceKindLabel(sourceKind) : label });
  if (postedBy) facts.push({ label: 'Posted by', value: postedBy });
  if (movementId) facts.push({ label: 'Movement', value: movementId });

  let splits = [];
  let trail = [];
  let payee = text(movement?.counterpartyName || row?.counterpartyName);

  if (sourceKind === 'REFUND' && refund) {
    const picture = refundPicture(refund, sentences, moneyRows, facts);
    splits = picture.splits;
    payee = picture.payee || payee;
  } else if (sourceKind === 'PAYMENT_REQUEST' && paymentRequest) {
    const picture = requestPicture(paymentRequest, sentences, moneyRows, facts);
    trail = picture.trail;
    payee = picture.payee || payee;
  } else if (sourceKind === 'EXPENSE' && expense) {
    const picture = expensePicture(expense, sentences, moneyRows, facts, amountAbs);
    payee = picture.payee || payee;
  } else if (sourceKind === 'PURCHASE_ORDER' && sourceId) {
    sentences.push(`This debit settles purchase order ${sourceId}.`);
  } else if (sourceKind === 'ACCOUNTS_PAYABLE' && sourceId) {
    sentences.push(`This debit settles accounts payable ${sourceId}.`);
  } else if (sourceId && !refund && !paymentRequest && !expense) {
    sentences.push(`Source ${sourceId} is not on this desk, so only the treasury line is shown.`);
  }

  const canOpenSource =
    (sourceKind === 'REFUND' && Boolean(refund)) ||
    (sourceKind === 'PAYMENT_REQUEST' && Boolean(paymentRequest)) ||
    (sourceKind === 'EXPENSE' && Boolean(expense));

  return {
    movementId,
    sourceId,
    sourceKind,
    typeLabel: label,
    headline: payee || sourceId || label,
    amountNgn: amountAbs,
    accountName,
    accountDetail,
    postedAtISO,
    reference,
    note,
    postedBy,
    sentences,
    money: moneyRows,
    facts,
    legs,
    splits,
    trail,
    netLeftNgn,
    outflowNgn,
    reversedNgn,
    canOpenSource,
  };
}
