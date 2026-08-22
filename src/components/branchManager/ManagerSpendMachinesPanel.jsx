import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { apiFetch } from '../../lib/apiBase';
import { formatNgn } from '../../lib/formatNgn';
import { SURFACE, TEXT } from '../../lib/designTokens';
import { Button } from '../ui/button';
import {
  REPAIR_REPLACE_PCT_OF_COST,
  REPAIR_REPLACE_PCT_OF_NBV,
  REPAIR_WATCH_PCT_OF_COST,
} from '../../shared/maintenanceRepairReplace';
import { userMayEditMachines } from '../../shared/maintenanceRegistry';
import { FinanceSequencePanel } from '../layout';
import { MachineDossierModal } from '../operations/MachineDossierModal';
import { MachineRegisterModal } from '../operations/MachineRegisterModal';
import { MaintenanceVendorsPanel } from './MaintenanceVendorsPanel';

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
  branches = [],
  roleKey = '',
  onOpenWorkOrder,
}) {
  const canEdit = userMayEditMachines(roleKey);
  const [pack, setPack] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dossierId, setDossierId] = useState('');
  const [registerOpen, setRegisterOpen] = useState(false);
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

  const openDossier = (machine) => {
    setDossierId(String(machine.machineId || machine.id || '').trim());
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
            <h3 className="text-sm font-semibold tracking-tight text-zarewa-teal">Machines</h3>
            <p className={`mt-0.5 ${TEXT.label}`}>Repair vs replace · lifetime file from cost lines</p>
            <p className="mt-2 rounded-md border border-amber-100 bg-amber-50/80 px-2.5 py-1.5 text-ui-xs text-amber-900">
              Watch at ≥{REPAIR_WATCH_PCT_OF_COST}% of asset cost · Replace review at ≥{REPAIR_REPLACE_PCT_OF_COST}% of
              cost or ≥{REPAIR_REPLACE_PCT_OF_NBV}% of NBV. Cost lines only when linked to a payment request / expense —
              consumables stay out. Does not change category expense totals above.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canEdit ? (
              <Button type="button" size="sm" onClick={() => setRegisterOpen(true)}>
                <Plus size={14} /> Register machine
              </Button>
            ) : null}
            <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
              Refresh
            </Button>
          </div>
        </div>

        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className={`${SURFACE.card} p-3`}>
            <p className={TEXT.labelCaps}>Machines</p>
            <p className="z-stencil mt-1 text-xl font-semibold text-zarewa-teal">
              {loading ? '…' : summary.machineCount ?? 0}
            </p>
          </div>
          <div className={`${SURFACE.card} p-3`}>
            <p className={TEXT.labelCaps}>Attributed spend</p>
            <p className="z-stencil mt-1 text-xl font-semibold text-zarewa-teal">
              {loading ? '…' : formatNgn(summary.totalAttributedNgn || 0)}
            </p>
          </div>
          <div className="rounded-md border border-amber-200 bg-amber-50/50 p-3">
            <p className="text-ui-xs font-semibold uppercase tracking-wide text-amber-700">Watch</p>
            <p className="z-stencil mt-1 text-xl font-semibold text-amber-900">
              {loading ? '…' : summary.watchCount ?? 0}
            </p>
          </div>
          <div className="rounded-md border border-rose-200 bg-rose-50/40 p-3">
            <p className="text-ui-xs font-semibold uppercase tracking-wide text-rose-800">Replace review</p>
            <p className="z-stencil mt-1 text-xl font-semibold text-rose-900">
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
          <div className="space-y-2 py-6" aria-busy="true" aria-label="Loading machine costs">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-md bg-[var(--z-surface-muted)]" />
            ))}
          </div>
        ) : machines.length === 0 ? (
          <div className={`${SURFACE.muted} px-4 py-8 text-center`}>
            <p className="text-sm font-semibold text-[var(--z-text)]">No machines on the plant register</p>
            <p className={`mt-1 ${TEXT.label}`}>
              Register here. Operations reports faults; it does not add machines.
            </p>
            {canEdit ? (
              <Button type="button" size="sm" className="mt-3" onClick={() => setRegisterOpen(true)}>
                <Plus size={14} /> Register machine
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border border-[var(--z-border)]">
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
                        onClick={() => openDossier(m)}
                      >
                        {m.name || m.machineCode || m.machineId}
                      </button>
                      <span className="mt-0.5 block text-ui-xs font-medium text-slate-400">
                        Open file for what’s wrong, history, and next steps
                      </span>
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
                    <td className="px-3 py-2 text-right z-stencil font-semibold text-[var(--z-text)]">
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
            Not true runtime utilization — metres produced and work-order downtime hours only. Do not treat as % uptime.
          </p>
        </div>
        {loading ? (
          <p className="text-xs text-slate-500 py-4 text-center">Loading…</p>
        ) : machines.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">No machines in insights pack.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-[var(--z-border)]">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-slate-50 text-ui-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-bold">Machine</th>
                  <th className="px-3 py-2 font-bold text-right">Output metres</th>
                  <th className="px-3 py-2 font-bold text-right">Downtime hours</th>
                </tr>
              </thead>
              <tbody>
                {machines.slice(0, 12).map((m) => (
                  <tr key={m.machineId || m.id || m.name} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-semibold text-slate-900">{m.name || m.machineId}</td>
                    <td className="px-3 py-2 text-right z-stencil text-slate-700">
                      {Number(m.outputMetres ?? m.lifetimeMetres ?? m.meterReading ?? 0) > 0
                        ? Number(m.outputMetres ?? m.lifetimeMetres ?? m.meterReading ?? 0).toLocaleString('en-NG')
                        : 'No production metres linked'}
                    </td>
                    <td className="px-3 py-2 text-right z-stencil text-slate-700">
                      {Number(m.downtimeHours ?? m.openDowntimeHours ?? 0) > 0
                        ? `${Number(m.downtimeHours ?? m.openDowntimeHours ?? 0).toLocaleString('en-NG')} h`
                        : 'No work-order downtime'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </FinanceSequencePanel>

      <MaintenanceVendorsPanel
        roleKey={roleKey}
        branchId={effectiveBranchId || branchId}
        branches={branches}
      />

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
          <div className="overflow-x-auto rounded-md border border-[var(--z-border)]">
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

      <MachineDossierModal
        machineId={dossierId}
        onClose={() => setDossierId('')}
        roleKey={roleKey}
        onActOnWorkOrder={
          onOpenWorkOrder
            ? (wid) => {
                setDossierId('');
                onOpenWorkOrder(wid);
              }
            : undefined
        }
      />
      <MachineRegisterModal
        isOpen={registerOpen}
        onClose={() => setRegisterOpen(false)}
        branchId={effectiveBranchId || branchId}
        onSaved={() => void load()}
      />
    </div>
  );
}
