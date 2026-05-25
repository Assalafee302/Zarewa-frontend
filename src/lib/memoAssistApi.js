import { apiFetch } from './apiBase';

/**
 * @param {object} payload
 */
export async function callMemoAssist(payload) {
  const { ok, data } = await apiFetch('/api/help/memo-assist', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!ok || !data?.ok) {
    return { ok: false, error: data?.error || 'Memo assist unavailable.' };
  }
  return { ok: true, ...data };
}
