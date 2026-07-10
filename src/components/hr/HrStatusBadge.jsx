import React from 'react';
import { hrRequestStatusClass, hrRequestStatusLabel } from '../../lib/hrFormat';
import { statusMeta } from '../../lib/hrDisciplineCases';

const PAYROLL_STYLES = {
  draft: 'bg-amber-50 text-amber-900 border-amber-200',
  locked: 'bg-blue-50 text-blue-900 border-blue-200',
  paid: 'bg-emerald-50 text-emerald-900 border-emerald-200',
};

const STAFF_STYLES = {
  active: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  inactive: 'bg-slate-100 text-slate-600 border-slate-200',
};

const BENEFIT_STYLES = {
  draft: 'bg-slate-50 text-slate-700 border-slate-200',
  submitted: 'bg-amber-50 text-amber-800 border-amber-200',
  approved: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  paid: 'bg-teal-50 text-teal-800 border-teal-200',
  rejected: 'bg-rose-50 text-rose-800 border-rose-200',
  exported: 'bg-sky-50 text-sky-800 border-sky-200',
  active: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  paused: 'bg-amber-50 text-amber-800 border-amber-200',
  ended: 'bg-slate-50 text-slate-600 border-slate-200',
  pending: 'bg-amber-50 text-amber-900 border-amber-200',
  scheduled: 'bg-sky-50 text-sky-800 border-sky-200',
  finance_review: 'bg-violet-50 text-violet-900 border-violet-200',
  md_review: 'bg-purple-50 text-purple-900 border-purple-200',
};

const LETTER_STYLES = {
  draft: 'bg-slate-100 text-slate-700 border-slate-200',
  submitted: 'bg-sky-50 text-sky-800 border-sky-200',
  hr_review: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  gm_review: 'bg-violet-50 text-violet-900 border-violet-200',
  md_review: 'bg-purple-50 text-purple-900 border-purple-200',
  approved: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  issued: 'bg-teal-50 text-zarewa-teal border-teal-200',
  rejected: 'bg-red-50 text-red-800 border-red-200',
  cancelled: 'bg-slate-100 text-slate-500 border-slate-200',
};

const TRANSFER_STYLES = {
  submitted: 'bg-sky-50 text-sky-800 border-sky-200',
  branch_review: 'bg-amber-50 text-amber-900 border-amber-200',
  hr_review: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  gm_approval: 'bg-violet-50 text-violet-900 border-violet-200',
  approved: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  completed: 'bg-teal-50 text-teal-900 border-teal-200',
  rejected: 'bg-red-50 text-red-800 border-red-200',
};

const WORKFLOW_STYLES = {
  applied: 'bg-slate-100 text-slate-700 border-slate-200',
  screening: 'bg-sky-50 text-sky-800 border-sky-100',
  interview: 'bg-amber-50 text-amber-900 border-amber-100',
  offer: 'bg-violet-50 text-violet-800 border-violet-100',
  hired: 'bg-emerald-50 text-emerald-800 border-emerald-100',
  open: 'bg-emerald-50 text-emerald-800 border-emerald-100',
  draft: 'bg-slate-50 text-slate-600 border-slate-200',
  closed: 'bg-slate-100 text-slate-500 border-slate-200',
  eligible: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  ineligible: 'bg-slate-100 text-slate-600 border-slate-200',
  due: 'bg-amber-50 text-amber-900 border-amber-200',
};

const ALERT_STYLES = {
  new_staff: 'bg-sky-50 text-sky-900 border-sky-200',
  missing_staff: 'bg-red-50 text-red-900 border-red-200',
  increase: 'bg-amber-50 text-amber-900 border-amber-200',
  decrease: 'bg-orange-50 text-orange-900 border-orange-200',
};

const ALERT_LABELS = {
  new_staff: 'New staff',
  missing_staff: 'Missing from run',
  increase: 'Gross increase',
  decrease: 'Gross decrease',
};

const DISCIPLINE_TONE = {
  emerald: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  amber: 'bg-amber-100 text-amber-900 border-amber-200',
  teal: 'bg-teal-100 text-teal-900 border-teal-200',
  red: 'bg-red-100 text-red-800 border-red-200',
  slate: 'bg-slate-100 text-slate-700 border-slate-200',
};

function styleFor(variant, key) {
  if (variant === 'request') return hrRequestStatusClass(key);
  if (variant === 'payroll') return PAYROLL_STYLES[key] || PAYROLL_STYLES.draft;
  if (variant === 'staff') return STAFF_STYLES[key] || 'bg-slate-50 text-slate-700 border-slate-200';
  if (variant === 'benefit') return BENEFIT_STYLES[key] || BENEFIT_STYLES.draft;
  if (variant === 'letter') return LETTER_STYLES[key] || LETTER_STYLES.draft;
  if (variant === 'transfer') return TRANSFER_STYLES[key] || 'bg-slate-50 text-slate-700 border-slate-200';
  if (variant === 'workflow') return WORKFLOW_STYLES[key] || WORKFLOW_STYLES.applied;
  if (variant === 'alert') return ALERT_STYLES[key] || 'bg-slate-50 text-slate-700 border-slate-200';
  if (variant === 'discipline') {
    const m = statusMeta(key);
    return DISCIPLINE_TONE[m.tone] || DISCIPLINE_TONE.slate;
  }
  return BENEFIT_STYLES[key] || 'bg-slate-50 text-slate-700 border-slate-200';
}

function labelFor(variant, key, override) {
  if (override) return override;
  if (variant === 'request') return hrRequestStatusLabel(key);
  if (variant === 'alert') return ALERT_LABELS[key] || key.replace(/_/g, ' ');
  if (variant === 'discipline') return statusMeta(key).label || key.replace(/_/g, ' ');
  return key.replace(/_/g, ' ');
}

/**
 * @param {{ status?: string; variant?: 'request'|'payroll'|'staff'|'benefit'|'letter'|'transfer'|'workflow'|'discipline'|'alert'|'generic'; label?: string; className?: string }} props
 */
export function HrStatusBadge({ status, variant = 'generic', label, className = '' }) {
  const key = String(status || 'draft').toLowerCase();
  const cls = styleFor(variant, key);
  const text = labelFor(variant, key, label);
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize whitespace-nowrap ${cls} ${className}`}
    >
      {text}
    </span>
  );
}
