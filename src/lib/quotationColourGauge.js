/** Colour / gauge labels from a quotation row for cashier queues. */
export function quotationColourGaugeLabel(q) {
  if (!q) return '';
  const colour = String(q.materialColor ?? q.material_color ?? q.color ?? '').trim();
  const gauge = String(q.materialGauge ?? q.material_gauge ?? q.gauge ?? '').trim();
  return [colour, gauge].filter(Boolean).join(' · ');
}

export function findQuotationByRef(quotations, quotationRef) {
  const key = String(quotationRef || '').trim().toLowerCase();
  if (!key) return null;
  return (
    (quotations || []).find((row) => {
      const id = String(row?.id || row?.quotationID || '').trim().toLowerCase();
      return id === key;
    }) || null
  );
}

export function receiptDateLabel(row) {
  const raw = String(row?.dateISO || row?.date || row?.receivedAtISO || '').trim();
  return raw.slice(0, 10) || '';
}
