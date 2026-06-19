/** Mirror of Zarewa-backend-main/shared/lib/bankDeposits.js — keep in sync. */
export const BANK_DEPOSIT_STATUS_OPEN = 'OPEN';
export const BANK_DEPOSIT_STATUS_RESERVED = 'RESERVED';
export const BANK_DEPOSIT_STATUS_PARTIAL = 'PARTIAL';
export const BANK_DEPOSIT_STATUS_ALLOCATED = 'ALLOCATED';
export const BANK_DEPOSIT_STATUS_REVERSED = 'REVERSED';
export const BANK_DEPOSIT_STATUS_RECLASSED = 'RECLASSED';

export const BANK_DEPOSIT_RECLASS_OTHER_INCOME = 'OTHER_INCOME';
export const BANK_DEPOSIT_RECLASS_INTER_BRANCH = 'INTER_BRANCH';
export const BANK_DEPOSIT_RECLASS_REFUND_OUT = 'REFUND_OUT';
export const BANK_DEPOSIT_RECLASS_EXPENSE_OFFSET = 'EXPENSE_OFFSET';

export const BANK_DEPOSIT_RECLASS_OPTIONS = [
  { value: BANK_DEPOSIT_RECLASS_OTHER_INCOME, label: 'Other income' },
  { value: BANK_DEPOSIT_RECLASS_INTER_BRANCH, label: 'Inter-branch transfer' },
  { value: BANK_DEPOSIT_RECLASS_REFUND_OUT, label: 'Refund / return out' },
  { value: BANK_DEPOSIT_RECLASS_EXPENSE_OFFSET, label: 'Expense offset' },
];

export const BANK_DEPOSIT_LINKABLE_STATUSES = new Set([
  BANK_DEPOSIT_STATUS_OPEN,
  BANK_DEPOSIT_STATUS_PARTIAL,
  BANK_DEPOSIT_STATUS_RESERVED,
]);

export function bankDepositRemainingNgn(row) {
  const total = Math.round(Number(row?.amountNgn ?? row?.amount_ngn) || 0);
  const allocated = Math.round(Number(row?.allocatedNgn ?? row?.allocated_ngn) || 0);
  return Math.max(0, total - allocated);
}

export function bankDepositStatusLabel(status) {
  const s = String(status || '').trim().toUpperCase();
  if (s === BANK_DEPOSIT_STATUS_OPEN) return 'Unlinked';
  if (s === BANK_DEPOSIT_STATUS_RESERVED) return 'In use';
  if (s === BANK_DEPOSIT_STATUS_PARTIAL) return 'Part linked';
  if (s === BANK_DEPOSIT_STATUS_ALLOCATED) return 'Linked';
  if (s === BANK_DEPOSIT_STATUS_REVERSED) return 'Reversed';
  if (s === BANK_DEPOSIT_STATUS_RECLASSED) return 'Reclassified';
  return s || '—';
}

export function bankDepositReclassKindLabel(kind) {
  const k = String(kind || '').trim().toUpperCase();
  const hit = BANK_DEPOSIT_RECLASS_OPTIONS.find((o) => o.value === k);
  return hit?.label || k || '—';
}

/** Open / partial unlinked deposits from workspace snapshot. */
export function openBankDepositsFromSnapshot(snapshot) {
  const rows = Array.isArray(snapshot?.bankDeposits) ? snapshot.bankDeposits : [];
  return rows.filter((d) => {
    const remaining = bankDepositRemainingNgn(d);
    const st = String(d?.status || '').toUpperCase();
    return remaining > 0 && BANK_DEPOSIT_LINKABLE_STATUSES.has(st);
  });
}
