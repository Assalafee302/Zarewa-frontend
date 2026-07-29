import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../lib/apiBase';
import { formatNgn } from '../../lib/formatNgn';
import {
  REPAIR_REPLACE_PCT_OF_COST,
  REPAIR_REPLACE_PCT_OF_NBV,
  REPAIR_WATCH_PCT_OF_COST,
} from '../../shared/maintenanceRepairReplace';
import { FinanceSequencePanel, ModalFrame } from '../layout';

function flagToneClass(flag) {
  switch (flag) {
    case 'urgent':
    case 'replace_review':
      return 'border-rose-200 bg-rose-50 text-rose-900';
    case 'watch':
      return 'border-amber-200 bg-amber-50 text-amber-900';
    default:
      return 'border-slate-200 bg-slate-50 text-slate-700';
  }
}

function ratioLabel(row) {
  if (row.costNgn == null && row.netBookValueNgn == null) return '—';
  const parts = [];
  if (row.pctOfCost != null) parts.push(`${row.pctOfCost}% of cost`);
  if (row.pctOfNbv != null) parts.push(`${row.pctOfNbv}% of NBV`);
  return parts.join(' · ') || '—';
}

/**
 * Spend → Machines: repair-vs-replace from GET /api/maintenance/insights + vendor comparison.
 * Additive to category Spend totals (does not recalculate them).
 */
export function ManagerSpendMachinesPanel({
  branchId = '',
  filterBranchId = '',
  viewAllBranches = false,
  branchNameById = null,
}) {
  const [pack, setPack] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [history, setHistory] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [vendorSort, setVendorSort] = useState('avgCostPerJobNgn');
  const [vendorSortDir, setVendorSortDir] = useState('desc');

  const effectiveBranchId = viewAllBranches ? String(filterBranchId || '').trim() : String(branchId || '').trim();

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const qs = new URLSearchParams();
    if (viewAllBranches && effectiveBranchId) qs.set('branchId', effectiveBranchId);
    const q = qs.toString();
    const res = await apiFetch(`/api/maintenance/insights${q ? `?${q}` : ''}`).catch(() => ({
      ok: false,
    }));
    setLoading(false);
    if (!res.ok || res.data?.ok === false) {
      setError(res.data?.error || 'Could not load machine maintenance insights.');
      setPack(null);
      return;
    }
    setPack(res.data);
  }, [effectiveBranchId, viewAllBranches]);

  useEffect(() => {
    void load();
  }, [load]);

  const branchLabel = useCallback(
    (id) => {
      const key = String(id || '').trim();
      if (!key) return '—';
      if (branchNameById?.get?.(key)) return branchNameById.get(key);
      return key;
    },
    [branchNameById]
  );

  const openHistory = async (machine) => {
    setHistory({ machine, workOrders: [] });
    setHistoryLoading(true);
    const res = await apiFetch('/api/maintenance/work-orders').catch(() => ({ ok: false }));
    setHistoryLoading(false);
    const all = Array.isArray(res.data?.workOrders) ? res.data.workOrders : [];
    const mid = String(machine.machineId || '');
    setHistory({
      machine,
      workOrders: all.filter((wo) => String(wo.machineId || '') === mid),
    });
  };

  const machines = useMemo(() => (Array.isArray(pack?.machines) ? pack.machines : []), [pack]);
  const vendors = useMemo(() => {
    const list = [...(Array.isArray(pack?.vendors) ? pack.vendors : [])];
    return list.sort((a, b) => vendorSortDir === 'asc' ? Number(a[vendorSort] || 0) - Number(b[vendorSort] || 0) : Number(b[vendorSort] || 0) - Number(a[vendorSort] || 0));
  }, [pack, vendorSort, vendorSortDir]);
  const summary = pack?.summary || {};
  const toggleVendorSort = (field) => {
    if (field === vendorSort) setVendorSortDir((dir) => dir === 'asc' ? 'desc' : 'asc');
    else {
      setVendorSort(field);
      setVendorSortDir('desc');
    }
  };

  return (
    <div className="space-y-4">
      <FinanceSequencePanel className="!min-h-0 sm:!min-h-0 p-5 sm:p-5 bg-white">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-black text-zarewa-teal tracking-tight">Machines</h3>
            <p className="text-xs text-slate-500 mt-0.5">Repair vs replace · lifetime maintenance from cost lines</p>
            <p className="mt-2 rounded-lg border border-amber-100 bg-amber-50/80 px-2.5 py-1.5 text-ui-xs text-amber-900">
              Watch at ≥{REPAIR_WATCH_PCT_OF_COST}% of asset cost · Replace review at ≥{REPAIR_REPLACE_PCT_OF_COST}% of
              cost or ≥{REPAIR_REPLACE_PCT_OF_NBV}% of NBV. Cost lines only when linked to a payment request / expense —
              consumables stay out. Does not change category expense totals above.
            </p>
          </div>
          <button
            type="button"
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-ui-xs font-bold uppercase text-slate-600 hover:border-zarewa-teal"
            onClick={() => void load()}
          >
            Refresh
          </button>
        </div>

        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-ui-xs font-bold uppercase tracking-wide text-slate-500">Machines</p>
            <p className="mt-1 text-xl font-black tabular-nums text-zarewa-teal">
              {loading ? '…' : summary.machineCount ?? 0}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-ui-xs font-bold uppercase tracking-wide text-slate-500">Attributed spend</p>
            <p className="mt-1 text-xl font-black tabular-nums text-zarewa-teal">
              {loading ? '…' : formatNgn(summary.totalAttributedNgn || 0)}
            </p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3">
            <p className="text-ui-xs font-bold uppercase tracking-wide text-amber-700">Watch</p>
            <p className="mt-1 text-xl font-black tabular-nums text-amber-900">
              {loading ? '…' : summary.watchCount ?? 0}
            </p>
          </div>
          <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-3">
            <p className="text-ui-xs font-bold uppercase tracking-wide text-rose-800">Replace review</p>
            <p className="mt-1 text-xl font-black tabular-nums text-rose-900">
              {loading ? '…' : summary.replaceReviewCount ?? 0}
            </p>
          </div>
        </div>

        {error ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs font-semibold text-amber-950">
            {error}
          </p>
        ) : null}

        {loading ? (
          <p className="text-xs text-slate-500 py-8 text-center">Loading machine costs…</p>
        ) : machines.length === 0 ? (
          <p className="text-xs text-slate-500 py-8 text-center">No machines in the registry for this scope.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-slate-50 text-ui-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-bold">Machine</th>
                  <th className="px-3 py-2 font-bold">Branch</th>
                  <th className="px-3 py-2 font-bold text-right">Lifetime maint.</th>
                  <th className="px-3 py-2 font-bold">Cost / NBV</th>
                  <th className="px-3 py-2 font-bold">Flag</th>
                </tr>
              </thead>
              <tbody>
                {machines.map((m) => (
                  <tr key={m.machineId} className="border-t border-slate-100">
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        className="text-left font-bold text-zarewa-teal hover:underline"
                        onClick={() => void openHistory(m)}
                      >
                        {m.name || m.machineCode || m.machineId}
                      </button>
                      {m.machineCode ? (
                        <span className="mt-0.5 block text-ui-xs font-medium text-slate-400">{m.machineCode}</span>
                      ) : null}
                      {!m.assetId ? (
                        <span className="mt-0.5 block text-ui-xs font-medium text-amber-800">
                          Not linked to an asset record
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-slate-700">{branchLabel(m.branchId)}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-900">
                      {formatNgn(m.lifetimeMaintenanceNgn || 0)}
                    </td>
                    <td className="px-3 py-2 text-slate-600">
                      <span className="block">{ratioLabel(m)}</span>
                      {m.assetId ? (
                        <span className="mt-0.5 block text-ui-xs text-slate-400">
                          Cost {formatNgn(m.costNgn || 0)} · NBV {formatNgn(m.netBookValueNgn || 0)}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex rounded-md border px-1.5 py-0.5 text-ui-xs font-black uppercase ${flagToneClass(
                          m.flag
                        )}`}
                      >
                        {m.flagLabel || m.flag || 'OK'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </FinanceSequencePanel>

      <FinanceSequencePanel className="!min-h-0 sm:!min-h-0 p-5 sm:p-5 bg-white">
        <div className="mb-3">
          <h3 className="text-sm font-black text-zarewa-teal tracking-tight">Output & downtime proxies</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Not true runtime utilization — metres produced and WO downtime hours only. Do not treat as % uptime.
          </p>
        </div>
        {loading ? (
          <p className="text-xs text-slate-500 py-4 text-center">Loading…</p>
        ) : machines.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">No machines in insights pack.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-slate-50 text-ui-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-bold">Machine</th>
                  <th className="px-3 py-2 font-bold text-right">Output metres (proxy)</th>
                  <th className="px-3 py-2 font-bold text-right">Downtime hrs (proxy)</th>
                </tr>
              </thead>
              <tbody>
                {machines.slice(0, 12).map((m) => (
                  <tr key={m.machineId || m.id || m.name} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-semibold text-slate-900">{m.name || m.machineId}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-700">
                      {Number(m.outputMetres ?? m.lifetimeMetres ?? m.meterReading ?? 0) > 0 ? Number(m.outputMetres ?? m.lifetimeMetres ?? m.meterReading ?? 0).toLocaleString('en-NG') : 'Not linked from production yet'}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-700">
                      {Number(m.downtimeHours ?? m.openDowntimeHours ?? 0) > 0 ? Number(m.downtimeHours ?? m.openDowntimeHours ?? 0).toLocaleString('en-NG') : 'Not linked from production yet'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </FinanceSequencePanel>

      <FinanceSequencePanel className="!min-h-0 sm:!min-h-0 p-5 sm:p-5 bg-white">
        <div className="mb-3">
          <h3 className="text-sm font-black text-zarewa-teal tracking-tight">Vendor cost comparison</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Total expenses, job count, and average cost per job by vendor (from cost lines on work orders)
          </p>
        </div>
        {loading ? (
          <p className="text-xs text-slate-500 py-6 text-center">Loading vendors…</p>
        ) : vendors.length === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center">
            No vendor-attributed maintenance cost lines yet. Post cost lines on work orders after linking expenses.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-slate-50 text-ui-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-bold">Vendor</th>
                  <th className="px-3 py-2 font-bold text-right"><button type="button" onClick={() => toggleVendorSort('totalNgn')} className="hover:text-zarewa-teal">Total expenses {vendorSort === 'totalNgn' ? (vendorSortDir === 'asc' ? '↑' : '↓') : ''}</button></th>
                  <th className="px-3 py-2 font-bold text-right">Jobs</th>
                  <th className="px-3 py-2 font-bold text-right"><button type="button" onClick={() => toggleVendorSort('avgCostPerJobNgn')} className="hover:text-zarewa-teal">Avg / job {vendorSort === 'avgCostPerJobNgn' ? (vendorSortDir === 'asc' ? '↑' : '↓') : ''}</button></th>
                </tr>
              </thead>
              <tbody>
                {vendors.map((v) => (
                  <tr key={v.vendorKey || v.vendorId || v.vendorName} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-semibold text-slate-900">{v.vendorName}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold">{formatNgn(v.totalNgn)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-700">{v.jobCount ?? v.lineCount ?? 0}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-700">
                      {formatNgn(v.avgCostPerJobNgn || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </FinanceSequencePanel>

      <ModalFrame
        isOpen={Boolean(history)}
        onClose={() => setHistory(null)}
        title="Work order history"
        surface="plain"
      >
        {history ? (
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden">
            <div className="border-b border-slate-100 px-4 py-3">
              <p className="text-sm font-black text-zarewa-teal">
                {history.machine?.name || history.machine?.machineId}
              </p>
              <p className="text-ui-xs text-slate-500">
                Lifetime {formatNgn(history.machine?.lifetimeMaintenanceNgn || 0)}
                {history.machine?.flagLabel ? ` · ${history.machine.flagLabel}` : ''}
              </p>
            </div>
            <div className="max-h-[min(60dvh,480px)] overflow-auto">
              {historyLoading ? (
                <p className="text-xs text-slate-500 py-8 text-center">Loading work orders…</p>
              ) : history.workOrders?.length ? (
                <ul className="divide-y divide-slate-100">
                  {history.workOrders.map((wo) => (
                    <li key={wo.id} className="px-4 py-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs font-bold text-slate-900">{wo.referenceNo || wo.id}</p>
                        <span
                          className={`rounded-md border px-1.5 py-0.5 text-ui-xs font-black uppercase ${
                            String(wo.priority || '').toLowerCase() === 'machine_down'
                              ? 'border-rose-200 bg-rose-50 text-rose-900'
                              : 'border-amber-200 bg-amber-50 text-amber-900'
                          }`}
                        >
                          {String(wo.priority || 'normal').replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p className="mt-0.5 text-ui-xs text-slate-600 truncate">{wo.symptom || wo.summary}</p>
                      <p className="mt-0.5 text-ui-xs text-slate-400 capitalize">
                        {wo.status}
                        {wo.openedAtIso ? ` · opened ${String(wo.openedAtIso).slice(0, 10)}` : ''}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-500 py-8 text-center">No work orders for this machine.</p>
              )}
            </div>
            <div className="border-t border-slate-100 px-4 py-3">
              <button
                type="button"
                className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-ui-xs font-bold uppercase text-slate-600"
                onClick={() => setHistory(null)}
              >
                Close
              </button>
            </div>
          </div>
        ) : null}
      </ModalFrame>
    </div>
  );
}
