import React from 'react';
import { ArrowRight, FileBarChart, Lock, Flag } from 'lucide-react';
import { formatNgn } from '../../../Data/mockData';
import { ACCOUNTING_CARD_ROW } from './AccountingDeskUi';

/**
 * @param {{
 *   periodKey: string;
 *   branchScopeLabel?: string;
 *   openingPosted?: boolean;
 *   statements?: object | null;
 *   close?: object | null;
 *   exceptionCount?: number;
 *   onFocusTab?: (tabId: string) => void;
 * }} props
 */
export function AccountingExecutiveSummary({
  periodKey,
  branchScopeLabel = '',
  openingPosted = false,
  statements = null,
  close = null,
  exceptionCount = 0,
  onFocusTab,
}) {
  const pl = statements?.profitAndLoss;
  const bs = statements?.balanceSheet;
  const closeSteps = close?.steps?.filter((s) => s.id !== 'period_lock') || [];
  const closeOk = closeSteps.filter((s) => s.status === 'ok').length;

  const next = (() => {
    if (!openingPosted) {
      return { label: 'Complete Opening Pack cutover', tab: 'opening', icon: Flag };
    }
    if (exceptionCount > 0) {
      return { label: 'Resolve operational exceptions', tab: 'overview', icon: ArrowRight };
    }
    if (close && !close.readyToLock && (close.blockers > 0 || close.warnings > 0)) {
      return { label: 'Continue month-end close checklist', tab: 'close', icon: Lock };
    }
    if (close?.readyToLock && !close?.periodLock?.locked) {
      return { label: 'Lock accounting period', tab: 'close', icon: Lock };
    }
    if (bs && !bs.balanced) {
      return { label: 'Review balance sheet variances', tab: 'statements', icon: FileBarChart };
    }
    return { label: 'Review draft statements', tab: 'statements', icon: FileBarChart };
  })();

  const NextIcon = next.icon;

  return (
    <section className="rounded-xl border border-zarewa-teal/20 bg-gradient-to-br from-teal-50/80 to-white overflow-hidden">
      <div className="h-1 bg-zarewa-teal" />
      <div className="p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-ui-xs font-black uppercase tracking-widest text-teal-800">Executive summary</p>
            <h3 className="mt-1 text-lg font-bold text-zarewa-teal">
              {periodKey}
              {branchScopeLabel ? ` · ${branchScopeLabel}` : ''}
            </h3>
            <p className="mt-1 text-xs text-slate-600">
              {openingPosted ? 'Live GL — management draft from registers and postings.' : 'Pre-cutover — complete Opening Pack before month-end lock.'}
            </p>
          </div>
          {onFocusTab ? (
            <button
              type="button"
              onClick={() => onFocusTab(next.tab)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-zarewa-teal px-3 py-2 text-ui-xs font-bold uppercase tracking-wide text-white hover:brightness-105 shrink-0"
            >
              <NextIcon size={14} />
              {next.label}
            </button>
          ) : null}
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div className={ACCOUNTING_CARD_ROW}>
            <p className="text-ui-xs font-bold uppercase text-slate-500">Net income</p>
            <p className="mt-1 text-base font-black tabular-nums text-zarewa-teal">
              {pl ? formatNgn(pl.netIncomeNgn) : '—'}
            </p>
            <p className="mt-0.5 text-ui-xs text-slate-500">Rev {pl ? formatNgn(pl.revenueTotalNgn) : '—'}</p>
          </div>
          <div className={ACCOUNTING_CARD_ROW}>
            <p className="text-ui-xs font-bold uppercase text-slate-500">Balance sheet</p>
            <p className="mt-1 text-base font-black text-zarewa-teal">{bs?.balanced ? 'Balanced' : bs ? 'Review' : '—'}</p>
            <p className="mt-0.5 text-ui-xs text-slate-500 tabular-nums">
              Assets {bs ? formatNgn(bs.assetsNgn) : '—'}
            </p>
          </div>
          <div className={ACCOUNTING_CARD_ROW}>
            <p className="text-ui-xs font-bold uppercase text-slate-500">Month-end close</p>
            <p className="mt-1 text-base font-black text-zarewa-teal">
              {close ? (close.readyToLock ? 'Ready to lock' : `${closeOk}/${closeSteps.length} steps`) : '—'}
            </p>
            <p className="mt-0.5 text-ui-xs text-slate-500">
              {close?.periodLock?.locked ? 'Period locked' : `${close?.warnings ?? 0} warning(s)`}
            </p>
          </div>
          <div className={ACCOUNTING_CARD_ROW}>
            <p className="text-ui-xs font-bold uppercase text-slate-500">Exceptions</p>
            <p className="mt-1 text-base font-black text-zarewa-teal">{exceptionCount}</p>
            <p className="mt-0.5 text-ui-xs text-slate-500">Cashier & treasury follow-up</p>
          </div>
        </div>
      </div>
    </section>
  );
}
