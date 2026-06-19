import { apiFetch } from './apiBase';

export function fetchStaffLinkOptions(query = '') {
  const q = String(query || '').trim();
  const qs = q ? `?q=${encodeURIComponent(q)}` : '';
  return apiFetch(`/api/customers/staff-link-options${qs}`);
}

export function setCustomerStaffLink(customerId, staffUserId) {
  return apiFetch(`/api/customers/${encodeURIComponent(customerId)}/staff-link`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ staffUserId: staffUserId || null }),
  });
}
