const KEY = 'zarewa.coilCount.latest';

export function readCoilCountSession() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveCoilCountSession(session) {
  localStorage.setItem(KEY, JSON.stringify(session));
  return session;
}

export function countedCoilNos(session) {
  const set = new Set();
  for (const line of session?.lines || []) {
    const no = String(line?.coilNo || '').trim();
    if (no) set.add(no.toLowerCase());
  }
  return set;
}
