/**
 * Browser-local “frequent refund payee” memory (name + account + bank).
 * Scoped by customer when `customerID` is present on save.
 */

const STORAGE_KEY = 'zarewa.refundPayeeRecentAccounts.v2';
const RECIPIENT_STORAGE_KEY = 'zarewa.refundPayoutRecipientMemory.v1';
const MAX_STORED = 30;
const MAX_SUGGESTIONS = 12;
const MAX_RECIPIENTS = 20;

function digitsOnly(s) {
  return String(s ?? '').replace(/\D/g, '');
}

export function refundPayeeDedupeKey({ payeeAccountNo, payeeBankName }) {
  const d = digitsOnly(payeeAccountNo);
  const b = String(payeeBankName ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
  return `${d}|${b}`;
}

function parseStored(raw) {
  try {
    const j = JSON.parse(raw);
    return Array.isArray(j) ? j.filter((x) => x && typeof x === 'object') : [];
  } catch {
    return [];
  }
}

export function loadRefundPayeeRecentAccounts() {
  if (typeof window === 'undefined') return [];
  try {
    return parseStored(localStorage.getItem(STORAGE_KEY));
  } catch {
    return [];
  }
}

/**
 * @param {{ payeeName?: string; payeeAccountNo?: string; payeeBankName?: string; customerID?: string }} entry
 */
export function touchRefundPayeeAccount(entry) {
  const name = String(entry?.payeeName ?? '').trim();
  const acct = String(entry?.payeeAccountNo ?? '').trim();
  const bank = String(entry?.payeeBankName ?? '').trim();
  const customerID = String(entry?.customerID ?? '').trim();
  if (!name || !acct || !bank || !digitsOnly(acct)) return;
  if (typeof window === 'undefined') return;

  const key = refundPayeeDedupeKey({ payeeAccountNo: acct, payeeBankName: bank });
  const list = loadRefundPayeeRecentAccounts();
  const now = new Date().toISOString();
  const idx = list.findIndex(
    (e) =>
      refundPayeeDedupeKey(e) === key &&
      String(e.customerID ?? '').trim() === customerID
  );
  const nextEntry = {
    payeeName: name,
    payeeAccountNo: acct,
    payeeBankName: bank,
    customerID,
    lastUsedAt: now,
    uses: 1,
  };
  if (idx >= 0) {
    nextEntry.uses = (Number(list[idx].uses) || 0) + 1;
    list.splice(idx, 1);
  }
  list.unshift(nextEntry);
  const trimmed = list.slice(0, MAX_STORED);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    /* ignore quota / privacy mode */
  }
}

/**
 * Remember which payout picker keys this desk used (quote customer / staff).
 * @param {{ key?: string; customerID?: string; quotationRef?: string; label?: string }} entry
 */
export function touchRefundPayoutRecipient(entry) {
  const key = String(entry?.key ?? '').trim();
  if (!key || typeof window === 'undefined') return;
  const customerID = String(entry?.customerID ?? '').trim();
  const quotationRef = String(entry?.quotationRef ?? '').trim();
  const label = String(entry?.label ?? '').trim();
  let raw = null;
  try {
    raw = localStorage.getItem(RECIPIENT_STORAGE_KEY);
  } catch {
    return;
  }
  const list = parseStored(raw);
  const now = new Date().toISOString();
  const idx = list.findIndex(
    (e) =>
      String(e.key || '').trim() === key &&
      String(e.customerID ?? '').trim() === customerID
  );
  const nextEntry = { key, customerID, quotationRef, label, lastUsedAt: now, uses: 1 };
  if (idx >= 0) {
    nextEntry.uses = (Number(list[idx].uses) || 0) + 1;
    nextEntry.label = label || String(list[idx].label || '').trim();
    list.splice(idx, 1);
  }
  list.unshift(nextEntry);
  try {
    localStorage.setItem(RECIPIENT_STORAGE_KEY, JSON.stringify(list.slice(0, MAX_RECIPIENTS)));
  } catch {
    /* ignore */
  }
}

/**
 * Recent picker keys, quote-customer first then this customer’s desk memory.
 * @param {{ customerID?: string }} opts
 * @returns {string[]}
 */
export function listRecentRefundPayoutRecipientKeys({ customerID } = {}) {
  if (typeof window === 'undefined') return [];
  const cid = String(customerID ?? '').trim();
  let raw = null;
  try {
    raw = localStorage.getItem(RECIPIENT_STORAGE_KEY);
  } catch {
    return [];
  }
  const list = parseStored(raw);
  const keys = [];
  const seen = new Set();
  for (const e of list) {
    const ec = String(e.customerID ?? '').trim();
    if (cid && ec && ec !== cid) continue;
    const key = String(e.key || '').trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    keys.push(key);
    if (keys.length >= MAX_SUGGESTIONS) break;
  }
  return keys;
}

function refundRowPayee(r) {
  const name = String(r?.payeeName ?? r?.payee_name ?? '').trim();
  const acct = String(r?.payeeAccountNo ?? r?.payee_account_no ?? '').trim();
  const bank = String(r?.payeeBankName ?? r?.payee_bank_name ?? '').trim();
  if (!name || !acct || !bank || !digitsOnly(acct)) return null;
  return { payeeName: name, payeeAccountNo: acct, payeeBankName: bank };
}

/**
 * Recent (this browser) + payees from past refunds for the same customer.
 *
 * @param {{ customerID?: string; refunds?: object[]; includeDeviceWide?: boolean }} opts
 * @returns {Array<{ payeeName: string; payeeAccountNo: string; payeeBankName: string; source: 'recent' | 'history' }>}
 */
export function listRefundPayeeSuggestions({ customerID, refunds = [], includeDeviceWide = false } = {}) {
  const cid = String(customerID ?? '').trim();
  const allRecent = loadRefundPayeeRecentAccounts();

  const recentFiltered = allRecent.filter((e) => {
    const ec = String(e.customerID ?? '').trim();
    if (!cid) return includeDeviceWide || !ec;
    if (ec === cid) return true;
    return Boolean(includeDeviceWide);
  });

  const recent = recentFiltered.map((e) => ({
    payeeName: String(e.payeeName ?? '').trim(),
    payeeAccountNo: String(e.payeeAccountNo ?? '').trim(),
    payeeBankName: String(e.payeeBankName ?? '').trim(),
    source: /** @type {'recent'} */ ('recent'),
  }));

  const seen = new Set(recent.map((x) => refundPayeeDedupeKey(x)));
  const history = [];

  for (const r of refunds) {
    if (!cid) break;
    const ridCid = String(r?.customerID ?? r?.customer_id ?? '').trim();
    if (!ridCid || ridCid !== cid) continue;
    const p = refundRowPayee(r);
    if (!p) continue;
    const k = refundPayeeDedupeKey(p);
    if (seen.has(k)) continue;
    seen.add(k);
    const sortKey =
      String(r?.paidAtISO ?? r?.paid_at_iso ?? '').trim() ||
      String(r?.approvalDate ?? '').trim() ||
      String(r?.requestedAtISO ?? r?.requested_at ?? '').trim() ||
      '';
    history.push({ ...p, source: /** @type {'history'} */ ('history'), sortKey });
  }

  history.sort((a, b) => String(b.sortKey || '').localeCompare(String(a.sortKey || '')));

  const merged = [
    ...recent,
    ...history.map((row) => ({
      payeeName: row.payeeName,
      payeeAccountNo: row.payeeAccountNo,
      payeeBankName: row.payeeBankName,
      source: row.source,
    })),
  ];
  return merged.slice(0, MAX_SUGGESTIONS);
}

/**
 * Recent payees for expense forms — device memory + past payment-request bank details.
 *
 * @param {{ paymentRequests?: object[] }} opts
 * @returns {Array<{ payeeName: string; payeeAccountNo: string; payeeBankName: string; source: 'recent' | 'history' }>}
 */
export function listExpensePayeeSuggestions({ paymentRequests = [] } = {}) {
  const recent = listRefundPayeeSuggestions({ customerID: '', refunds: [] });
  const seen = new Set(recent.map((x) => refundPayeeDedupeKey(x)));
  const history = [];

  for (const pr of paymentRequests) {
    const name = String(pr?.payeeName ?? pr?.payee_name ?? '').trim();
    const acct = String(pr?.payeeAccountNo ?? pr?.payee_account_no ?? '').trim();
    const bank = String(pr?.payeeBankName ?? pr?.payee_bank_name ?? '').trim();
    if (!name || !acct || !bank || !digitsOnly(acct)) continue;
    const k = refundPayeeDedupeKey({ payeeAccountNo: acct, payeeBankName: bank });
    if (seen.has(k)) continue;
    seen.add(k);
    history.push({
      payeeName: name,
      payeeAccountNo: acct,
      payeeBankName: bank,
      source: /** @type {'history'} */ ('history'),
    });
    if (recent.length + history.length >= MAX_SUGGESTIONS) break;
  }

  return [...recent, ...history].slice(0, MAX_SUGGESTIONS);
}
