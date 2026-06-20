const STORAGE_KEY = 'zarewa-hr-staff-directory-views';

export function loadSavedDirectoryViews() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function persistSavedDirectoryViews(views) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(views.slice(0, 12)));
  } catch {
    /* ignore quota */
  }
}

export function saveDirectoryView(name, snapshot) {
  const label = String(name || '').trim();
  if (!label) return { ok: false, error: 'Name is required.' };
  const views = loadSavedDirectoryViews().filter((v) => v.name !== label);
  views.unshift({
    name: label,
    savedAt: new Date().toISOString(),
    snapshot: {
      search: snapshot.search || '',
      branchId: snapshot.branchId || '',
      department: snapshot.department || '',
      employmentType: snapshot.employmentType || '',
      status: snapshot.status || 'active',
      quickFilter: snapshot.quickFilter || '',
      sortKey: snapshot.sortKey || 'name',
    },
  });
  persistSavedDirectoryViews(views);
  return { ok: true, views };
}

export function deleteDirectoryView(name) {
  const views = loadSavedDirectoryViews().filter((v) => v.name !== name);
  persistSavedDirectoryViews(views);
  return views;
}
