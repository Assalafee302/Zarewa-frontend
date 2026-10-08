function scoreOption(opt, q) {
  if (!q) return 0;
  const label = String(opt.label || '').toLowerCase();
  const hay = String(opt.searchText || opt.label || '').toLowerCase();
  if (label === q) return 400;
  if (label.startsWith(q)) return 300;
  if (hay.startsWith(q)) return 220;
  const tokens = q.split(/\s+/).filter(Boolean);
  if (tokens.length > 1 && tokens.every((t) => hay.includes(t))) return 180;
  if (hay.includes(q)) return 100;
  return 0;
}

/** Rank refund payout recipient options for desk search (shared by picker + tests). */
export function rankRefundPayoutOptions(options, query, recentKeys = []) {
  const q = String(query || '')
    .trim()
    .toLowerCase();
  const recentRank = new Map(recentKeys.map((k, i) => [String(k), i]));
  const list = Array.isArray(options) ? options : [];
  const scored = q
    ? list
        .map((o) => ({ o, s: scoreOption(o, q) }))
        .filter((x) => x.s > 0)
        .sort((a, b) => b.s - a.s || String(a.o.label).localeCompare(String(b.o.label)))
        .map((x) => x.o)
    : [...list];
  if (!recentKeys.length) return scored;
  const head = [];
  const tail = [];
  const seen = new Set();
  for (const key of recentKeys) {
    const hit = scored.find((o) => String(o.key) === String(key));
    if (hit && !seen.has(hit.key)) {
      seen.add(hit.key);
      head.push({ ...hit, recent: true });
    }
  }
  for (const o of scored) {
    if (seen.has(o.key)) continue;
    tail.push(o);
  }
  if (!q && head.length) {
    return [
      ...head.map((o) => ({ ...o, group: o.recent && !q ? 'Recent on this desk' : o.group })),
      ...tail,
    ];
  }
  return [...head, ...tail].sort((a, b) => {
    if (q) return 0;
    const ar = recentRank.has(String(a.key)) ? 0 : 1;
    const br = recentRank.has(String(b.key)) ? 0 : 1;
    return ar - br;
  });
}
