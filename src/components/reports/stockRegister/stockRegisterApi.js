import { apiFetch } from '../../../lib/apiBase';

export async function fetchStockRegister(periodEnd, viewMode = 'store') {
  return apiFetch(
    `/api/stock-register?periodEnd=${encodeURIComponent(periodEnd)}&viewMode=${encodeURIComponent(viewMode)}`
  );
}

export async function printStockRegisterSnapshot(periodEnd) {
  return apiFetch('/api/stock-register/print-snapshot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ periodEnd }),
  });
}

export async function postStockRegisterWorkflow(body) {
  return apiFetch('/api/stock-register/workflow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function postLineClearance(periodKey, lineClearance) {
  return apiFetch('/api/stock-register/line-clearance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ periodKey, lineClearance }),
  });
}

export async function postStoreChecklist(periodKey, checklist) {
  return apiFetch('/api/stock-register/store-checklist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ periodKey, checklist }),
  });
}

export async function fetchLineDetail(periodKey, lineKey) {
  return apiFetch(
    `/api/stock-register/line-detail?periodKey=${encodeURIComponent(periodKey)}&lineKey=${encodeURIComponent(lineKey)}`
  );
}

export async function captureStockRegisterClosing(periodEnd) {
  return apiFetch('/api/stock-register/capture-closing', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ periodEnd }),
  });
}

export async function reopenStockRegisterClosing(periodEnd, reason) {
  return apiFetch('/api/stock-register/reopen', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ periodEnd, reason }),
  });
}
