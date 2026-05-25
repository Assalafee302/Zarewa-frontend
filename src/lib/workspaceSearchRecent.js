const RECENT_KEY = 'zarewa.workspace.search.recent.v1';

/**
 * @returns {{ label: string, path: string, state?: object }[]}
 */
export function loadRecentWorkspaceSearches() {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const data = JSON.parse(raw || '[]');
    return Array.isArray(data) ? data.slice(0, 8) : [];
  } catch {
    return [];
  }
}

/**
 * @param {{ label: string, path: string, state?: object }} entry
 */
export function pushRecentWorkspaceSearch(entry) {
  if (!entry?.label || !entry?.path) return;
  const prev = loadRecentWorkspaceSearches().filter((x) => x.label !== entry.label);
  const next = [{ label: entry.label, path: entry.path, state: entry.state || null }, ...prev].slice(0, 8);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}
