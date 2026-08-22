import React from 'react';
import { ArrowRight, X } from 'lucide-react';

/**
 * Single priority on the morning board — only the #1 urgent item.
 */
export function ManagerPriorityBanner({ item, onDismiss, onAction }) {
  if (!item) return null;

  return (
    <div
      className="mb-5 flex overflow-hidden rounded-xl border border-[var(--z-border-subtle)] bg-white shadow-[var(--shadow-zarewa-card)]"
      role="status"
    >
      <div className="w-1.5 shrink-0 bg-rose-800" aria-hidden />
      <div className="flex min-w-0 flex-1 flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="z-label-caps">Priority</p>
          <p className="mt-1 text-sm font-semibold text-[var(--z-text)]">{item.title}</p>
          {item.detail ? <p className="mt-1 text-xs leading-relaxed text-[var(--z-text-muted)]">{item.detail}</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {item.actionLabel ? (
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-sm bg-zarewa-teal px-3 py-2 text-ui-xs font-medium text-white hover:brightness-105"
              onClick={() => onAction?.(item)}
            >
              {item.actionLabel}
              <ArrowRight size={14} aria-hidden />
            </button>
          ) : null}
          {typeof onDismiss === 'function' ? (
            <button
              type="button"
              className="rounded-sm p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              aria-label="Dismiss priority banner"
              onClick={onDismiss}
            >
              <X size={16} />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/**
 * Rank competing banners into one priority item.
 * @returns {null | { key: string; title: string; detail: string; actionLabel: string; severity: number; action: string }}
 */
export function pickManagerPriorityItem({ // eslint-disable-line react-refresh/only-export-components
  pendingOrderSignOffCount = 0,
  stockRegisterCount = 0,
  governanceCount = 0,
  expenseCoach = null,
  overdueRefundHint = null,
} = {}) {
  const candidates = [];
  if (governanceCount > 0) {
    candidates.push({
      key: 'governance',
      severity: 100,
      title: 'Governance risk needs review',
      detail: `${governanceCount} dual-control or payment-gate item${governanceCount === 1 ? '' : 's'} in your queue.`,
      actionLabel: 'Review governance',
      action: 'governance',
    });
  }
  if (overdueRefundHint) {
    candidates.push({
      key: 'refund_sla',
      severity: 95,
      title: 'Refund SLA breach',
      detail: overdueRefundHint,
      actionLabel: 'Review refunds',
      action: 'refunds',
    });
  }
  if (pendingOrderSignOffCount > 0) {
    candidates.push({
      key: 'orders',
      severity: 80,
      title: 'Order sign-off required',
      detail: `${pendingOrderSignOffCount} paid quotation${pendingOrderSignOffCount === 1 ? '' : 's'} need branch manager review.`,
      actionLabel: 'Review orders',
      action: 'orders',
    });
  }
  if (stockRegisterCount > 0) {
    candidates.push({
      key: 'stock',
      severity: 70,
      title: 'Month-end stock register',
      detail: `${stockRegisterCount} period${stockRegisterCount === 1 ? '' : 's'} awaiting manager count alignment.`,
      actionLabel: 'Review stock register',
      action: 'stock',
    });
  }
  if (expenseCoach?.shouldCoach) {
    candidates.push({
      key: 'expense_coach',
      severity: 40,
      title: 'Others category — branch coaching',
      detail:
        expenseCoach.message ||
        `${expenseCoach.othersPct ?? '—'}% of recent expenses coded Others. Prefer standard categories.`,
      actionLabel: 'Review expenses',
      action: 'expenses',
    });
  }
  candidates.sort((a, b) => b.severity - a.severity);
  return candidates[0] || null;
}
