/** Checklist items with SOP deep-links for BM daily discipline. */

export const MANAGER_CHECKLIST_ITEMS = [
  {
    id: 'open_cash',
    phase: 'opening',
    label: 'Cash float confirmed',
    durable: true,
    sopPath: '/docs/sop/cashier',
    sopHint: 'SOP-02 Cashier Desk — opening float',
  },
  {
    id: 'open_security',
    phase: 'opening',
    label: 'Overnight security handover reviewed',
    durable: true,
    sopPath: '/docs/sop/maintenance',
    sopHint: 'SOP-09 Maintenance — overnight security',
  },
  {
    id: 'open_attendance',
    phase: 'opening',
    label: 'Attendance roll started',
    sopPath: '/docs/sop/hr',
    sopHint: 'SOP-07 HR — daily attendance',
  },
  {
    id: 'open_machines',
    phase: 'opening',
    label: 'Machines pre-shift checked',
    sopPath: '/docs/sop/production',
    sopHint: 'SOP-05 Production — pre-shift',
  },
  {
    id: 'close_cash',
    phase: 'closing',
    label: 'Cash count reconciled',
    durable: true,
    sopPath: '/docs/sop/cashier',
    sopHint: 'SOP-02 Cashier Desk — closing count',
  },
  {
    id: 'close_stock',
    phase: 'closing',
    label: 'Stock movements posted',
    sopPath: '/docs/sop/store',
    sopHint: 'SOP-04 Operations Store',
  },
  {
    id: 'close_production',
    phase: 'closing',
    label: 'Next-day production plan confirmed',
    sopPath: '/docs/sop/production',
    sopHint: 'SOP-05 Production — plan',
  },
  {
    id: 'close_incidents',
    phase: 'closing',
    label: 'Incident log cleared',
    durable: true,
    sopPath: '/docs/sop/maintenance',
    sopHint: 'SOP-09 — incidents',
  },
];

function storageKey(branchId, dayIso) {
  return `zarewa.bm.checklist.${branchId || 'none'}.${dayIso || 'none'}`;
}

function draftKey(branchId, dayIso) {
  return `zarewa.bm.handover.draft.${branchId || 'none'}.${dayIso || 'none'}`;
}

export function ymdLocal(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

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
    /* ignore */
  }
}

export function loadHandoverDraft(branchId, dayIso = ymdLocal()) {
  try {
    return String(sessionStorage.getItem(draftKey(branchId, dayIso)) || '');
  } catch {
    return '';
  }
}

export function saveHandoverDraft(branchId, dayIso, text) {
  try {
    sessionStorage.setItem(draftKey(branchId, dayIso), String(text || ''));
  } catch {
    /* ignore */
  }
}

export function checklistCompletionPct(state) {
  const total = MANAGER_CHECKLIST_ITEMS.length;
  if (!total) return 0;
  const done = MANAGER_CHECKLIST_ITEMS.filter((item) => state?.[item.id]?.done).length;
  return Math.round((done / total) * 100);
}
