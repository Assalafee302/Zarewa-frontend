/** Client policy constants — keep aligned with server/hrPolicyConstants.js */

export const PROBATION_MONTHS_DEFAULT = 6;

export const HR_LEAVE_TYPES = [
  { value: 'annual', label: 'Annual leave' },
  { value: 'sick', label: 'Sick leave' },
  { value: 'maternity', label: 'Maternity leave' },
  { value: 'compassionate', label: 'Compassionate leave' },
  { value: 'unpaid', label: 'Leave without pay (GMHR approval)' },
  { value: 'other', label: 'Other leave' },
];

export function leaveBandFromSalaryLevel(salaryLevel) {
  const n = Math.round(Number(salaryLevel) || 0);
  if (n <= 0) return '';
  if (n <= 3) return 'junior';
  return 'senior';
}

export function leaveBandLabel(band) {
  const b = String(band || '').trim().toLowerCase();
  if (b === 'junior' || b === 'standard') return 'Junior (L1–L3)';
  if (b === 'senior' || b === 'executive') return 'Senior (L4–L7)';
  return 'Auto from level';
}

export function defaultProbationEndIso(dateJoinedIso, months = PROBATION_MONTHS_DEFAULT) {
  const raw = String(dateJoinedIso || '').trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return '';
  const d = new Date(`${raw}T12:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return '';
  d.setUTCMonth(d.getUTCMonth() + Math.max(1, Math.round(Number(months) || PROBATION_MONTHS_DEFAULT)));
  return d.toISOString().slice(0, 10);
}

export const ZAREWA_HR_SITES = [
  { id: 'HQ', label: 'Kaduna (HQ)' },
  { id: 'BR-YL', label: 'Yola' },
  { id: 'BR-MDG', label: 'Maiduguri' },
];
