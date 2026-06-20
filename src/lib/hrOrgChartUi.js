import { HR_PAYROLL_GROUPS } from './hrStaffConstants';
import { payrollGroupLabel } from './hrFormat';

export const ORG_CHART_VIEWS = [
  { id: 'hierarchy', label: 'Reporting lines', hint: 'Full company tree from line managers' },
  { id: 'department', label: 'By department', hint: 'Functional departments and their teams' },
  { id: 'branch', label: 'By branch', hint: 'Branch locations and local reporting' },
  { id: 'unit', label: 'Company units', hint: 'HQ, mining, household, and branch cohorts' },
];

/** Relationship types available in organogram link editor. */
export const ORG_RELATIONSHIP_TYPES = [
  { id: 'reports_to', label: 'Reports to (line manager)', hint: 'Moves this person under the manager in the organogram.' },
  { id: 'remove', label: 'Remove line manager', hint: 'Clears the reporting line; person becomes top-level or unlinked.' },
];

export const ROLE_FAMILY_LABELS = {
  finance: 'Finance & Accounts',
  hr: 'Human Resources',
  commercial: 'Sales & Commercial',
  procurement: 'Procurement',
  operations: 'Operations & Production',
  technology: 'Technology',
  security: 'Security',
  logistics: 'Logistics',
  administration: 'Administration',
  general: 'General',
};

const PAYROLL_LABELS = Object.fromEntries(HR_PAYROLL_GROUPS.map((g) => [g.value, g.label]));

export function orgUnitLabel(key) {
  const k = String(key || '').trim();
  if (!k) return 'Branch staff';
  return PAYROLL_LABELS[k] || payrollGroupLabel({ payrollGroup: k });
}

export function roleFamilyLabel(key) {
  const k = String(key || '').trim() || 'general';
  return ROLE_FAMILY_LABELS[k] || k.replace(/_/g, ' ');
}

export function branchLabel(branchId, branches = []) {
  const id = String(branchId || '').trim();
  if (!id || id === 'Unassigned') return 'Unassigned';
  const hit = branches.find((b) => b.id === id);
  return hit?.name || id;
}

export function sectionTitle(view, key, branches = []) {
  if (view === 'branch') return branchLabel(key, branches);
  if (view === 'unit') return orgUnitLabel(key);
  return key;
}

export function seniorityBadgeClass(seniority) {
  switch (seniority) {
    case 'leadership':
      return 'bg-[#134e4a] text-white';
    case 'senior':
      return 'bg-teal-100 text-teal-900';
    case 'mid':
      return 'bg-slate-100 text-slate-700';
    case 'entry':
      return 'bg-amber-50 text-amber-800';
    default:
      return 'bg-slate-50 text-slate-500';
  }
}

export function seniorityLabel(seniority) {
  const map = {
    leadership: 'Leadership',
    senior: 'Senior',
    mid: 'Mid-level',
    entry: 'Entry',
  };
  return map[seniority] || null;
}

/**
 * Group flat chart into sections for department / branch / unit lenses.
 * Mirrors shared buildHrOrgChartGrouped for client-side filtered charts.
 */
export function buildGroupedSections(chart, groupBy = 'department') {
  const nodes = [];
  const walk = (node) => {
    nodes.push(node);
    for (const child of node.children || []) walk(child);
  };
  for (const root of chart?.roots || []) walk(root);
  for (const orphan of chart?.orphans || []) nodes.push(orphan);

  const buckets = new Map();
  const bucketKey = (node) => {
    if (groupBy === 'branch') return String(node.branchId || '').trim() || 'Unassigned';
    if (groupBy === 'unit') return String(node.orgNode || node.payrollGroup || '').trim() || 'branch_ops';
    return String(node.department || '').trim() || 'Unassigned';
  };

  for (const node of nodes) {
    const key = bucketKey(node);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(node);
  }

  const sections = [];
  for (const [key, members] of buckets.entries()) {
    const memberIds = new Set(members.map((m) => m.userId));
    const localRoots = members.filter((m) => {
      const mgr = m.lineManagerUserId;
      return !mgr || !memberIds.has(mgr);
    });
    localRoots.sort((a, b) => {
      const dr = (b.directReportCount || 0) - (a.directReportCount || 0);
      if (dr !== 0) return dr;
      return String(a.displayName).localeCompare(String(b.displayName), undefined, { sensitivity: 'base' });
    });
    sections.push({
      key,
      count: members.length,
      roots: localRoots.map((r) => ({
        ...r,
        children: (r.children || []).filter((c) => memberIds.has(c.userId)),
      })),
    });
  }

  sections.sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
  return sections;
}
