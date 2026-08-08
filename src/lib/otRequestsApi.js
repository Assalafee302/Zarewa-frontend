import { apiFetch } from './apiBase';

function qs(params = {}) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v == null || v === '') continue;
    if (Array.isArray(v)) {
      for (const item of v) {
        if (item != null && item !== '') sp.append(k, String(item));
      }
    } else {
      sp.set(k, String(v));
    }
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

/** List OT requests — server applies role status filter (cashier only sees approved/paid). */
export async function listOtRequests(params = {}) {
  return apiFetch(`/api/ot/requests${qs(params)}`);
}

export async function getOtRequest(id) {
  return apiFetch(`/api/ot/requests/${encodeURIComponent(id)}`);
}

export async function createOtRequest(body) {
  return apiFetch('/api/ot/requests', { method: 'POST', body: JSON.stringify(body) });
}

export async function updateOtRequest(id, body) {
  return apiFetch(`/api/ot/requests/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export async function deleteOtRequest(id) {
  return apiFetch(`/api/ot/requests/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function submitOtRequest(id) {
  return apiFetch(`/api/ot/requests/${encodeURIComponent(id)}/submit`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function approveOtRequest(id, body = {}) {
  return apiFetch(`/api/ot/requests/${encodeURIComponent(id)}/approve`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function rejectOtRequest(id, body = {}) {
  return apiFetch(`/api/ot/requests/${encodeURIComponent(id)}/reject`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function payOtRequest(id, body = {}) {
  return apiFetch(`/api/ot/requests/${encodeURIComponent(id)}/pay`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function otLookupQuotations(q, limit = 30) {
  return apiFetch(`/api/ot/lookups/quotations${qs({ q, limit })}`);
}

export async function otLookupPurchaseOrders(q, limit = 30) {
  return apiFetch(`/api/ot/lookups/purchase-orders${qs({ q, limit })}`);
}

export async function otLookupProductionJobs({ q, quotationRef, limit = 30 } = {}) {
  return apiFetch(`/api/ot/lookups/production-jobs${qs({ q, quotationRef, limit })}`);
}

export async function otLookupStaff(q, limit = 30) {
  return apiFetch(`/api/ot/lookups/staff${qs({ q, limit })}`);
}

export async function otMeta() {
  return apiFetch('/api/ot/meta');
}
