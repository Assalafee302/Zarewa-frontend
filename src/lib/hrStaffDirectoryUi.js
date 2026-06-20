/** Client-side helpers for HR staff directory filters, KPIs, and display. */

export const QUICK_FILTERS = [
  { id: '', label: 'All staff' },
  { id: 'incomplete', label: 'Incomplete profile' },
  { id: 'probation', label: 'On probation' },
  { id: 'probation-ending', label: 'Probation ending' },
  { id: 'contract', label: 'Contract expiring' },
  { id: 'no-manager', label: 'No line manager' },
];

export const SORT_OPTIONS = [
  { id: 'name', label: 'Name' },
  { id: 'branch', label: 'Branch' },
  { id: 'department', label: 'Department' },
  { id: 'joined', label: 'Date joined' },
  { id: 'profile', label: 'Profile %' },
];

export function branchNameMap(branches = []) {
  const map = new Map();
  for (const b of branches) {
    if (b?.id) map.set(String(b.id), b.name || b.id);
  }
  return map;
}

export function resolveBranchLabel(staff, branchNames) {
  const id = String(staff?.branchId || staff?.normalized?.branchId || '').trim();
  if (!id) return '—';
  return branchNames.get(id) || id;
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function addDaysIso(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function isOnProbation(staff, today = todayIso()) {
  const end = String(staff?.probationEndIso || '').slice(0, 10);
  if (!end) return false;
  const joined = String(staff?.dateJoinedIso || '').slice(0, 10);
  if (joined && end <= joined) return false;
  return end >= today;
}

export function isProbationEndingSoon(staff, withinDays = 30, today = todayIso()) {
  const end = String(staff?.probationEndIso || '').slice(0, 10);
  if (!end || end < today) return false;
  return end <= addDaysIso(withinDays);
}

export function isContractExpiringSoon(staff, withinDays = 60, today = todayIso()) {
  const et = String(staff?.employmentType || staff?.normalized?.taxonomy?.employmentType || '').toLowerCase();
  if (!et.includes('contract') && !et.includes('temp')) return false;
  const end = String(staff?.contractEndIso || '').slice(0, 10);
  if (!end || end < today) return false;
  return end <= addDaysIso(withinDays);
}

export function profilePct(staff) {
  return staff?.profileCompleteness?.overallPct ?? (staff?.criticalMissing?.length ? 0 : 100);
}

export function isIncompleteProfile(staff) {
  if ((staff?.criticalMissing || []).length > 0) return true;
  return profilePct(staff) < 60;
}

export function contractBadge(staff) {
  if (!staff) return null;
  const et = String(staff.employmentType || staff.normalized?.taxonomy?.employmentType || '').toLowerCase();
  if (!et.includes('contract') && !et.includes('temp')) return null;
  const end = staff.contractEndIso;
  const today = todayIso();
  if (!end) return { label: 'No contract end', cls: 'border-amber-200 bg-amber-50 text-amber-900' };
  if (end < today) return { label: 'Past contract end', cls: 'border-red-200 bg-red-50 text-red-900' };
  if (end <= addDaysIso(30)) {
    return { label: 'Contract ending soon', cls: 'border-orange-200 bg-orange-50 text-orange-900' };
  }
  if (staff.dateJoinedIso) {
    const months = (Date.parse(end) - Date.parse(staff.dateJoinedIso)) / (30.44 * 86400000);
    if (months > 6) return { label: 'Over 6 months', cls: 'border-violet-200 bg-violet-50 text-violet-900' };
  }
  return null;
}

export function probationBadge(staff) {
  if (isProbationEndingSoon(staff)) {
    return { label: 'Probation ending', cls: 'border-amber-200 bg-amber-50 text-amber-900' };
  }
  if (isOnProbation(staff)) {
    return { label: 'On probation', cls: 'border-sky-200 bg-sky-50 text-sky-900' };
  }
  return null;
}

export function profilePctBadge(pct) {
  if (pct >= 90) return { label: `${pct}%`, cls: 'border-emerald-200 bg-emerald-50 text-emerald-800' };
  if (pct >= 60) return { label: `${pct}%`, cls: 'border-amber-200 bg-amber-50 text-amber-900' };
  return { label: `${pct}%`, cls: 'border-red-200 bg-red-50 text-red-900' };
}

export function matchesQuickFilter(staff, quickFilter) {
  if (!quickFilter) return true;
  if (quickFilter === 'incomplete') return isIncompleteProfile(staff);
  if (quickFilter === 'probation') return isOnProbation(staff);
  if (quickFilter === 'probation-ending') return isProbationEndingSoon(staff);
  if (quickFilter === 'contract') return isContractExpiringSoon(staff);
  if (quickFilter === 'no-manager') return !String(staff?.lineManagerUserId || '').trim();
  return true;
}

/**
 * @param {object[]} staff
 * @param {{ search?: string; branchId?: string; department?: string; employmentType?: string; status?: string; quickFilter?: string }} filters
 */
export function filterStaffList(staff, filters = {}) {
  const q = String(filters.search || '').trim().toLowerCase();
  return staff.filter((s) => {
    if (!s) return false;
    if (filters.status === 'active' && String(s.status) !== 'active') return false;
    if (filters.status === 'inactive' && String(s.status) === 'active') return false;
    if (filters.branchId && String(s.branchId || s.normalized?.branchId) !== filters.branchId) return false;
    if (filters.department && String(s.department || '') !== filters.department) return false;
    if (filters.employmentType) {
      const et = String(s.employmentType || s.normalized?.taxonomy?.employmentType || '');
      if (et !== filters.employmentType) return false;
    }
    if (!matchesQuickFilter(s, filters.quickFilter)) return false;
    if (!q) return true;
    const hay = [
      s.displayName,
      s.username,
      s.employeeNo,
      s.jobTitle,
      s.department,
      s.branchId,
      s.lineManagerDisplayName,
    ]
      .join(' ')
      .toLowerCase();
    return hay.includes(q);
  });
}

export function computeDirectoryKpis(staff = []) {
  const active = staff.filter((s) => String(s.status) === 'active').length;
  const incomplete = staff.filter((s) => isIncompleteProfile(s)).length;
  const onProbation = staff.filter((s) => isOnProbation(s)).length;
  const probationEnding = staff.filter((s) => isProbationEndingSoon(s)).length;
  const contractsExpiring = staff.filter((s) => isContractExpiringSoon(s)).length;
  const noManager = staff.filter((s) => !String(s?.lineManagerUserId || '').trim()).length;
  return { total: staff.length, active, incomplete, onProbation, probationEnding, contractsExpiring, noManager };
}

export function sortStaffList(list, sortKey = 'name', branchNames = new Map()) {
  const dir = 1;
  const copy = [...list];
  copy.sort((a, b) => {
    if (sortKey === 'branch') {
      const av = resolveBranchLabel(a, branchNames);
      const bv = resolveBranchLabel(b, branchNames);
      return dir * String(av).localeCompare(String(bv));
    }
    if (sortKey === 'department') {
      return dir * String(a.department || '').localeCompare(String(b.department || ''));
    }
    if (sortKey === 'joined') {
      return dir * String(b.dateJoinedIso || '').localeCompare(String(a.dateJoinedIso || ''));
    }
    if (sortKey === 'profile') {
      return dir * (profilePct(b) - profilePct(a));
    }
    return dir * String(a.displayName || a.username || '').localeCompare(String(b.displayName || b.username || ''));
  });
  return copy;
}

/** Recent hires with incomplete profiles — onboarding queue heuristic. */
export function onboardingQueueFromStaff(staff = [], withinDays = 90) {
  const cutoff = addDaysIso(-withinDays);
  return staff
    .filter((s) => {
      const joined = String(s.dateJoinedIso || '').slice(0, 10);
      if (!joined || joined < cutoff) return false;
      return isIncompleteProfile(s) || !s.complianceBadges?.handbookAcknowledged;
    })
    .sort((a, b) => String(b.dateJoinedIso || '').localeCompare(String(a.dateJoinedIso || '')));
}
