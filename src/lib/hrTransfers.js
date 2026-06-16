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

/** Visual approval chain for transfer workflow. */
export function hrTransferApprovalChain(transferType, status) {
  const type = String(transferType || '').toLowerCase();
  const needsBranch = type === 'inter_branch';
  const needsGm = ['inter_branch', 'hq_to_branch', 'branch_to_hq'].includes(type);
  let chain;
  if (needsBranch && needsGm) {
    chain = ['Draft', 'Branch review', 'HR review', 'GM approval', 'Approved', 'Completed'];
  } else if (needsGm) {
    chain = ['Draft', 'HR review', 'GM approval', 'Approved', 'Completed'];
  } else {
    chain = ['Draft', 'HR review', 'Approved', 'Completed'];
  }

  const statusIdx = {
    draft: 0,
    submitted: needsBranch ? 1 : 1,
    branch_review: chain.indexOf('Branch review'),
    hr_review: chain.indexOf('HR review'),
    gm_approval: chain.indexOf('GM approval'),
    approved: chain.indexOf('Approved'),
    completed: chain.length - 1,
  };
  const rejected = status === 'rejected';
  const idx = statusIdx[status] ?? (rejected ? chain.length - 2 : 0);
  return { chain, currentIdx: idx >= 0 ? idx : 0, status, rejected };
}

export const TRANSFER_QUEUE_SCOPES = {
  branch_queue: 'branch_review',
  hr_queue: 'hr_review',
  gm_queue: 'gm_approval',
  complete_queue: 'approved',
};
