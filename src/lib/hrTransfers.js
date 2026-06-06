import { apiFetch } from './apiBase';

export const TRANSFER_TYPES = [
  { value: 'inter_branch', label: 'Inter-branch transfer' },
  { value: 'in_branch_department', label: 'In-branch department transfer' },
  { value: 'hq_to_branch', label: 'HQ to branch transfer' },
  { value: 'branch_to_hq', label: 'Branch to HQ transfer' },
  { value: 'role_designation', label: 'Role / designation change' },
  { value: 'temporary', label: 'Temporary transfer' },
  { value: 'permanent', label: 'Permanent transfer' },
];

export const TRANSFER_STATUSES = [
  'draft',
  'submitted',
  'branch_review',
  'hr_review',
  'gm_approval',
  'approved',
  'rejected',
  'completed',
  'cancelled',
];

export function fetchHrTransferRequests(params = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v != null && String(v).trim() !== '') q.set(k, String(v));
  });
  const qs = q.toString();
  return apiFetch(`/api/hr/transfer-requests${qs ? `?${qs}` : ''}`);
}

export function createHrTransferRequest(body) {
  return apiFetch('/api/hr/transfer-requests', { method: 'POST', body: JSON.stringify(body) });
}

export function patchHrTransferRequest(id, body) {
  return apiFetch(`/api/hr/transfer-requests/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}
