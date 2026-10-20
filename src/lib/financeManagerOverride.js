/**
 * Finance Phase A: who may approve an override with a reason (A2 duplicate receipt,
 * A5 over-quote payout). Mirrors server `userIsBranchManagerOrOm` (operations/coilCorrectionControl.js).
 */
const BM_OM_ROLES = new Set([
  'branch_manager',
  'sales_manager',
  'operations_manager',
  'ops_manager',
  'admin',
  'md',
  'ceo',
  'chairman',
]);

export function userIsBranchManagerOrOmClient(roleKey) {
  const rk = String(roleKey || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
  return BM_OM_ROLES.has(rk);
}

/** Text for the 24-hour duplicate receipt prompt (A2). */
export function receiptDuplicate24hPrompt(data) {
  const lines = (Array.isArray(data?.duplicates) ? data.duplicates : [])
    .map((d) => `- ${d.id} on ${d.quotationRef || 'this quotation'} (${d.hoursApart} h apart)`)
    .join('\n');
  return `${data?.error || 'Same customer, amount and quotation within 24 hours.'}\n${lines}\n\nManager override — type the reason (at least 10 characters). It is flagged in the audit trail:`;
}

/**
 * A5: the server refused a haulage / supplier payout above the quoted or approved amount
 * (code PAYOUT_ABOVE_QUOTE). A BM/OM is asked for the reason; anyone else is told who can approve.
 * @returns {{ reason: string } | { error: string }}
 */
export function askOverQuoteReason(data, roleKey, ask = (msg) => (typeof window !== 'undefined' ? window.prompt(msg, '') : null)) {
  if (!userIsBranchManagerOrOmClient(roleKey)) {
    return { error: data?.error || 'Payment is above the quoted amount. A Branch Manager or Operations Manager must approve it.' };
  }
  const answer = String(
    ask(`${data?.error || 'Payment is above the quoted amount.'}\n\nApprove the excess — reason (at least 10 characters). The excess posts as its own line with this reason:`) ?? ''
  ).trim();
  if (answer.length < 10) return { error: 'Payment not posted — the excess above the quote needs a manager reason.' };
  return { reason: answer };
}
