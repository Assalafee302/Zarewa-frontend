import { apiFetch } from './apiBase';

/** Company pay ladder — aligns with docs/HR/ZAREWA-ORG-STRUCTURE-AND-TITLES.md */
export const PAY_LADDER_LEVELS = [
  { level: 1, grades: 'G1', typicalTitles: 'Cleaner, security, factory assistant, trainee', leaveBand: 'Junior' },
  { level: 2, grades: 'G1–G2', typicalTitles: 'Assistants, operators, assistant store/sales/cashier', leaveBand: 'Junior' },
  { level: 3, grades: 'G2–G3', typicalTitles: 'Officers (sales, store, HR, procurement), supervisors', leaveBand: 'Junior / Standard' },
  { level: 4, grades: 'G3–G4', typicalTitles: 'Accountant, ABM, senior officers', leaveBand: 'Senior' },
  { level: 5, grades: 'G4–G5', typicalTitles: 'Branch Manager, HR Manager, Head Accountant', leaveBand: 'Senior' },
  { level: 6, grades: 'G5–G6', typicalTitles: 'Senior Manager, GM HR, Executive Director', leaveBand: 'Senior / Executive' },
  { level: 7, grades: 'G6–G7', typicalTitles: 'Managing Director', leaveBand: 'Executive' },
];

export const PAYROLL_MATRIX_GROUPS = [
  { value: 'branch_ops', label: 'Branch operations', hint: 'Default for factory & branch staff' },
  { value: 'hq_admin', label: 'HQ administrative', hint: 'Same baseline as branch' },
  { value: 'mining_div', label: 'Mining division', hint: '+10% hardship uplift' },
  { value: 'scholarship', label: 'Executive family', hint: '65% of branch stipend band' },
  { value: 'chairman_staffs', label: 'Household staff', hint: '75% of branch band' },
];

export const MATRIX_STEPS = [1, 2, 3];

export function matrixRowKey(row) {
  return `${row.payrollGroup}|${row.salaryLevel}|${row.salaryStep}`;
}

export function totalMatrixPay(row) {
  return (
    Math.round(Number(row?.baseSalaryNgn) || 0) +
    Math.round(Number(row?.housingAllowanceNgn) || 0) +
    Math.round(Number(row?.transportAllowanceNgn) || 0)
  );
}

export function fetchSalaryMatrix() {
  return apiFetch('/api/hr/salary-matrix');
}

export function saveSalaryMatrixRow(body) {
  return apiFetch('/api/hr/salary-matrix', { method: 'PUT', body: JSON.stringify(body) });
}

export function deleteSalaryMatrixRow(id) {
  return apiFetch(`/api/hr/salary-matrix/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export function deleteHrDesignation(id, { hard = false } = {}) {
  const q = hard ? '?hard=1' : '';
  return apiFetch(`/api/hr/designations/${encodeURIComponent(id)}${q}`, { method: 'DELETE' });
}

export function deleteHrDepartment(id, { hard = false } = {}) {
  const q = hard ? '?hard=1' : '';
  return apiFetch(`/api/hr/departments/${encodeURIComponent(id)}${q}`, { method: 'DELETE' });
}
