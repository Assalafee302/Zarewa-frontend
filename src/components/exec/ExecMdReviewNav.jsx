import React from 'react';
import { BarChart3, FileText, Wallet } from 'lucide-react';
import { PageTabs } from '../layout/PageTabs';

/**
 * Secondary navigation inside MD Review — chairman pack vs deep-dive BI/finance.
 */
export function ExecMdReviewNav({ value = 'pack', onChange, mayViewBi = false }) {
  const tabs = [
    { id: 'pack', label: 'Chairman pack', icon: <FileText size={14} strokeWidth={2} /> },
    ...(mayViewBi
      ? [{ id: 'intelligence', label: 'Intelligence', icon: <BarChart3 size={14} strokeWidth={2} /> }]
      : []),
    { id: 'finance', label: 'Finance', icon: <Wallet size={14} strokeWidth={2} /> },
  ];

  return (
    <div className="rounded-xl border border-slate-200/90 bg-slate-50/80 px-3 py-3 sm:px-4">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-2">
        Monthly review
      </p>
      <PageTabs tabs={tabs} value={value} onChange={onChange} ariaLabel="Review sections" />
    </div>
  );
}
