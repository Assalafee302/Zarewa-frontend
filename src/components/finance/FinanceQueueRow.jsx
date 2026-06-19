import React from 'react';
import { FinanceActionButton } from './FinanceActionButton';

/**
 * Work queue row: summary + one primary action + optional secondary link.
 */
export function FinanceQueueRow({ title, subtitle, amount, primaryAction, secondaryLink }) {
  return (
    <li className="flex flex-col gap-3 rounded-lg border border-slate-100 px-3 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1 w-full">
        <p className="text-sm font-semibold text-slate-800 truncate">{title}</p>
        {subtitle ? <p className="text-xs font-medium text-slate-500">{subtitle}</p> : null}
      </div>
      {amount ? <span className="text-sm font-bold tabular-nums text-slate-900 shrink-0">{amount}</span> : null}
      <div className="flex flex-col gap-2 w-full sm:flex-row sm:flex-wrap sm:w-auto sm:shrink-0">
        {primaryAction}
        {secondaryLink}
      </div>
    </li>
  );
}
