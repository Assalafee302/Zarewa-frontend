import React, { useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { formatNgn } from '../../Data/mockData';
import { downloadFinanceCsv } from '../../lib/exportFinanceCsv';
import { useAp3BranchPl } from '../../hooks/useAp3BranchPl';
import {
  AccountingDeskKpiCard,
  AccountingDeskNotice,
  ACCOUNTING_FIELD_LABEL,
  ACCOUNTING_INPUT,
} from './accounting/AccountingDeskUi';
import { AccountingDeskTableSection } from './accounting/AccountingDeskTableSection';

const BRANCH_OPTIONS = [
  { id: 'ALL', label: 'All branches' },
  { id: 'BR-KD', label: 'Kaduna (HQ)' },
  { id: 'BR-YL', label: 'Yola' },
  { id: 'BR-MDG', label: 'Maiduguri' },
];

function defaultPeriodKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * @param {{ initialBranchId?: string; autoLoad?: boolean; enabled?: boolean; deskLayout?: boolean }} props
 */
export function Ap3BranchPlPanel({
  initialBranchId = 'ALL',
  autoLoad = false,
  enabled = true,
  deskLayout = false,
}) {
  const [period, setPeriod] = useState(defaultPeriodKey);
  const [branchId, setBranchId] = useState(initialBranchId || 'ALL');
  const { data, loading, error, load } = useAp3BranchPl({ enabled });
  const filters = useMemo(
    () => ({ branchId: branchId === 'ALL' ? 'ALL' : branchId, period }),
    [branchId, period]
  );

  useEffect(() => {
    if (autoLoad && enabled) void load(filters);
  }, [autoLoad, enabled, filters, load]);

  const exportCsv = () => {
    if (!data?.rows) return;
    const rows = [
      ['Period', data.periodKey],
      ['Branch scope', data.branchScope],
      ['GL revenue', data.glRevenueNgn],
      [],
      ['Branch', 'Metres', 'Revenue', 'Factory cost', 'Contribution', 'Margin %'],
      ...data.rows.map((r) => [
        r.branchId,
        r.producedMetres,
        r.estimatedRevenueNgn,
        r.factoryCostNgn,
        r.contributionNgn,
        r.marginPct,
      ]),
    ];
    downloadFinanceCsv(`branch-pl-${period}`, rows);
  };

  const headerActions = (
    <div className="flex flex-wrap items-center gap-2">
      <label className={ACCOUNTING_FIELD_LABEL}>
        Period
        <input type="month" className={ACCOUNTING_INPUT} value={period} onChange={(e) => setPeriod(e.target.value)} />
      </label>
      <label className={ACCOUNTING_FIELD_LABEL}>
        Branch
        <select className={ACCOUNTING_INPUT} value={branchId} onChange={(e) => setBranchId(e.target.value)}>
          {BRANCH_OPTIONS.map((b) => (
            <option key={b.id} value={b.id}>
              {b.label}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        onClick={() => void load(filters)}
        disabled={loading}
        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold uppercase text-[#134e4a]"
      >
        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        Load
      </button>
      {data ? (
        <button
          type="button"
          onClick={exportCsv}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold uppercase text-slate-600"
        >
          Export CSV
        </button>
      ) : null}
    </div>
  );

  const t = data?.totals;

  return (
    <section className="space-y-4">
      {!deskLayout ? (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-[#134e4a]">Branch contribution P&L</h3>
            <p className="mt-1 text-[10px] text-slate-500 max-w-2xl">
              Management draft — revenue from completed jobs; factory cost from AP3c allocation by metres. Excludes HQ
              and selling expenses.
            </p>
          </div>
          {headerActions}
        </div>
      ) : (
        headerActions
      )}

      {error ? <p className="text-[11px] font-medium text-rose-700">{error}</p> : null}

      {data ? (
        <>
          {data.warnings?.length ? (
            <AccountingDeskNotice tone="warn">{data.warnings.join(' ')}</AccountingDeskNotice>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <AccountingDeskKpiCard label="Estimated revenue" value={formatNgn(t?.revenueNgn)} />
            <AccountingDeskKpiCard label="Factory cost" value={formatNgn(t?.factoryCostNgn)} tone="amber" />
            <AccountingDeskKpiCard
              label="Contribution"
              value={formatNgn(t?.contributionNgn)}
              tone={(t?.contributionNgn ?? 0) >= 0 ? 'teal' : 'amber'}
            />
            <AccountingDeskKpiCard
              label="Margin"
              value={t?.marginPct != null ? `${t.marginPct}%` : '—'}
              hint={data.glRevenueNgn != null ? `GL revenue ${formatNgn(data.glRevenueNgn)}` : undefined}
            />
          </div>

          <AccountingDeskTableSection title="By branch" description={data.summary}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="border-b border-slate-100 text-[9px] font-bold uppercase text-slate-500">
                    <th className="px-3 py-2">Branch</th>
                    <th className="px-3 py-2 text-right">Metres</th>
                    <th className="px-3 py-2 text-right">Revenue</th>
                    <th className="px-3 py-2 text-right">Material</th>
                    <th className="px-3 py-2 text-right">Labour</th>
                    <th className="px-3 py-2 text-right">Diesel</th>
                    <th className="px-3 py-2 text-right">Overhead</th>
                    <th className="px-3 py-2 text-right">Contribution</th>
                    <th className="px-3 py-2 text-right">Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r) => (
                    <tr key={r.branchId} className="border-b border-slate-50">
                      <td className="px-3 py-2 font-semibold">{r.branchId}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{r.producedMetres?.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatNgn(r.estimatedRevenueNgn)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatNgn(r.materialCostNgn)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatNgn(r.labourAllocatedNgn)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatNgn(r.dieselAllocatedNgn)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatNgn(r.overheadAllocatedNgn)}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-bold">{formatNgn(r.contributionNgn)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {r.marginPct != null ? `${r.marginPct}%` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AccountingDeskTableSection>

          <p className="text-[10px] text-slate-500">{data.disclaimer}</p>
        </>
      ) : null}
    </section>
  );
}
