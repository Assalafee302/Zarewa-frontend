/**
 * Title-case person / company names for display (each word starts with a capital letter).
 * Search and storage stay unchanged — use only when rendering labels.
 */
export function formatPersonName(raw) {
  const s = String(raw ?? '').trim();
  if (!s || s === '—' || s === '-') return s;

  const capSegment = (part) => {
    if (!part) return part;
    return part.charAt(0).toLocaleUpperCase('en') + part.slice(1).toLocaleLowerCase('en');
  };

  const capToken = (token) =>
    token
      .split('-')
      .map((piece) =>
        piece
          .split("'")
          .map(capSegment)
          .join("'")
      )
      .join('-');

  return s.split(/\s+/).map(capToken).join(' ');
}
