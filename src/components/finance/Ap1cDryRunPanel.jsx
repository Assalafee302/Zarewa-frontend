import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, Receipt, RefreshCw } from 'lucide-react';
import { formatNgn } from '../../Data/mockData';
import { ProcurementFormSection } from '../procurement/ProcurementFormSection';
import {
  AccountingDeskKpiCard,
  AccountingDeskNotice,
  AccountingDeskPageIntro,
} from './accounting/AccountingDeskUi';

/**
 * @param {{
 *   data: object | null,
 *   loading?: boolean,
 *   error?: string,
 *   onReload?: () => void,
 *   embedded?: boolean,
 * }} props
 */
export function Ap1cDryRunPanel({ data, loading, error, onReload, embedded = false }) {
  const s = data?.summary || {};
  const notes = data?.notes || [];
  const [showTechnical, setShowTechnical] = useState(false);

  return (
    <div className="grid grid-cols-1 gap-4 lg:gap-6 min-w-0">
      {!embedded ? (
        <>
          <AccountingDeskPageIntro
            title="Receipt & production readiness"
            description="Read-only checks before turning on Policy v1 GL posting. No journals have been changed."
            action={
              onReload ? (
                <button
                  type="button"
                  onClick={() => onReload()}
                  disabled={loading}
                  className="inline-flex items-center gap-1 rounded-lg bg-zarewa-teal text-white px-3 py-1.5 text-ui-xs font-semibold uppercase tracking-wider shadow-sm hover:brightness-105 disabled:opacity-50"
                >
                  <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                  Load report
                </button>
              ) : null
            }
          />

          <AccountingDeskNotice tone="warn">
            Policy v1 dry-run only — Head of Accounts must sign off before enabling live GL posting flags.
          </AccountingDeskNotice>
        </>
      ) : null}

      {error ? (
        <p className="text-xs font-medium text-rose-800 flex items-center gap-2">
          <AlertTriangle size={16} />
          {error}
        </p>
      ) : null}

      {loading && !data ? <p className="text-xs font-medium text-violet-800">Loading AP1c dry-run…</p> : null}

      {data?.status === 'dry_run_only' ? (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <AccountingDeskKpiCard
              icon={<Receipt size={12} />}
              label="Receipts → deposits"
              value={s.receiptsBeforeProductionCredited1200Count ?? 0}
              hint={s.expected2500InsteadOf1200Ngn ? formatNgn(s.expected2500InsteadOf1200Ngn) : undefined}
              tone="amber"
            />
            <AccountingDeskKpiCard
              label="AR overstatement"
              value={formatNgn(s.potentialArOverstatementNgn)}
              tone="amber"
            />
            <AccountingDeskKpiCard
              label="Deposit understatement"
              value={formatNgn(s.potentialDepositUnderstatementNgn)}
              tone="amber"
            />
            <AccountingDeskKpiCard
              label="Paid, no production"
              value={s.quotationsPaidButNoProductionCount ?? 0}
              tone="amber"
            />
          </div>

          <ProcurementFormSection letter="T" title="Technical detail" compact>
            <button
              type="button"
              onClick={() => setShowTechnical((v) => !v)}
              className="inline-flex items-center gap-1 text-ui-xs font-bold uppercase tracking-wider text-slate-500 hover:text-zarewa-teal"
            >
              <ChevronDown size={14} className={showTechnical ? 'rotate-180' : ''} />
              {showTechnical ? 'Hide' : 'Show'} extended counters
            </button>
            {showTechnical ? (
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <AccountingDeskKpiCard label="Release gap" value={formatNgn(s.releaseGapNgn)} />
                <AccountingDeskKpiCard label="Production duplicate AR" value={s.productionDuplicateRiskCount ?? 0} tone="amber" />
                <AccountingDeskKpiCard label="Reversals missing account" value={s.receiptReversalsMissingResolvableMetaCount ?? 0} tone="amber" />
                <AccountingDeskKpiCard label="Refunds — revenue review" value={s.refundPayoutsRevenueReviewCount ?? 0} tone="amber" />
                <AccountingDeskKpiCard label="Deposit refunds (pre-prod)" value={s.depositRefundsBeforeProductionCount ?? 0} />
                <AccountingDeskKpiCard label="Mixed legacy/AP1c refund" value={s.mixedLegacyAp1cRefundRiskCount ?? 0} tone="amber" />
              </div>
            ) : null}
          </ProcurementFormSection>

          {notes.length ? (
            <ProcurementFormSection letter="i" title="Notes" compact>
              <ul className="text-ui-xs font-medium text-violet-900/90 list-disc pl-4 space-y-1 leading-relaxed">
                {notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </ProcurementFormSection>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
