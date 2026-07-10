import React from 'react';
import { AlertTriangle, ArrowRight, X } from 'lucide-react';

/**
 * Single priority banner — only the #1 urgent item.
 */
export function ManagerPriorityBanner({ item, onDismiss, onAction }) {
  if (!item) return null;

  return (
    <div
      className="mb-5 flex flex-col gap-3 rounded-zarewa border border-rose-200 bg-rose-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
      role="status"
    >
      <div className="min-w-0 flex items-start gap-2.5">
        <AlertTriangle size={16} className="mt-0.5 shrink-0 text-rose-600" aria-hidden />
        <div className="min-w-0">
          <p className="text-ui-xs font-black uppercase tracking-wide text-rose-900">{item.title}</p>
          {item.detail ? <p className="mt-1 text-xs text-rose-900/80 leading-relaxed">{item.detail}</p> : null}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {item.actionLabel ? (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-xl bg-zarewa-teal px-3 py-2 text-ui-xs font-black uppercase tracking-wide text-white hover:brightness-105"
            onClick={() => onAction?.(item)}
          >
            {item.actionLabel}
            <ArrowRight size={14} aria-hidden />
          </button>
        ) : null}
        {typeof onDismiss === 'function' ? (
          <button
            type="button"
            className="rounded-lg p-2 text-rose-700/70 hover:bg-rose-100 hover:text-rose-900"
            aria-label="Dismiss priority banner"
            onClick={onDismiss}
          >
            <X size={16} />
          </button>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Rank competing banners into one priority item.
 * @returns {null | { key: string; title: string; detail: string; actionLabel: string; severity: number; action: string }}
 */
export function pickManagerPriorityItem({
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
      actionLabel: 'Review cash out',
      action: 'cash',
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
      actionLabel: 'Review cash out',
      action: 'cash',
    });
  }
  candidates.sort((a, b) => b.severity - a.severity);
  return candidates[0] || null;
}
