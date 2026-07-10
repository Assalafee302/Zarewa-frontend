/**
 * Branch Health Score (0–100) — client-side indicator from existing queue signals.
 * Weights are a working proposal (not official SOP policy).
 */

const WEIGHTS = {
  approvalSla: 0.25,
  openActions: 0.2,
  stock: 0.2,
  attendance: 0.15,
  targets: 0.2,
};

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

/**
 * @param {{
 *   totalOpenActions?: number;
 *   overdueCount?: number;
 *   stockRegisterCount?: number;
 *   lowStockCount?: number;
 *   attendancePendingCount?: number;
 *   salesProgressPct?: number;
 *   metresProgressPct?: number;
 *   checklistCompletionPct?: number;
 * }} input
 */
export function computeBranchHealthScore(input = {}) {
  const open = Number(input.totalOpenActions) || 0;
  const overdue = Number(input.overdueCount) || 0;
  const stockReg = Number(input.stockRegisterCount) || 0;
  const lowStock = Number(input.lowStockCount) || 0;
  const attendancePending = Number(input.attendancePendingCount) || 0;
  const salesPct = clamp(Number(input.salesProgressPct) || 0, 0, 150);
  const metresPct = clamp(Number(input.metresProgressPct) || 0, 0, 150);
  const checklistPct = clamp(Number(input.checklistCompletionPct) || 0, 0, 100);

  const approvalSlaScore =
    open <= 0 ? 100 : clamp(100 - overdue * 18 - Math.max(0, open - overdue) * 4, 0, 100);

  const openActionsScore = open <= 0 ? 100 : clamp(100 - open * 6, 0, 100);

  const stockScore =
    stockReg <= 0 && lowStock <= 0
      ? 100
      : clamp(100 - stockReg * 25 - Math.min(lowStock, 12) * 4, 0, 100);

  const attendanceScore =
    attendancePending <= 0 ? 100 : clamp(100 - attendancePending * 8, 0, 100);

  const targetAvg = (Math.min(salesPct, 100) + Math.min(metresPct, 100)) / 2;
  const targetsScore = clamp(targetAvg * 0.85 + checklistPct * 0.15, 0, 100);

  const components = [
    { key: 'approvalSla', label: 'Approval SLA', weight: WEIGHTS.approvalSla, score: approvalSlaScore },
    { key: 'openActions', label: 'Open actions', weight: WEIGHTS.openActions, score: openActionsScore },
    { key: 'stock', label: 'Stock posture', weight: WEIGHTS.stock, score: stockScore },
    { key: 'attendance', label: 'Attendance roll', weight: WEIGHTS.attendance, score: attendanceScore },
    { key: 'targets', label: 'Targets & discipline', weight: WEIGHTS.targets, score: targetsScore },
  ];

  const score = Math.round(components.reduce((sum, c) => sum + c.score * c.weight, 0));

  let status = 'Strong';
  let tone = 'emerald';
  if (score < 55) {
    status = 'At risk';
    tone = 'rose';
  } else if (score < 75) {
    status = 'Watch';
    tone = 'amber';
  }

  const drivers = components
    .filter((c) => c.score < 80)
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)
    .map((c) => c.label);

  return { score, status, tone, components, drivers };
}
