/**
 * Treasury posting confirmations (Phase 2.1).
 *
 * The server refuses a money posting with `confirmRequired: { code, message, details }` when it
 * needs something from the user: a backdating reason, a below-floor reason, a duplicate reason,
 * a same-day duplicate confirmation, or a correction reason (shown as old → new).
 * `apiFetch` asks once per refusal and resends the same request with the same Idempotency-Key.
 */

const fmtNgn = (n) => `₦${Math.round(Number(n) || 0).toLocaleString('en-NG')}`;
const fmtDay = (iso) => String(iso || '').slice(0, 10) || '—';

function describeSide(side) {
  if (!side || typeof side !== 'object') return '—';
  const acct = side.accountName || (side.treasuryAccountId ? `account #${side.treasuryAccountId}` : '—');
  return `${fmtNgn(side.amountNgn)} · ${acct} · ${fmtDay(side.postedAtISO)}`;
}

/** Old → new lines for a correction, listing only what changes. */
export function describeCorrectionChange(details) {
  const o = details?.old || {};
  const n = details?.new || {};
  const lines = [];
  if (Math.round(Number(o.amountNgn) || 0) !== Math.round(Number(n.amountNgn) || 0)) {
    lines.push(`Amount: ${fmtNgn(o.amountNgn)} → ${fmtNgn(n.amountNgn)}`);
  }
  if (Number(o.treasuryAccountId) !== Number(n.treasuryAccountId)) {
    lines.push(`Account: ${o.accountName || `#${o.treasuryAccountId}`} → ${n.accountName || `#${n.treasuryAccountId}`}`);
  }
  if (fmtDay(o.postedAtISO) !== fmtDay(n.postedAtISO)) {
    lines.push(`Date: ${fmtDay(o.postedAtISO)} → ${fmtDay(n.postedAtISO)}`);
  }
  if (!lines.length) lines.push(`${describeSide(o)} → ${describeSide(n)}`);
  return lines;
}

/**
 * What to ask for a given refusal, or null when the user cannot fix it by confirming.
 * @param {{ code?: string, message?: string, details?: object } | null | undefined} confirmRequired
 * @returns {{ kind: 'reason' | 'confirm', target: 'treasuryConfirm' | 'body', field: string, message: string } | null}
 */
export function treasuryConfirmPrompt(confirmRequired) {
  const code = String(confirmRequired?.code || '');
  const msg = String(confirmRequired?.message || '').trim();
  switch (code) {
    case 'DATE_REASON_REQUIRED':
    case 'DATE_ADMIN_REQUIRED':
    case 'FUTURE_DATE':
      return { kind: 'reason', target: 'treasuryConfirm', field: 'dateOverrideReason', message: `${msg}\n\nReason for this date:` };
    case 'AMOUNT_FLOOR':
      return { kind: 'reason', target: 'treasuryConfirm', field: 'amountFloorReason', message: `${msg}\n\nReason for this small amount:` };
    case 'DUPLICATE_BLOCK':
      return {
        kind: 'reason',
        target: 'treasuryConfirm',
        field: 'duplicateOverrideReason',
        message: `${msg}\n\nIf this really is a second payment, give the reason:`,
      };
    case 'DUPLICATE_SAME_DAY':
      return { kind: 'confirm', target: 'treasuryConfirm', field: 'duplicateSameDayConfirmed', message: msg };
    case 'CORRECTION_REASON_REQUIRED': {
      const change = describeCorrectionChange(confirmRequired?.details).join('\n');
      return {
        kind: 'reason',
        target: 'body',
        field: 'correctionReason',
        message: `You are changing this payment line:\n\n${change}\n\nReason for the correction:`,
      };
    }
    default:
      return null;
  }
}

/**
 * Merge one answer into a JSON request body string.
 * @param {string | undefined} body
 * @param {{ target: string, field: string }} prompt
 * @param {string | boolean} value
 */
export function applyTreasuryConfirmation(body, prompt, value) {
  let obj = {};
  try {
    obj = body ? JSON.parse(body) : {};
  } catch {
    return body;
  }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return body;
  if (prompt.target === 'body') {
    obj[prompt.field] = value;
  } else {
    obj.treasuryConfirm = { ...(obj.treasuryConfirm || {}), [prompt.field]: value };
  }
  return JSON.stringify(obj);
}

/**
 * Ask the user in the browser. Returns the answer, or null when cancelled / no dialog available.
 * @param {{ kind: 'reason' | 'confirm', message: string }} prompt
 */
export function askTreasuryConfirmation(prompt) {
  if (typeof window === 'undefined') return null;
  if (prompt.kind === 'confirm') {
    if (typeof window.confirm !== 'function') return null;
    return window.confirm(prompt.message) ? true : null;
  }
  if (typeof window.prompt !== 'function') return null;
  const answer = window.prompt(prompt.message, '');
  const trimmed = String(answer ?? '').trim();
  return trimmed ? trimmed : null;
}
