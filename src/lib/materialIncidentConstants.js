export const INCIDENT_TYPES = [
  { id: 'coil_stain', label: 'Coil stain / damage (after unwind)' },
  { id: 'supplier_defect', label: 'Supplier defect' },
  { id: 'production_error', label: 'Production error' },
  { id: 'customer_return', label: 'Customer return' },
  { id: 'yard_offcut', label: 'Yard offcut / trim / scratch' },
];

/** Short guidance shown on the new-incident card and in the record modal. */
export const INCIDENT_RECORD_HINTS = {
  coil_stain:
    'Pick the coil — gauge, colour, and before kg fill automatically from the register. List each damaged section like a cutting list, then submit for manager approval.',
  supplier_defect:
    'Select the affected coil from the register. Record the defective section lengths, weigh before and after removal, then submit for manager approval.',
  production_error:
    'Pick the coil and list material lost on the line. Weigh before and after cutting out the error, then submit for approval.',
  customer_return:
    'Select the coil or material being returned. Record returned lengths, weigh before and after, and choose where the material goes (pool, sellable, scrap, or supplier return).',
  yard_offcut:
    'Pick the coil from the yard register. List trim or scratch sections removed, weigh before and after, then submit for manager approval.',
};

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
