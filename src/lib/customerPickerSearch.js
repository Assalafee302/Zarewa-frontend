/**
 * Customer picker search — quotations and sales lists.
 * Staff purchase credit customers include employee no in name/notes (e.g. ZAPKD004).
 */

/** @param {Record<string, unknown> | null | undefined} customer */
export function customerPickerSearchBlob(customer) {
  if (!customer) return '';
  const tags = Array.isArray(customer.crmTags) ? customer.crmTags.join(' ') : '';
  return [
    customer.customerID,
    customer.name,
    customer.phoneNumber,
    customer.email,
    customer.tier,
    customer.paymentTerms,
    customer.companyName,
    customer.crmProfileNotes,
    tags,
  ]
    .map((v) => String(v ?? '').trim())
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

/**
 * @param {Array<Record<string, unknown>>} customers
 * @param {string} query
 * @param {number} [limit]
 */
export function filterCustomersForPicker(customers, query, limit = 40) {
  const list = Array.isArray(customers) ? customers : [];
  const raw = String(query || '').trim().toLowerCase();
  if (!raw) return list.slice(0, limit);

  const digits = raw.replace(/\D/g, '');
  return list
    .filter((c) => {
      const blob = customerPickerSearchBlob(c);
      if (blob.includes(raw)) return true;
      if (digits.length >= 3) {
        const phone = String(c.phoneNumber || '').replace(/\D/g, '');
        if (phone.includes(digits)) return true;
      }
      return false;
    })
    .slice(0, limit);
}

/** Extract staff employee no from linked customer name or CRM notes. */
export function staffEmployeeNoFromCustomer(customer) {
  const name = String(customer?.name || '');
  const fromName = name.match(/·\s*([A-Z]{2,}\d+)\s*\(Staff\)/i);
  if (fromName) return fromName[1].toUpperCase();

  const notes = String(customer?.crmProfileNotes || '');
  const fromNotes = notes.match(/·\s*([A-Z]{2,}\d+)\s*$/i) || notes.match(/\b(ZAP[A-Z]{2}\d+)\b/i);
  return fromNotes ? fromNotes[1].toUpperCase() : '';
}

/** Secondary line under customer name in quotation picker. */
export function customerPickerSubline(customer) {
  const parts = [];
  const tier = String(customer?.tier || '').trim();
  if (tier) parts.push(tier);

  const employeeNo = staffEmployeeNoFromCustomer(customer);
  if (employeeNo) parts.push(employeeNo);

  const phone = String(customer?.phoneNumber || '').trim();
  if (phone) parts.push(phone);

  if (!parts.length) return String(customer?.customerID || '');
  return parts.join(' · ');
}
