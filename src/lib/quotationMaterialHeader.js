export const QUOTATION_MATERIAL_HEADER_CODE = 'QUOTATION_MATERIAL_HEADER_REQUIRED';

export function validateQuotationMaterialHeaderRequired(linesJson) {
  const j = linesJson && typeof linesJson === 'object' ? linesJson : {};
  const missing = [];
  if (!String(j.materialTypeId || '').trim()) missing.push('material type');
  if (!String(j.materialGauge || '').trim()) missing.push('gauge');
  if (!String(j.materialColor || '').trim()) missing.push('colour');
  if (!String(j.materialDesign || '').trim()) missing.push('profile');
  if (missing.length === 0) return { ok: true };
  return {
    ok: false,
    code: QUOTATION_MATERIAL_HEADER_CODE,
    error: `Quotation material header is incomplete — select ${missing.join(', ')}.`,
    details: { missing },
  };
}

export function quotationMaterialHeaderErrorMessage(data) {
  if (!data || data.code !== QUOTATION_MATERIAL_HEADER_CODE) return data?.error || '';
  return String(data.error || 'Complete material type, gauge, colour, and profile.').trim();
}
