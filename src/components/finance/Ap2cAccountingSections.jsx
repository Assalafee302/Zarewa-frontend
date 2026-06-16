import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ChevronDown, RefreshCw } from 'lucide-react';
import { formatNgn } from '../../Data/mockData';
import { downloadFinanceCsv } from '../../lib/exportFinanceCsv';
import { useAp2cReports } from '../../hooks/useAp2cReports';
import { FinanceDataTable } from './FinanceDataTable';
import { ProcurementFormSection } from '../procurement/ProcurementFormSection';
import {
  AccountingDeskKpiCard,
  AccountingDeskPageIntro,
} from './accounting/AccountingDeskUi';
import { AccountingDeskTableSection } from './accounting/AccountingDeskTableSection';

/**
 * @param {{
 *   branchId?: string;
 *   period?: string;
 *   supplierId?: string;
 *   status?: string;
 *   enabled?: boolean;
 *   compact?: boolean;
 * }} props
 */
export function Ap2cAccountingSections({
  branchId = 'ALL',
  period = '',
  supplierId = '',
  status = '',
  enabled = true,
  compact = false,
}) {
  const { advance, inventory, alignment, loading, error, loadAll } = useAp2cReports({ enabled });
  const [showTechnical, setShowTechnical] = useState(false);

  const filters = { branchId, period, supplierId, status };

  const topAdvances = (advance?.supplierExposure || []).slice(0, compact ? 3 : 8);
  const alignmentChecks = (alignment?.checks || []).slice(0, compact ? 2 : 6);

  return (
    <div className="space-y-4 border-t border-slate-200 pt-6">
      <AccountingDeskPageIntro
        title="Supplier advances & inventory (AP2c)"
        description="Management diagnostic — accounting value. Not statutory until Head of Accounts sign-off."
        action={
          <button
            type="button"
            onClick={() => loadAll(filters)}
            disabled={loading || !enabled}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-[#134e4a] hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Load AP2c
          </button>
        }
      />

      {error ? (
        <p className="text-[11px] font-medium text-rose-800 flex items-center gap-2">
          <AlertTriangle size={16} />
          {error}
        </p>
      ) : null}

      <div className={`grid gap-3 ${compact ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-4'}`}>
        <AccountingDeskKpiCard
          label="Supplier advances"
          value={formatNgn(advance?.summary?.totalSupplierAdvanceNgn ?? 0)}
          hint={`${advance?.summary?.paidNotReceivedCount ?? 0} paid not received`}
          tone="amber"
        />
        <AccountingDeskKpiCard
          label="Received not paid"
          value={formatNgn(advance?.summary?.totalReceivedNotPaidNgn ?? 0)}
          tone="amber"
        />
        <AccountingDeskKpiCard
          label="Inventory (accounting)"
          value={formatNgn(inventory?.accountingValueNgn ?? 0)}
          hint={
            inventory?.replacementStatus === 'not_configured'
              ? 'Replacement not configured'
              : `Replacement ${formatNgn(inventory?.replacementValueNgn)}`
          }
          tone="teal"
        />
        <AccountingDeskKpiCard
          label="GL alignment warnings"
          value={alignment?.warningCount ?? 0}
          hint={`${inventory?.missingCostCount ?? 0} missing cost`}
        />
      </div>

      {!compact ? (
        <>
          <AccountingDeskTableSection
            title="Supplier advances"
            description="Prepayments where supplier paid exceeds received goods value."
            onExport={() =>
              downloadFinanceCsv(
                'supplier-advance-summary',
                ['poId', 'supplierName', 'supplierAdvanceNgn', 'classification'],
                (advance?.supplierAdvanceSummary || []).map((r) => ({
                  poId: r.poId,
                  supplierName: r.supplierName,
                  supplierAdvanceNgn: r.supplierAdvanceNgn,
                  classification: r.classification,
                }))
              )
            }
            exportDisabled={!topAdvances.length}
          >
            <FinanceDataTable
              columns={[
                { key: 'supplier', label: 'Supplier' },
                { key: 'advance', label: 'Advance', align: 'right' },
                { key: 'pos', label: 'POs', align: 'right' },
              ]}
              rows={topAdvances.map((r) => ({
                _key: r.supplierId || r.supplierName,
                supplier: r.supplierName || r.supplierId,
                advance: formatNgn(r.advanceNgn),
                pos: r.poCount,
              }))}
            />
          </AccountingDeskTableSection>

          <AccountingDeskTableSection
            title="Inventory valuation"
            description="Accounting value from landed/unit cost. Management replacement value not configured unless price basis added."
            onExport={() =>
              downloadFinanceCsv('inventory-valuation', ['key', 'accountingValueNgn', 'coilCount'], inventory?.byBranch || [])
            }
          >
            <p className="text-[11px] font-medium text-slate-700 mb-2">
              Month avg unit price:{' '}
              {inventory?.monthlyAveragePurchasePriceNgn != null ? formatNgn(inventory.monthlyAveragePurchasePriceNgn) : '—'}
              {' · '}
              Highest month:{' '}
              {inventory?.highestPurchasePriceMonthNgn != null ? formatNgn(inventory.highestPurchasePriceMonthNgn) : '—'}
            </p>
            <Link to="/accounting" className="text-[10px] font-bold text-[#134e4a] hover:underline">
              Review missing cost →
            </Link>
          </AccountingDeskTableSection>

          <AccountingDeskTableSection title="AP / inventory / GL alignment" description="Management tie-out — not statutory.">
            {alignmentChecks.length ? (
              <ul className="space-y-2 text-sm">
                {alignmentChecks.map((c) => (
                  <li
                    key={c.id}
                    className={`rounded-lg border px-3 py-2 ${
                      c.level === 'critical'
                        ? 'border-rose-200 bg-rose-50 text-rose-950'
                        : c.level === 'warning'
                          ? 'border-amber-200 bg-amber-50 text-amber-950'
                          : 'border-slate-200 bg-slate-50 text-slate-800'
                    }`}
                  >
                    <p className="font-bold">{c.title}</p>
                    <p className="text-xs mt-0.5">{c.message}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[11px] text-slate-600">Load AP2c reports to see alignment checks.</p>
            )}
            <Link to="/accounts?tab=audit" className="inline-block mt-2 text-[10px] font-bold text-[#134e4a] hover:underline">
              Finance → Audit trail
            </Link>
          </AccountingDeskTableSection>

          <ProcurementFormSection letter="G" title="Supplier advance GL notes" compact>
            <button
              type="button"
              onClick={() => setShowTechnical((v) => !v)}
              className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-[#134e4a]"
            >
              <ChevronDown size={14} className={showTechnical ? 'rotate-180' : ''} />
              {showTechnical ? 'Hide' : 'Show'} design notes
            </button>
            {showTechnical && advance?.supplierAdvanceGl?.designNotes ? (
              <ul className="mt-2 list-disc pl-5 text-[10px] text-slate-600 space-y-1">
                {advance.supplierAdvanceGl.designNotes.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            ) : null}
          </ProcurementFormSection>
        </>
      ) : null}
    </div>
  );
}
