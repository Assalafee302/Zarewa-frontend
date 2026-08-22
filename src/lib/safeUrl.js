/**
 * Allow only http(s) absolute URLs for user-supplied hrefs (blocks javascript:/data:).
 * @param {unknown} raw
 * @returns {string | null}
 */
export function safeHttpUrl(raw) {
  const s = String(raw || '').trim();
  if (!s) return null;
  try {
    const withScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(s) ? s : `https://${s}`;
    const u = new URL(withScheme);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return u.href;
  } catch {
    return null;
  }
}

/**
 * Safe href for attachment open/download. Allows https/http/blob only — not javascript: or arbitrary data:.
 * Image previews may still use data: in <img src>; navigation hrefs must not.
 * @param {unknown} raw
 * @returns {string | null}
 */
export function safeAttachmentHref(raw) {
  const s = String(raw || '').trim();
  if (!s) return null;
  if (s.startsWith('blob:')) return s;
  if (s.startsWith('data:image/')) return s;
  if (s.startsWith('data:')) return null;
  return safeHttpUrl(s);
}
