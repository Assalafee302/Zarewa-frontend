import { poStatusChipClass } from '../../lib/procurementStatusUi';
export {
  STANDARD_COIL_GAUGES_MM,
  PROCUREMENT_COIL_MATERIALS,
  procurementCoilMaterialByKey,
  kgPerMFromStripDensity,
  COIL_STRIP_WIDTH_M,
} from '../../shared/lib/coilDensityStandard.js';

/** Rows per page on the Purchases desk table. */
export const PROCUREMENT_PURCHASES_PAGE_SIZE = 15;
export const PAYABLES_TABLE_PAGE_SIZE = 10;

export const PO_KIND_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'coil', label: 'Coil' },
  { id: 'stone', label: 'Stone-coated' },
  { id: 'accessory', label: 'Accessories' },
  { id: 'mixed', label: 'Mixed' },
];

export function poKindShortLabel(kind) {
  if (kind === 'stone') return 'Stone-coated';
  if (kind === 'accessory') return 'Accessories';
  if (kind === 'mixed') return 'Mixed';
  return 'Coil';
}

export function poKindUnitHint(kind) {
  if (kind === 'stone') return 'm';
  if (kind === 'accessory') return 'units';
  if (kind === 'mixed') return 'mixed';
  return 'kg';
}

export const TAB_LABELS = {
  purchases: 'Purchases',
  payables: 'Supplier payables',
  transport: 'Transport reconciliation',
  suppliers: 'Suppliers',
  conversion: 'Pricing workbook',
};

/** Kg coil SKUs below this on-hand level count as low stock on the Procurement KPI row. */
const APPROVED_PURCHASE_WINDOWS = [
  { id: '1m', label: '1 month', months: 1 },
  { id: '4m', label: '4 months', months: 4 },
  { id: '6m', label: '6 months', months: 6 },
  { id: '12m', label: '1 year', months: 12 },
];

export function poLineSummaryLabel(kind) {
  if (kind === 'mixed') return 'mixed line(s)';
  if (kind === 'stone') return 'stone line(s)';
  if (kind === 'accessory') return 'accessory line(s)';
  return 'coil line(s)';
}

export const PILL = 'inline-flex items-center px-2 py-0.5 rounded-md text-ui-xs font-semibold uppercase tracking-wide';

/** Bordered chip — matches Stock / Finance compact lists */
export const statusChipBorder = poStatusChipClass;

export const CARD_ROW =
  'rounded-lg border border-slate-200/60 bg-white/40 backdrop-blur-md py-1.5 px-2.5 shadow-sm transition-colors hover:bg-white/70';

