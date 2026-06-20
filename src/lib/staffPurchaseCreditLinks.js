/** Deep-link into Sales quotation editor from a quotation ref. */
export function salesQuotationDeepLink(quotationRef) {
  const id = String(quotationRef || '').trim();
  if (!id) return null;
  return {
    to: '/sales',
    state: { openSalesRecord: { type: 'quotation', id } },
  };
}
