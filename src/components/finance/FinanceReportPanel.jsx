import React from 'react';
import { FileSpreadsheet, RefreshCw } from 'lucide-react';
import { FinanceStatusChip } from './FinanceStatusChip';
import { FinanceActionButton } from './FinanceActionButton';
import { FinanceEmptyState } from './FinanceEmptyState';

/**
 * @param {{
 *   title: string;
 *   description?: string;
 *   loading?: boolean;
 *   onLoad?: () => void;
 *   onExport?: () => void;
 *   exportDisabled?: boolean;
 *   filters?: React.ReactNode;
 *   children?: React.ReactNode;
 *   emptyTitle?: string;
 *   emptyDescription?: string;
 * }} props
 */
export function FinanceReportPanel({
  title,
  description,
  loading,
  onLoad,
  onExport,
  exportDisabled,
  filters,
  children,
  emptyTitle,
  emptyDescription,
}) {
  const showEmpty = !loading && !children;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-black text-slate-900">{title}</h3>
            <FinanceStatusChip label="Management draft" tone="neutral" />
            <FinanceStatusChip label="Not statutory" tone="neutral" />
          </div>
          {description ? <p className="mt-1 text-xs font-medium text-slate-600 max-w-2xl">{description}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {onLoad ? (
            <FinanceActionButton variant="primary" onClick={onLoad} disabled={loading}>
              <RefreshCw size={14} className={`mr-1 inline ${loading ? 'animate-spin' : ''}`} />
              Load report
            </FinanceActionButton>
          ) : null}
          {onExport ? (
            <FinanceActionButton variant="secondary" onClick={onExport} disabled={exportDisabled || loading}>
              <FileSpreadsheet size={14} className="mr-1 inline" />
              Export
            </FinanceActionButton>
          ) : null}
        </div>
      </div>
      {filters ? <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">{filters}</div> : null}
      {loading ? <p className="text-sm text-slate-500">Loading report…</p> : null}
      {!loading && children}
      {showEmpty && emptyTitle ? (
        <FinanceEmptyState title={emptyTitle} description={emptyDescription} />
      ) : null}
    </section>
  );
}
