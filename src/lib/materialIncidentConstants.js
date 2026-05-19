export const INCIDENT_TYPES = [
  { id: 'coil_stain', label: 'Coil stain / damage (after unwind)' },
  { id: 'supplier_defect', label: 'Supplier defect' },
  { id: 'production_error', label: 'Production error' },
  { id: 'customer_return', label: 'Customer return' },
  { id: 'yard_offcut', label: 'Yard offcut / trim / scratch' },
];

export const MATERIAL_FAMILIES = [
  { id: 'aluminium', label: 'Aluminium' },
  { id: 'aluzinc', label: 'Aluzinc' },
  { id: 'stone_meter', label: 'Stone coated (metres)' },
];

export const RETURN_DISPOSITIONS = [
  { id: 'offcut_pool', label: 'Offcut pool (reusable metres)' },
  { id: 'sellable_fg', label: 'Sellable — return to finished goods stock' },
  { id: 'scrap', label: 'Scrap / reject' },
  { id: 'supplier_return', label: 'Return to supplier' },
];

export const INCIDENT_STATUS_LABEL = {
  draft: 'Draft',
  submitted: 'Pending approval',
  approved: 'Approved',
  rejected: 'Rejected',
  posted: 'Posted',
  voided: 'Voided',
};
