import React from 'react';
import { cn } from '../../lib/utils';
import { SALES_STATUS_CHIP } from '../../lib/salesStatusUi';

const TONE_CLASS = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  warn: 'border-amber-200 bg-amber-50 text-amber-800',
  danger: 'border-rose-200 bg-rose-50 text-rose-800',
  info: 'border-sky-200 bg-sky-50 text-sky-900',
  muted: 'border-slate-300 bg-slate-100 text-slate-700',
  teal: 'border-teal-200 bg-teal-50 text-teal-900',
  neutral: 'border-slate-200 bg-slate-50 text-slate-600',
};

/**
 * Unified status chip — pass `tone` preset or `className` for custom colors.
 */
export function StatusBadge({ label, tone = 'neutral', className = '', title }) {
  return (
    <span
      className={cn(SALES_STATUS_CHIP, TONE_CLASS[tone] || TONE_CLASS.neutral, className)}
      title={title}
    >
      {label}
    </span>
  );
}

/** Sales-specific chip with dynamic class from salesStatusUi helpers. */
export function SalesStatusChip({ label, chipClass, className = '', title }) {
  return (
    <span className={cn(SALES_STATUS_CHIP, chipClass, className)} title={title}>
      {label}
    </span>
  );
}
