/** @typedef {'customer' | 'supplier' | 'branch' | 'staff' | null} RegisterPartyKind */

/** Categories that must link to a master record instead of free-text party name. */
export const REGISTER_LINKED_PARTY_CATEGORIES = {
  staff_loan: 'staff',
  customer_ar: 'customer',
  customer_deposit: 'customer',
  project_overpayment: 'customer',
  supplier_ap: 'supplier',
  supplier_prepay: 'supplier',
  inter_branch: 'branch',
};

/**
 * @param {string} category
 * @returns {RegisterPartyKind}
 */
export function registerPartyKindForCategory(category) {
  return REGISTER_LINKED_PARTY_CATEGORIES[String(category || '').trim()] || null;
}

/**
 * @param {RegisterPartyKind} kind
 * @param {'creditor' | 'debtor'} registerSide
 */
export function registerPartyFieldLabel(kind, registerSide) {
  if (kind === 'staff') return 'Employee *';
  if (kind === 'customer') return 'Customer *';
  if (kind === 'supplier') return 'Supplier *';
  if (kind === 'branch') {
    return registerSide === 'creditor' ? 'Branch that owes us *' : 'Branch we owe *';
  }
  return 'Party name *';
}
