import { apiFetch } from './apiBase';

/**
 * @param {string} branchId
 */
export async function fetchComposeDrafts(branchId) {
  const { ok, data } = await apiFetch(
    `/api/office/compose-drafts?branchId=${encodeURIComponent(branchId || '')}`
  );
  if (!ok || !data?.ok) return [];
  return Array.isArray(data.drafts) ? data.drafts : [];
}

/**
 * @param {object} draft
 */
export async function saveComposeDraft(draft) {
  const id = String(draft?.id || '').trim();
  const path = id ? `/api/office/compose-drafts/${encodeURIComponent(id)}` : '/api/office/compose-drafts';
  const { ok, data } = await apiFetch(path, {
    method: 'PUT',
    body: JSON.stringify(draft),
  });
  return ok && data?.ok ? data.draft : null;
}

/**
 * @param {string} draftId
 */
export async function deleteComposeDraft(draftId) {
  const { ok, data } = await apiFetch(`/api/office/compose-drafts/${encodeURIComponent(draftId)}`, {
    method: 'DELETE',
  });
  return ok && data?.ok;
}
