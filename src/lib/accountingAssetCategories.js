/** Shared fixed-asset category labels (filter, create form, detail modal). */

export const ACCOUNTING_ASSET_CATEGORY_LABELS = {
  plant: 'Plant & machinery',
  vehicle: 'Vehicles',
  it: 'IT equipment',
  building: 'Buildings',
  land: 'Land',
  other: 'Other',
};

export const ACCOUNTING_ASSET_CATEGORY_OPTIONS = [
  { id: 'all', label: 'All categories' },
  { id: 'plant', label: ACCOUNTING_ASSET_CATEGORY_LABELS.plant },
  { id: 'building', label: ACCOUNTING_ASSET_CATEGORY_LABELS.building },
  { id: 'land', label: ACCOUNTING_ASSET_CATEGORY_LABELS.land },
  { id: 'vehicle', label: ACCOUNTING_ASSET_CATEGORY_LABELS.vehicle },
  { id: 'it', label: ACCOUNTING_ASSET_CATEGORY_LABELS.it },
  { id: 'other', label: ACCOUNTING_ASSET_CATEGORY_LABELS.other },
];

export function accountingAssetCategoryLabel(category) {
  const key = String(category || '').trim().toLowerCase();
  return ACCOUNTING_ASSET_CATEGORY_LABELS[key] || String(category || '').trim() || '—';
}
