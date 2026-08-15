import { apiUrl } from './apiBase.js';

/**
 * Download every entered operational record as Excel (not period-filtered).
 * @param {(msg: string, opts?: object) => void} [showToast]
 * @returns {Promise<boolean>}
 */
export async function downloadEnteredDataWorkbook(showToast) {
  const r = await fetch(apiUrl('/api/reports/entered-data.xlsx'), { credentials: 'include' });
  if (!r.ok) {
    let msg = 'Could not download entered data.';
    try {
      const j = await r.json();
      msg = j.error || msg;
    } catch {
      msg = (await r.text()).slice(0, 200) || msg;
    }
    showToast?.(msg, { variant: 'error' });
    return false;
  }
  const blob = await r.blob();
  const filename =
    r.headers.get('Content-Disposition')?.match(/filename="([^"]+)"/)?.[1] ||
    `zarewa-entered-data.xlsx`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  showToast?.('All entered data downloaded.');
  return true;
}
