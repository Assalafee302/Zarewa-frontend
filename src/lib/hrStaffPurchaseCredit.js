import { apiFetch } from './apiBase';

export function fetchStaffPurchaseCredits(params = {}) {
  const q = new URLSearchParams();
  if (params.status) q.set('status', params.status);
  const qs = q.toString();
  return apiFetch(`/api/staff-purchase-credits${qs ? `?${qs}` : ''}`);
}

export function fetchQuotationStaffPurchaseStatus(quotationRef) {
  return apiFetch(`/api/quotations/${encodeURIComponent(quotationRef)}/staff-purchase-status`);
}

export function createStaffPurchaseCredit(body) {
  return apiFetch('/api/staff-purchase-credits', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function decideStaffPurchaseCredit(accountId, decision, body = {}) {
  return apiFetch(`/api/staff-purchase-credits/${encodeURIComponent(accountId)}/decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, decision }),
  });
}

export function ensureStaffSalesCustomer(userId) {
  return apiFetch(`/api/hr/staff/${encodeURIComponent(userId)}/ensure-sales-customer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
}
