/** Client-side org desk keys — keep aligned with server/hrOrgConstants.js */

export const HR_FUNCTIONAL_OFFICES = [
  { key: 'executive', label: 'Managing Director / Executive' },
  { key: 'office_admin', label: 'General Administration' },
  { key: 'branch_manager', label: 'Branch Manager' },
  { key: 'sales', label: 'Sales & Customer Service' },
  { key: 'operations', label: 'Operations & Store' },
  { key: 'procurement', label: 'Procurement & Supply' },
  { key: 'finance', label: 'Finance & Treasury' },
  { key: 'hr', label: 'Human Resources' },
  { key: 'maintenance', label: 'Maintenance' },
  { key: 'reports', label: 'Management Information' },
];

export const DESIGNATION_APP_ROLE_HINTS = {
  desig_md: 'md',
  desig_gmhr: 'gmhr',
  desig_hoa: 'finance_manager',
  desig_hro: 'hr_admin',
  desig_adm: 'hr_admin',
  desig_bm: 'sales_manager',
  desig_abm: 'sales_manager',
  desig_actbm: 'sales_manager',
  desig_so: 'sales_staff',
  desig_sa: 'sales_staff',
  desig_sso: 'sales_staff',
  desig_st: 'sales_staff',
  desig_sk: 'operations_officer',
  desig_ask: 'operations_officer',
  desig_ps: 'operations_officer',
  desig_op: 'operations_officer',
  desig_fa: 'operations_officer',
  desig_ssk: 'operations_officer',
  desig_actsk: 'operations_officer',
  desig_csh: 'cashier',
  desig_acsh: 'cashier',
  desig_bac: 'finance_manager',
  desig_drv: 'sales_staff',
  desig_sec: 'viewer',
  desig_cln: 'viewer',
  desig_po: 'operations_officer',
  desig_mm: 'operations_officer',
  desig_dbm: 'sales_manager',
  desig_cso: 'sales_staff',
};

export const OFFICE_APP_ROLE_HINTS = {
  executive: 'md',
  hr: 'hr_admin',
  finance: 'finance_manager',
  branch_manager: 'sales_manager',
  sales: 'sales_staff',
  operations: 'operations_officer',
  procurement: 'md',
  office_admin: 'hr_admin',
  maintenance: 'operations_officer',
};

export const DIRECTOR_CORPORATE_DESIGNATION_IDS = new Set(['desig_md']);

export const ACTING_DESIGNATION_IDS = new Set(['desig_actbm', 'desig_actsk']);

export const DESIGNATION_OFFICE_KEYS = {
  desig_md: 'executive',
  desig_gmhr: 'hr',
  desig_hro: 'hr',
  desig_hoa: 'finance',
  desig_adm: 'office_admin',
  desig_bm: 'branch_manager',
  desig_abm: 'branch_manager',
  desig_actbm: 'branch_manager',
  desig_so: 'sales',
  desig_sa: 'sales',
  desig_sso: 'sales',
  desig_st: 'sales',
  desig_sk: 'operations',
  desig_ask: 'operations',
  desig_ps: 'operations',
  desig_op: 'operations',
  desig_fa: 'operations',
  desig_ssk: 'operations',
  desig_actsk: 'operations',
  desig_csh: 'finance',
  desig_acsh: 'finance',
  desig_bac: 'finance',
  desig_drv: 'office_admin',
  desig_sec: 'office_admin',
  desig_cln: 'office_admin',
  desig_po: 'procurement',
  desig_mm: 'maintenance',
  desig_dbm: 'branch_manager',
  desig_cso: 'sales',
};

const OFFICE_LABELS = Object.fromEntries(HR_FUNCTIONAL_OFFICES.map((o) => [o.key, o.label]));

export function officeKeyLabel(key) {
  return OFFICE_LABELS[String(key || '').trim()] || String(key || '').replace(/_/g, ' ');
}

export function isDirectorCorporateEligible({ designationId, compensationVarianceType, corporateTitle, boardMember }) {
  if (boardMember === true) return true;
  if (DIRECTOR_CORPORATE_DESIGNATION_IDS.has(String(designationId || '').trim())) return true;
  if (compensationVarianceType === 'director_emolument') return true;
  if (String(corporateTitle || '').trim()) return true;
  return false;
}

export function inferSecondaryRoleFromDesignation(desId, designations = []) {
  const des = designations.find((d) => d.id === desId);
  if (!des) return {};
  return {
    designationId: desId,
    role: des.title,
    officeKey: DESIGNATION_OFFICE_KEYS[desId] || '',
    acting: ACTING_DESIGNATION_IDS.has(desId),
  };
}
