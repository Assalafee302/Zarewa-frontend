import React from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * Compact mobile-only alert strip for Accounting Desk home context.
 * @param {{ count: number; label?: string; onAction?: () => void; actionLabel?: string }} props
 */
export function AccountingDeskMobileStrip({ count, label, onAction, actionLabel = 'View' }) {
  if (!count) return null;
  return (
    <div className="lg:hidden rounded-xl border border-amber-200 bg-amber-50/90 px-3 py-2.5 flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <AlertTriangle size={16} className="text-amber-700 shrink-0" />
        <p className="text-[11px] font-semibold text-amber-950">
          {label || `${count} item(s) need attention`}
        </p>
      </div>
      {onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="rounded-lg bg-[#134e4a] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-white min-h-9"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
