import { apiFetch } from './apiBase';

export function fetchCompensationVarianceTypes() {
  return apiFetch('/api/hr/compensation/variance-types');
}

export function fetchMatrixCompensationLookup({ payrollGroup, salaryLevel, salaryStep }) {
  const q = new URLSearchParams();
  if (payrollGroup) q.set('payrollGroup', payrollGroup);
  if (salaryLevel != null && salaryLevel !== '') q.set('salaryLevel', String(salaryLevel));
  if (salaryStep != null && salaryStep !== '') q.set('salaryStep', String(salaryStep || 1));
  return apiFetch(`/api/hr/compensation/matrix-lookup?${q.toString()}`);
}

export function fetchSalaryVarianceReport() {
  return apiFetch('/api/hr/reports/salary-variance');
}

export function seedZarewaOrgStandard() {
  return apiFetch('/api/hr/org/seed-standard', { method: 'POST' });
}

export function fetchOrgCatalogMeta() {
  return apiFetch('/api/hr/org/catalog-meta');
}

export function previewLegacyPayBackfill() {
  return apiFetch('/api/hr/compensation/backfill-legacy-pay', {
    method: 'POST',
    body: JSON.stringify({ execute: false }),
  });
}

export function runLegacyPayBackfill({ autoDocument = false } = {}) {
  return apiFetch('/api/hr/compensation/backfill-legacy-pay', {
    method: 'POST',
    body: JSON.stringify({ execute: true, autoDocument }),
  });
}

export function previewMatrixRevisionApply({ payrollGroup } = {}) {
  return apiFetch('/api/hr/compensation/apply-matrix-revision', {
    method: 'POST',
    body: JSON.stringify({ execute: false, payrollGroup: payrollGroup || undefined }),
  });
}

export function runMatrixRevisionApply({ payrollGroup, reason, effectiveFromIso } = {}) {
  return apiFetch('/api/hr/compensation/apply-matrix-revision', {
    method: 'POST',
    body: JSON.stringify({
      execute: true,
      payrollGroup: payrollGroup || undefined,
      reason: reason || undefined,
      effectiveFromIso: effectiveFromIso || undefined,
    }),
  });
}

export function fetchOfficeCoverage(officeKey, branchId) {
  const q = new URLSearchParams({ officeKey });
  if (branchId) q.set('branchId', branchId);
  return apiFetch(`/api/hr/org/office-coverage?${q.toString()}`);
}

export function seedDemoMultiRoleProfile({ userId, applyRecommendedRoleKey = true, applyMultiRolePermissions = true } = {}) {
  return apiFetch('/api/hr/org/seed-demo-profile', {
    method: 'POST',
    body: JSON.stringify({ userId, applyRecommendedRoleKey, applyMultiRolePermissions }),
  });
}
