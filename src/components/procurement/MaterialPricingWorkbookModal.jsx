import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X } from 'lucide-react';
import { ModalFrame } from '../layout';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useToast } from '../../context/ToastContext';
import { apiFetch } from '../../lib/apiBase';
import { formatNgn } from '../../Data/mockData';
import { listPriceFromFloorAndCommission } from '../../lib/publishedPrice.js';
import {
  MaterialWorkbookCustomerPrintView,
  MaterialWorkbookOfficialPrintView,
} from './MaterialPricingWorkbookPrintViews.jsx';

const MATERIAL_OPTIONS = [
  { key: 'alu', label: 'Aluminium' },
  { key: 'aluzinc', label: 'Aluzinc (PPGI)' },
  { key: 'stone-coated', label: 'Stone-coated' },
];

function fmtConv2(v) {
  if (v == null || !Number.isFinite(Number(v))) return '—';
  return Number(v).toFixed(2);
}

function numOrUndef(v) {
  const t = String(v ?? '').trim();
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

function costPerM(used, costKg) {
  const u = Number(used);
  const c = Number(costKg);
  if (!Number.isFinite(u) || u <= 0 || !Number.isFinite(c) || c < 0) return null;
  return u * c;
}

function suggested(used, costKg, oh, pr) {
  const u = Number(used);
  const ck = Number(costKg);
  const o = Number(oh) || 0;
  const p = Number(pr) || 0;
  if (!Number.isFinite(u) || u <= 0 || !Number.isFinite(ck) || ck < 0) return null;
  return Math.round(u * ck + o + p);
}

/** Effective kg/m for economics: draft override, else data average (usedSuggested), else merged API used. */
function effectiveUsedKgPerM(draftStr, resolved) {
  const d = numOrUndef(draftStr);
  if (d != null && d > 0) return d;
  const us = resolved?.usedSuggested;
  if (us != null && Number.isFinite(Number(us)) && Number(us) > 0) return Number(us);
  const u = resolved?.used;
  if (u != null && Number.isFinite(Number(u)) && Number(u) > 0) return Number(u);
  return null;
}

/** Merge current on-screen drafts into one material sheet payload for print preview. */
function mergeDraftIntoSheet(sheet, draftByGauge) {
  if (!sheet?.ok || !draftByGauge) return sheet;
  const designRows = (sheet.rows || []).filter((r) => String(r.designKey || '').trim());
  const baseRows = (sheet.gauges || []).map((g) => {
    const existing = (sheet.rows || []).find((r) => r.gaugeMm === g && !String(r.designKey || '').trim());
    const row = existing
      ? { ...existing }
      : {
          gaugeMm: g,
          designKey: '',
          materialKey: sheet.materialKey,
          branchId: sheet.branchId,
          costPerKgNgn: 0,
          overheadNgnPerM: 0,
          profitNgnPerM: 0,
          minimumPricePerMeterNgn: 0,
          commissionNgnPerM: 0,
          conversionUsedKgPerM: null,
          notes: '',
        };
    const dr = draftByGauge[g];
    if (dr) {
      const ck = numOrUndef(dr.costPerKgNgn);
      if (ck !== undefined) row.costPerKgNgn = ck;
      const oh = numOrUndef(dr.overheadNgnPerM);
      if (oh !== undefined) row.overheadNgnPerM = oh;
      const pr = numOrUndef(dr.profitNgnPerM);
      if (pr !== undefined) row.profitNgnPerM = pr;
      const mn = numOrUndef(dr.minimumPricePerMeterNgn);
      if (mn !== undefined) row.minimumPricePerMeterNgn = Math.round(mn);
      const cm = numOrUndef(dr.commissionNgnPerM);
      if (cm !== undefined) row.commissionNgnPerM = Math.max(0, cm);
      const uStr = String(dr.conversionUsedKgPerM ?? '').trim();
      if (uStr !== '') {
        const n = Number(uStr);
        if (Number.isFinite(n) && n > 0) row.conversionUsedKgPerM = n;
      }
    }
    return row;
  });
  return { ...sheet, rows: [...baseRows, ...designRows] };
}

/**
 * Coil material pricing workbook: conversions, suggested ₦/m, minimum floor, change log.
 * @param {{ open: boolean; onClose: () => void; initialMaterialKey?: string }} props
 */
export function MaterialPricingWorkbookModal({ open, onClose, initialMaterialKey = 'alu' }) {
  const ws = useWorkspace();
  const { show: showToast } = useToast();
  const branches = useMemo(
    () => ws?.snapshot?.workspaceBranches ?? ws?.session?.branches ?? [],
    [ws?.snapshot?.workspaceBranches, ws?.session?.branches]
  );
  const [materialKey, setMaterialKey] = useState(initialMaterialKey);
  const [branchId, setBranchId] = useState(() => branches[0]?.id || '');
  const [sheet, setSheet] = useState(null);
  const [events, setEvents] = useState([]);
  const [busy, setBusy] = useState(false);
  const [savingAll, setSavingAll] = useState(false);
  const [draftByGauge, setDraftByGauge] = useState({});
  const [printPreview, setPrintPreview] = useState(null);
  const [printPack, setPrintPack] = useState(null);
  const [printLoading, setPrintLoading] = useState(false);

  useEffect(() => {
    if (open) setMaterialKey(initialMaterialKey);
  }, [open, initialMaterialKey]);

  useEffect(() => {
    if (branches.length && !branches.some((b) => b.id === branchId)) {
      setBranchId(branches[0]?.id || '');
    }
  }, [branches, branchId]);

  const loadEvents = useCallback(async (mk) => {
    const { ok, data } = await apiFetch(
      `/api/pricing/material-sheet/events?materialKey=${encodeURIComponent(mk)}&limit=60`
    );
    if (ok && data?.ok) setEvents(data.events || []);
    else setEvents([]);
  }, []);

  const loadSheet = useCallback(async () => {
    if (!materialKey || !branchId) return;
    setBusy(true);
    const [r1, r2] = await Promise.all([
      apiFetch(
        `/api/pricing/material-sheet?materialKey=${encodeURIComponent(materialKey)}&branchId=${encodeURIComponent(branchId)}`
      ),
      apiFetch(
        `/api/pricing/material-sheet/events?materialKey=${encodeURIComponent(materialKey)}&limit=60`
      ),
    ]);
    setBusy(false);
    if (!r1.ok || !r1.data?.ok) {
      setSheet(null);
      setDraftByGauge({});
      showToast(r1.data?.error || 'Could not load workbook.', { variant: 'error' });
      return;
    }
    setSheet(r1.data);
    if (r2.ok && r2.data?.ok) setEvents(r2.data.events || []);

    const isStone = Boolean(r1.data.isStoneCoatedWorkbook);
    const recCost = r1.data.recommendedCostPerKgNgn;
    const d = {};
    for (const g of r1.data.gauges || []) {
      const row = (r1.data.rows || []).find((x) => x.gaugeMm === g && !x.designKey);
      let costStr = row?.costPerKgNgn != null && Number(row.costPerKgNgn) > 0 ? String(row.costPerKgNgn) : '';
      if (!costStr && recCost != null && Number(recCost) > 0 && !isStone) {
        costStr = String(recCost);
      }
      const rv = r1.data.resolvedByGauge?.[g] || {};
      const usedStored = row?.conversionUsedKgPerM;
      const usedSuggested = rv.usedSuggested;
      const hasDistinctStored =
        usedStored != null &&
        Number(usedStored) > 0 &&
        (usedSuggested == null ||
          !Number.isFinite(Number(usedSuggested)) ||
          Math.abs(Number(usedStored) - Number(usedSuggested)) > 1e-6);
      d[g] = {
        costPerKgNgn: costStr,
        conversionUsedKgPerM:
          hasDistinctStored && usedStored != null ? String(usedStored) : '',
        overheadNgnPerM: row?.overheadNgnPerM != null ? String(row.overheadNgnPerM) : '',
        profitNgnPerM: row?.profitNgnPerM != null ? String(row.profitNgnPerM) : '',
        commissionNgnPerM: row?.commissionNgnPerM != null && Number(row.commissionNgnPerM) > 0 ? String(row.commissionNgnPerM) : '',
        minimumPricePerMeterNgn: row?.minimumPricePerMeterNgn != null ? String(row.minimumPricePerMeterNgn) : '',
        notes: row?.notes || '',
        syncMinimumToPriceList: false,
        syncDesignKey: isStone ? 'stone-coated' : '',
      };
    }
    setDraftByGauge(d);
  }, [materialKey, branchId, showToast]);

  useEffect(() => {
    if (open && branchId) void loadSheet();
  }, [open, branchId, materialKey, loadSheet]);

  useEffect(() => {
    if (!printPreview) return undefined;
    const el = document.createElement('style');
    el.setAttribute('data-workbook-print', '1');
    el.textContent = `@media print {
  body * { visibility: hidden !important; }
  #workbook-print-root, #workbook-print-root * { visibility: visible !important; }
  #workbook-print-root { position: absolute; left: 0; top: 0; width: 100%; background: #fff; }
  #workbook-print-actions, #workbook-print-actions * { display: none !important; }
}`;
    document.head.appendChild(el);
    return () => {
      el.remove();
    };
  }, [printPreview]);

  const buildPersistBody = (gaugeMm) => {
    const dr = draftByGauge[gaugeMm];
    if (!dr || !branchId) return null;
    const uStr = String(dr.conversionUsedKgPerM ?? '').trim();
    let conversionUsedKgPerM = null;
    if (uStr !== '') {
      const n = Number(uStr);
      conversionUsedKgPerM = Number.isFinite(n) && n > 0 ? n : null;
    }
    return {
      materialKey,
      gaugeMm,
      branchId,
      designKey: '',
      costPerKgNgn: numOrUndef(dr.costPerKgNgn) ?? 0,
      conversionUsedKgPerM,
      overheadNgnPerM: numOrUndef(dr.overheadNgnPerM) ?? 0,
      profitNgnPerM: numOrUndef(dr.profitNgnPerM) ?? 0,
      commissionNgnPerM: Math.max(0, numOrUndef(dr.commissionNgnPerM) ?? 0),
      minimumPricePerMeterNgn: Math.round(Number(dr.minimumPricePerMeterNgn) || 0),
      notes: dr.notes?.trim() || undefined,
      syncMinimumToPriceList: Boolean(dr.syncMinimumToPriceList),
      syncDesignKey: dr.syncDesignKey?.trim() || undefined,
    };
  };

  const persistAllRows = async () => {
    const gauges = sheet?.gauges || [];
    if (!branchId || !gauges.length || savingAll || busy) return;
    setSavingAll(true);
    let saved = 0;
    let firstError = '';
    let priceListSyncWarning = '';
    for (const g of gauges) {
      const body = buildPersistBody(g);
      if (!body) continue;
      const { ok, data } = await apiFetch('/api/pricing/material-sheet/rows', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      if (!ok || !data?.ok) {
        firstError = data?.error || 'Save failed.';
        break;
      }
      saved += 1;
      if (data.priceListSync && !data.priceListSync.ok && !priceListSyncWarning) {
        priceListSyncWarning = data.priceListSync.error || 'Price list sync skipped for at least one row.';
      }
    }
    setSavingAll(false);
    if (firstError) {
      showToast(`${firstError} (stopped at ${saved}/${gauges.length} saved)`, { variant: 'error' });
      if (saved > 0) {
        void loadSheet();
        void loadEvents(materialKey);
      }
      return;
    }
    if (saved === 0) {
      showToast('Nothing to save.', { variant: 'error' });
      return;
    }
    showToast(
      priceListSyncWarning
        ? `Saved ${saved} gauge row(s). ${priceListSyncWarning}`
        : `Saved ${saved} gauge row(s).`
    );
    void loadSheet();
    void loadEvents(materialKey);
  };

  const branchRecord = branches.find((b) => b.id === branchId);
  const branchName = branchRecord?.name || branchRecord?.code || branchId;

  const effectiveDateLabel = useMemo(
    () => new Date().toLocaleDateString('en-NG', { dateStyle: 'long' }),
    [printPreview]
  );

  const loadPrintPack = useCallback(
    async (kind) => {
      if (!branchId) return;
      setPrintLoading(true);
      try {
        const matKeys = ['alu', 'aluzinc', 'stone-coated'];
        const sheetReqs = matKeys.map((mk) =>
          apiFetch(
            `/api/pricing/material-sheet?materialKey=${encodeURIComponent(mk)}&branchId=${encodeURIComponent(branchId)}`
          )
        );
        const [policyR, extrasR, ...sheetRs] = await Promise.all([
          apiFetch('/api/pricing/policy'),
          apiFetch('/api/pricing/material-workbook-print-extras'),
          ...sheetReqs,
        ]);
        const sheets = sheetRs.map((r) => r.data).filter((d) => d?.ok);
        if (sheets.length < 3) {
          showToast('Could not load all workbook sections for print.', { variant: 'error' });
          return;
        }
        const merged = sheets.map((s) => (s.materialKey === materialKey ? mergeDraftIntoSheet(s, draftByGauge) : s));
        setPrintPack({
          sheets: merged,
          accessories: extrasR.ok && extrasR.data?.ok ? extrasR.data.accessories || [] : [],
          ridgeAddOns: policyR.ok && policyR.data?.ridgeAddOns ? policyR.data.ridgeAddOns : [],
        });
        setPrintPreview(kind);
      } catch {
        showToast('Could not load print data.', { variant: 'error' });
      } finally {
        setPrintLoading(false);
      }
    },
    [branchId, draftByGauge, materialKey, showToast]
  );

  const setDraft = (gaugeMm, patch) => {
    setDraftByGauge((prev) => ({
      ...prev,
      [gaugeMm]: { ...prev[gaugeMm], ...patch },
    }));
  };

  const setCostPerKgAllGauges = useCallback(
    (raw) => {
      const gauges = sheet?.gauges || [];
      setDraftByGauge((prev) => {
        const next = { ...prev };
        for (const g of gauges) {
          const row = next[g];
          if (!row) continue;
          next[g] = { ...row, costPerKgNgn: raw };
        }
        return next;
      });
    },
    [sheet?.gauges]
  );

  const materialCostPerKgFieldValue = useMemo(() => {
    const gauges = sheet?.gauges || [];
    const vals = gauges
      .map((g) => String(draftByGauge[g]?.costPerKgNgn ?? '').trim())
      .filter((s) => s.length > 0);
    if (!vals.length) return '';
    const first = vals[0];
    return vals.every((v) => v === first) ? first : '';
  }, [sheet?.gauges, draftByGauge]);

  const recCostLabel = sheet?.recommendedCostPerKgNgn;
  const lookbackDays = sheet?.purchaseCostLookbackDays ?? 30;

  const materialCostPerKgMixed = useMemo(() => {
    const gauges = sheet?.gauges || [];
    const vals = gauges
      .map((g) => String(draftByGauge[g]?.costPerKgNgn ?? '').trim())
      .filter((s) => s.length > 0);
    if (vals.length < 2) return false;
    const first = vals[0];
    return !vals.every((v) => v === first);
  }, [sheet?.gauges, draftByGauge]);

  return (
    <ModalFrame isOpen={open} onClose={onClose} modal={!printPreview}>
      <div className="z-modal-panel max-w-[min(96vw,1100px)] max-h-[min(90vh,820px)] flex flex-col p-0 overflow-hidden">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 bg-slate-50/80 px-4 py-3 sm:px-5">
          <div>
            <h2 className="text-base font-black text-[#134e4a]">Material pricing workbook</h2>
            <p className="text-[10px] text-slate-600 mt-1 max-w-xl leading-relaxed">
              <strong className="text-slate-800">Std / Ref / Hist</strong> kg/m are <strong>read-only</strong> from data
              (theory/catalog, last {lookbackDays}d purchases, last {lookbackDays}d production checks).{' '}
              <strong className="text-slate-800">Used</strong> defaults to the average of those three; leave blank to keep the
              average or type an override (two decimal places). Stone-coated: enter <strong>minimum ₦/m</strong> per gauge and
              sync to the price list. <strong className="text-slate-800">₦/kg</strong> defaults from{' '}
              <strong>weighted average</strong> coil cost for this branch (last {lookbackDays} days) when available.{' '}
              <strong className="text-slate-800">Suggested ₦/m</strong> = used kg/m × ₦/kg + overhead + profit.{' '}
              <strong className="text-slate-800">Floor</strong> is the minimum ₦/m; <strong className="text-slate-800">commission</strong>{' '}
              is added to the floor, then <strong className="text-slate-800">list ₦/m</strong> = published rounding of floor + commission
              (same rule as customer price book). Sync writes that <strong>list</strong> amount to the floor price list.{' '}
              <strong className="text-slate-800">Print</strong> opens a preview modal: internal (full steps) or customer (Longspan / Metcoppo
              columns only). Save all when done.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-slate-800 shrink-0"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-wrap items-end gap-3 px-4 py-3 sm:px-5 border-b border-slate-100 bg-white">
          <div className="min-w-[200px]">
            <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Material</span>
            <div
              className="inline-flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-slate-50/90 p-1"
              role="group"
              aria-label="Workbook material"
            >
              {MATERIAL_OPTIONS.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setMaterialKey(m.key)}
                  className={`rounded-md px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wide transition-colors ${
                    materialKey === m.key
                      ? 'bg-[#134e4a] text-white shadow-sm'
                      : 'bg-white text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <label className="text-[10px] font-bold uppercase text-slate-500 block min-w-[180px]">
            Branch
            <select
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white py-2 px-2 text-sm font-semibold text-slate-800"
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
            >
              {branches.length === 0 ? <option value="">No branches</option> : null}
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name || b.code || b.id}
                </option>
              ))}
            </select>
          </label>
          <label
            className="text-[10px] font-bold uppercase text-slate-500 block min-w-[160px]"
            title={`Suggested from weighted average unit cost on coil GRNs (last ${lookbackDays} days, this branch). You may override.`}
          >
            ₦/kg (material)
            <input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              aria-label="Material cost per kilogram, applied to all gauges"
              placeholder={
                materialCostPerKgMixed
                  ? 'Mixed — set to align'
                  : recCostLabel != null && Number(recCostLabel) > 0 && !sheet?.isStoneCoatedWorkbook
                    ? `Avg purchase ~${recCostLabel} (30d)`
                    : sheet?.isStoneCoatedWorkbook
                      ? 'N/A stone'
                      : ''
              }
              disabled={Boolean(sheet?.isStoneCoatedWorkbook)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white py-2 px-2 text-sm font-semibold text-slate-800 font-mono tabular-nums disabled:opacity-50"
              value={materialCostPerKgFieldValue}
              onChange={(e) => setCostPerKgAllGauges(e.target.value)}
            />
          </label>
          <button
            type="button"
            disabled={busy || savingAll || !sheet}
            onClick={() => void persistAllRows()}
            className="rounded-lg bg-[#134e4a] px-3 py-2 text-[10px] font-black uppercase text-white disabled:opacity-50"
          >
            {savingAll ? 'Saving…' : 'Save all'}
          </button>
          <button
            type="button"
            disabled={busy || !sheet || printLoading}
            onClick={() => void loadPrintPack('official')}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase text-[#134e4a] disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            <Printer size={14} className="shrink-0" aria-hidden />
            {printLoading ? '…' : 'Print · internal'}
          </button>
          <button
            type="button"
            disabled={busy || !sheet || printLoading}
            onClick={() => void loadPrintPack('customer')}
            className="rounded-lg border border-slate-200 bg-[#134e4a]/10 px-3 py-2 text-[10px] font-black uppercase text-[#134e4a] disabled:opacity-50"
          >
            Print · customer list
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void loadSheet()}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase text-[#134e4a] disabled:opacity-50"
          >
            Refresh
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-auto px-2 sm:px-4 py-3">
          {busy && !sheet ? (
            <p className="text-sm text-slate-500 px-2">Loading…</p>
          ) : (
            <div className="z-scroll-x overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="min-w-[1020px] w-full border-collapse text-left text-xs">
                <thead className="bg-slate-50 text-[9px] font-black uppercase tracking-wide text-slate-600 sticky top-0 z-[1]">
                  <tr>
                    <th className="px-2 py-2 border-b border-slate-200 whitespace-nowrap">Gauge</th>
                    <th className="px-2 py-2 border-b border-slate-200 whitespace-nowrap">Std kg/m</th>
                    <th
                      className="px-2 py-2 border-b border-slate-200 whitespace-nowrap"
                      title="Reference kg/m — hint from average supplier conversion on received coils (purchases)."
                    >
                      Ref
                    </th>
                    <th
                      className="px-2 py-2 border-b border-slate-200 whitespace-nowrap"
                      title="History kg/m — hint from average actual conversion in production (gauge history)."
                    >
                      Hist
                    </th>
                    <th className="px-2 py-2 border-b border-slate-200 whitespace-nowrap">Used</th>
                    <th className="px-2 py-2 border-b border-slate-200 whitespace-nowrap">Cost/m</th>
                    <th className="px-2 py-2 border-b border-slate-200 whitespace-nowrap">OH/m</th>
                    <th className="px-2 py-2 border-b border-slate-200 whitespace-nowrap">Profit/m</th>
                    <th className="px-2 py-2 border-b border-slate-200 whitespace-nowrap">Suggested</th>
                    <th className="px-2 py-2 border-b border-slate-200 whitespace-nowrap" title="Floor minimum ₦/m">
                      Floor
                    </th>
                    <th
                      className="px-2 py-2 border-b border-slate-200 whitespace-nowrap"
                      title="Commission ₦/m on top of floor; list = published round(floor + commission)"
                    >
                      Comm/m
                    </th>
                    <th className="px-2 py-2 border-b border-slate-200 whitespace-nowrap">List ₦/m</th>
                    <th className="px-2 py-2 border-b border-slate-200 whitespace-nowrap">Sync list</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(sheet?.gauges || []).map((g) => {
                    const dr = draftByGauge[g] || {};
                    const rv = sheet?.resolvedByGauge?.[g] || {};
                    const usedNum = sheet?.isStoneCoatedWorkbook
                      ? null
                      : effectiveUsedKgPerM(dr.conversionUsedKgPerM, rv);
                    const ck = numOrUndef(dr.costPerKgNgn);
                    const oh = numOrUndef(dr.overheadNgnPerM);
                    const pr = numOrUndef(dr.profitNgnPerM);
                    const cm =
                      sheet?.isStoneCoatedWorkbook || usedNum == null || ck == null
                        ? null
                        : costPerM(usedNum, ck);
                    const sug =
                      sheet?.isStoneCoatedWorkbook || usedNum == null
                        ? null
                        : suggested(usedNum, ck ?? 0, oh, pr);
                    const minimumNgn = Math.round(Number(dr.minimumPricePerMeterNgn) || 0);
                    const commissionNgn = Math.max(0, numOrUndef(dr.commissionNgnPerM) ?? 0);
                    const listNgn = listPriceFromFloorAndCommission(minimumNgn, commissionNgn);
                    const displaySug =
                      sug != null && sug > 0
                        ? sug
                        : sheet?.isStoneCoatedWorkbook && minimumNgn > 0
                          ? minimumNgn
                          : null;
                    const inp =
                      'w-full min-w-[64px] rounded border border-slate-200 px-1 py-1 font-mono text-[11px] tabular-nums';
                    const cell =
                      'min-w-[72px] rounded border border-slate-100 bg-slate-50/80 px-2 py-1 font-mono text-[11px] tabular-nums text-slate-800';
                    return (
                      <tr key={g} className="hover:bg-teal-50/20">
                        <td className="px-2 py-1.5 font-bold text-slate-800 whitespace-nowrap">{g} mm</td>
                        <td className="px-2 py-1.5 align-top">
                          <div className={cell}>{fmtConv2(rv.std)}</div>
                        </td>
                        <td className="px-2 py-1.5 align-top">
                          <div className={cell}>{fmtConv2(rv.ref)}</div>
                          {!sheet?.isStoneCoatedWorkbook ? (
                            <p className="text-[8px] text-slate-400 mt-0.5">Purchases {lookbackDays}d</p>
                          ) : null}
                        </td>
                        <td className="px-2 py-1.5 align-top">
                          <div className={cell}>{fmtConv2(rv.hist)}</div>
                          {!sheet?.isStoneCoatedWorkbook ? (
                            <p className="text-[8px] text-slate-400 mt-0.5">Production {lookbackDays}d</p>
                          ) : null}
                        </td>
                        <td className="px-2 py-1.5 align-top">
                          {sheet?.isStoneCoatedWorkbook ? (
                            <div className={cell}>—</div>
                          ) : (
                            <>
                              <input
                                className={inp}
                                placeholder={
                                  rv.usedSuggested != null && Number.isFinite(Number(rv.usedSuggested))
                                    ? `~${fmtConv2(rv.usedSuggested)}`
                                    : '—'
                                }
                                title="Leave blank to use the average of Std, Ref, and Hist"
                                value={dr.conversionUsedKgPerM ?? ''}
                                onChange={(e) => setDraft(g, { conversionUsedKgPerM: e.target.value })}
                              />
                              <p className="text-[8px] text-slate-400 mt-0.5">Override avg (kg/m)</p>
                            </>
                          )}
                        </td>
                        <td className="px-2 py-1.5 font-mono text-[11px] text-slate-600 tabular-nums">
                          {cm == null ? '—' : formatNgn(Math.round(cm))}
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            className={inp}
                            value={dr.overheadNgnPerM ?? ''}
                            onChange={(e) => setDraft(g, { overheadNgnPerM: e.target.value })}
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            className={inp}
                            value={dr.profitNgnPerM ?? ''}
                            onChange={(e) => setDraft(g, { profitNgnPerM: e.target.value })}
                          />
                        </td>
                        <td className="px-2 py-1.5 font-mono text-[11px] font-semibold text-[#134e4a] tabular-nums">
                          {displaySug == null ? '—' : formatNgn(displaySug)}
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            className={inp}
                            value={dr.minimumPricePerMeterNgn ?? ''}
                            onChange={(e) => setDraft(g, { minimumPricePerMeterNgn: e.target.value })}
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            className={inp}
                            inputMode="decimal"
                            placeholder="0"
                            title="Commission ₦/m added to floor for published list price"
                            value={dr.commissionNgnPerM ?? ''}
                            onChange={(e) => setDraft(g, { commissionNgnPerM: e.target.value })}
                          />
                        </td>
                        <td className="px-2 py-1.5 font-mono text-[11px] font-semibold text-slate-800 tabular-nums">
                          {listNgn > 0 ? formatNgn(listNgn) : '—'}
                        </td>
                        <td className="px-2 py-1.5 align-top space-y-1">
                          <label className="flex items-center gap-1 text-[9px] text-slate-600 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={Boolean(dr.syncMinimumToPriceList)}
                              onChange={(e) => setDraft(g, { syncMinimumToPriceList: e.target.checked })}
                            />
                            Sync list
                          </label>
                          <input
                            className={`${inp} text-[10px]`}
                            placeholder="Design key"
                            value={dr.syncDesignKey ?? ''}
                            onChange={(e) => setDraft(g, { syncDesignKey: e.target.value })}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
            <h3 className="text-[10px] font-black uppercase text-[#134e4a] mb-2">Price change log</h3>
            {events.length === 0 ? (
              <p className="text-[11px] text-slate-500">No changes recorded for this material yet.</p>
            ) : (
              <ul className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {events.map((ev) => {
                  const snap = ev.payload?.after || {};
                  const when = ev.changedAtIso ? new Date(ev.changedAtIso).toLocaleString() : '';
                  return (
                    <li
                      key={ev.id}
                      className="text-[10px] text-slate-700 border-b border-slate-200/80 pb-2 last:border-0 leading-snug"
                    >
                      <span className="font-bold text-slate-900">{when}</span>
                      {' · '}
                      <span className="font-mono">{ev.branchId}</span> · gauge {ev.gaugeMm} mm
                      {snap.minimumPricePerMeterNgn != null ? (
                        <>
                          {' '}
                          · min <span className="font-mono">₦{formatNgn(snap.minimumPricePerMeterNgn)}</span>/m
                        </>
                      ) : null}
                      {snap.suggestedPricePerMeterNgn != null ? (
                        <>
                          {' '}
                          · suggested{' '}
                          <span className="font-mono">₦{formatNgn(snap.suggestedPricePerMeterNgn)}</span>/m
                        </>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      {printPreview &&
        printPack &&
        typeof document !== 'undefined' &&
        createPortal(
          <>
            <button
              type="button"
              aria-label="Close print preview"
              className="no-print fixed inset-0 z-[11060] bg-black/50"
              onClick={() => {
                setPrintPreview(null);
                setPrintPack(null);
              }}
            />
            <div
              className="no-print fixed inset-0 z-[11070] overflow-y-auto overscroll-y-contain p-4 sm:p-8"
              onClick={() => {
                setPrintPreview(null);
                setPrintPack(null);
              }}
            >
              <div className="mx-auto max-w-[min(1000px,100%)] pb-16" onClick={(e) => e.stopPropagation()}>
                <div
                  id="workbook-print-root"
                  className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xl print:rounded-none print:border-0 print:shadow-none print:p-0"
                >
                  {printPreview === 'official' ? (
                    <MaterialWorkbookOfficialPrintView
                      sheets={printPack.sheets}
                      branchName={String(branchName || branchId)}
                      effectiveDateLabel={effectiveDateLabel}
                      lookbackDays={lookbackDays}
                      accessories={printPack.accessories}
                      ridgeAddOns={printPack.ridgeAddOns}
                    />
                  ) : (
                    <MaterialWorkbookCustomerPrintView
                      sheets={printPack.sheets}
                      branchName={String(branchName || branchId)}
                      effectiveDateLabel={effectiveDateLabel}
                      accessories={printPack.accessories}
                      ridgeAddOns={printPack.ridgeAddOns}
                    />
                  )}
                </div>
                <div id="workbook-print-actions" className="mt-4 flex flex-col items-center gap-2">
                  <div className="flex flex-wrap justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="rounded-lg bg-[#134e4a] px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow-lg"
                    >
                      Print…
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPrintPreview(null);
                        setPrintPack(null);
                      }}
                      className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700"
                    >
                      Close
                    </button>
                  </div>
                  <p className="text-center text-[9px] text-slate-500 max-w-md">
                    {printPreview === 'customer'
                      ? 'Customer sheet shows only gauges with a published list price (floor + commission).'
                      : 'Internal sheet includes full cost build-up for all gauges.'}
                  </p>
                </div>
              </div>
            </div>
          </>,
          document.body
        )}
    </ModalFrame>
  );
}
