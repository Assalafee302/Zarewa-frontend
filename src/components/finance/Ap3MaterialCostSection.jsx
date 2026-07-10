import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { formatNgn } from '../../Data/mockData';
import { downloadFinanceCsv } from '../../lib/exportFinanceCsv';
import { useAp3MaterialCostReport } from '../../hooks/useAp3MaterialCostReport';
import { FinanceActionButton } from './FinanceActionButton';
import { FinanceDataTable } from './FinanceDataTable';
import { FinanceReportPanel } from './FinanceReportPanel';

function MetricCard({ label, value, hint, tone = 'slate' }) {
  const tones = {
    teal: 'border-teal-200 bg-teal-50/50',
    amber: 'border-amber-200 bg-amber-50/70',
    rose: 'border-rose-200 bg-rose-50/70',
    slate: 'border-slate-200 bg-white',
  };
  return (
    <div className={`rounded-xl border p-3 ${tones[tone] || tones.slate}`}>
      <p className="text-ui-xs font-bold uppercase text-slate-500">{label}</p>
      <p className="text-lg font-black tabular-nums text-zarewa-teal">{value}</p>
      {hint ? <p className="text-ui-xs text-slate-600 mt-1">{hint}</p> : null}
    </div>
  );
}

/**
 * @param {{
 *   branchId?: string;
 *   period?: string;
 *   materialFamily?: string;
 *   gauge?: string;
 *   colour?: string;
 *   enabled?: boolean;
 *   compact?: boolean;
 *   onLoad?: () => void;
 * }} props
 */
export function Ap3MaterialCostSection({
  branchId = 'ALL',
  period = '',
  materialFamily = '',
  gauge = '',
  colour = '',
  enabled = true,
  compact = false,
  onLoad,
}) {
  const { data, loading, error, load } = useAp3MaterialCostReport({ enabled });
  const filters = {
    branchId,
    period,
    materialFamily: materialFamily.trim() || undefined,
    gauge: gauge.trim() || undefined,
    colour: colour.trim() || undefined,
  };

  const handleLoad = () => {
    void load(filters);
    onLoad?.();
  };

  const s = data?.summary;

  const exportCsv = () => {
    if (!data?.byBranch?.length) return;
    downloadFinanceCsv(
      'ap3-material-cost-by-branch',
      ['branchId', 'trustedMetres', 'materialCostPerMetreNgn', 'trustedJobCount'],
      data.byBranch.map((r) => ({
        branchId: r.branchId,
        trustedMetres: r.trustedMetres,
        materialCostPerMetreNgn: r.materialCostPerMetreNgn,
        trustedJobCount: r.trustedJobCount,
      }))
    );
  };

  if (data?.status === 'disabled') {
    return (
      <p className="text-sm text-amber-800">
        Material cost report disabled. Set AP3_MATERIAL_COST_REPORT_ENABLED=1 on server.
      </p>
    );
  }

  return (
    <div className="space-y-4 border-t border-teal-200/60 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black text-zarewa-teal">Material cost per metre (AP3b)</p>
          <p className="text-xs font-medium text-slate-600 mt-1">
            Trusted totals from actual coil consumption — material only. Not full factory cost.
          </p>
        </div>
        <div className="flex gap-2">
          <FinanceActionButton variant="primary" onClick={handleLoad} disabled={loading || !enabled}>
            <RefreshCw size={14} className={`mr-1 inline ${loading ? 'animate-spin' : ''}`} />
            Load material cost
          </FinanceActionButton>
          {!compact ? (
            <FinanceActionButton variant="secondary" onClick={exportCsv} disabled={!data}>
              Export report
            </FinanceActionButton>
          ) : null}
        </div>
      </div>

      {error ? (
        <p className="text-sm text-rose-800 flex items-center gap-2">
          <AlertTriangle size={16} />
          {error}
        </p>
      ) : null}

      {data ? (
        <>
          <div className={`grid gap-3 ${compact ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-4'}`}>
            <MetricCard
              label="Trusted ₦/m"
              value={s?.trustedMaterialCostPerMetreNgn != null ? formatNgn(s.trustedMaterialCostPerMetreNgn) : '—'}
              hint={`${s?.trustedJobCount ?? 0} trusted jobs`}
              tone="teal"
            />
            <MetricCard label="Trusted metres" value={s?.trustedMetres ?? 0} />
            <MetricCard
              label="Partial jobs"
              value={s?.partialJobCount ?? 0}
              hint="Missing some coil cost"
              tone={(s?.partialJobCount || 0) > 0 ? 'amber' : 'slate'}
            />
            <MetricCard
              label="Below material warnings"
              value={s?.belowMaterialCostWarningCount ?? 0}
              hint="Quotation vs material (read-only)"
              tone={(s?.belowMaterialCostWarningCount || 0) > 0 ? 'rose' : 'slate'}
            />
          </div>

          {!compact ? (
            <>
              <FinanceReportPanel title="By branch (trusted)" badge="Material only">
                <FinanceDataTable
                  columns={[
                    { key: 'branchId', label: 'Branch' },
                    { key: 'trustedJobCount', label: 'Trusted jobs' },
                    { key: 'trustedMetres', label: 'Metres' },
                    {
                      key: 'materialCostPerMetreNgn',
                      label: '₦/m',
                      render: (r) => (r.materialCostPerMetreNgn != null ? formatNgn(r.materialCostPerMetreNgn) : '—'),
                    },
                    { key: 'partialJobCount', label: 'Partial' },
                  ]}
                  rows={data.byBranch || []}
                />
              </FinanceReportPanel>

              <FinanceReportPanel title="By product family (trusted)" badge="Material only">
                <FinanceDataTable
                  columns={[
                    { key: 'productFamily', label: 'Family' },
                    { key: 'trustedMetres', label: 'Metres' },
                    {
                      key: 'materialCostPerMetreNgn',
                      label: '₦/m',
                      render: (r) => (r.materialCostPerMetreNgn != null ? formatNgn(r.materialCostPerMetreNgn) : '—'),
                    },
                  ]}
                  rows={data.byProductFamily || []}
                />
              </FinanceReportPanel>

              <FinanceReportPanel title="Job material cost" badge="Trusted / partial / excluded">
                <FinanceDataTable
                  columns={[
                    { key: 'jobId', label: 'Job' },
                    { key: 'branchId', label: 'Branch' },
                    { key: 'trust', label: 'Trust' },
                    { key: 'metres', label: 'm' },
                    {
                      key: 'materialCostPerMetreNgn',
                      label: 'Material ₦/m',
                      render: (r) => (r.materialCostPerMetreNgn != null ? formatNgn(r.materialCostPerMetreNgn) : '—'),
                    },
                    {
                      key: 'varianceVsStandardPct',
                      label: 'vs std %',
                      render: (r) => (r.varianceVsStandardPct != null ? `${r.varianceVsStandardPct}%` : '—'),
                    },
                    {
                      key: 'belowMaterialCostWarning',
                      label: 'Margin warn',
                      render: (r) => (r.belowMaterialCostWarning ? 'Yes' : '—'),
                    },
                  ]}
                  rows={data.jobRows || []}
                />
              </FinanceReportPanel>
            </>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
