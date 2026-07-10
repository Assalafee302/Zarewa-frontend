/** Branch manager daily opening/closing checklist — local, branch-scoped. */

export const MANAGER_CHECKLIST_ITEMS = [
  { id: 'open_cash', phase: 'opening', label: 'Cash float confirmed' },
  { id: 'open_security', phase: 'opening', label: 'Overnight security handover reviewed' },
  { id: 'open_attendance', phase: 'opening', label: 'Attendance roll started' },
  { id: 'open_machines', phase: 'opening', label: 'Machines pre-shift checked' },
  { id: 'close_cash', phase: 'closing', label: 'Cash count reconciled' },
  { id: 'close_stock', phase: 'closing', label: 'Stock movements posted' },
  { id: 'close_production', phase: 'closing', label: 'Next-day production plan confirmed' },
  { id: 'close_incidents', phase: 'closing', label: 'Incident log cleared' },
];

function storageKey(branchId, dayIso) {
  return `zarewa.bm.checklist.${branchId || 'none'}.${dayIso || 'none'}`;
}

export function ymdLocal(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * @returns {Record<string, { done: boolean; at?: string; by?: string }>}
 */
export function loadManagerChecklist(branchId, dayIso = ymdLocal()) {
  try {
    const raw = localStorage.getItem(storageKey(branchId, dayIso));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveManagerChecklist(branchId, dayIso, state) {
  try {
    localStorage.setItem(storageKey(branchId, dayIso), JSON.stringify(state || {}));
  } catch {
    /* ignore quota */
  }
}

export function checklistCompletionPct(state) {
  const total = MANAGER_CHECKLIST_ITEMS.length;
  if (!total) return 0;
  const done = MANAGER_CHECKLIST_ITEMS.filter((item) => state?.[item.id]?.done).length;
  return Math.round((done / total) * 100);
}
