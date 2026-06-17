import { apiFetch } from './apiBase';
import { yearsOfServiceFromIso } from './hrFormat';

export function fetchStaffTenure(userId) {
  return apiFetch(`/api/hr/staff/${encodeURIComponent(userId)}/tenure`);
}

export function fetchDesignationTenureEligibility(designationId, { userId, dateJoinedIso } = {}) {
  const q = new URLSearchParams();
  if (userId) q.set('userId', userId);
  if (dateJoinedIso) q.set('dateJoinedIso', dateJoinedIso);
  const qs = q.toString();
  return apiFetch(`/api/hr/designations/${encodeURIComponent(designationId)}/tenure-eligibility${qs ? `?${qs}` : ''}`);
}

export function localYearsOfService(dateJoinedIso) {
  return yearsOfServiceFromIso(dateJoinedIso);
}
