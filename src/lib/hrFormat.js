/** HR display helpers. */

export function formatNgn(amount) {
  const n = Math.round(Number(amount) || 0);
  if (n === 0 && amount != null && amount !== 0) return '—';
  return `₦${n.toLocaleString('en-NG')}`;
}

export function yearsOfServiceFromIso(dateJoinedIso) {
  const d = String(dateJoinedIso || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  const start = new Date(`${d}T12:00:00Z`);
  const now = new Date();
  const yrs = (now.getTime() - start.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  if (!Number.isFinite(yrs) || yrs < 0) return null;
  return Math.floor(yrs * 10) / 10;
}

const REQUEST_STATUS_STYLES = {
  draft: 'bg-slate-100 text-slate-700 border-slate-200',
  hr_review: 'bg-amber-50 text-amber-900 border-amber-200',
  branch_manager_review: 'bg-amber-50 text-amber-900 border-amber-200',
  gm_hr_review: 'bg-blue-50 text-blue-900 border-blue-200',
  approved: 'bg-emerald-50 text-emerald-900 border-emerald-200',
  rejected: 'bg-red-50 text-red-900 border-red-200',
};

export function hrRequestStatusClass(status) {
  return REQUEST_STATUS_STYLES[String(status || '').toLowerCase()] || REQUEST_STATUS_STYLES.draft;
}

export const HR_REQUEST_KIND_LABELS = {
  leave: 'Leave',
  loan: 'Loan',
  attendance_exception: 'Attendance exception',
  retirement: 'Retirement',
  appeal: 'Appeal',
  profile_change: 'Profile change',
  bonus: 'Bonus',
  training: 'Training',
  promotion: 'Promotion',
  welfare: 'Welfare',
  other: 'Other',
};

export const HR_REQUEST_STATUS_LABELS = {
  draft: 'Draft',
  hr_review: 'HR review',
  branch_manager_review: 'Branch endorsement',
  gm_hr_review: 'GM HR final',
  approved: 'Approved',
  rejected: 'Rejected',
};

export function hrRequestKindLabel(kind) {
  return HR_REQUEST_KIND_LABELS[String(kind || '').toLowerCase()] || kind || 'Request';
}

export function hrRequestStatusLabel(status) {
  return HR_REQUEST_STATUS_LABELS[String(status || '').toLowerCase()] || status || '—';
}

export function payrollGroupLabel(staff) {
  const g = staff?.payrollGroup || staff?.profileExtra?.payrollGroup || staff?.normalized?.orgNode;
  if (!g) return 'Branch staff';
  const map = {
    branch_ops: 'Branch staff',
    mining_div: 'Mining division',
    scholarship: 'Scholarship / school',
    chairman_staffs: 'Domestic staff',
  };
  return map[g] || String(g).replace(/_/g, ' ');
}
