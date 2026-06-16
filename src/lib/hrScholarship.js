import { apiUrl } from './apiBase';

/** Download scholarship payment statement PDF. */
export async function downloadScholarshipStatementPdf({ academicSession } = {}) {
  const params = new URLSearchParams();
  if (academicSession) params.set('academicSession', academicSession);
  const qs = params.toString();
  const path = `/api/hr/me/scholarship-statement.pdf${qs ? `?${qs}` : ''}`;
  const r = await fetch(apiUrl(path), { credentials: 'include' });
  if (!r.ok) {
    const text = await r.text();
    let err = 'PDF download failed.';
    try {
      const j = JSON.parse(text);
      err = j.error || err;
    } catch {
      err = text.slice(0, 200) || err;
    }
    return { ok: false, error: err };
  }
  const blob = await r.blob();
  const filename =
    r.headers.get('Content-Disposition')?.match(/filename="([^"]+)"/)?.[1] || 'scholarship-statement.pdf';
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return { ok: true };
}
