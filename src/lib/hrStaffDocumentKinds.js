/** Keep in sync with backend shared/lib/hrStaffDocuments.js */

export const HR_STAFF_DOC_KINDS = [
  { value: 'birth_certificate', label: 'Birth certificate' },
  { value: 'fslc', label: 'FSLC (First School Leaving Certificate)' },
  { value: 'secondary_certificate', label: 'Secondary school certificate (WAEC/NECO)' },
  { value: 'tertiary_qualification', label: 'Degree / ND / HND / professional qualification' },
  { value: 'guarantor_form', label: 'Guarantor form(s)', downloadableTemplate: true },
  { value: 'employment_letter', label: 'Employment / offer letter (signed copy)' },
  { value: 'nin_slip', label: 'NIN slip / NIN card' },
];

export const HR_REQUIRED_DOC_KINDS = HR_STAFF_DOC_KINDS.filter((d) => d.value !== 'employment_letter').map(
  (d) => d.value
);

/** @param {string} kind */
export function hrStaffDocKindLabel(kind) {
  return HR_STAFF_DOC_KINDS.find((d) => d.value === kind)?.label || kind;
}

export const CRITICAL_MISSING_LABELS = {
  employeeNo: 'Staff ID',
  dateJoinedIso: 'Date joined',
  jobTitle: 'Job title',
  department: 'Department',
  branchId: 'Branch',
  ninNumber: 'NIN number',
  nextOfKin: 'Next of kin',
  passportPhoto: 'Passport photograph',
  'doc:birth_certificate': 'Birth certificate',
  'doc:fslc': 'FSLC',
  'doc:secondary_certificate': 'Secondary certificate',
  'doc:tertiary_qualification': 'Tertiary qualification',
  'doc:guarantor_form': 'Guarantor form',
  'doc:employment_letter': 'Employment letter',
  'doc:nin_slip': 'NIN slip',
};

export const GUARANTOR_FORM_TEMPLATE_URL = '/api/hr/templates/guarantor-form';
