import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { apiFetch } from '../../lib/apiBase';
import { formatNgn } from '../../Data/mockData';
import {
  AccountingDeskKpiCard,
  AccountingDeskNotice,
  AccountingDeskPageIntro,
  ACCOUNTING_FIELD_LABEL,
  ACCOUNTING_INPUT,
} from './accounting/AccountingDeskUi';
import { AccountingDeskTableSection } from './accounting/AccountingDeskTableSection';
import { FinanceEmptyState } from './FinanceEmptyState';

const BRANCH_OPTIONS = [
  { id: 'ALL', label: 'All branches' },
  { id: 'BR-KD', label: 'Kaduna (HQ)' },
  { id: 'BR-YL', label: 'Yola' },
  { id: 'BR-MDG', label: 'Maiduguri' },
];

/**
 * Phase 3 — Finance/Pricing governance: cost variance, floor exceptions, margin consistency.
 */
export function PricingGovernancePanel({
  initialBranchId = 'ALL',
  deskLayout = false,
  autoLoad = true,
  enabled = true,
  deskRefresh = 0,
}) {
  const [branchId, setBranchId] = useState(initialBranchId || 'ALL');
  const [section, setSection] = useState('cost'); // cost | floor | margin
  const [flaggedOnly, setFlaggedOnly] = useState(true);
  const [pack, setPack] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [selectedMargin, setSelectedMargin] = useState(null);

  const load = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError('');
    const qs = new URLSearchParams();
    if (branchId && branchId !== 'ALL') qs.set('branchId', branchId);
    const res = await apiFetch(`/api/finance/pricing-governance?${qs}`).catch(() => ({ ok: false }));
    setLoading(false);
    if (!res.ok || res.data?.ok === false) {
      setError(res.data?.error || 'Could not load pricing governance.');
      setPack(null);
      return;
    }
    setPack(res.data);
  }, [branchId, enabled]);

  useEffect(() => {
    if (!autoLoad || !enabled) return;
    void load();
  }, [autoLoad, enabled, load, deskRefresh]);

  const thresholds = pack?.thresholds;
  const summary = pack?.summary;

  const costRows = useMemo(() => {
    const rows = Array.isArray(pack?.costVariance) ? pack.costVariance : [];
    return flaggedOnly ? rows.filter((r) => r.flagged) : rows;
  }, [pack, flaggedOnly]);

  const floorRows = useMemo(
    () => (Array.isArray(pack?.floorExceptions) ? pack.floorExceptions : []),
    [pack]
  );

  const marginRows = useMemo(() => {
    const rows = Array.isArray(pack?.marginConsistency) ? pack.marginConsistency : [];
    return flaggedOnly ? rows.filter((r) => r.flagged) : rows;
  }, [pack, flaggedOnly]);

  const filters = (
    <div className="flex flex-wrap items-end gap-3">
      <label className="block">
        <span className={ACCOUNTING_FIELD_LABEL}>Branch</span>
        <select
          className={ACCOUNTING_INPUT}
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
      <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 pb-2">
        <input
          type="checkbox"
          checked={flaggedOnly}
          onChange={(e) => setFlaggedOnly(e.target.checked)}
          className="rounded border-slate-300 accent-zarewa-teal"
        />
        Flagged only
      </label>
      <button
        type="button"
        onClick={() => void load()}
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} aria-hidden />
        Refresh
      </button>
    </div>
  );

  const sectionTabs = (
    <div className="flex flex-wrap gap-2">
      {[
        { id: 'cost', label: 'Cost variance' },
        { id: 'floor', label: 'Floor exceptions' },
        { id: 'margin', label: 'Margin consistency' },
      ].map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => {
            setSection(t.id);
            setSelectedFloor(null);
            setSelectedMargin(null);
          }}
          className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
            section === t.id
              ? 'bg-zarewa-teal text-white'
              : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className={deskLayout ? 'space-y-4' : 'space-y-5'}>
      <AccountingDeskPageIntro
        title="Pricing governance"
        description={`Workbook cost vs 30-day GRN WAC (flag ≥${thresholds?.costVariancePct ?? 8}%), MD floor-exception log, and Profit/Overhead consistency across material/gauge.`}
      />
      {filters}
      {error ? (
        <AccountingDeskNotice tone="warn">
          <span className="inline-flex items-start gap-1.5">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden />
            {error}
          </span>
        </AccountingDeskNotice>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <AccountingDeskKpiCard
          label="Cost variance flags"
          value={summary?.costVarianceFlagged ?? '—'}
          hint={`Threshold ${thresholds?.costVariancePct ?? 8}% vs GRN WAC`}
          tone={(summary?.costVarianceFlagged || 0) > 0 ? 'amber' : 'default'}
        />
        <AccountingDeskKpiCard
          label="Missing GRN WAC"
          value={summary?.costVarianceMissingGrn ?? '—'}
          hint="No coil receipts in lookback"
        />
        <AccountingDeskKpiCard
          label="Floor exceptions"
          value={summary?.floorExceptionCount ?? '—'}
          hint="MD-approved below-floor quotes"
          tone="teal"
        />
        <AccountingDeskKpiCard
          label="Margin inconsistencies"
          value={summary?.marginConsistencyFlagged ?? '—'}
          hint={`≥${thresholds?.marginConsistencyRelPct ?? 15}% and ₦${thresholds?.marginConsistencyAbsNgn ?? 50}/m spread`}
          tone={(summary?.marginConsistencyFlagged || 0) > 0 ? 'amber' : 'default'}
        />
      </div>

      {sectionTabs}

      {section === 'cost' ? (
        <AccountingDeskTableSection title="Cost variance register" description="Workbook cost_per_kg vs weighted-average GRN coil cost (30 days).">
          {loading && !pack ? (
            <p className="text-xs text-slate-500 py-6 text-center">Loading…</p>
          ) : costRows.length === 0 ? (
            <FinanceEmptyState title="No cost variance rows" description={flaggedOnly ? 'No flags at the current threshold.' : 'No workbook rows in scope.'} />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-xs">
                <thead className="border-b border-slate-100 text-ui-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="py-2 pr-3 font-bold">Material</th>
                    <th className="py-2 pr-3 font-bold">Gauge</th>
                    <th className="py-2 pr-3 font-bold">Branch</th>
                    <th className="py-2 pr-3 font-bold">Design</th>
                    <th className="py-2 pr-3 font-bold text-right">Workbook ₦/kg</th>
                    <th className="py-2 pr-3 font-bold text-right">GRN WAC ₦/kg</th>
                    <th className="py-2 pr-3 font-bold text-right">Δ %</th>
                    <th className="py-2 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {costRows.map((r) => (
                    <tr key={r.id} className="border-b border-slate-50">
                      <td className="py-2 pr-3 font-semibold text-slate-800">{r.materialKey}</td>
                      <td className="py-2 pr-3 tabular-nums">{r.gaugeMm}</td>
                      <td className="py-2 pr-3">{r.branchId}</td>
                      <td className="py-2 pr-3">{r.designKey || '—'}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{formatNgn(r.workbookCostPerKgNgn)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">
                        {r.grnWeightedAvgCostPerKgNgn != null ? formatNgn(r.grnWeightedAvgCostPerKgNgn) : '—'}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums font-bold">
                        {r.variancePct != null ? `${r.variancePct > 0 ? '+' : ''}${r.variancePct}%` : '—'}
                      </td>
                      <td className="py-2">
                        {r.flagged ? (
                          <span className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-ui-xs font-bold text-amber-900">
                            Flag
                          </span>
                        ) : r.grnWeightedAvgCostPerKgNgn == null ? (
                          <span className="text-slate-400">No GRN</span>
                        ) : (
                          <span className="text-slate-500">OK</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AccountingDeskTableSection>
      ) : null}

      {section === 'floor' ? (
        <AccountingDeskTableSection
          title="Floor exception log"
          description="Reuses MD price-exception approvals and snapshot (no new logging)."
        >
          {loading && !pack ? (
            <p className="text-xs text-slate-500 py-6 text-center">Loading…</p>
          ) : floorRows.length === 0 ? (
            <FinanceEmptyState title="No floor exceptions" description="No MD-approved below-floor quotes in scope." />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-xs">
                <thead className="border-b border-slate-100 text-ui-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="py-2 pr-3 font-bold">Quote</th>
                    <th className="py-2 pr-3 font-bold">Customer</th>
                    <th className="py-2 pr-3 font-bold">Branch</th>
                    <th className="py-2 pr-3 font-bold">Approved by</th>
                    <th className="py-2 pr-3 font-bold">When</th>
                    <th className="py-2 pr-3 font-bold text-right">Below floor (₦/m sum)</th>
                    <th className="py-2 font-bold"> </th>
                  </tr>
                </thead>
                <tbody>
                  {floorRows.map((r) => (
                    <tr key={r.quotationId} className="border-b border-slate-50">
                      <td className="py-2 pr-3 font-mono font-bold text-zarewa-teal">{r.quotationId}</td>
                      <td className="py-2 pr-3 font-semibold text-slate-800">{r.customerName}</td>
                      <td className="py-2 pr-3">{r.branchId}</td>
                      <td className="py-2 pr-3">{r.approvedByName || r.approvedByUserId || '—'}</td>
                      <td className="py-2 pr-3 text-slate-500">
                        {r.approvedAtIso ? new Date(r.approvedAtIso).toLocaleString() : '—'}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums font-bold text-amber-900">
                        {formatNgn(r.totalBelowFloorPerMeterNgn || 0)}
                      </td>
                      <td className="py-2">
                        <button
                          type="button"
                          className="text-ui-xs font-bold text-zarewa-teal hover:underline"
                          onClick={() => setSelectedFloor(r)}
                        >
                          Drill down
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {selectedFloor ? (
            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-black text-zarewa-teal">
                  {selectedFloor.quotationId} · line deltas
                </p>
                <Link
                  to={`/sales?q=${encodeURIComponent(selectedFloor.quotationId)}`}
                  className="text-ui-xs font-bold text-zarewa-teal hover:underline"
                >
                  Open in Sales
                </Link>
              </div>
              {(selectedFloor.lines || []).length === 0 ? (
                <p className="text-ui-xs text-slate-500">No snapshot lines stored on this approval.</p>
              ) : (
                <ul className="space-y-1.5">
                  {selectedFloor.lines.map((ln, i) => (
                    <li key={i} className="text-xs text-slate-700">
                      <span className="font-semibold">{ln.lineName || `Line ${Number(ln.lineIndex) + 1}`}</span>
                      {ln.gauge ? ` · ${ln.gauge}` : ''}
                      {ln.design ? ` · ${ln.design}` : ''}
                      <span className="block text-ui-xs text-slate-500 mt-0.5">
                        Quoted {ln.quotedPerMeter != null ? formatNgn(ln.quotedPerMeter) : '—'}/m · Floor{' '}
                        {ln.floorPerMeter != null ? formatNgn(ln.floorPerMeter) : '—'}/m · Below{' '}
                        <span className="font-bold text-amber-900">
                          {ln.belowFloorPerMeterNgn != null ? formatNgn(ln.belowFloorPerMeterNgn) : '—'}
                        </span>
                        /m
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                className="text-ui-xs font-bold text-slate-500 hover:underline"
                onClick={() => setSelectedFloor(null)}
              >
                Close
              </button>
            </div>
          ) : null}
        </AccountingDeskTableSection>
      ) : null}

      {section === 'margin' ? (
        <AccountingDeskTableSection
          title="Margin consistency"
          description="Same material/gauge with divergent Profit or Overhead across branch/design rows."
        >
          {loading && !pack ? (
            <p className="text-xs text-slate-500 py-6 text-center">Loading…</p>
          ) : marginRows.length === 0 ? (
            <FinanceEmptyState
              title="No margin inconsistencies"
              description={flaggedOnly ? 'No spreads beyond the threshold.' : 'No workbook groups in scope.'}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-xs">
                <thead className="border-b border-slate-100 text-ui-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="py-2 pr-3 font-bold">Material</th>
                    <th className="py-2 pr-3 font-bold">Gauge</th>
                    <th className="py-2 pr-3 font-bold text-right">Rows</th>
                    <th className="py-2 pr-3 font-bold text-right">Profit spread</th>
                    <th className="py-2 pr-3 font-bold text-right">Overhead spread</th>
                    <th className="py-2 font-bold"> </th>
                  </tr>
                </thead>
                <tbody>
                  {marginRows.map((r) => (
                    <tr key={`${r.materialKey}-${r.gaugeMm}`} className="border-b border-slate-50">
                      <td className="py-2 pr-3 font-semibold text-slate-800">{r.materialKey}</td>
                      <td className="py-2 pr-3 tabular-nums">{r.gaugeMm}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{r.rowCount}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">
                        {r.profitSpreadNgn != null ? (
                          <span className={r.profitFlagged ? 'font-bold text-amber-900' : ''}>
                            {formatNgn(r.profitSpreadNgn)} ({r.profitRelPct}%)
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">
                        {r.overheadSpreadNgn != null ? (
                          <span className={r.overheadFlagged ? 'font-bold text-amber-900' : ''}>
                            {formatNgn(r.overheadSpreadNgn)} ({r.overheadRelPct}%)
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-2">
                        <button
                          type="button"
                          className="text-ui-xs font-bold text-zarewa-teal hover:underline"
                          onClick={() => setSelectedMargin(r)}
                        >
                          Drill down
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {selectedMargin ? (
            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3 space-y-2">
              <p className="text-xs font-black text-zarewa-teal">
                {selectedMargin.materialKey} · {selectedMargin.gaugeMm} — row detail
              </p>
              <p className="text-ui-xs text-slate-500">{selectedMargin.note}</p>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-xs">
                  <thead className="text-ui-xs uppercase text-slate-500">
                    <tr>
                      <th className="py-1 pr-2">Branch</th>
                      <th className="py-1 pr-2">Design</th>
                      <th className="py-1 pr-2 text-right">Overhead ₦/m</th>
                      <th className="py-1 pr-2 text-right">Profit ₦/m</th>
                      <th className="py-1 text-right">Floor ₦/m</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedMargin.rows || []).map((row) => (
                      <tr key={row.id} className="border-t border-slate-100">
                        <td className="py-1.5 pr-2">{row.branchId}</td>
                        <td className="py-1.5 pr-2">{row.designKey || '—'}</td>
                        <td className="py-1.5 pr-2 text-right tabular-nums">{formatNgn(row.overheadNgnPerM)}</td>
                        <td className="py-1.5 pr-2 text-right tabular-nums">{formatNgn(row.profitNgnPerM)}</td>
                        <td className="py-1.5 text-right tabular-nums">{formatNgn(row.minimumPricePerMeterNgn)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                type="button"
                className="text-ui-xs font-bold text-slate-500 hover:underline"
                onClick={() => setSelectedMargin(null)}
              >
                Close
              </button>
            </div>
          ) : null}
        </AccountingDeskTableSection>
      ) : null}
    </div>
  );
}
