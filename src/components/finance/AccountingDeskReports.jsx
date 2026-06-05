import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatNgn } from '../../Data/mockData';
import { downloadFinanceCsv } from '../../lib/exportFinanceCsv';
import { FinanceReportPanel } from './FinanceReportPanel';
import { FinanceDataTable } from './FinanceDataTable';
import { FinanceActionButton } from './FinanceActionButton';

/**
 * @param {{
 *   trialData: object | null;
 *   ap1cData: object | null;
 *   onReloadTrial?: () => void;
 *   onReloadAp1c?: () => void;
 *   branchScopeLabel?: string;
 * }} props
 */
export function AccountingDeskReports({
  trialData,
  ap1cData,
  onReloadTrial,
  onReloadAp1c,
  branchScopeLabel,
}) {
  const [periodEnd, setPeriodEnd] = useState(new Date().toISOString().slice(0, 10));
  const ex = trialData?.exceptions || {};
  const ap1c = ap1cData?.summary || trialData?.ap1cDryRun || {};
  const credit = trialData?.creditExceptions || {};

  const exceptionRows = [
    { _key: 'r1', item: 'Receipts pending confirmation', count: ex.pendingReceiptClearance ?? 0 },
    { _key: 'r2', item: 'Receipt bank mismatch', count: ex.receiptBankAmountMismatch ?? 0 },
    { _key: 'r3', item: 'Treasury movement not settled', count: ex.treasuryMovementWithoutFinanceSettlement ?? 0 },
    { _key: 'r4', item: 'Open deliveries unpaid (gate)', count: trialData?.accountingPolicyV1?.openDeliveriesWouldBlockOnPayment ?? 0 },
  ];

  const ap1cRows = ap1cData?.summary
    ? [
        { _key: 'a1', risk: 'Receipts should be deposits', count: ap1c.receiptsBeforeProductionCredited1200Count ?? 0 },
        { _key: 'a2', risk: 'AR overstatement (₦)', count: formatNgn(ap1c.potentialArOverstatementNgn) },
        { _key: 'a3', risk: 'Deposit understatement (₦)', count: formatNgn(ap1c.potentialDepositUnderstatementNgn) },
        { _key: 'a4', risk: 'Refund revenue review', count: ap1c.refundPayoutsRevenueReviewCount ?? 0 },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <FinanceActionButton variant="primary" onClick={() => onReloadTrial?.()}>
          Run reconciliation check
        </FinanceActionButton>
        <FinanceActionButton variant="secondary" onClick={() => onReloadAp1c?.()}>
          Load AP1c dry-run
        </FinanceActionButton>
        <FinanceActionButton variant="link" to="/accounting">
          Open reconciliation tab →
        </FinanceActionButton>
      </div>

      <FinanceReportPanel
        title="Treasury drift report"
        description={`Branch scope: ${branchScopeLabel || 'All'}. Compare treasury movements to finance settlement.`}
        onLoad={() => onReloadTrial?.()}
        onExport={() =>
          downloadFinanceCsv('treasury-drift-summary', ['item', 'count'], exceptionRows.map(({ item, count }) => ({ item, count })))
        }
        filters={
          <label className="text-xs font-bold text-slate-600">
            As-at date
            <input
              type="date"
              className="ml-2 rounded-lg border px-2 py-1 text-sm"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
            />
          </label>
        }
      >
        <FinanceDataTable
          columns={[
            { key: 'item', label: 'Indicator' },
            { key: 'count', label: 'Count', align: 'right' },
          ]}
          rows={exceptionRows}
        />
        <p className="mt-2 text-xs text-slate-500">
          Full pack: use <Link to="/accounting" className="font-bold text-teal-800">Reconciliation</Link> tab.
        </p>
      </FinanceReportPanel>

      <FinanceReportPanel
        title="Deposit vs receivable (AP1c dry-run)"
        description="Policy v1 readiness — management draft only."
        onLoad={() => onReloadAp1c?.()}
        onExport={() => downloadFinanceCsv('ap1c-dry-run-summary', ['risk', 'count'], ap1cRows)}
        exportDisabled={!ap1cRows.length}
        emptyTitle="Enable diagnostics and load AP1c dry-run"
      >
        {ap1cRows.length ? (
          <FinanceDataTable
            columns={[
              { key: 'risk', label: 'Risk indicator' },
              { key: 'count', label: 'Value', align: 'right' },
            ]}
            rows={ap1cRows}
          />
        ) : null}
      </FinanceReportPanel>

      <FinanceReportPanel
        title="Refund revenue review report"
        description="Post-production refunds that may need manual revenue/AR journals."
        onLoad={() => onReloadAp1c?.()}
      >
        <p className="text-2xl font-black tabular-nums text-amber-900">
          {ap1c.refundPayoutsRevenueReviewCount ?? 0}
        </p>
        <p className="text-xs text-slate-600 mt-1">Refunds flagged for Head of Accounts review (AP1c-4).</p>
      </FinanceReportPanel>

      <FinanceReportPanel
        title="Delivery gate warning report"
        description="Unpaid deliveries and credit coverage — from trial exception API."
        onLoad={() => onReloadTrial?.()}
      >
        <ul className="text-sm font-semibold text-slate-800 space-y-2">
          <li>Deliveries allowed by credit: {credit.deliveriesAllowedByCreditCount ?? 0}</li>
          <li>Unpaid, no credit: {credit.deliveriesWarningNoCreditCount ?? 0}</li>
          <li>Pending credit requests: {credit.pendingCreditExceptionsCount ?? 0}</li>
        </ul>
      </FinanceReportPanel>

      <FinanceReportPanel
        title="Month-end readiness"
        description="Placeholder checklist — formal close in Phase A4."
        onLoad={() => {}}
      >
        <ul className="list-disc pl-5 text-sm text-slate-600 space-y-1">
          <li>Receipt confirmation backlog cleared</li>
          <li>Stock register signed off</li>
          <li>Payroll GL export posted</li>
          <li>Period lock reviewed</li>
        </ul>
      </FinanceReportPanel>
    </div>
  );
}
