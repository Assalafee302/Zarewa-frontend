import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ChevronDown, RefreshCw } from 'lucide-react';
import { formatNgn } from '../../Data/mockData';
import { downloadFinanceCsv } from '../../lib/exportFinanceCsv';
import { useAp2cReports } from '../../hooks/useAp2cReports';
import { FinanceActionButton } from './FinanceActionButton';
import { FinanceDataTable } from './FinanceDataTable';
import { FinanceReportPanel } from './FinanceReportPanel';

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
    <div className="space-y-6 border-t border-slate-200 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black text-[#134e4a]">Supplier advances &amp; inventory (AP2c)</p>
          <p className="text-xs font-medium text-slate-600 mt-1">
            Management diagnostic — accounting value. Not statutory until Head of Accounts sign-off.
          </p>
        </div>
        <FinanceActionButton variant="secondary" onClick={() => loadAll(filters)} disabled={loading || !enabled}>
          <RefreshCw size={14} className={`mr-1 inline ${loading ? 'animate-spin' : ''}`} />
          Load AP2c reports
        </FinanceActionButton>
      </div>

      {error ? (
        <p className="text-sm text-rose-800 flex items-center gap-2">
          <AlertTriangle size={16} />
          {error}
        </p>
      ) : null}

      <div className={`grid gap-3 ${compact ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-4'}`}>
        <div className="rounded-xl border border-rose-200/80 bg-rose-50/40 p-3">
          <p className="text-[10px] font-bold uppercase text-rose-800">Supplier advances</p>
          <p className="text-lg font-black tabular-nums">{formatNgn(advance?.summary?.totalSupplierAdvanceNgn ?? 0)}</p>
          <p className="text-[10px] text-rose-900/80">{advance?.summary?.paidNotReceivedCount ?? 0} paid not received</p>
        </div>
        <div className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-3">
          <p className="text-[10px] font-bold uppercase text-amber-800">Received not paid</p>
          <p className="text-lg font-black tabular-nums">{formatNgn(advance?.summary?.totalReceivedNotPaidNgn ?? 0)}</p>
        </div>
        <div className="rounded-xl border border-teal-200/80 bg-teal-50/40 p-3">
          <p className="text-[10px] font-bold uppercase text-teal-800">Inventory (accounting)</p>
          <p className="text-lg font-black tabular-nums">{formatNgn(inventory?.accountingValueNgn ?? 0)}</p>
          <p className="text-[10px] text-teal-900/80">
            Replacement: {inventory?.replacementStatus === 'not_configured' ? 'Not configured' : formatNgn(inventory?.replacementValueNgn)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 p-3">
          <p className="text-[10px] font-bold uppercase text-slate-500">GL alignment warnings</p>
          <p className="text-lg font-black tabular-nums">{alignment?.warningCount ?? 0}</p>
          <p className="text-[10px] text-slate-600">{inventory?.missingCostCount ?? 0} missing cost</p>
        </div>
      </div>

      {!compact ? (
        <>
          <FinanceReportPanel
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
          </FinanceReportPanel>

          <FinanceReportPanel
            title="Inventory valuation"
            description="Accounting value from landed/unit cost. Management replacement value not configured unless price basis added."
            onExport={() =>
              downloadFinanceCsv('inventory-valuation', ['key', 'accountingValueNgn', 'coilCount'], inventory?.byBranch || [])
            }
          >
            <p className="text-sm font-medium text-slate-700 mb-2">
              Month avg unit price: {inventory?.monthlyAveragePurchasePriceNgn != null ? formatNgn(inventory.monthlyAveragePurchasePriceNgn) : '—'}
              {' · '}
              Highest month: {inventory?.highestPurchasePriceMonthNgn != null ? formatNgn(inventory.highestPurchasePriceMonthNgn) : '—'}
            </p>
            <FinanceActionButton variant="link" to="/accounting">
              Review missing cost →
            </FinanceActionButton>
          </FinanceReportPanel>

          <FinanceReportPanel title="AP / inventory / GL alignment" description="Management tie-out — not statutory.">
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
              <p className="text-sm text-slate-600">Load AP2c reports to see alignment checks.</p>
            )}
            <Link to="/accounts?tab=audit" className="inline-block mt-2 text-xs font-bold text-teal-800 hover:underline">
              Finance → Audit trail
            </Link>
          </FinanceReportPanel>

          <button
            type="button"
            onClick={() => setShowTechnical((v) => !v)}
            className="text-xs font-bold text-slate-500 hover:text-teal-800 inline-flex items-center gap-1"
          >
            <ChevronDown size={14} className={showTechnical ? 'rotate-180' : ''} />
            {showTechnical ? 'Hide' : 'Show'} supplier advance GL notes
          </button>
          {showTechnical && advance?.supplierAdvanceGl?.designNotes ? (
            <ul className="list-disc pl-5 text-xs text-slate-600 space-y-1">
              {advance.supplierAdvanceGl.designNotes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
