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
      return 'bg-zarewa-teal text-white';
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

function flattenChartNodes(chart) {
  const all = [];
  const walk = (node) => {
    all.push(node);
    for (const child of node.children || []) walk(child);
  };
  for (const root of chart?.roots || []) walk(root);
  for (const orphan of chart?.orphans || []) all.push(orphan);
  return all;
}

/** Mirror shared summarizeHrOrgChart for client-side filtered charts. */
export function summarizeHrOrgChart(chart) {
  const nodes = flattenChartNodes(chart);
  const byDepartment = new Map();
  const byBranch = new Map();
  const byOrgNode = new Map();
  const byRoleFamily = new Map();
  let leadership = 0;
  let maxDepth = 0;

  const depthWalk = (node, depth) => {
    maxDepth = Math.max(maxDepth, depth);
    for (const child of node.children || []) depthWalk(child, depth + 1);
  };
  for (const root of chart?.roots || []) depthWalk(root, 0);

  for (const node of nodes) {
    const dept = String(node.department || '').trim() || 'Unassigned';
    const branch = String(node.branchId || '').trim() || 'Unassigned';
    const unit = String(node.orgNode || node.payrollGroup || '').trim() || 'branch_ops';
    const family = String(node.roleFamily || '').trim() || 'general';

    byDepartment.set(dept, (byDepartment.get(dept) || 0) + 1);
    byBranch.set(branch, (byBranch.get(branch) || 0) + 1);
    byOrgNode.set(unit, (byOrgNode.get(unit) || 0) + 1);
    byRoleFamily.set(family, (byRoleFamily.get(family) || 0) + 1);
    if (node.seniority === 'leadership') leadership += 1;
  }

  const toSorted = (map) =>
    Array.from(map.entries())
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));

  return {
    total: chart?.total || nodes.length,
    roots: chart?.roots?.length || 0,
    orphans: chart?.orphans?.length || 0,
    leadership,
    maxDepth,
    departments: toSorted(byDepartment),
    branches: toSorted(byBranch),
    orgUnits: toSorted(byOrgNode),
    roleFamilies: toSorted(byRoleFamily),
  };
}

/** @param {{ roots?: object[]; orphans?: object[] }} chart */
export function exportFilteredChartCsv(chart, branches = []) {
  const lines = [];
  const walk = (node, depth, managerName) => {
    lines.push({
      displayName: node.displayName,
      userId: node.userId,
      jobTitle: node.jobTitle || '',
      department: node.department || '',
      branchId: branchLabel(node.branchId, branches),
      orgNode: node.orgNode || node.payrollGroup || '',
      roleFamily: node.roleFamily || '',
      seniority: node.seniority || '',
      directReportCount: node.directReportCount ?? (node.children?.length || 0),
      lineManager: managerName || '',
      depth,
    });
    for (const child of node.children || []) walk(child, depth + 1, node.displayName);
  };
  for (const root of chart?.roots || []) walk(root, 0, '');
  for (const orphan of chart?.orphans || []) {
    lines.push({
      displayName: orphan.displayName,
      userId: orphan.userId,
      jobTitle: orphan.jobTitle || '',
      department: orphan.department || '',
      branchId: branchLabel(orphan.branchId, branches),
      orgNode: orphan.orgNode || orphan.payrollGroup || '',
      roleFamily: orphan.roleFamily || '',
      seniority: orphan.seniority || '',
      directReportCount: orphan.directReportCount ?? 0,
      lineManager: '',
      depth: 0,
    });
  }
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const header = [
    'Name',
    'UserId',
    'JobTitle',
    'Department',
    'Branch',
    'OrgNode',
    'RoleFamily',
    'Seniority',
    'DirectReportCount',
    'LineManager',
    'Depth',
  ];
  const rows = lines.map((l) =>
    [
      l.displayName,
      l.userId,
      l.jobTitle,
      l.department,
      l.branchId,
      l.orgNode,
      l.roleFamily,
      l.seniority,
      l.directReportCount,
      l.lineManager,
      l.depth,
    ]
      .map(esc)
      .join(',')
  );
  const csv = [header.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `org-chart-filtered-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Find path of userIds from roots/orphans to target user. */
export function findOrgChartFocusPath(chart, focusUserId) {
  const target = String(focusUserId || '').trim();
  if (!target) return [];

  const findInNodes = (nodes, path) => {
    for (const n of nodes) {
      const nextPath = [...path, n.userId];
      if (n.userId === target) return nextPath;
      const found = findInNodes(n.children || [], nextPath);
      if (found) return found;
    }
    return null;
  };

  const inTree = findInNodes(chart?.roots || [], []);
  if (inTree) return inTree;
  if ((chart?.orphans || []).some((o) => o.userId === target)) return [target];
  return [];
}
