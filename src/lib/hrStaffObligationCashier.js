import { apiFetch } from './apiBase';

export function fetchStaffObligationsDue() {
  return apiFetch('/api/finance/staff-obligations-due');
}

export function receiveStaffObligationPayment(accountId, body) {
  return apiFetch(`/api/finance/staff-obligations/${encodeURIComponent(accountId)}/receive`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
