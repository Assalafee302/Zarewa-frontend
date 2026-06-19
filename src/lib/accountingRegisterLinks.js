/**
 * Deep links from accounting register rows to customer, supplier, HR, sales, and finance screens.
 */

/**
 * @param {string} sectionId
 * @param {{ entityType?: string; entityId?: string; partyRef?: string; id?: string }} item
 * @returns {{ to: string; state?: object } | null}
 */
export function accountingRegisterPartyLink(sectionId, item) {
  const entityType = String(item?.entityType || '').trim();
  const entityId = String(item?.entityId || item?.partyRef || '').trim();
  if (!entityId && !entityType) return null;

  switch (entityType) {
    case 'staff':
      return { to: `/hr/employees/${encodeURIComponent(entityId)}` };
    case 'customer':
      return { to: `/customers/${encodeURIComponent(entityId)}#cd-financial` };
    case 'supplier':
      return { to: `/procurement/suppliers/${encodeURIComponent(entityId)}` };
    case 'inter_branch_loan':
    case 'inter_branch':
      return { to: '/accounts?tab=movements' };
    default:
      break;
  }

  switch (sectionId) {
    case 'staff_loans':
      return entityId ? { to: `/hr/employees/${encodeURIComponent(entityId)}` } : null;
    case 'customer_receivables':
    case 'customer_deposits':
    case 'overpayment_credits':
      return entityId ? { to: `/customers/${encodeURIComponent(entityId)}#cd-financial` } : null;
    case 'supplier_payables':
    case 'supplier_prepayments':
      return entityId ? { to: `/procurement/suppliers/${encodeURIComponent(entityId)}` } : null;
    case 'unallocated_receipts':
      return entityId ? { to: `/customers/${encodeURIComponent(entityId)}#cd-financial` } : null;
    case 'bank_deposit_suspense':
      return { to: '/accounts?tab=receipts' };
    case 'inter_branch_receivable':
    case 'inter_branch_payable':
      return { to: '/accounts?tab=movements' };
    case 'legacy_inherited':
      return legacyPartyLink(item);
    default:
      return null;
  }
}

/**
 * @param {{ category?: string; partyRef?: string; reference?: string }} item
 */
function legacyPartyLink(item) {
  const ref = String(item?.partyRef || '').trim();
  const category = String(item?.category || '').trim();
  if (!ref) return null;
  if (category === 'staff_loan' || ref.startsWith('USR-')) {
    return { to: `/hr/employees/${encodeURIComponent(ref)}` };
  }
  if (
    category === 'customer_deposit' ||
    category === 'customer_ar' ||
    category === 'project_overpayment' ||
    ref.startsWith('CUS-')
  ) {
    return { to: `/customers/${encodeURIComponent(ref)}#cd-financial` };
  }
  if (category === 'supplier_ap' || category === 'supplier_prepay' || ref.startsWith('SUP-')) {
    return { to: `/procurement/suppliers/${encodeURIComponent(ref)}` };
  }
  if (category === 'inter_branch') {
    return { to: '/accounts?tab=movements' };
  }
  return null;
}

/**
 * @param {string} sectionId
 * @param {{ reference?: string; entityType?: string; entityId?: string; quotationRefs?: string[]; id?: string }} item
 * @returns {{ to: string; state?: object } | null}
 */
export function accountingRegisterReferenceLink(sectionId, item) {
  const ref = String(item?.reference || '').trim();
  if (Array.isArray(item?.quotationRefs) && item.quotationRefs.length) {
    const q = String(item.quotationRefs[0] || '').trim();
    if (q) {
      return { to: '/sales', state: { openSalesRecord: { type: 'quotation', id: q } } };
    }
  }

  if (!ref || ref === '—') {
    if (sectionId === 'unallocated_receipts' && item?.id) {
      return { to: '/sales', state: { openSalesRecord: { type: 'receipt', id: String(item.id) } } };
    }
    if (sectionId === 'bank_deposit_suspense' && item?.bankDepositId) {
      return { to: '/accounts?tab=receipts' };
    }
    return null;
  }

  if (sectionId === 'staff_loans' && ref) {
    const staffLink = accountingRegisterPartyLink(sectionId, item);
    return staffLink;
  }

  if (sectionId === 'unallocated_receipts') {
    return { to: '/sales', state: { openSalesRecord: { type: 'receipt', id: String(item.id || ref) } } };
  }

  if (sectionId === 'bank_deposit_suspense') {
    return { to: '/accounts?tab=receipts' };
  }

  if (sectionId === 'inter_branch_receivable' || sectionId === 'inter_branch_payable') {
    if (item?.entityType === 'inter_branch_loan' && item?.entityId) {
      return { to: '/accounts?tab=movements' };
    }
    return { to: '/accounts?tab=movements' };
  }

  const poRef = ref.split(' · ')[0].trim();
  if (/^PO-/i.test(poRef)) {
    const supplierId = String(item?.entityId || item?.partyRef || '').trim();
    if (supplierId && supplierId.startsWith('SUP-')) {
      return { to: `/procurement/suppliers/${encodeURIComponent(supplierId)}` };
    }
    return { to: '/procurement', state: { focusTab: 'payables' } };
  }

  if (/^QT-/i.test(poRef)) {
    return { to: '/sales', state: { openSalesRecord: { type: 'quotation', id: poRef } } };
  }

  if (/^IBL-/i.test(poRef) || /^IB-/i.test(poRef)) {
    return { to: '/accounts?tab=movements' };
  }

  if (sectionId === 'legacy_inherited' && /^CUS-/i.test(ref)) {
    return { to: `/customers/${encodeURIComponent(ref)}#cd-financial` };
  }

  return null;
}
