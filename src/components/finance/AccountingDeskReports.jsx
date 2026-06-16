import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileBarChart, RefreshCw } from 'lucide-react';
import { formatNgn } from '../../Data/mockData';
import { downloadFinanceCsv } from '../../lib/exportFinanceCsv';
import { ProcurementFormSection } from '../procurement/ProcurementFormSection';
import { SalesListSearchInput } from '../sales/SalesListTableFrame';
import { FinanceDataTable } from './FinanceDataTable';
import {
  AccountingDeskKpiCard,
  AccountingDeskPageIntro,
  AccountingReportLinkRow,
  ACCOUNTING_CARD_ROW,
  ACCOUNTING_FIELD_LABEL,
  ACCOUNTING_INPUT,
} from './accounting/AccountingDeskUi';
import { AccountingDeskTableSection } from './accounting/AccountingDeskTableSection';

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
  const [catalogSearch, setCatalogSearch] = useState('');
  const ex = trialData?.exceptions || {};
  const ap1c = ap1cData?.summary || trialData?.ap1cDryRun || {};
  const credit = trialData?.creditExceptions || {};

  const exceptionRows = [
    { _key: 'r1', item: 'Receipts pending confirmation', count: ex.pendingReceiptClearance ?? 0 },
    { _key: 'r2', item: 'Receipt bank mismatch', count: ex.receiptBankAmountMismatch ?? 0 },
    { _key: 'r3', item: 'Treasury movement not settled', count: ex.treasuryMovementWithoutFinanceSettlement ?? 0 },
    {
      _key: 'r4',
      item: 'Open deliveries unpaid (gate)',
      count: trialData?.accountingPolicyV1?.openDeliveriesWouldBlockOnPayment ?? 0,
    },
  ];

  const ap1cRows = ap1cData?.summary
    ? [
        { _key: 'a1', risk: 'Receipts should be deposits', count: ap1c.receiptsBeforeProductionCredited1200Count ?? 0 },
        { _key: 'a2', risk: 'AR overstatement (₦)', count: formatNgn(ap1c.potentialArOverstatementNgn) },
        { _key: 'a3', risk: 'Deposit understatement (₦)', count: formatNgn(ap1c.potentialDepositUnderstatementNgn) },
        { _key: 'a4', risk: 'Refund revenue review', count: ap1c.refundPayoutsRevenueReviewCount ?? 0 },
      ]
    : [];

  const reportCatalog = useMemo(
    () => [
      {
        id: 'recon',
        title: 'Full reconciliation pack',
        description: 'Operational cash tie-out — use Reconciliation tab.',
        to: '/accounting',
        state: { focusTab: 'reconciliation' },
      },
      {
        id: 'ap2',
        title: 'Supplier AP diagnostics (AP2a)',
        description: 'Ordered vs received vs paid — Supplier & AP tab.',
        to: '/accounting',
        state: { focusTab: 'supplier-ap' },
      },
      {
        id: 'ap2b',
        title: 'AP rebuild preview (AP2b)',
        description: 'Received-basis correction — HoA approval required.',
        to: '/accounting',
        state: { focusTab: 'supplier-ap' },
      },
      {
        id: 'ap2c-adv',
        title: 'Supplier advance report (AP2c)',
        description: 'Prepayment and paid-not-received.',
        to: '/accounting',
        state: { focusTab: 'supplier-ap' },
      },
      {
        id: 'ap2c-inv',
        title: 'Inventory valuation (AP2c)',
        description: 'Accounting value and missing cost.',
        to: '/accounting',
        state: { focusTab: 'supplier-ap' },
      },
      {
        id: 'ap2c-gl',
        title: 'AP / inventory GL alignment',
        description: 'Management tie-out warnings.',
        to: '/accounts?tab=audit',
      },
      {
        id: 'ap3a',
        title: 'Costing readiness (AP3a)',
        description: 'Material, labour, diesel, overhead readiness.',
        to: '/accounting',
        state: { focusTab: 'costing' },
      },
      {
        id: 'ap3b',
        title: 'Material cost per metre (AP3b)',
        description: 'Trusted material ₦/m from coil consumption.',
        to: '/accounting',
        state: { focusTab: 'costing' },
      },
      {
        id: 'credit',
        title: 'Delivery gate & credit',
        description: 'Unpaid deliveries and credit coverage.',
        to: '/accounting',
        state: { focusTab: 'credit' },
      },
      {
        id: 'month',
        title: 'Month-end readiness',
        description: 'Close checklist — receipt backlog, stock, payroll GL.',
        to: '/accounting',
        state: { focusTab: 'month' },
      },
    ],
    []
  );

  const filteredCatalog = useMemo(() => {
    const q = catalogSearch.trim().toLowerCase();
    if (!q) return reportCatalog;
    return reportCatalog.filter(
      (r) => `${r.title} ${r.description}`.toLowerCase().includes(q)
    );
  }, [reportCatalog, catalogSearch]);

  return (
    <div className="grid grid-cols-1 gap-4 lg:gap-6 min-w-0">
      <AccountingDeskPageIntro
        title="Management reports"
        description={`Branch scope: ${branchScopeLabel || 'All'}. Load live exception counts, then open detailed reports from the catalog.`}
        action={
          <>
            <button
              type="button"
              onClick={() => onReloadTrial?.()}
              className="inline-flex items-center gap-1 rounded-lg bg-[#134e4a] text-white px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider shadow-sm hover:brightness-105"
            >
              <RefreshCw size={12} /> Run checks
            </button>
            <button
              type="button"
              onClick={() => onReloadAp1c?.()}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-[#134e4a] hover:bg-slate-50"
            >
              Load AP1c dry-run
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AccountingDeskKpiCard
          icon={<FileBarChart size={12} />}
          label="Pending receipts"
          value={ex.pendingReceiptClearance ?? '—'}
          tone="amber"
        />
        <AccountingDeskKpiCard label="Credit exposure" value={formatNgn(credit.approvedCreditExposureNgn ?? 0)} tone="teal" />
        <AccountingDeskKpiCard
          label="Refund revenue review"
          value={ap1c.refundPayoutsRevenueReviewCount ?? '—'}
          tone="amber"
        />
        <AccountingDeskKpiCard
          label="Unpaid, no credit"
          value={credit.deliveriesWarningNoCreditCount ?? '—'}
          hint={`${credit.pendingCreditExceptionsCount ?? 0} pending credit requests`}
        />
      </div>

      <ProcurementFormSection letter="F" title="Filters" compact>
        <label className={ACCOUNTING_FIELD_LABEL}>
          As-at date
          <input
            type="date"
            className={`${ACCOUNTING_INPUT} max-w-xs`}
            value={periodEnd}
            onChange={(e) => setPeriodEnd(e.target.value)}
          />
        </label>
      </ProcurementFormSection>

      <AccountingDeskTableSection
        title="Treasury drift indicators"
        description="Compare treasury movements to finance settlement."
        onReload={() => onReloadTrial?.()}
        onExport={() =>
          downloadFinanceCsv(
            'treasury-drift-summary',
            ['item', 'count'],
            exceptionRows.map(({ item, count }) => ({ item, count }))
          )
        }
      >
        <FinanceDataTable
          columns={[
            { key: 'item', label: 'Indicator' },
            { key: 'count', label: 'Count', align: 'right' },
          ]}
          rows={exceptionRows}
        />
      </AccountingDeskTableSection>

      <AccountingDeskTableSection
        title="Deposit vs receivable (AP1c dry-run)"
        description="Policy v1 readiness — management draft only."
        onReload={() => onReloadAp1c?.()}
        onExport={() => downloadFinanceCsv('ap1c-dry-run-summary', ['risk', 'count'], ap1cRows)}
        exportDisabled={!ap1cRows.length}
        empty={
          !ap1cRows.length ? (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 py-10 px-6 text-center">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                Enable diagnostics and load AP1c dry-run
              </p>
            </div>
          ) : null
        }
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
      </AccountingDeskTableSection>

      <AccountingDeskTableSection
        title="Report catalog"
        description="Jump to detailed reports on other Accounting Desk tabs."
        toolbar={
          <SalesListSearchInput
            value={catalogSearch}
            onChange={setCatalogSearch}
            placeholder="Search reports…"
          />
        }
      >
        {filteredCatalog.length ? (
          <ul className="space-y-1.5 max-h-[min(40vh,360px)] overflow-y-auto custom-scrollbar">
            {filteredCatalog.map((r) => (
              <AccountingReportLinkRow
                key={r.id}
                title={r.title}
                description={r.description}
                to={r.to}
                state={r.state}
              />
            ))}
          </ul>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 py-10 text-center">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">No reports match</p>
          </div>
        )}
      </AccountingDeskTableSection>

      <ProcurementFormSection letter="i" title="Delivery gate summary" compact>
        <ul className={`${ACCOUNTING_CARD_ROW} space-y-1 p-3 text-[11px] font-medium text-slate-700`}>
          <li>Deliveries allowed by credit: {credit.deliveriesAllowedByCreditCount ?? 0}</li>
          <li>Unpaid, no credit: {credit.deliveriesWarningNoCreditCount ?? 0}</li>
          <li>
            Full pack:{' '}
            <Link to="/accounting" state={{ focusTab: 'reconciliation' }} className="font-bold text-[#134e4a] hover:underline">
              Reconciliation tab
            </Link>
          </li>
        </ul>
      </ProcurementFormSection>
    </div>
  );
}
