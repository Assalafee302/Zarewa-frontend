/** Client-side search/sort for HR dashboard recent-requests list. */

export const HR_DASHBOARD_REQUEST_SORT_FIELDS = [
  { id: 'updated', label: 'Updated' },
  { id: 'kind', label: 'Kind' },
  { id: 'status', label: 'Status' },
  { id: 'employee', label: 'Employee' },
];

export function filterHrDashboardRequests(rows, searchQuery) {
  const q = String(searchQuery || '').trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((r) => {
    const hay = [r.kind, r.status, r.staffDisplayName, r.userId, r.id, r.title].join(' ').toLowerCase();
    return hay.includes(q);
  });
}

function cmpStr(a, b) {
  return String(a || '').localeCompare(String(b || ''), undefined, { sensitivity: 'base' });
}

export function sortHrDashboardRequests(rows, field, dir) {
  const mult = dir === 'desc' ? -1 : 1;
  const sorted = [...rows];
  sorted.sort((a, b) => {
    let c = 0;
    if (field === 'kind') c = cmpStr(a.kind, b.kind);
    else if (field === 'status') c = cmpStr(a.status, b.status);
    else if (field === 'employee') c = cmpStr(a.staffDisplayName || a.userId, b.staffDisplayName || b.userId);
    else c = cmpStr(a.updatedAtIso, b.updatedAtIso);
    return c * mult;
  });
  return sorted;
}
