/**
 * Person name for printed sales slips — never the login role title when a real name exists.
 */

function normalizeLabel(label) {
  return String(label || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/** Role titles that must not appear as “prepared by” / “by” on customer slips. */
export function isGenericStaffRoleLabel(label) {
  const n = normalizeLabel(label);
  return (
    n === 'cashier' ||
    n === 'sales' ||
    n === 'sales staff' ||
    n === 'sales officer' ||
    n === 'branch manager' ||
    n === 'finance' ||
    n === 'finance manager' ||
    n === 'head of accounts' ||
    n === 'accounts' ||
    n === 'accountant' ||
    n === 'admin' ||
    n === 'administrator'
  );
}

/**
 * Logged-in staff name for a new voucher. Skips display names that are still the role title.
 * @param {{ displayName?: string, fullName?: string, name?: string, roleLabel?: string } | null | undefined} user
 * @param {string} [fallback]
 */
export function staffPrintName(user, fallback = '') {
  const name = String(user?.displayName || user?.fullName || user?.name || '').trim();
  const role = String(user?.roleLabel || '').trim();
  if (name && !isGenericStaffRoleLabel(name) && (!role || name.toLowerCase() !== role.toLowerCase())) {
    return name;
  }
  const next = String(fallback || '').trim();
  if (next && !isGenericStaffRoleLabel(next)) return next;
  if (name && !isGenericStaffRoleLabel(name)) return name;
  return name || next || role;
}

/**
 * Who recorded an existing ledger / advance row, for reprint.
 * @param {object | null | undefined} record
 * @param {object | null | undefined} user
 * @param {string} [fallback]
 */
export function voucherRecordedByLabel(record, user, fallback = '') {
  const stored = String(
    record?.createdByName || record?.created_by_name || record?.handledBy || record?.handled_by || ''
  ).trim();
  if (stored && stored !== '—' && !isGenericStaffRoleLabel(stored)) return stored;
  return staffPrintName(user, fallback);
}
