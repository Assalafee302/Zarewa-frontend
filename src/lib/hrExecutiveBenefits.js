import { apiFetch, apiUrl } from './apiBase';

export async function fetchExecutiveBenefitsDashboard() {
  const { ok, data } = await apiFetch('/api/hr/executive/dashboard');
  if (!ok || !data?.ok) throw new Error(data?.error || 'Could not load dashboard.');
  return data.dashboard;
}

export async function fetchExecutiveBeneficiaries(filters = {}) {
  const q = new URLSearchParams(filters).toString();
  const { ok, data } = await apiFetch(`/api/hr/executive/beneficiaries${q ? `?${q}` : ''}`);
  if (!ok || !data?.ok) throw new Error(data?.error || 'Could not load beneficiaries.');
  return data.beneficiaries || [];
}

export async function saveExecutiveBeneficiary(payload) {
  const method = payload.id ? 'PUT' : 'POST';
  const path = payload.id ? `/api/hr/executive/beneficiaries/${payload.id}` : '/api/hr/executive/beneficiaries';
  return apiFetch(path, { method, body: JSON.stringify(payload) });
}

export async function fetchExecutiveSchoolFees(filters = {}) {
  const q = new URLSearchParams(filters).toString();
  const { ok, data } = await apiFetch(`/api/hr/executive/school-fees${q ? `?${q}` : ''}`);
  if (!ok || !data?.ok) throw new Error(data?.error || 'Could not load school fees.');
  return data.fees || [];
}

export async function saveExecutiveSchoolFee(payload) {
  const method = payload.id ? 'PUT' : 'POST';
  const path = payload.id ? `/api/hr/executive/school-fees/${payload.id}` : '/api/hr/executive/school-fees';
  return apiFetch(path, { method, body: JSON.stringify(payload) });
}

export async function submitExecutiveSchoolFee(id) {
  return apiFetch(`/api/hr/executive/school-fees/${id}/submit`, { method: 'POST' });
}

export async function deleteExecutiveSchoolFee(id) {
  return apiFetch(`/api/hr/executive/school-fees/${id}`, { method: 'DELETE' });
}

export async function fetchExecutiveStipends(filters = {}) {
  const q = new URLSearchParams(filters).toString();
  const { ok, data } = await apiFetch(`/api/hr/executive/stipends${q ? `?${q}` : ''}`);
  if (!ok || !data?.ok) throw new Error(data?.error || 'Could not load stipends.');
  return data.stipends || [];
}

export async function saveExecutiveStipend(payload) {
  const method = payload.id ? 'PUT' : 'POST';
  const path = payload.id ? `/api/hr/executive/stipends/${payload.id}` : '/api/hr/executive/stipends';
  return apiFetch(path, { method, body: JSON.stringify(payload) });
}

export async function fetchDomesticStaff(filters = {}) {
  const q = new URLSearchParams(filters).toString();
  const { ok, data } = await apiFetch(`/api/hr/executive/domestic-staff${q ? `?${q}` : ''}`);
  if (!ok || !data?.ok) throw new Error(data?.error || 'Could not load domestic staff.');
  return data.staff || [];
}

export async function saveDomesticStaffProfile(payload) {
  const method = payload.id ? 'PUT' : 'POST';
  const path = payload.id ? `/api/hr/executive/domestic-staff/${payload.id}` : '/api/hr/executive/domestic-staff';
  return apiFetch(path, { method, body: JSON.stringify(payload) });
}

export async function fetchExecutivePayments(filters = {}) {
  const q = new URLSearchParams(filters).toString();
  const { ok, data } = await apiFetch(`/api/hr/executive/payments${q ? `?${q}` : ''}`);
  if (!ok || !data?.ok) throw new Error(data?.error || 'Could not load payments.');
  return data.payments || [];
}

export async function approveExecutivePayment(id, body = {}) {
  return apiFetch(`/api/hr/executive/payments/${id}/approve`, { method: 'POST', body: JSON.stringify(body) });
}

export async function rejectExecutivePayment(id, reason) {
  return apiFetch(`/api/hr/executive/payments/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) });
}

export async function markExecutivePaymentPaid(id, body = {}) {
  return apiFetch(`/api/hr/executive/payments/${id}/mark-paid`, { method: 'POST', body: JSON.stringify(body) });
}

export async function downloadExecutivePaymentExport(body = {}) {
  const res = await fetch(apiUrl('/api/hr/executive/payments/export'), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let err = 'Export failed.';
    try {
      const j = await res.json();
      err = j.error || err;
    } catch {
      /* ignore */
    }
    throw new Error(err);
  }
  const blob = await res.blob();
  const cd = res.headers.get('Content-Disposition') || '';
  const match = /filename="([^"]+)"/.exec(cd);
  const filename = match?.[1] || 'beneficiary-stipend-export.csv';
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function fetchChairmanExpenses(period) {
  const url = period ? `/api/hr/executive/expenses?period=${period}` : '/api/hr/executive/expenses';
  const { ok, data } = await apiFetch(url);
  if (!ok || !data?.ok) throw new Error(data?.error || 'Could not load expenses.');
  return data.expenses || [];
}

export async function saveChairmanExpense(payload) {
  const method = payload.id ? 'PUT' : 'POST';
  const path = payload.id ? `/api/hr/executive/expenses/${payload.id}` : '/api/hr/executive/expenses';
  return apiFetch(path, { method, body: JSON.stringify(payload) });
}

export async function deleteChairmanExpense(id) {
  return apiFetch(`/api/hr/executive/expenses/${id}`, { method: 'DELETE' });
}
