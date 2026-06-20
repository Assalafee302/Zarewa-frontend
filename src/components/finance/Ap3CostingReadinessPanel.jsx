import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { formatNgn } from '../../Data/mockData';
import { downloadFinanceCsv } from '../../lib/exportFinanceCsv';
import { useAp3CostingReadiness } from '../../hooks/useAp3CostingReadiness';
import { FinanceDataTable } from './FinanceDataTable';
import { FinanceEmptyState } from './FinanceEmptyState';
import { Ap3MaterialCostSection } from './Ap3MaterialCostSection';
import { ProcurementFormSection } from '../procurement/ProcurementFormSection';
import {
  AccountingDeskKpiCard,
  AccountingDeskNotice,
  AccountingDeskPageIntro,
  ACCOUNTING_FIELD_LABEL,
  ACCOUNTING_INPUT,
} from './accounting/AccountingDeskUi';
import { AccountingRegisterHeader } from './accounting/AccountingRegisterLayout';
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

function buildCostingReadinessFilters({ branchId, period, materialFamily, gauge, colour }) {
  return {
    branchId: branchId === 'ALL' ? 'ALL' : branchId,
    period,
    materialFamily: materialFamily.trim() || undefined,
    gauge: gauge.trim() || undefined,
    colour: colour.trim() || undefined,
  };
}

/**
 * @param {{
 *   initialBranchId?: string;
 *   compact?: boolean;
 *   autoLoad?: boolean;
 *   enabled?: boolean;
 *   deskLayout?: boolean;
 * }} props
 */
export function Ap3CostingReadinessPanel({
  initialBranchId = 'ALL',
  compact = false,
  autoLoad = false,
  enabled = true,
  deskLayout = false,
}) {
  const [period, setPeriod] = useState(defaultPeriodKey);
  const [branchId, setBranchId] = useState(initialBranchId || 'ALL');
  const [materialFamily, setMaterialFamily] = useState('');
  const [gauge, setGauge] = useState('');
  const [colour, setColour] = useState('');

  const { data, loading, error, load } = useAp3CostingReadiness({ enabled });
  const filters = useMemo(
    () => buildCostingReadinessFilters({ branchId, period, materialFamily, gauge, colour }),
    [branchId, period, materialFamily, gauge, colour]
  );

  useEffect(() => {
    if (autoLoad && enabled) void load(filters);
  }, [autoLoad, enabled, filters, load]);

  const s = data?.summary;
  const dq = data?.dataQuality;

  const exportCsv = () => {
    if (!data) return;
    const rows = [
      ['Costing Readiness', data.period?.key || period],
      ['Readiness score', data.readinessScore],
      ['Completed jobs', s?.completedJobs],
      ['Produced metres', s?.producedMetres],
      ['Material cost/m (draft)', s?.materialCostPerMetreNgn],
      ['Missing coil cost', s?.missingCoilCostCount],
    ];
    downloadFinanceCsv('costing-readiness-summary', rows);
  };

  const headerActions = !compact ? (
    <>
      <button
        type="button"
        onClick={() => load(filters)}
        disabled={loading || !enabled}
        className="inline-flex items-center gap-1 rounded-lg bg-[#134e4a] text-white px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider shadow-sm hover:brightness-105 disabled:opacity-50"
      >
        <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
        Load readiness
      </button>
      <button
        type="button"
        onClick={exportCsv}
        disabled={!data}
        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-[#134e4a] hover:bg-slate-50 disabled:opacity-50"
      >
        Export
      </button>
    </>
  ) : (
    <button
      type="button"
      onClick={() => load(filters)}
      disabled={loading || !enabled}
      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-[#134e4a] hover:bg-slate-50 disabled:opacity-50"
    >
      <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
      Refresh
    </button>
  );

  return (
    <div className="grid grid-cols-1 gap-4 lg:gap-6 min-w-0">
      {deskLayout ? (
        <AccountingRegisterHeader compact actions={headerActions} />
      ) : (
        <AccountingDeskPageIntro
          title="Costing readiness"
          description="Material cost, labour, diesel, and overhead readiness before full cost per metre. Draft values — Head of Accounts review."
          action={headerActions}
        />
      )}

      <AccountingDeskNotice tone="warn">
        Readiness only — not final cost per metre. AP3a does not post GL or change costing.
      </AccountingDeskNotice>

      {!compact ? (
        <ProcurementFormSection letter="F" title="Filters" compact>
          <div className="flex flex-wrap gap-3 items-end">
            <label className={ACCOUNTING_FIELD_LABEL}>
              Branch
              <select
                className={`${ACCOUNTING_INPUT} mt-1`}
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
              >
                {BRANCH_OPTIONS.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={ACCOUNTING_FIELD_LABEL}>
              Period
              <input
                type="month"
                className={`${ACCOUNTING_INPUT} mt-1`}
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              />
            </label>
            <label className={ACCOUNTING_FIELD_LABEL}>
              Material family
              <input
                className={`${ACCOUNTING_INPUT} mt-1 w-32`}
                value={materialFamily}
                onChange={(e) => setMaterialFamily(e.target.value)}
                placeholder="Optional"
              />
            </label>
            <label className={ACCOUNTING_FIELD_LABEL}>
              Gauge
              <input
                className={`${ACCOUNTING_INPUT} mt-1 w-24`}
                value={gauge}
                onChange={(e) => setGauge(e.target.value)}
              />
            </label>
            <label className={ACCOUNTING_FIELD_LABEL}>
              Colour
              <input
                className={`${ACCOUNTING_INPUT} mt-1 w-24`}
                value={colour}
                onChange={(e) => setColour(e.target.value)}
              />
            </label>
          </div>
        </ProcurementFormSection>
      ) : null}

      {error ? (
        <p className="text-sm text-rose-800 flex items-center gap-2">
          <AlertTriangle size={16} />
          {error}
        </p>
      ) : null}

      {!data && !loading ? (
        <FinanceEmptyState
          title="No costing readiness loaded"
          message="Load the report to audit production metres, coil costs, and expense classification."
        />
      ) : null}

      {data ? (
        <>
          <div className={`grid gap-3 ${compact ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-4'}`}>
            <AccountingDeskKpiCard label="Readiness score" value={`${data.readinessScore ?? 0}%`} hint="Draft" tone="teal" />
            <AccountingDeskKpiCard
              label="Completed jobs"
              value={s?.completedJobs ?? 0}
              hint={`${s?.producedMetres ?? 0} m produced`}
            />
            <AccountingDeskKpiCard
              label="Jobs with coil consumption"
              value={s?.jobsWithCoilConsumption ?? 0}
              hint={`${s?.jobsMissingCoilConsumption ?? 0} missing consumption`}
              tone={(s?.jobsMissingCoilConsumption || 0) > 0 ? 'amber' : 'default'}
            />
            <AccountingDeskKpiCard
              label="Material cost / m (draft)"
              value={s?.materialCostPerMetreNgn ? formatNgn(s.materialCostPerMetreNgn) : '—'}
              hint="Estimated · coil only"
            />
            <AccountingDeskKpiCard
              label="Missing coil cost"
              value={s?.missingCoilCostCount ?? 0}
              tone={(s?.missingCoilCostCount || 0) > 0 ? 'amber' : 'default'}
            />
            <AccountingDeskKpiCard
              label="Labour data"
              value={s?.payrollMappable ? 'Mappable' : 'Not ready'}
              hint={`${formatNgn(s?.labourExpenseNgn ?? 0)} expenses`}
              tone={s?.payrollMappable ? 'teal' : 'amber'}
            />
            <AccountingDeskKpiCard
              label="Diesel data"
              value={s?.dieselSeparated ? 'Separated' : 'Weak'}
              hint={formatNgn(s?.dieselExpenseNgn ?? 0)}
              tone={s?.dieselSeparated ? 'teal' : 'amber'}
            />
            {data.branchContributionDraft?.poolNgn ? (
              <AccountingDeskKpiCard
                label="AP3c cost pool"
                value={formatNgn(data.branchContributionDraft.poolNgn.total)}
                hint={`Labour ${formatNgn(data.branchContributionDraft.poolNgn.labour)} · OH ${formatNgn(data.branchContributionDraft.poolNgn.overhead)}`}
                tone="teal"
              />
            ) : null}
            <AccountingDeskKpiCard
              label="Unclassified expenses"
              value={formatNgn(s?.unclassifiedExpenseNgn ?? 0)}
              tone={(s?.unclassifiedExpenseNgn || 0) > 0 ? 'amber' : 'default'}
            />
          </div>

          {(dq?.highRisk?.length || dq?.warnings?.length) && !compact ? (
            <div className="grid gap-3 md:grid-cols-2">
              {dq.highRisk?.length ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-3">
                  <p className="text-xs font-black uppercase text-rose-800">High risk</p>
                  <ul className="mt-2 text-xs text-rose-900 list-disc pl-4 space-y-1">
                    {dq.highRisk.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {dq.warnings?.length ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-3">
                  <p className="text-xs font-black uppercase text-amber-800">Warnings</p>
                  <ul className="mt-2 text-xs text-amber-900 list-disc pl-4 space-y-1">
                    {dq.warnings.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}

          {!compact ? (
            <>
              <AccountingDeskTableSection title="Branch readiness" description="Draft material cost per metre by branch">
                <FinanceDataTable
                  columns={[
                    { key: 'branchId', label: 'Branch' },
                    { key: 'completedJobs', label: 'Jobs' },
                    { key: 'producedMetres', label: 'Metres' },
                    {
                      key: 'materialCostPerMetreNgn',
                      label: 'Material ₦/m',
                      render: (r) => (r.materialCostPerMetreNgn != null ? formatNgn(r.materialCostPerMetreNgn) : '—'),
                    },
                    { key: 'confidence', label: 'Confidence' },
                    { key: 'missingCostCount', label: 'Missing cost' },
                  ]}
                  rows={data.byBranch || []}
                  emptyMessage="No branch rows in period."
                />
              </AccountingDeskTableSection>

              {data.branchContributionDraft?.rows?.length ? (
                <AccountingDeskTableSection
                  title="Branch contribution (AP3c draft)"
                  description={
                    data.branchContributionDraft.disclaimer ||
                    'Labour, diesel, and factory overhead allocated by branch metres share.'
                  }
                >
                  <FinanceDataTable
                    columns={[
                      { key: 'branchId', label: 'Branch' },
                      { key: 'producedMetres', label: 'Metres' },
                      {
                        key: 'metreShare',
                        label: 'Share',
                        render: (r) =>
                          r.metreShare != null ? `${(Number(r.metreShare) * 100).toFixed(1)}%` : '—',
                      },
                      {
                        key: 'materialCostNgn',
                        label: 'Material',
                        render: (r) => formatNgn(r.materialCostNgn),
                      },
                      {
                        key: 'labourAllocatedNgn',
                        label: 'Labour',
                        render: (r) => formatNgn(r.labourAllocatedNgn),
                      },
                      {
                        key: 'dieselAllocatedNgn',
                        label: 'Diesel',
                        render: (r) => formatNgn(r.dieselAllocatedNgn),
                      },
                      {
                        key: 'overheadAllocatedNgn',
                        label: 'Overhead',
                        render: (r) => formatNgn(r.overheadAllocatedNgn),
                      },
                      {
                        key: 'totalProductionCostNgn',
                        label: 'Total cost',
                        render: (r) => formatNgn(r.totalProductionCostNgn),
                      },
                      {
                        key: 'draftCostPerMetreNgn',
                        label: 'Draft ₦/m',
                        render: (r) => (r.draftCostPerMetreNgn != null ? formatNgn(r.draftCostPerMetreNgn) : '—'),
                      },
                    ]}
                    rows={data.branchContributionDraft.rows}
                    emptyMessage="No branch allocation rows."
                  />
                </AccountingDeskTableSection>
              ) : null}

              <AccountingDeskTableSection title="Product family — material cost / m" description="Draft estimates by family">
                <FinanceDataTable
                  columns={[
                    { key: 'productFamily', label: 'Family' },
                    { key: 'producedMetres', label: 'Metres' },
                    {
                      key: 'materialCostPerMetreNgn',
                      label: '₦/m',
                      render: (r) => (r.materialCostPerMetreNgn != null ? formatNgn(r.materialCostPerMetreNgn) : '—'),
                    },
                    { key: 'confidence', label: 'Confidence' },
                  ]}
                  rows={data.byProductFamily || []}
                />
              </AccountingDeskTableSection>

              <AccountingDeskTableSection title="Gauge / colour — material cost / m">
                <FinanceDataTable
                  columns={[
                    { key: 'gauge', label: 'Gauge' },
                    { key: 'colour', label: 'Colour' },
                    { key: 'producedMetres', label: 'Metres' },
                    {
                      key: 'materialCostPerMetreNgn',
                      label: '₦/m',
                      render: (r) => (r.materialCostPerMetreNgn != null ? formatNgn(r.materialCostPerMetreNgn) : '—'),
                    },
                  ]}
                  rows={data.byGaugeColour || []}
                />
              </AccountingDeskTableSection>

              <AccountingDeskTableSection title="Production expense classification" description="Needs HoA review">
                <FinanceDataTable
                  columns={[
                    { key: 'label', label: 'Bucket' },
                    { key: 'count', label: 'Rows' },
                    {
                      key: 'amountNgn',
                      label: 'Amount',
                      render: (r) => formatNgn(r.amountNgn),
                    },
                  ]}
                  rows={data.expenseClassification || []}
                />
              </AccountingDeskTableSection>

              <AccountingDeskTableSection title="Missing data samples" description="Readiness only">
                <FinanceDataTable
                  columns={[
                    { key: 'kind', label: 'Issue' },
                    { key: 'jobId', label: 'Job' },
                    { key: 'branchId', label: 'Branch' },
                    { key: 'coilNo', label: 'Coil' },
                  ]}
                  rows={data.missingDataSamples || []}
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link to="/manager" className="text-[10px] font-bold text-[#134e4a] hover:underline">
                    View production jobs
                  </Link>
                  <Link to="/accounts?tab=movements" className="text-[10px] font-bold text-[#134e4a] hover:underline">
                    Expense classification (Treasury)
                  </Link>
                </div>
              </AccountingDeskTableSection>

              <ProcurementFormSection letter="P" title="Proposed costing policy" compact>
                <pre className="text-[10px] bg-slate-50 rounded-lg p-3 overflow-auto max-h-48">
                  {JSON.stringify(data.proposedCostingPolicy, null, 2)}
                </pre>
                <ul className="mt-2 text-[10px] text-slate-600 list-disc pl-4 space-y-1">
                  {(data.policyNotes || []).map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              </ProcurementFormSection>
            </>
          ) : (
            <Link to="/accounting" className="text-xs font-bold text-teal-800 hover:underline">
              Accounting Desk → Costing
            </Link>
          )}
        </>
      ) : null}

      <Ap3MaterialCostSection
        branchId={branchId === 'ALL' ? 'ALL' : branchId}
        period={period}
        materialFamily={materialFamily}
        gauge={gauge}
        colour={colour}
        enabled={enabled}
        compact={compact}
      />
    </div>
  );
}
