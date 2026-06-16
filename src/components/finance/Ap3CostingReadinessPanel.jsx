import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, RefreshCw, ShieldAlert } from 'lucide-react';
import { formatNgn } from '../../Data/mockData';
import { downloadFinanceCsv } from '../../lib/exportFinanceCsv';
import { useAp3CostingReadiness } from '../../hooks/useAp3CostingReadiness';
import { FinanceActionButton } from './FinanceActionButton';
import { FinanceDataTable } from './FinanceDataTable';
import { FinanceEmptyState } from './FinanceEmptyState';
import { FinanceReportPanel } from './FinanceReportPanel';
import { Ap3MaterialCostSection } from './Ap3MaterialCostSection';

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

function MetricCard({ label, value, hint, tone = 'slate' }) {
  const tones = {
    amber: 'border-amber-200 bg-amber-50/70',
    rose: 'border-rose-200 bg-rose-50/70',
    teal: 'border-teal-200 bg-teal-50/50',
    slate: 'border-slate-200 bg-white',
  };
  return (
    <div className={`rounded-2xl border p-4 ${tones[tone] || tones.slate}`}>
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-black tabular-nums text-[#134e4a]">{value}</p>
      {hint ? <p className="mt-1 text-xs font-medium text-slate-600">{hint}</p> : null}
    </div>
  );
}

/**
 * @param {{
 *   initialBranchId?: string;
 *   compact?: boolean;
 *   autoLoad?: boolean;
 *   enabled?: boolean;
 * }} props
 */
export function Ap3CostingReadinessPanel({
  initialBranchId = 'ALL',
  compact = false,
  autoLoad = false,
  enabled = true,
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

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-amber-200/80 bg-amber-50/50 px-4 py-3 flex gap-3">
        <ShieldAlert className="shrink-0 text-amber-800" size={20} />
        <div>
          <p className="text-sm font-black text-amber-950">Readiness only — not final cost per metre</p>
          <p className="text-xs font-medium text-amber-900/90 mt-1">
            Material cost, labour, diesel, and overhead readiness before full cost per metre. Draft / estimated
            values. Needs Head of Accounts review. AP3a does not post GL or change costing.
          </p>
        </div>
      </div>

      {!compact ? (
        <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
          <label className="text-xs font-bold text-slate-600">
            Branch
            <select
              className="mt-1 block rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
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
          <label className="text-xs font-bold text-slate-600">
            Period
            <input
              type="month"
              className="mt-1 block rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            />
          </label>
          <label className="text-xs font-bold text-slate-600">
            Material family
            <input
              className="mt-1 block rounded-lg border border-slate-200 px-2 py-1.5 text-sm w-32"
              value={materialFamily}
              onChange={(e) => setMaterialFamily(e.target.value)}
              placeholder="Optional"
            />
          </label>
          <label className="text-xs font-bold text-slate-600">
            Gauge
            <input
              className="mt-1 block rounded-lg border border-slate-200 px-2 py-1.5 text-sm w-24"
              value={gauge}
              onChange={(e) => setGauge(e.target.value)}
            />
          </label>
          <label className="text-xs font-bold text-slate-600">
            Colour
            <input
              className="mt-1 block rounded-lg border border-slate-200 px-2 py-1.5 text-sm w-24"
              value={colour}
              onChange={(e) => setColour(e.target.value)}
            />
          </label>
          <FinanceActionButton variant="primary" onClick={() => load(filters)} disabled={loading || !enabled}>
            <RefreshCw size={14} className={`mr-1 inline ${loading ? 'animate-spin' : ''}`} />
            Load costing readiness
          </FinanceActionButton>
          <FinanceActionButton variant="secondary" onClick={exportCsv} disabled={!data}>
            Export report
          </FinanceActionButton>
        </div>
      ) : (
        <FinanceActionButton variant="secondary" onClick={() => load(filters)} disabled={loading || !enabled}>
          Refresh costing readiness
        </FinanceActionButton>
      )}

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
            <MetricCard label="Readiness score" value={`${data.readinessScore ?? 0}%`} hint="Draft" tone="teal" />
            <MetricCard
              label="Completed jobs"
              value={s?.completedJobs ?? 0}
              hint={`${s?.producedMetres ?? 0} m produced`}
            />
            <MetricCard
              label="Jobs with coil consumption"
              value={s?.jobsWithCoilConsumption ?? 0}
              hint={`${s?.jobsMissingCoilConsumption ?? 0} missing consumption`}
              tone={(s?.jobsMissingCoilConsumption || 0) > 0 ? 'amber' : 'slate'}
            />
            <MetricCard
              label="Material cost / m (draft)"
              value={s?.materialCostPerMetreNgn ? formatNgn(s.materialCostPerMetreNgn) : '—'}
              hint="Estimated · coil only"
            />
            <MetricCard
              label="Missing coil cost"
              value={s?.missingCoilCostCount ?? 0}
              tone={(s?.missingCoilCostCount || 0) > 0 ? 'rose' : 'slate'}
            />
            <MetricCard
              label="Labour data"
              value={s?.payrollMappable ? 'Mappable' : 'Not ready'}
              hint={formatNgn(s?.labourExpenseNgn ?? 0) + ' expenses'}
              tone={s?.payrollMappable ? 'teal' : 'amber'}
            />
            <MetricCard
              label="Diesel data"
              value={s?.dieselSeparated ? 'Separated' : 'Weak'}
              hint={formatNgn(s?.dieselExpenseNgn ?? 0)}
              tone={s?.dieselSeparated ? 'teal' : 'amber'}
            />
            <MetricCard
              label="Unclassified expenses"
              value={formatNgn(s?.unclassifiedExpenseNgn ?? 0)}
              tone={(s?.unclassifiedExpenseNgn || 0) > 0 ? 'amber' : 'slate'}
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
              <FinanceReportPanel
                title="Branch readiness"
                subtitle="Draft material cost per metre by branch"
                badge="Readiness only"
              >
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
              </FinanceReportPanel>

              <FinanceReportPanel title="Product family — material cost / m" badge="Draft">
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
              </FinanceReportPanel>

              <FinanceReportPanel title="Gauge / colour — material cost / m" badge="Draft">
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
              </FinanceReportPanel>

              <FinanceReportPanel title="Production expense classification" badge="Needs HoA review">
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
              </FinanceReportPanel>

              <FinanceReportPanel title="Missing data samples" badge="Readiness only">
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
                  <FinanceActionButton variant="link" to="/manager">
                    View production jobs
                  </FinanceActionButton>
                  <FinanceActionButton variant="link" to="/accounts?tab=movements">
                    View expense classification (Treasury)
                  </FinanceActionButton>
                </div>
              </FinanceReportPanel>

              <FinanceReportPanel title="Proposed costing policy" badge="MD / HoA approval required">
                <pre className="text-xs bg-slate-50 rounded-lg p-3 overflow-auto max-h-48">
                  {JSON.stringify(data.proposedCostingPolicy, null, 2)}
                </pre>
                <ul className="mt-2 text-xs text-slate-600 list-disc pl-4 space-y-1">
                  {(data.policyNotes || []).map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              </FinanceReportPanel>
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
