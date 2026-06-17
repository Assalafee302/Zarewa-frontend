/** Client-side org desk keys — keep aligned with server/hrOrgConstants.js */

export const HR_FUNCTIONAL_OFFICES = [
  { key: 'executive', label: 'Managing Director / Executive' },
  { key: 'office_admin', label: 'General Administration' },
  { key: 'branch_manager', label: 'Branch Manager' },
  { key: 'sales', label: 'Sales & Customer Service' },
  { key: 'operations', label: 'Operations & Store' },
  { key: 'production', label: 'Production Unit' },
  { key: 'procurement', label: 'Procurement & Supply' },
  { key: 'finance', label: 'Finance & Treasury' },
  { key: 'hr', label: 'Human Resources' },
  { key: 'maintenance', label: 'Maintenance & Engineering' },
  { key: 'reports', label: 'Management Information' },
];

export const TITLE_TIERS = ['trainee', 'assistant', 'officer', 'supervisor', 'deputy', 'manager', 'executive', 'acting'];

export const DESIGNATION_APP_ROLE_HINTS = {
  desig_md: 'md',
  desig_actmd: 'md',
  desig_edo: 'md',
  desig_edf: 'finance_manager',
  desig_edc: 'sales_manager',
  desig_gmhr: 'gmhr',
  desig_hrm: 'hr_admin',
  desig_hro: 'hr_admin',
  desig_ahro: 'hr_admin',
  desig_hra: 'hr_admin',
  desig_acthro: 'hr_admin',
  desig_hrrep: 'hr_admin',
  desig_hoa: 'finance_manager',
  desig_acct: 'finance_manager',
  desig_aacct: 'finance_manager',
  desig_actacct: 'finance_manager',
  desig_csec: 'hr_admin',
  desig_eamd: 'hr_admin',
  desig_adm: 'hr_admin',
  desig_bm: 'sales_manager',
  desig_abm: 'sales_manager',
  desig_dbm: 'sales_manager',
  desig_actbm: 'sales_manager',
  desig_so: 'sales_staff',
  desig_aso: 'sales_staff',
  desig_sa: 'sales_staff',
  desig_ssup: 'sales_staff',
  desig_sso: 'sales_staff',
  desig_actsso: 'sales_staff',
  desig_st: 'sales_staff',
  desig_cso: 'sales_staff',
  desig_acso: 'sales_staff',
  desig_sk: 'operations_officer',
  desig_ask: 'operations_officer',
  desig_ssk: 'operations_officer',
  desig_actsk: 'operations_officer',
  desig_ps: 'operations_officer',
  desig_pm: 'operations_officer',
  desig_apm: 'operations_officer',
  desig_qco: 'operations_officer',
  desig_op: 'operations_officer',
  desig_aop: 'operations_officer',
  desig_fa: 'operations_officer',
  desig_hop: 'operations_officer',
  desig_po: 'operations_officer',
  desig_apo: 'operations_officer',
  desig_actpo: 'operations_officer',
  desig_csh: 'cashier',
  desig_acsh: 'cashier',
  desig_bac: 'finance_manager',
  desig_mm: 'operations_officer',
  desig_msup: 'operations_officer',
  desig_mtech: 'operations_officer',
  desig_amtech: 'operations_officer',
  desig_drv: 'sales_staff',
  desig_sdrv: 'sales_staff',
  desig_sec: 'viewer',
  desig_ssec: 'viewer',
  desig_cln: 'viewer',
};

export const OFFICE_APP_ROLE_HINTS = {
  executive: 'md',
  hr: 'hr_admin',
  finance: 'finance_manager',
  branch_manager: 'sales_manager',
  sales: 'sales_staff',
  operations: 'operations_officer',
  production: 'operations_officer',
  procurement: 'md',
  office_admin: 'hr_admin',
  maintenance: 'operations_officer',
};

export const DIRECTOR_CORPORATE_DESIGNATION_IDS = new Set(['desig_md', 'desig_edo', 'desig_edf', 'desig_edc']);

export const ACTING_DESIGNATION_IDS = new Set([
  'desig_actbm',
  'desig_actsk',
  'desig_actmd',
  'desig_actsso',
  'desig_actpo',
  'desig_actacct',
  'desig_acthro',
]);

export const DESIGNATION_OFFICE_KEYS = {
  desig_md: 'executive',
  desig_actmd: 'executive',
  desig_edo: 'executive',
  desig_edf: 'finance',
  desig_edc: 'sales',
  desig_gmhr: 'hr',
  desig_hrm: 'hr',
  desig_hro: 'hr',
  desig_ahro: 'hr',
  desig_hra: 'hr',
  desig_acthro: 'hr',
  desig_hrrep: 'hr',
  desig_hoa: 'finance',
  desig_acct: 'finance',
  desig_aacct: 'finance',
  desig_actacct: 'finance',
  desig_adm: 'office_admin',
  desig_csec: 'office_admin',
  desig_eamd: 'executive',
  desig_bm: 'branch_manager',
  desig_abm: 'branch_manager',
  desig_dbm: 'branch_manager',
  desig_actbm: 'branch_manager',
  desig_so: 'sales',
  desig_sa: 'sales',
  desig_aso: 'sales',
  desig_ssup: 'sales',
  desig_sso: 'sales',
  desig_actsso: 'sales',
  desig_st: 'sales',
  desig_cso: 'sales',
  desig_acso: 'sales',
  desig_sk: 'operations',
  desig_ask: 'operations',
  desig_ssk: 'operations',
  desig_actsk: 'operations',
  desig_ps: 'production',
  desig_pm: 'production',
  desig_apm: 'production',
  desig_qco: 'production',
  desig_op: 'production',
  desig_aop: 'production',
  desig_fa: 'production',
  desig_csh: 'finance',
  desig_acsh: 'finance',
  desig_bac: 'finance',
  desig_po: 'procurement',
  desig_hop: 'procurement',
  desig_apo: 'procurement',
  desig_actpo: 'procurement',
  desig_mm: 'maintenance',
  desig_msup: 'maintenance',
  desig_mtech: 'maintenance',
  desig_amtech: 'maintenance',
  desig_drv: 'office_admin',
  desig_sdrv: 'office_admin',
  desig_sec: 'office_admin',
  desig_ssec: 'office_admin',
  desig_cln: 'office_admin',
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
    officeKey: DESIGNATION_OFFICE_KEYS[desId] || des.functionalOfficeKey || '',
    acting: ACTING_DESIGNATION_IDS.has(desId) || Boolean(des.isActing),
  };
}

export function isActingDesignation(designationId, designations = []) {
  const id = String(designationId || '').trim();
  if (ACTING_DESIGNATION_IDS.has(id)) return true;
  const des = designations.find((d) => d.id === id);
  return Boolean(des?.isActing) || des?.titleTier === 'acting';
}
