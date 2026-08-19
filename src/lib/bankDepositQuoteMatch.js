import {
  bankDepositRemainingNgn,
  isBankDepositAmountClose,
  openBankDepositsFromSnapshot,
  scoreBankDepositMatch,
} from './bankDeposits.js';

function depositSearchText(deposit) {
  return [deposit?.description, deposit?.bankReference, deposit?.note, deposit?.id]
    .map((v) => String(v || '').toLowerCase())
    .join(' ');
}

function customerHitsDeposit(customer, deposit) {
  const name = String(customer || '')
    .trim()
    .toLowerCase();
  if (name.length < 3) return false;
  const text = depositSearchText(deposit);
  if (text.includes(name)) return true;
  return name
    .split(/\s+/)
    .filter((token) => token.length >= 4)
    .some((token) => text.includes(token));
}

function quoteIdHitsDeposit(quotationRef, deposit) {
  const id = String(quotationRef || '')
    .trim()
    .toLowerCase();
  return id.length >= 4 && depositSearchText(deposit).includes(id);
}

/**
 * Pair unlinked bank deposits with quotation remaining balances when the amounts fit
 * (exact, or close within ±₦100 / 1%). Each deposit and quote is used at most once.
 *
 * @param {{
 *   deposits?: object[];
 *   quoteRows?: object[];
 *   pendingReceipts?: object[];
 * }} opts
 */
export function recommendBankDepositsForQuoteBalances({
  deposits = [],
  quoteRows = [],
  pendingReceipts = [],
} = {}) {
  const open = openBankDepositsFromSnapshot({ bankDeposits: deposits });
  const quotes = (Array.isArray(quoteRows) ? quoteRows : []).filter((q) => {
    const balance = Math.round(Number(q?.balance) || 0);
    return balance > 0 && String(q?.id || '').trim();
  });

  const pendingByQuote = new Map();
  for (const receipt of Array.isArray(pendingReceipts) ? pendingReceipts : []) {
    const ref = String(receipt?.quotationRef || '').trim();
    if (!ref) continue;
    const list = pendingByQuote.get(ref) || [];
    list.push(receipt);
    pendingByQuote.set(ref, list);
  }

  const pairs = [];
  for (const deposit of open) {
    const remaining = bankDepositRemainingNgn(deposit);
    if (remaining <= 0) continue;
    for (const quote of quotes) {
      const balance = Math.round(Number(quote.balance) || 0);
      const scored = scoreBankDepositMatch(
        {
          amountNgn: remaining,
          bankDateISO: deposit.bankDateISO,
          bankReference: deposit.bankReference,
        },
        {
          amountNgn: balance,
          bankDateISO: quote.date,
          bankReference: '',
        }
      );
      if (!scored.amountExact && !scored.amountClose) continue;

      const hints = [...scored.matchHints];
      let score = scored.score;
      if (customerHitsDeposit(quote.customer, deposit)) {
        score += 25;
        hints.push('customer in narration');
      }
      if (quoteIdHitsDeposit(quote.id, deposit)) {
        score += 40;
        hints.push('quote id in narration');
      }

      const applyNgn = Math.min(remaining, balance);
      const pendingReceipt =
        (pendingByQuote.get(quote.id) || []).find((receipt) => {
          const amt = Math.round(Number(receipt?.amountNgn) || 0);
          return isBankDepositAmountClose(amt, remaining) || isBankDepositAmountClose(amt, applyNgn);
        }) || null;

      pairs.push({
        key: `${deposit.id}:${quote.id}`,
        depositId: deposit.id,
        deposit,
        quotationRef: quote.id,
        quote,
        customer: quote.customer,
        customerID: quote.customerID,
        applyNgn,
        quoteBalanceNgn: balance,
        depositRemainingNgn: remaining,
        amountExact: scored.amountExact,
        amountClose: scored.amountClose,
        dateExact: scored.dateExact,
        dateClose: scored.dateClose,
        score,
        matchHints: hints,
        pendingReceipt,
        action: pendingReceipt ? 'confirm_receipt' : 'apply_deposit',
      });
    }
  }

  pairs.sort(
    (a, b) =>
      b.score - a.score ||
      Number(b.amountExact) - Number(a.amountExact) ||
      String(b.deposit?.bankDateISO || '').localeCompare(String(a.deposit?.bankDateISO || ''))
  );

  const usedDeposits = new Set();
  const usedQuotes = new Set();
  const recommended = [];
  for (const pair of pairs) {
    if (usedDeposits.has(pair.depositId) || usedQuotes.has(pair.quotationRef)) continue;
    usedDeposits.add(pair.depositId);
    usedQuotes.add(pair.quotationRef);
    recommended.push(pair);
  }
  return recommended;
}

export function matchesByQuotationRef(matches) {
  const map = new Map();
  for (const match of matches || []) {
    map.set(match.quotationRef, match);
  }
  return map;
}

export function matchesByDepositId(matches) {
  const map = new Map();
  for (const match of matches || []) {
    map.set(match.depositId, match);
  }
  return map;
}
