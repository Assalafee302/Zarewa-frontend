/** Pay-page copy for versioned salary structure. */

export const PAY_SOURCE_LABEL = {
  structure: 'Approved structure',
  profile_fallback: 'Profile amount (no structure)',
  missing_structure: 'Needs approved salary',
  no_designation: 'No job title',
};

export function paySourceLabel(source) {
  return PAY_SOURCE_LABEL[source] || source || '—';
}

export function paySourceTone(source) {
  if (source === 'structure') return 'emerald';
  if (source === 'no_designation') return 'slate';
  return 'amber';
}
