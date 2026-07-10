/** Rows per column for Coil / Stone-coated / Accessories lists on Purchases. */
export const PROCUREMENT_PURCHASES_COLUMN_PAGE_SIZE = 10;
export const PAYABLES_TABLE_PAGE_SIZE = 10;

export const TAB_LABELS = {
  purchases: 'Purchases',
  payables: 'Payments',
  transport: 'Transport catch-up',
  suppliers: 'Suppliers',
  conversion: 'Conversion',
};

/** Kg coil SKUs below this on-hand level count as low stock on the Procurement KPI row. */
const APPROVED_PURCHASE_WINDOWS = [
  { id: '1m', label: '1 month', months: 1 },
  { id: '4m', label: '4 months', months: 4 },
  { id: '6m', label: '6 months', months: 6 },
  { id: '12m', label: '1 year', months: 12 },
];

/** Coil materials for density-based standard conversion (maps to stock product_id). Stonecoated is excluded — different product class. */
export const PROCUREMENT_COIL_MATERIALS = [
  { key: 'alu', label: 'Aluminium', productID: 'COIL-ALU', defaultCatalogLabel: 'Aluminium' },
  { key: 'aluzinc', label: 'Aluzinc (PPGI)', productID: 'PRD-102', defaultCatalogLabel: 'Aluzinc (PPGI)' },
];

export function procurementCoilMaterialByKey(key) {
  return PROCUREMENT_COIL_MATERIALS.find((m) => m.key === key) ?? PROCUREMENT_COIL_MATERIALS[0];
}

/** Standard gauges (mm) used in yard / procurement. */
export const STANDARD_COIL_GAUGES_MM = ['0.18', '0.20', '0.22', '0.24', '0.28', '0.30', '0.40', '0.45', '0.50', '0.55'];

/** Strip width for theoretical mass per metre (metres). */
const PROCUREMENT_STRIP_WIDTH_M = 1.2;

/** Mass density in g/cm³ (×1000 → kg/m³). Values confirmed with operations. */
const DENSITY_ALUMINIUM_G_CM3 = 2.7;
const DENSITY_ALUZINC_G_CM3 = 7.8;

function densityKgPerM3ForProcurementKey(materialKey) {
  if (materialKey === 'alu') return DENSITY_ALUMINIUM_G_CM3 * 1000;
  if (materialKey === 'aluzinc') return DENSITY_ALUZINC_G_CM3 * 1000;
  return null;
}

/** Theoretical kg/m: ρ (kg/m³) × strip width (m) × thickness (m); gaugeMm is thickness in mm. */
export function kgPerMFromStripDensity(materialKey, gaugeMm) {
  const rho = densityKgPerM3ForProcurementKey(materialKey);
  if (rho == null || !Number.isFinite(gaugeMm) || gaugeMm <= 0) return null;
  return rho * PROCUREMENT_STRIP_WIDTH_M * (gaugeMm / 1000);
}

export function poLineSummaryLabel(kind) {
  if (kind === 'mixed') return 'mixed line(s)';
  if (kind === 'stone') return 'stone line(s)';
  if (kind === 'accessory') return 'accessory line(s)';
  return 'coil line(s)';
}

export const PILL = 'inline-flex items-center px-2 py-0.5 rounded-md text-ui-xs font-semibold uppercase tracking-wide';

const normalizeNairaInput = (value) => String(value ?? '').replace(/[^\d]/g, '');
const formatNairaInput = (value) => {
  const normalized = normalizeNairaInput(value);
  if (!normalized) return '';
  return Number(normalized).toLocaleString('en-NG');
};

/** Bordered chip — matches Stock / Finance compact lists */
export const statusChipBorder = (st) => {
  if (st === 'Received') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  if (st === 'In Transit') return 'border-sky-200 bg-sky-50 text-sky-900';
  if (st === 'On loading') return 'border-violet-200 bg-violet-50 text-violet-900';
  if (st === 'Approved') return 'border-teal-200 bg-teal-50 text-teal-900';
  if (st === 'Rejected') return 'border-rose-200 bg-rose-50 text-rose-800';
  return 'border-amber-200 bg-amber-50 text-amber-900';
};

export const CARD_ROW =
  'rounded-lg border border-slate-200/60 bg-white/40 backdrop-blur-md py-1.5 px-2.5 shadow-sm transition-colors hover:bg-white/70';
