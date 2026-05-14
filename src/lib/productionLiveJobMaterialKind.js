import { normalizeReceiptMatchDashes } from './salesReceiptsList';
import { STONE_METER_INVENTORY_MODEL } from './stoneCoatedQuotationPolicy';

function normQuoteKey(s) {
  return normalizeReceiptMatchDashes(String(s ?? '').trim()).toLowerCase();
}

function parseLineQty(value) {
  const n = Number(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function quotationHasPositiveLines(q, cat) {
  const arr = q?.quotationLines?.[cat];
  if (!Array.isArray(arr)) return false;
  return arr.some((row) => String(row?.name ?? '').trim() && parseLineQty(row?.qty) > 0);
}

function quotationIsAccessoriesOnly(q) {
  return quotationHasPositiveLines(q, 'accessories') && !quotationHasPositiveLines(q, 'products');
}

function materialTypeLabelFromQuotation(q, materialTypes) {
  const named = String(q.materialTypeName ?? q.material_type_name ?? '').trim();
  if (named) return named;
  const id = String(
    q.materialTypeId ?? q.material_type_id ?? q.quotationLines?.materialTypeId ?? ''
  ).trim();
  if (!id) return '';
  const row = (materialTypes || []).find((t) => String(t?.id ?? '').trim() === id);
  return String(row?.name ?? '').trim();
}

function isStoneMeterJob(q, materialTypes) {
  if (!q) return false;
  if (q.stoneMeterQuote) return true;
  const mid = String(q.materialTypeId || '').trim();
  if (mid === 'MAT-005') return true;
  const row = (materialTypes || []).find((t) => String(t?.id ?? '').trim() === mid);
  return String(row?.inventoryModel || '').trim() === STONE_METER_INVENTORY_MODEL;
}

function classifyCoilFamilyFromText(blob) {
  const t = String(blob || '').toLowerCase();
  if (!t.trim()) return null;
  if (/(stone\s*-?\s*coated|stonecoated)/i.test(t)) return 'stone';
  if (t.includes('aluzinc') || t.includes('ppgi')) return 'aluzinc';
  if (t.includes('galvan')) return 'aluzinc';
  if (t.includes('alumin')) return 'aluminium';
  return null;
}

/**
 * Classify a registered cutting list + quotation for Operations "Live jobs" styling.
 * @returns {'stone' | 'aluminium' | 'aluzinc' | 'accessories' | 'other'}
 */
export function resolveLiveJobMaterialKind({ quotation, cuttingList, materialTypes }) {
  const q = quotation || null;
  const pn = String(cuttingList?.productName || '').trim();
  const pnLower = pn.toLowerCase();

  if (q && quotationIsAccessoriesOnly(q)) return 'accessories';
  if (pnLower.includes('accessories only')) return 'accessories';

  if (q && isStoneMeterJob(q, materialTypes)) return 'stone';

  const matLabel = q ? materialTypeLabelFromQuotation(q, materialTypes) : '';
  const fromMat = classifyCoilFamilyFromText(matLabel);
  if (fromMat && fromMat !== 'stone') return fromMat;

  const fromProduct = classifyCoilFamilyFromText(`${pn} ${cuttingList?.productID || ''}`);
  if (fromProduct) return fromProduct;

  return 'other';
}

export function liveJobMaterialPresentation(kind) {
  switch (kind) {
    case 'stone':
      return {
        cardClass: 'border-violet-200/90 bg-violet-50/75',
        chipLabel: 'Stone',
        chipClass: 'border-violet-300 bg-violet-100/90 text-violet-950',
      };
    case 'aluminium':
      return {
        cardClass: 'border-blue-200/90 bg-blue-50/80',
        chipLabel: 'Aluminium',
        chipClass: 'border-blue-300 bg-blue-100/90 text-blue-950',
      };
    case 'aluzinc':
      return {
        cardClass: 'border-slate-300/90 bg-slate-100/80',
        chipLabel: 'Aluzinc',
        chipClass: 'border-slate-400 bg-slate-200/90 text-slate-900',
      };
    case 'accessories':
      return {
        cardClass: 'border-fuchsia-200/90 bg-fuchsia-50/75',
        chipLabel: 'Accessories',
        chipClass: 'border-fuchsia-300 bg-fuchsia-100/90 text-fuchsia-950',
      };
    default:
      return {
        cardClass: 'border-sky-100 bg-white/90',
        chipLabel: '',
        chipClass: '',
      };
  }
}

export { normQuoteKey as normQuoteKeyForLiveJob };
