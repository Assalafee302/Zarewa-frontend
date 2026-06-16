import { apiFetch, apiUrl } from './apiBase';

export async function fetchDomesticSummary() {
  const { ok, data } = await apiFetch('/api/hr/me/domestic-summary');
  if (!ok || !data?.ok) throw new Error(data?.error || 'Could not load your pay profile.');
  return data;
}

/** Download household staff payment statement PDF (self-service). */
export async function downloadDomesticStatementPdf() {
  const path = '/api/hr/me/domestic-statement.pdf';
  const r = await fetch(apiUrl(path), { credentials: 'include' });
  if (!r.ok) {
    let err = 'Download failed.';
    try {
      const j = await r.json();
      err = j.error || err;
    } catch {
      /* ignore */
    }
    return { ok: false, error: err };
  }
  const blob = await r.blob();
  const filename =
    r.headers.get('Content-Disposition')?.match(/filename="([^"]+)"/)?.[1] || 'household-staff-statement.pdf';
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return { ok: true };
}

/** Admin — download statement for a household staff record (no staff login). */
export async function downloadDomesticStatementPdfForStaff(profileId) {
  const id = String(profileId || '').trim();
  if (!id) return { ok: false, error: 'Staff record not found.' };
  const path = `/api/hr/executive/domestic-staff/${encodeURIComponent(id)}/statement.pdf`;
  const r = await fetch(apiUrl(path), { credentials: 'include' });
  if (!r.ok) {
    let err = 'Download failed.';
    try {
      const j = await r.json();
      err = j.error || err;
    } catch {
      /* ignore */
    }
    return { ok: false, error: err };
  }
  const blob = await r.blob();
  const filename =
    r.headers.get('Content-Disposition')?.match(/filename="([^"]+)"/)?.[1] || 'household-staff-statement.pdf';
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return { ok: true };
}

/** CEO / Chairman — all household staff with salary status. */
export async function fetchExecutiveDomesticDashboard(filters = {}) {
  const q = new URLSearchParams(filters).toString();
  const { ok, data } = await apiFetch(`/api/hr/executive/domestic-dashboard${q ? `?${q}` : ''}`);
  if (!ok || !data?.ok) throw new Error(data?.error || 'Could not load household staff overview.');
  return data;
}
