import { apiFetch } from './apiBase';

export function fetchStaffRecoveriesDue() {
  return apiFetch('/api/finance/staff-recoveries-due');
}

export function receiveStaffRecoveryPayment(scheduleId, body) {
  return apiFetch(`/api/finance/staff-recoveries/${encodeURIComponent(scheduleId)}/receive`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
