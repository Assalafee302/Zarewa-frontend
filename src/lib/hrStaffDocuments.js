import { apiFetch } from './apiBase';

export { HR_STAFF_DOC_KINDS, HR_REQUIRED_DOC_KINDS, hrStaffDocKindLabel, CRITICAL_MISSING_LABELS } from './hrStaffDocumentKinds.js';

/** @param {string} userId */
export async function fetchHrStaffDocuments(userId) {
  return apiFetch(`/api/hr/staff/${encodeURIComponent(userId)}/documents`);
}

/**
 * @param {string} userId
 * @param {{ docKind: string; fileName: string; mimeType: string; dataBase64: string }} body
 */
export async function uploadHrStaffDocument(userId, body) {
  return apiFetch(`/api/hr/staff/${encodeURIComponent(userId)}/documents`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/** @param {string} userId @param {string} docId */
export async function deleteHrStaffDocument(userId, docId) {
  return apiFetch(`/api/hr/staff/${encodeURIComponent(userId)}/documents/${encodeURIComponent(docId)}`, {
    method: 'DELETE',
  });
}

/** @param {string} userId @param {string} docId */
export function hrStaffDocumentDownloadUrl(userId, docId) {
  return `/api/hr/staff/${encodeURIComponent(userId)}/documents/${encodeURIComponent(docId)}/download`;
}

/** @param {string} userId @param {string} docId @param {{ action: 'verify' | 'reject'; rejectionReason?: string }} body */
export async function verifyHrStaffDocument(userId, docId, body) {
  return apiFetch(`/api/hr/staff/${encodeURIComponent(userId)}/documents/${encodeURIComponent(docId)}/verify`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

/** @param {string} userId @param {string | null} avatarUrl */
export async function uploadHrStaffPassportPhoto(userId, avatarUrl) {
  return apiFetch(`/api/hr/staff/${encodeURIComponent(userId)}/passport-photo`, {
    method: 'PATCH',
    body: JSON.stringify({ avatarUrl }),
  });
}

/** @param {File} file */
export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Could not read file.'));
    reader.readAsDataURL(file);
  });
}

/** @param {string} dataUrl @param {string} fileName */
export function dataUrlToUploadPayload(dataUrl, fileName) {
  const m = String(dataUrl).match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return null;
  return {
    fileName,
    mimeType: m[1],
    dataBase64: m[2],
  };
}
