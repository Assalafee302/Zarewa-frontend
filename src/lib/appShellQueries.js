import { apiFetch } from './apiBase';
import { fetchHrNotificationSummary } from './hrMasterData';

export async function fetchOfficeSummary() {
  const { ok, data } = await apiFetch('/api/office/summary');
  if (ok && data?.ok) return data;
  return null;
}

export async function fetchHrNotifSummary() {
  const { ok, data } = await fetchHrNotificationSummary();
  if (ok && data?.ok) return data.summary ?? null;
  return null;
}

export async function fetchManagementAttention() {
  const { ok, data } = await apiFetch('/api/management/attention');
  if (ok && data?.ok !== false) return data;
  return null;
}
