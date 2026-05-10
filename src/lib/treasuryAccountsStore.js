/**
 * Treasury helpers: live list comes from workspace bootstrap (`snapshot.treasuryAccounts`).
 * localStorage helpers remain for legacy / tooling only — Sales modals use the snapshot.
 */

const STORAGE_KEY = 'zarewa.finance.treasuryAccounts';

/**
 * Serialize treasury account id for ledger POST bodies.
 * Integer IDs are sent as numbers; UUIDs and other opaque ids stay strings.
 * @param {unknown} id
 * @returns {number|string|null}
 */
export function treasuryAccountIdForApiPayload(id) {
  if (id === '' || id == null) return null;
  if (typeof id === 'number' && Number.isFinite(id)) return Math.trunc(id);
  const s = String(id).trim();
  if (!s) return null;
  if (/^\d+$/.test(s)) {
    const n = Number(s);
    if (Number.isSafeInteger(n)) return n;
  }
  return s;
}

/** @param {{ treasuryAccounts?: object[] } | null | undefined} snapshot */
export function treasuryAccountsFromSnapshot(snapshot) {
  if (!snapshot || !Array.isArray(snapshot.treasuryAccounts)) return [];
  return snapshot.treasuryAccounts.map((a) => ({
    id: a.id,
    name: String(a.name ?? ''),
    bankName: String(a.bankName ?? ''),
    balance: Number(a.balance) || 0,
    openingBalanceNgn: Number(a.openingBalanceNgn) || 0,
    type: a.type === 'Cash' ? 'Cash' : 'Bank',
    accNo: String(a.accNo ?? 'N/A'),
    accountOfficerName: String(a.accountOfficerName ?? ''),
    accountOfficerPhone: String(a.accountOfficerPhone ?? ''),
    bankBranch: String(a.bankBranch ?? ''),
    sortCodeOrSwift: String(a.sortCodeOrSwift ?? ''),
    notes: String(a.notes ?? ''),
  }));
}

/**
 * Bank-first label for treasury selectors across payment/ledger flows.
 * Example: "Guaranty Trust Bank — Zaps Aluminum Enterprises"
 */
export function treasuryAccountDisplayName(account) {
  const bankName = String(account?.bankName ?? '').trim();
  const accountName = String(account?.name ?? '').trim();
  if (bankName && accountName && bankName.toLowerCase() !== accountName.toLowerCase()) {
    return `${bankName} — ${accountName}`;
  }
  return bankName || accountName || 'Treasury account';
}

export function defaultTreasuryAccounts() {
  return [
    {
      id: 1,
      name: 'GTBank Main',
      bankName: 'Guaranty Trust Bank',
      balance: 14250000,
      openingBalanceNgn: 14250000,
      type: 'Bank',
      accNo: '0123456789',
    },
    {
      id: 2,
      name: 'Zenith Production',
      bankName: 'Zenith Bank',
      balance: 5200000,
      openingBalanceNgn: 5200000,
      type: 'Bank',
      accNo: '9876543210',
    },
    {
      id: 3,
      name: 'Cash Office (Till)',
      bankName: '',
      balance: 450000,
      openingBalanceNgn: 450000,
      type: 'Cash',
      accNo: 'N/A',
    },
  ];
}

export function loadTreasuryAccounts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultTreasuryAccounts();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return defaultTreasuryAccounts();
    return parsed.map((a) => ({
      id: a.id,
      name: String(a.name ?? ''),
      bankName: String(a.bankName ?? ''),
      balance: Number(a.balance) || 0,
      type: a.type === 'Cash' ? 'Cash' : 'Bank',
      accNo: String(a.accNo ?? 'N/A'),
    }));
  } catch {
    return defaultTreasuryAccounts();
  }
}

export function saveTreasuryAccounts(accounts) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
  } catch {
    /* ignore */
  }
}

/**
 * Account number is usable for “pay into” / customer-facing bank details.
 * Uses digit run length so values like "0006047389" or "604-738-9012" still qualify;
 * excludes placeholders (N/A, empty, very short stubs).
 */
export function hasSettlableCustomerAccountNumber(accNo) {
  const raw = String(accNo ?? '').trim();
  if (!raw || raw.toUpperCase() === 'N/A') return false;
  const digits = raw.replace(/\D/g, '');
  if (digits.length >= 6) return true;
  return raw.replace(/\s/g, '').length >= 6;
}

/**
 * Bank accounts suitable for customer transfers (excludes till / N/A numbers).
 * Includes `Bank` rows with a settlable number, and `Cash` rows that look like
 * bank/POS wallets (non-empty bankName + number) so fintech accounts aren’t hidden
 * if mis-typed as Cash in Treasury.
 */
export function bankAccountsForCustomerPayment(accounts) {
  return (accounts ?? []).filter((a) => {
    if (!hasSettlableCustomerAccountNumber(a.accNo)) return false;
    if (a.type === 'Bank') return true;
    if (a.type === 'Cash' && String(a.bankName ?? '').trim()) return true;
    return false;
  });
}
