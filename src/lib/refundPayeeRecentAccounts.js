/**
 * Browser-local “frequent refund payee” memory (name + account + bank).
 * Scoped by customer when `customerID` is present on save.
 */

const STORAGE_KEY = 'zarewa.refundPayeeRecentAccounts.v2';
const MAX_STORED = 30;
const MAX_SUGGESTIONS = 12;

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
 * @param {{ customerID?: string; refunds?: object[] }} opts
 * @returns {Array<{ payeeName: string; payeeAccountNo: string; payeeBankName: string; source: 'recent' | 'history' }>}
 */
export function listRefundPayeeSuggestions({ customerID, refunds = [] }) {
  const cid = String(customerID ?? '').trim();
  const allRecent = loadRefundPayeeRecentAccounts();

  const recentFiltered = allRecent.filter((e) => {
    const ec = String(e.customerID ?? '').trim();
    if (!cid) return !ec;
    return ec === cid;
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
