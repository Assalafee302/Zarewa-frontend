/** @param {string} raw */
export function normalizeEditApprovalInput(raw) {
  const t = String(raw ?? '').trim();
  if (/^EA-/i.test(t)) return t.slice(0, 120);
  return t.replace(/\D/g, '').slice(0, 6);
}
