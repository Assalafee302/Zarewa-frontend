import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PrintModalPortal } from '../layout/PrintModalPortal';
import { ArrowLeft, Plus, Printer, Trash2, X } from 'lucide-react';
import { ModalFrame, PageHeader, PageShell } from '../layout';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useToast } from '../../context/ToastContext';
import { useUnsavedWorkRegistry, UNSAVED_LEAVE_MESSAGE } from '../../context/UnsavedWorkContext';
import { appConfirm } from '../../lib/appConfirm';
import { apiFetch } from '../../lib/apiBase';
import { formatNgn } from '../../Data/mockData';
import { listPriceFromFloorAndCommission } from '../../lib/publishedPrice.js';
import { localCalendarDateIso } from '../../lib/pricingAsOf.js';
import { fmtConv2, roundConv2 } from '../../lib/conversionKgPerM.js';
import { suggestedPricePerMeterNgn } from '../../shared/lib/suggestedPricePerMeter.js';
import {
  MaterialWorkbookCustomerPrintView,
  MaterialWorkbookOfficialPrintView,
} from './MaterialPricingWorkbookPrintViews.jsx';

const MATERIAL_OPTIONS = [
  { key: 'alu', label: 'Aluminium' },
  { key: 'aluzinc', label: 'Aluzinc (PPGI)' },
  { key: 'stone-coated', label: 'Stone-coated' },
  { key: 'stone-flatsheet', label: 'Stone flatsheet' },
  { key: 'ridge-flashing', label: 'Ridge / flashing' },
  { key: 'accessories', label: 'Accessories' },
];

const WORKBOOK_MATERIAL_KEYS = new Set(['alu', 'aluzinc', 'stone-coated']);
const RIDGE_GIRTH_COLUMNS_MM = [150, 300, 400, 600];
const RIDGE_MATERIAL_OPTIONS = [
  { key: 'alu', label: 'Aluminium' },
  { key: 'aluzinc', label: 'Aluzinc (PPGI)' },
];

function isStoneFlatsheetQuoteItemName(name) {
  const n = String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
  return n === 'stone flatsheet' || n.startsWith('stone flatsheet ');
}

function isWorkbookMaterialKey(k) {
  return WORKBOOK_MATERIAL_KEYS.has(String(k || ''));
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
  return suggestedPricePerMeterNgn(used, costKg, oh, pr);
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

function isWorkbookDesignKey(dk) {
  const s = String(dk ?? '').trim();
  // Back-compat: older clients generated `wb_...`; treat as workbook rows too.
  return s === '' || s.startsWith('wb-') || s.startsWith('wb_');
}

function newLineKey() {
  return `ln_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
}

function newWbDesignKey() {
  // Must match server + UI workbook row matcher: `wb-...` (not `wb_...`).
  return `wb-${crypto.randomUUID().replace(/-/g, '').slice(0, 10)}`;
}

function newCalcRowId() {
  return `rc_${crypto.randomUUID().replace(/-/g, '').slice(0, 10)}`;
}

function lineGaugeDesignKey(gaugeMm, designKey) {
  return `gd:${String(gaugeMm || '').trim()}|${String(designKey || '').trim()}`;
}

/** First row per gauge keeps '' or explicit wb-; further rows for same gauge get wb-* */
function finalizeDesignKeys(lines) {
  const seenGauge = new Set();
  return lines.map((line) => {
    const g = String(line.gaugeMm ?? '').trim();
    if (!g) return line;
    let dk = String(line.designKey ?? '').trim();
    if (!seenGauge.has(g)) {
      seenGauge.add(g);
      return { ...line, designKey: dk.startsWith('wb-') ? dk : '' };
    }
    if (!dk || !dk.startsWith('wb-')) {
      dk = newWbDesignKey();
    }
    return { ...line, designKey: dk };
  });
}

function draftFromServerRow(row, recCost, rv, isStone) {
  if (!row) {
    return {
      gaugeCustomerLabel: '',
      costPerKgNgn: recCost != null && Number(recCost) > 0 && !isStone ? String(recCost) : '',
      conversionUsedKgPerM: '',
      overheadNgnPerM: '',
      profitNgnPerM: '',
      commissionNgnPerM: '',
      minimumPricePerMeterNgn: '',
      notes: '',
      syncMinimumToPriceList: false,
      syncDesignKey: isStone ? 'stone-coated' : '',
    };
  }
  let costStr = row?.costPerKgNgn != null && Number(row.costPerKgNgn) > 0 ? String(row.costPerKgNgn) : '';
  if (!costStr && recCost != null && Number(recCost) > 0 && !isStone) {
    costStr = String(recCost);
  }
  const usedStored = row?.conversionUsedKgPerM;
  const usedSuggested = rv?.usedSuggested;
  const hasDistinctStored =
    usedStored != null &&
    Number(usedStored) > 0 &&
    (usedSuggested == null ||
      !Number.isFinite(Number(usedSuggested)) ||
      Math.abs(Number(usedStored) - Number(usedSuggested)) > 1e-6);
  return {
    gaugeCustomerLabel: row?.gaugeCustomerLabel != null ? String(row.gaugeCustomerLabel) : '',
    costPerKgNgn: costStr,
    conversionUsedKgPerM: hasDistinctStored && usedStored != null ? String(usedStored) : '',
    overheadNgnPerM: row?.overheadNgnPerM != null ? String(row.overheadNgnPerM) : '',
    profitNgnPerM: row?.profitNgnPerM != null ? String(row.profitNgnPerM) : '',
    commissionNgnPerM: row?.commissionNgnPerM != null && Number(row.commissionNgnPerM) > 0 ? String(row.commissionNgnPerM) : '',
    minimumPricePerMeterNgn: row?.minimumPricePerMeterNgn != null ? String(row.minimumPricePerMeterNgn) : '',
    notes: row?.notes || '',
    syncMinimumToPriceList: Boolean(row?.syncMinimumToPriceList),
    syncDesignKey:
      String(row?.syncDesignKey || '').trim() || (isStone ? 'stone-coated' : ''),
  };
}

function confidenceBadgeClass(level) {
  const s = String(level || 'none').toLowerCase();
  if (s === 'high') return 'bg-emerald-100 text-emerald-800';
  if (s === 'medium') return 'bg-amber-100 text-amber-900';
  if (s === 'low') return 'bg-orange-100 text-orange-900';
  return 'bg-slate-100 text-slate-500';
}

function confidenceLabel(level) {
  const s = String(level || 'none').toLowerCase();
  if (s === 'high') return 'High';
  if (s === 'medium') return 'Medium';
  if (s === 'low') return 'Low';
  return 'None';
}

/** @param {{ n?: number } | null | undefined} meta @param {'coils' | 'jobs'} unit */
function metaNChip(meta, unit) {
  const n = Number(meta?.n);
  if (!Number.isFinite(n) || n <= 0) return null;
  return `n=${Math.round(n)} ${unit}`;
}

function resolveDefaultBranchId(ws, branches) {
  const list = Array.isArray(branches) ? branches : [];
  const candidates = [
    ws?.session?.activeBranchId,
    ws?.snapshot?.activeBranchId,
    ws?.session?.currentBranchId,
    ws?.branchScope,
    ws?.workspaceBranchId,
    ws?.session?.workspaceBranchId,
    ws?.snapshot?.workspaceBranchId,
  ];
  for (const c of candidates) {
    const id = String(c || '').trim();
    if (!id || id === 'ALL') continue;
    if (list.some((b) => b.id === id)) return id;
  }
  return list[0]?.id || '';
}

function shortApiError(data, fallback) {
  const raw = String(data?.error || data?.message || fallback || 'Request failed.').trim();
  if (data?.code === 'NON_JSON_RESPONSE' || /API route not found/i.test(raw) || raw.length > 180) {
    return fallback || 'Request failed. Check that the API is running the latest build.';
  }
  return raw;
}

/** Merge workbook line state into sheet payload for print preview. */
function mergeDraftIntoSheet(sheet, workbookLines) {
  if (!sheet?.ok) return sheet;
  if (!workbookLines?.length) {
    return { ...sheet, rows: [] };
  }
  const finalized = finalizeDesignKeys(workbookLines.filter((l) => String(l.gaugeMm ?? '').trim()));
  const built = finalized.map((line) => {
    const dr = line.draft;
    const g = String(line.gaugeMm).trim();
    const dk = String(line.designKey ?? '').trim();
    const uStr = String(dr.conversionUsedKgPerM ?? '').trim();
    let conversionUsedKgPerM = null;
    if (uStr !== '') {
      const n = Number(uStr);
      conversionUsedKgPerM = roundConv2(n);
    }
    const existing = (sheet.rows || []).find((r) => r.id === line.serverId);
    return {
      ...(existing || {}),
      id: line.serverId,
      gaugeMm: g,
      designKey: dk,
      materialKey: sheet.materialKey,
      branchId: sheet.branchId,
      gaugeCustomerLabel: String(dr.gaugeCustomerLabel ?? '').trim(),
      costPerKgNgn: numOrUndef(dr.costPerKgNgn) ?? 0,
      overheadNgnPerM: numOrUndef(dr.overheadNgnPerM) ?? 0,
      profitNgnPerM: numOrUndef(dr.profitNgnPerM) ?? 0,
      commissionNgnPerM: Math.max(0, numOrUndef(dr.commissionNgnPerM) ?? 0),
      minimumPricePerMeterNgn: Math.round(Number(dr.minimumPricePerMeterNgn) || 0),
      conversionUsedKgPerM,
      notes: dr.notes?.trim() || '',
    };
  });
  return { ...sheet, rows: built };
}

/**
 * Coil material pricing workbook: conversions, suggested ₦/m, minimum floor, change log.
 * Works as a full page (`mode="page"`) or modal (`mode="modal"`).
 * @param {{ mode?: 'modal' | 'page'; open?: boolean; onClose?: () => void; initialMaterialKey?: string }} props
 */
export function MaterialPricingWorkbook({
  mode = 'modal',
  open = true,
  onClose,
  initialMaterialKey = 'alu',
}) {
  const isPage = mode === 'page';
  const isActive = isPage || Boolean(open);
  const navigate = useNavigate();
  const ws = useWorkspace();
  const { show: showToast } = useToast();
  const { setFlag: setUnsavedFlag, clearFlag: clearUnsavedFlag } = useUnsavedWorkRegistry();
  const canPolicyManage = Boolean(ws?.hasPermission?.('pricing.policy.manage') || ws?.hasPermission?.('*'));
  const canPricingManage = Boolean(ws?.hasPermission?.('pricing.manage') || ws?.hasPermission?.('*'));
  const canAccessWorkbook = Boolean(
    canPricingManage || ws?.hasPermission?.('md.price_exception.approve') || ws?.hasPermission?.('*')
  );
  const canSetupManage = Boolean(
    ws?.hasPermission?.('settings.manage') || ws?.hasPermission?.('settings.view') || ws?.hasPermission?.('*')
  );
  const branches = useMemo(
    () => ws?.snapshot?.workspaceBranches ?? ws?.session?.branches ?? [],
    [ws?.snapshot?.workspaceBranches, ws?.session?.branches]
  );
  const [materialKey, setMaterialKey] = useState(initialMaterialKey);
  const [branchId, setBranchId] = useState(() => resolveDefaultBranchId(ws, branches));
  const [sheet, setSheet] = useState(null);
  const [events, setEvents] = useState([]);
  const [busy, setBusy] = useState(false);
  const [savingAll, setSavingAll] = useState(false);
  /** @type {Array<{ key: string; serverId?: string; gaugeMm: string; designKey: string; draft: Record<string, unknown> }>} */
  const [workbookLines, setWorkbookLines] = useState([]);
  const [isDirty, setIsDirty] = useState(false);
  const [dirtyCount, setDirtyCount] = useState(0);
  /** Preserve transient sync controls through post-save reloads. */
  const syncDraftRef = useRef(new Map());
  const loadSheetAbortRef = useRef(/** @type {AbortController | null} */ (null));
  /** Ridge add-ons from pricing policy (reference tabs). */
  const [refRidgeAddOns, setRefRidgeAddOns] = useState([]);
  /** Accessories from master data (reference tab). */
  const [refAccessories, setRefAccessories] = useState([]);
  /** Stone flatsheet quote products (reference tab) — list + floor ₦/m². */
  const [refStoneFlatsheets, setRefStoneFlatsheets] = useState([]);
  /** Ridge calculator rows (gauge + material). */
  const [ridgeCalcRows, setRidgeCalcRows] = useState([]);
  /** Base list price by material+gauge key. */
  const [ridgeBaseByMatGauge, setRidgeBaseByMatGauge] = useState({});
  /** gauge mm → customer label from workbook rows (for ridge calculator dropdown). */
  const [ridgeCustomerLabelByGauge, setRidgeCustomerLabelByGauge] = useState({});
  const [savingRidges, setSavingRidges] = useState(false);
  const [savingAccessories, setSavingAccessories] = useState(false);
  const [savingStoneFlatsheets, setSavingStoneFlatsheets] = useState(false);
  const [printPreview, setPrintPreview] = useState(null);
  const [printPack, setPrintPack] = useState(null);
  const [printLoading, setPrintLoading] = useState(false);
  const [publishPreviewOpen, setPublishPreviewOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (isActive) setMaterialKey(initialMaterialKey);
  }, [isActive, initialMaterialKey]);

  useEffect(() => {
    if (!branches.length) return;
    if (branchId && branches.some((b) => b.id === branchId)) return;
    setBranchId(resolveDefaultBranchId(ws, branches));
  }, [branches, branchId, ws]);

  useEffect(() => {
    const next = new Map();
    for (const line of workbookLines) {
      const draft = line?.draft || {};
      const syncState = {
        syncMinimumToPriceList: Boolean(draft.syncMinimumToPriceList),
        syncDesignKey: String(draft.syncDesignKey || ''),
      };
      if (line?.serverId) next.set(`id:${line.serverId}`, syncState);
      next.set(lineGaugeDesignKey(line?.gaugeMm, line?.designKey), syncState);
    }
    syncDraftRef.current = next;
  }, [workbookLines]);

  const markDirty = useCallback(() => {
    setIsDirty(true);
    setDirtyCount((n) => n + 1);
  }, []);

  const clearDirty = useCallback(() => {
    setIsDirty(false);
    setDirtyCount(0);
  }, []);

  useEffect(() => {
    const id = 'material-pricing-workbook';
    const track = Boolean(isDirty && isActive);
    setUnsavedFlag(id, track);
    return () => clearUnsavedFlag(id);
  }, [isDirty, isActive, setUnsavedFlag, clearUnsavedFlag]);

  const requestClose = useCallback(async () => {
    if (isDirty) {
      const ok = await appConfirm({ title: 'Unsaved changes', message: UNSAVED_LEAVE_MESSAGE });
      if (!ok) return;
    }
    onClose?.();
  }, [isDirty, onClose]);

  const requestBackToProcurement = useCallback(async () => {
    if (isDirty) {
      const ok = await appConfirm({ title: 'Unsaved changes', message: UNSAVED_LEAVE_MESSAGE });
      if (!ok) return;
    }
    navigate('/procurement', { state: { focusTab: 'conversion' } });
  }, [isDirty, navigate]);

  const requestMaterialKey = useCallback(
    async (next) => {
      if (next === materialKey) return;
      if (isDirty) {
        const ok = await appConfirm({ title: 'Unsaved changes', message: UNSAVED_LEAVE_MESSAGE });
        if (!ok) return;
      }
      setMaterialKey(next);
    },
    [isDirty, materialKey]
  );

  const requestBranchId = useCallback(
    async (next) => {
      if (next === branchId) return;
      if (isDirty) {
        const ok = await appConfirm({ title: 'Unsaved changes', message: UNSAVED_LEAVE_MESSAGE });
        if (!ok) return;
      }
      setBranchId(next);
    },
    [isDirty, branchId]
  );

  const loadSheet = useCallback(async () => {
    if (!materialKey || !branchId) return;

    loadSheetAbortRef.current?.abort();
    const ac = new AbortController();
    loadSheetAbortRef.current = ac;
    const { signal } = ac;

    if (!isWorkbookMaterialKey(materialKey)) {
      setBusy(true);
      try {
        const [policyR, setupR, aluSheetR, aluzSheetR] = await Promise.all([
          apiFetch('/api/pricing/policy', { signal }),
          apiFetch('/api/setup', { signal }),
          apiFetch(`/api/pricing/material-sheet?materialKey=alu&branchId=${encodeURIComponent(branchId)}`, {
            signal,
          }),
          apiFetch(`/api/pricing/material-sheet?materialKey=aluzinc&branchId=${encodeURIComponent(branchId)}`, {
            signal,
          }),
        ]);
        if (signal.aborted) return;
        const ridges = policyR.ok && Array.isArray(policyR.data?.ridgeAddOns) ? policyR.data.ridgeAddOns : [];
        const quoteItems =
          setupR.ok && setupR.data?.ok && Array.isArray(setupR.data?.masterData?.quoteItems)
            ? setupR.data.masterData.quoteItems
            : [];
        const acc = quoteItems.filter((r) => String(r?.itemType || '').toLowerCase() === 'accessory');
        const stoneFs = quoteItems.filter(
          (r) =>
            String(r?.itemType || '').toLowerCase() === 'product' &&
            isStoneFlatsheetQuoteItemName(r?.name) &&
            r?.active !== false
        );
        setSheet({
          ok: true,
          isReferenceTab: true,
          referenceTab: materialKey,
        });
        setWorkbookLines([]);
        clearDirty();
        setEvents([]);
        setRefRidgeAddOns(ridges);
        setRefAccessories(acc);
        setRefStoneFlatsheets(
          stoneFs.map((r) => ({
            id: r.id,
            itemType: 'product',
            name: r.name,
            unit: r.unit || 'm²',
            defaultUnitPriceNgn: Math.round(Number(r.defaultUnitPriceNgn) || 0),
            floorUnitPriceNgn: Math.round(Number(r.floorUnitPriceNgn) || 0),
            active: r.active !== false,
            inventoryProductId: r.inventoryProductId || '',
            sortOrder: Number(r.sortOrder) || 0,
          }))
        );
        const sheets = [aluSheetR?.data, aluzSheetR?.data].filter((s) => s?.ok);
        const baseMap = {};
        const labelByGauge = {};
        for (const s of sheets) {
          const mk = String(s.materialKey || '').trim();
          for (const row of s.rows || []) {
            if (!isWorkbookDesignKey(row?.designKey)) continue;
            const g = String(row?.gaugeMm || '').trim();
            if (!mk || !g) continue;
            const listNgn = listPriceFromFloorAndCommission(row?.minimumPricePerMeterNgn, row?.commissionNgnPerM);
            if (listNgn <= 0) continue;
            const k = `${mk}::${g}`;
            if (!baseMap[k] || listNgn > baseMap[k]) baseMap[k] = listNgn;
            const cust = String(row?.gaugeCustomerLabel || '').trim();
            if (cust && !labelByGauge[g]) labelByGauge[g] = cust;
          }
        }
        setRidgeBaseByMatGauge(baseMap);
        setRidgeCustomerLabelByGauge(labelByGauge);
        setRidgeCalcRows((prev) => (prev.length ? prev : [{ id: newCalcRowId(), gaugeMm: '', materialKey: 'alu' }]));
        if (!policyR.ok || !setupR.ok || !setupR.data?.ok) {
          showToast('Some reference data could not be loaded.', { variant: 'error' });
        }
      } catch {
        if (signal.aborted) return;
        setSheet(null);
        setRefRidgeAddOns([]);
        setRefAccessories([]);
        setRefStoneFlatsheets([]);
        setRidgeBaseByMatGauge({});
        setRidgeCustomerLabelByGauge({});
        showToast('Could not load ridge/accessory reference.', { variant: 'error' });
      } finally {
        if (!signal.aborted) setBusy(false);
      }
      return;
    }

    setBusy(true);
    const [r1, r2] = await Promise.all([
      apiFetch(
        `/api/pricing/material-sheet?materialKey=${encodeURIComponent(materialKey)}&branchId=${encodeURIComponent(branchId)}`,
        { signal }
      ),
      apiFetch(
        `/api/pricing/material-sheet/events?materialKey=${encodeURIComponent(materialKey)}&limit=60`,
        { signal }
      ),
    ]);
    if (signal.aborted) return;
    setBusy(false);
    if (!r1.ok || !r1.data?.ok) {
      setSheet(null);
      setWorkbookLines([]);
      clearDirty();
      showToast(shortApiError(r1.data, 'Could not load workbook.'), { variant: 'error' });
      return;
    }
    setSheet(r1.data);
    if (r2.ok && r2.data?.ok) setEvents(r2.data.events || []);
    else setEvents([]);

    const isStone = Boolean(r1.data.isStoneCoatedWorkbook);
    const recCost = r1.data.recommendedCostPerKgNgn;
    const wbRows = (r1.data.rows || [])
      .filter((r) => isWorkbookDesignKey(r.designKey))
      .sort((a, b) => {
        const ga = String(a.gaugeMm || '');
        const gb = String(b.gaugeMm || '');
        if (ga !== gb) return ga.localeCompare(gb, undefined, { numeric: true });
        return String(a.designKey || '').localeCompare(String(b.designKey || ''));
      });
    const nextLines = wbRows.map((row) => {
      const rv = r1.data.resolvedByGauge?.[row.gaugeMm] || {};
      const preservedSync =
        syncDraftRef.current.get(`id:${row.id}`) ||
        syncDraftRef.current.get(lineGaugeDesignKey(row.gaugeMm, row.designKey));
      const draft = draftFromServerRow(row, recCost, rv, isStone);
      if (preservedSync) {
        draft.syncMinimumToPriceList = Boolean(preservedSync.syncMinimumToPriceList);
        if (String(preservedSync.syncDesignKey || '').trim()) {
          draft.syncDesignKey = String(preservedSync.syncDesignKey || '').trim();
        }
      }
      return {
        key: row.id ? `srv_${row.id}` : newLineKey(),
        serverId: row.id,
        gaugeMm: row.gaugeMm || '',
        designKey: row.designKey || '',
        draft,
      };
    });
    setWorkbookLines(nextLines);
    clearDirty();
  }, [materialKey, branchId, showToast, clearDirty]);

  useEffect(() => {
    if (isActive && branchId) void loadSheet();
  }, [isActive, branchId, materialKey, loadSheet]);

  const buildPersistBody = (line) => {
    const dr = line.draft;
    if (!dr || !branchId) return null;
    const gaugeMm = String(line.gaugeMm ?? '').trim();
    if (!gaugeMm) return null;
    const uStr = String(dr.conversionUsedKgPerM ?? '').trim();
    let conversionUsedKgPerM = null;
    if (uStr !== '') {
      conversionUsedKgPerM = roundConv2(Number(uStr));
    }
    const designKey = String(line.designKey ?? '').trim();
    return {
      id: line.serverId,
      materialKey,
      gaugeMm,
      branchId,
      designKey,
      gaugeCustomerLabel: String(dr.gaugeCustomerLabel ?? '').trim() || undefined,
      costPerKgNgn: numOrUndef(dr.costPerKgNgn) ?? 0,
      conversionUsedKgPerM,
      overheadNgnPerM: numOrUndef(dr.overheadNgnPerM) ?? 0,
      profitNgnPerM: numOrUndef(dr.profitNgnPerM) ?? 0,
      commissionNgnPerM: Math.max(0, numOrUndef(dr.commissionNgnPerM) ?? 0),
      minimumPricePerMeterNgn: Math.round(Number(dr.minimumPricePerMeterNgn) || 0),
      notes: dr.notes?.trim() || undefined,
      syncMinimumToPriceList: Boolean(dr.syncMinimumToPriceList),
      // Default design key for coil materials so sync never silently fails on a blank field.
      syncDesignKey: dr.syncDesignKey?.trim() || (materialKey !== 'stone-coated' ? 'longspan' : undefined),
    };
  };

  const persistAllRows = async () => {
    if (!isWorkbookMaterialKey(materialKey)) {
      showToast('Switch to Aluminium, Aluzinc, or Stone-coated to save workbook lines.', { variant: 'error' });
      return;
    }
    if (!branchId || savingAll || busy) return;
    const finalized = finalizeDesignKeys(workbookLines.filter((l) => String(l.gaugeMm ?? '').trim()));
    if (!finalized.length) {
      showToast('Add at least one row and choose a gauge before saving.', { variant: 'error' });
      return;
    }
    const rows = [];
    for (const line of finalized) {
      const body = buildPersistBody(line);
      if (body) rows.push(body);
    }
    if (!rows.length) {
      showToast('Nothing to save.', { variant: 'error' });
      return;
    }
    setSavingAll(true);

    const finishOk = (saved) => {
      showToast(`Saved ${saved} draft row(s). Use Publish to update the price list.`);
      void loadSheet();
    };

    const bulk = await apiFetch('/api/pricing/material-sheet/rows/bulk', {
      method: 'POST',
      body: JSON.stringify({ materialKey, branchId, rows }),
    });
    if (bulk.ok && bulk.data?.ok) {
      setSavingAll(false);
      finishOk(Number(bulk.data.saved) || rows.length);
      return;
    }
    const bulkMissing =
      bulk.status === 404 ||
      bulk.data?.code === 'NON_JSON_RESPONSE' ||
      /API route not found/i.test(String(bulk.data?.error || ''));
    if (!bulkMissing) {
      setSavingAll(false);
      showToast(shortApiError(bulk.data, 'Save failed.'), { variant: 'error' });
      return;
    }

    let saved = 0;
    let firstError = '';
    for (const body of rows) {
      const { ok, data } = await apiFetch('/api/pricing/material-sheet/rows', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      if (!ok || !data?.ok) {
        firstError = shortApiError(data, 'Save failed.');
        break;
      }
      saved += 1;
    }
    setSavingAll(false);
    if (firstError) {
      showToast(`${firstError} (stopped at ${saved}/${rows.length} saved)`, { variant: 'error' });
      if (saved > 0) void loadSheet();
      return;
    }
    finishOk(saved);
  };

  const addWorkbookLine = () => {
    const isStone = Boolean(sheet?.isStoneCoatedWorkbook);
    const recCost = sheet?.recommendedCostPerKgNgn;
    const emptyDraft = draftFromServerRow(null, recCost, {}, isStone);
    setWorkbookLines((prev) => [
      ...prev,
      { key: newLineKey(), gaugeMm: '', designKey: '', draft: { ...emptyDraft, costPerKgNgn: '' } },
    ]);
    markDirty();
  };

  const removeWorkbookLine = async (lineKey) => {
    const line = workbookLines.find((l) => l.key === lineKey);
    if (line?.serverId) {
      const { ok, data } = await apiFetch(`/api/pricing/material-sheet/rows/${encodeURIComponent(line.serverId)}`, {
        method: 'DELETE',
      });
      if (!ok || !data?.ok) {
        showToast(shortApiError(data, 'Could not delete row.'), { variant: 'error' });
        return;
      }
      void loadSheet();
      return;
    }
    setWorkbookLines((prev) => prev.filter((l) => l.key !== lineKey));
    markDirty();
  };

  const updateLineDraft = (lineKey, patch) => {
    setWorkbookLines((prev) =>
      prev.map((l) =>
        l.key === lineKey ? { ...l, draft: { ...(l.draft || {}), ...patch } } : l
      )
    );
    markDirty();
  };

  const setLineGauge = (lineKey, newGauge) => {
    const g = String(newGauge ?? '').trim();
    setWorkbookLines((prev) =>
      prev.map((line) => {
        if (line.key !== lineKey) return line;
        let dk = String(line.designKey ?? '').trim();
        if (g) {
          const siblingSame = prev.filter((x) => x.key !== lineKey && String(x.gaugeMm ?? '').trim() === g);
          if (siblingSame.length > 0 && (!dk || !dk.startsWith('wb-'))) {
            dk = newWbDesignKey();
          }
        }
        return { ...line, gaugeMm: g, designKey: dk };
      })
    );
    markDirty();
  };

  const setCostPerKgAllLines = useCallback(
    (raw) => {
      setWorkbookLines((prev) =>
        prev.map((line) => ({
          ...line,
          draft: { ...line.draft, costPerKgNgn: raw },
        }))
      );
      markDirty();
    },
    [markDirty]
  );

  const syncListAllChecked = useMemo(() => {
    const eligible = workbookLines.filter((l) => String(l.gaugeMm || '').trim());
    if (eligible.length === 0) return false;
    return eligible.every((l) => Boolean(l.draft?.syncMinimumToPriceList));
  }, [workbookLines]);

  const setSyncListForAll = useCallback((checked) => {
    setWorkbookLines((prev) =>
      prev.map((line) => {
        if (!String(line.gaugeMm || '').trim()) return line;
        const draft = line.draft || {};
        const patch = { syncMinimumToPriceList: checked };
        // Auto-fill design key so bulk sync never silently fails on blank fields.
        if (checked && !String(draft.syncDesignKey ?? '').trim() && materialKey !== 'stone-coated') {
          patch.syncDesignKey = 'longspan';
        }
        return { ...line, draft: { ...draft, ...patch } };
      })
    );
    markDirty();
  }, [materialKey, markDirty]);

  const publishPreviewRows = useMemo(() => {
    return workbookLines
      .filter((l) => String(l.gaugeMm || '').trim() && Boolean(l.draft?.syncMinimumToPriceList))
      .map((line) => {
        const dr = line.draft || {};
        const g = String(line.gaugeMm).trim();
        const floor = Math.round(Number(dr.minimumPricePerMeterNgn) || 0);
        const commission = Math.max(0, numOrUndef(dr.commissionNgnPerM) ?? 0);
        const listNgn = listPriceFromFloorAndCommission(floor, commission);
        const rv = g ? sheet?.resolvedByGauge?.[g] || {} : {};
        const usedConf = String(rv.usedConfidence || 'none').toLowerCase();
        const usedNum = sheet?.isStoneCoatedWorkbook
          ? null
          : effectiveUsedKgPerM(dr.conversionUsedKgPerM, rv);
        const sug =
          sheet?.isStoneCoatedWorkbook || usedNum == null
            ? null
            : suggested(
                usedNum,
                numOrUndef(dr.costPerKgNgn) ?? 0,
                numOrUndef(dr.overheadNgnPerM),
                numOrUndef(dr.profitNgnPerM)
              );
        const floorBelowSuggested = sug != null && sug > 0 && floor > 0 && floor < sug;
        const lowConfidence = usedConf === 'none' || usedConf === 'low';
        return {
          key: line.key,
          serverId: line.serverId,
          gaugeMm: g,
          designKey:
            String(dr.syncDesignKey || line.designKey || '').trim() ||
            (materialKey === 'stone-coated' ? 'stone-coated' : 'longspan'),
          floor,
          listNgn,
          usedConf,
          floorBelowSuggested,
          warn: lowConfidence || floorBelowSuggested,
        };
      });
  }, [workbookLines, materialKey, sheet]);

  const publishPreviewHasWarnings = useMemo(
    () => publishPreviewRows.some((r) => r.warn),
    [publishPreviewRows]
  );

  const openPublishPreview = useCallback(async () => {
    if (!canPricingManage) {
      showToast('Publishing requires Pricing Manager.', { variant: 'error' });
      return;
    }
    if (!isWorkbookMaterialKey(materialKey)) {
      showToast('Switch to Aluminium, Aluzinc, or Stone-coated to publish.', { variant: 'error' });
      return;
    }
    if (isDirty) {
      showToast('Save all drafts first before publishing to the price list.', { variant: 'error' });
      return;
    }
    if (!publishPreviewRows.length) {
      showToast('Tick “Include in publish” on at least one row first.', { variant: 'error' });
      return;
    }
    const unsaved = publishPreviewRows.filter((r) => !r.serverId);
    if (unsaved.length) {
      showToast('Save all drafts first — some publish rows are not yet on the server.', { variant: 'error' });
      return;
    }
    setPublishPreviewOpen(true);
  }, [canPricingManage, materialKey, isDirty, publishPreviewRows, showToast]);

  const confirmPublish = useCallback(async () => {
    if (!branchId || publishing) return;
    setPublishing(true);
    const { ok, data } = await apiFetch('/api/pricing/material-sheet/publish', {
      method: 'POST',
      body: JSON.stringify({
        materialKey,
        branchId,
        effectiveFromIso: localCalendarDateIso(),
      }),
    });
    setPublishing(false);
    if (!ok || !data?.ok) {
      const detail =
        Array.isArray(data?.errors) && data.errors.length
          ? ` ${data.errors.map((e) => e.error || e.gaugeMm).filter(Boolean).slice(0, 2).join('; ')}`
          : '';
      showToast(shortApiError(data, 'Publish failed.') + detail, { variant: 'error' });
      return;
    }
    const n = Array.isArray(data.published) ? data.published.length : 0;
    showToast(
      `Published ${n} row(s) to the price list. Review Material Exceptions for quotes below floor.`
    );
    setPublishPreviewOpen(false);
    // Prefer skipping ws.refresh — quote screens pick up floors on next navigation/load.
    // If live quote screens must update immediately without leaving the page, re-enable:
    // if (typeof ws?.refresh === 'function') { try { await ws.refresh(); } catch { /* non-fatal */ } }
    void loadSheet();
  }, [branchId, publishing, materialKey, showToast, loadSheet]);

  const addRidgeRow = () => {
    setRidgeCalcRows((prev) => [...prev, { id: newCalcRowId(), gaugeMm: '', materialKey: 'alu' }]);
  };

  const addRidgePolicyRow = () => {
    setRefRidgeAddOns((prev) => [...prev, { id: '', girthMm: '', materialFamily: '', addOnNgn: '', listAddOnNgn: '' }]);
  };

  const removeRidgePolicyRow = (idx) => {
    setRefRidgeAddOns((prev) => prev.filter((_, i) => i !== idx));
  };

  const removeRidgeRow = (idx) => {
    setRidgeCalcRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const saveRidgeRows = async () => {
    if (!canPolicyManage) {
      showToast('You do not have permission to edit ridge/flashing rates.', { variant: 'error' });
      return;
    }
    setSavingRidges(true);
    const ridgePayload = refRidgeAddOns
      .filter((r) => Number.isFinite(Number(r.girthMm)) && Number(r.girthMm) > 0)
      .map((r) => {
        const row = {
          ...(r.id ? { id: r.id } : {}),
          girthMm: Number(r.girthMm),
          materialFamily: String(r.materialFamily || '').trim(),
          addOnNgn: Math.max(0, Math.round(Number(r.addOnNgn) || 0)),
        };
        const listRaw = r.listAddOnNgn;
        if (listRaw !== '' && listRaw != null && Number.isFinite(Number(listRaw))) {
          row.listAddOnNgn = Math.max(0, Math.round(Number(listRaw)));
        }
        return row;
      });
    const body = {
      ridgeAddOns: ridgePayload,
    };
    const { ok, data } = await apiFetch('/api/pricing/policy', {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    setSavingRidges(false);
    if (!ok || !data?.ok) {
      showToast(data?.error || 'Could not save ridge/flashing add-ons.', { variant: 'error' });
      return;
    }
    showToast('Ridge/flashing add-ons saved.');
    void loadSheet();
  };

  const addAccessoryRow = () => {
    setRefAccessories((prev) => [
      ...prev,
      { id: '', itemType: 'accessory', name: '', unit: 'pcs', defaultUnitPriceNgn: 0, active: true },
    ]);
  };

  const removeAccessoryRow = async (idx) => {
    const row = refAccessories[idx];
    if (row?.id) {
      const { ok, data } = await apiFetch(`/api/setup/quote-items/${encodeURIComponent(row.id)}`, { method: 'DELETE' });
      if (!ok || !data?.ok) {
        showToast(data?.error || 'Could not delete accessory.', { variant: 'error' });
        return;
      }
    }
    setRefAccessories((prev) => prev.filter((_, i) => i !== idx));
  };

  const saveAccessories = async () => {
    if (!canSetupManage) {
      showToast('You do not have permission to edit accessories.', { variant: 'error' });
      return;
    }
    setSavingAccessories(true);
    for (const row of refAccessories) {
      const name = String(row?.name || '').trim();
      if (!name) continue;
      const payload = {
        ...(row?.id ? { id: row.id } : {}),
        itemType: 'accessory',
        name,
        unit: String(row?.unit || 'unit').trim() || 'unit',
        defaultUnitPriceNgn: Math.round(Number(row?.defaultUnitPriceNgn) || 0),
        active: row?.active !== false,
      };
      const { ok, data } = await apiFetch('/api/setup/quote-items', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (!ok || !data?.ok) {
        setSavingAccessories(false);
        showToast(data?.error || `Could not save accessory "${name}". Check setup permission.`, { variant: 'error' });
        return;
      }
    }
    setSavingAccessories(false);
    showToast('Accessories saved.');
    void loadSheet();
  };

  const addStoneFlatsheetRow = () => {
    setRefStoneFlatsheets((prev) => [
      ...prev,
      {
        id: '',
        itemType: 'product',
        name: 'Stone flatsheet',
        unit: 'm²',
        defaultUnitPriceNgn: 0,
        floorUnitPriceNgn: 0,
        active: true,
        inventoryProductId: '',
        sortOrder: 13,
      },
    ]);
  };

  const saveStoneFlatsheets = async () => {
    if (!canSetupManage) {
      showToast('You do not have permission to edit stone flatsheet prices.', { variant: 'error' });
      return;
    }
    setSavingStoneFlatsheets(true);
    for (const row of refStoneFlatsheets) {
      const name = String(row?.name || '').trim();
      if (!name || !isStoneFlatsheetQuoteItemName(name)) {
        setSavingStoneFlatsheets(false);
        showToast('Stone flatsheet names must start with “Stone flatsheet” (e.g. Stone flatsheet 1.4).', {
          variant: 'error',
        });
        return;
      }
      const listNgn = Math.round(Number(row?.defaultUnitPriceNgn) || 0);
      const floorNgn = Math.round(Number(row?.floorUnitPriceNgn) || 0);
      if (floorNgn > 0 && listNgn > 0 && floorNgn > listNgn) {
        setSavingStoneFlatsheets(false);
        showToast(`Floor cannot exceed list for "${name}".`, { variant: 'error' });
        return;
      }
      const payload = {
        ...(row?.id ? { id: row.id } : {}),
        itemType: 'product',
        name,
        unit: String(row?.unit || 'm²').trim() || 'm²',
        defaultUnitPriceNgn: listNgn,
        floorUnitPriceNgn: floorNgn,
        active: row?.active !== false,
        inventoryProductId: String(row?.inventoryProductId || '').trim() || undefined,
        sortOrder: Number(row?.sortOrder) || 13,
      };
      const { ok, data } = await apiFetch('/api/setup/quote-items', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (!ok || !data?.ok) {
        setSavingStoneFlatsheets(false);
        showToast(data?.error || `Could not save "${name}". Check setup permission.`, { variant: 'error' });
        return;
      }
      const quoteItemId = data?.id || row?.id;
      if (quoteItemId && listNgn > 0) {
        const priceId =
          quoteItemId === 'SQI-037'
            ? 'PRI-SF-14'
            : quoteItemId === 'SQI-039'
              ? 'PRI-SF-20'
              : `PRI-SF-${String(quoteItemId).replace(/^SQI-/, '')}`;
        await apiFetch('/api/setup/price-list', {
          method: 'POST',
          body: JSON.stringify({
            id: priceId,
            quoteItemId,
            itemName: name,
            unit: payload.unit,
            unitPriceNgn: listNgn,
            materialTypeId: 'MAT-005',
            notes:
              floorNgn > 0
                ? `List ₦/m² from pricing workbook. Floor ₦${floorNgn.toLocaleString('en-NG')}/m².`
                : 'List ₦/m² from pricing workbook (stone flatsheet).',
            active: true,
            bookLabel: 'Standard',
            bookVersion: 1,
            effectiveFromISO: '2020-01-01',
          }),
        });
      }
    }
    setSavingStoneFlatsheets(false);
    showToast('Stone flatsheet prices saved.');
    void loadSheet();
  };

  const ridgeGaugeSelectOptions = useMemo(() => {
    const out = new Set();
    Object.keys(ridgeBaseByMatGauge).forEach((k) => {
      const parts = k.split('::');
      if (parts[1]) out.add(parts[1]);
    });
    return Array.from(out)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      .map((g) => {
        const nick = String(ridgeCustomerLabelByGauge[g] || '').trim();
        return { value: g, label: nick ? `${g} mm — ${nick}` : `${g} mm` };
      });
  }, [ridgeBaseByMatGauge, ridgeCustomerLabelByGauge]);

  const ridgeMatchedPolicyRow = useCallback((materialKeyValue, girthMm) => {
    const g = Number(girthMm);
    if (!Number.isFinite(g)) return null;
    const rows = (refRidgeAddOns || []).filter((r) => Math.abs(Number(r?.girthMm) - g) < 0.001);
    if (!rows.length) return null;
    const mk = String(materialKeyValue || '').trim().toLowerCase();
    const exact = rows.find((r) => {
      const mf = String(r?.materialFamily || '').trim().toLowerCase();
      return mf === mk;
    });
    if (exact) return exact;
    const familyHint = rows.find((r) => {
      const mf = String(r?.materialFamily || '').trim().toLowerCase();
      return (mk === 'alu' && mf.includes('alu')) || (mk === 'aluzinc' && (mf.includes('zinc') || mf.includes('ppgi')));
    });
    if (familyHint) return familyHint;
    return rows.find((r) => !String(r?.materialFamily || '').trim()) || null;
  }, [refRidgeAddOns]);

  const ridgeAddOnFor = useCallback(
    (materialKeyValue, girthMm) => {
      const r = ridgeMatchedPolicyRow(materialKeyValue, girthMm);
      return r ? Math.max(0, Math.round(Number(r?.addOnNgn) || 0)) : 0;
    },
    [ridgeMatchedPolicyRow]
  );

  const ridgeCustomerListAddOnFor = useCallback(
    (materialKeyValue, girthMm) => {
      const r = ridgeMatchedPolicyRow(materialKeyValue, girthMm);
      if (!r) return 0;
      const lr = r.listAddOnNgn;
      if (lr !== '' && lr != null && Number.isFinite(Number(lr))) {
        return Math.max(0, Math.round(Number(lr)));
      }
      return Math.max(0, Math.round(Number(r?.addOnNgn) || 0));
    },
    [ridgeMatchedPolicyRow]
  );

  const ridgeAutoAmount = useCallback(
    (materialKeyValue, gaugeMm, girthMm) => {
      const base = Math.max(0, Math.round(Number(ridgeBaseByMatGauge[`${materialKeyValue}::${gaugeMm}`]) || 0));
      if (!base) return 0;
      const divisor = 1200 / Number(girthMm || 0);
      if (!Number.isFinite(divisor) || divisor <= 0) return 0;
      const addOn = ridgeAddOnFor(materialKeyValue, girthMm);
      return Math.round(base / divisor + addOn);
    },
    [ridgeAddOnFor, ridgeBaseByMatGauge]
  );

  const branchRecord = branches.find((b) => b.id === branchId);
  const branchName = branchRecord?.name || branchRecord?.code || branchId;

  const effectiveDateLabel = new Date().toLocaleDateString('en-NG', { dateStyle: 'long' });

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
        // Customer print: server sheets only — do not merge unsaved drafts.
        const merged =
          kind === 'customer'
            ? sheets
            : sheets.map((s) => (s.materialKey === materialKey ? mergeDraftIntoSheet(s, workbookLines) : s));
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
    [branchId, workbookLines, materialKey, showToast]
  );

  const recCostLabel = sheet?.recommendedCostPerKgNgn;
  const lookbackDays = sheet?.purchaseCostLookbackDays ?? 30;
  const isReferenceTab = Boolean(sheet?.isReferenceTab);

  const materialCostPerKgFieldValue = useMemo(() => {
    const vals = workbookLines
      .map((l) => String(l.draft?.costPerKgNgn ?? '').trim())
      .filter((s) => s.length > 0);
    if (!vals.length) return '';
    const first = vals[0];
    return vals.every((v) => v === first) ? first : '';
  }, [workbookLines]);

  const materialCostPerKgMixed = useMemo(() => {
    const vals = workbookLines
      .map((l) => String(l.draft?.costPerKgNgn ?? '').trim())
      .filter((s) => s.length > 0);
    if (vals.length < 2) return false;
    const first = vals[0];
    return !vals.every((v) => v === first);
  }, [workbookLines]);

  const printPortal = printPreview && printPack ? (
      <PrintModalPortal
        open
        onClose={() => {
          setPrintPreview(null);
          setPrintPack(null);
        }}
        className={
          printPreview === 'customer'
            ? 'bg-slate-400/35 py-8 sm:py-14 px-4 sm:px-10'
            : ''
        }
      >
              <div
                className={
                  printPreview === 'customer'
                    ? 'mx-auto flex w-full max-w-[calc(210mm+4rem)] flex-col items-center justify-center pb-20 print:pb-0'
                    : 'mx-auto max-w-[min(1000px,100%)] pb-16 print:pb-0'
                }
              >
                <div
                  id="workbook-print-root"
                  className={
                    printPreview === 'customer'
                      ? 'box-border w-[210mm] max-w-full min-h-[297mm] shrink-0 rounded-sm border border-slate-500/40 bg-white shadow-2xl print:min-h-0 print:w-full print:max-w-full print:rounded-none print:border-0 print:shadow-none'
                      : 'rounded-lg border border-slate-200 bg-white p-4 shadow-2xl print:rounded-none print:border-0 print:shadow-none print:p-0'
                  }
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
                      className="rounded-lg bg-zarewa-teal px-5 py-2.5 text-ui-xs font-semibold uppercase tracking-wide text-white shadow-lg"
                    >
                      Print…
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPrintPreview(null);
                        setPrintPack(null);
                      }}
                      className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-ui-xs font-semibold uppercase tracking-wide text-slate-700"
                    >
                      Close
                    </button>
                  </div>
                  <p className="text-center text-ui-xs text-slate-500 max-w-md">
                    {printPreview === 'customer'
                      ? 'Customer sheet shows only gauges with a published list price (floor + commission).'
                      : 'Internal sheet includes full cost build-up for all gauges.'}
                  </p>
                </div>
              </div>
      </PrintModalPortal>
  ) : null;

  const publishPreviewModal = (
    <ModalFrame
      isOpen={publishPreviewOpen}
      onClose={() => !publishing && setPublishPreviewOpen(false)}
      title="Publish to price list"
      description="Rows with Include in publish will write floor + commission as list ₦/m."
      layer={isPage ? 'default' : 'nested'}
      showCloseButton={!publishing}
    >
      <div className="z-modal-panel w-full max-w-lg p-4 sm:p-5 space-y-3">
        <div>
          <h3 className="text-base font-black text-zarewa-teal">Publish to price list</h3>
          <p className="text-ui-xs text-slate-600 mt-1 leading-relaxed">
            Confirm rows marked Include in publish. List ₦/m = floor + commission (published rounding).
          </p>
        </div>
        {publishPreviewHasWarnings ? (
          <p className="text-ui-xs text-amber-900 bg-amber-50 border border-amber-200/80 rounded-lg px-3 py-2 leading-relaxed">
            Warning: one or more rows have <strong>None/Low</strong> conversion confidence or a floor below
            suggested. Review before publishing.
          </p>
        ) : null}
        <div className="z-scroll-x overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-slate-50 text-ui-xs font-black uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-3 py-2 border-b">Gauge</th>
                <th className="px-3 py-2 border-b">Design</th>
                <th className="px-3 py-2 border-b">Conf.</th>
                <th className="px-3 py-2 border-b text-right">Floor</th>
                <th className="px-3 py-2 border-b text-right">List</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {publishPreviewRows.map((r) => (
                <tr key={r.key} className={r.warn ? 'bg-amber-50/60' : undefined}>
                  <td className="px-3 py-2 font-mono tabular-nums">{r.gaugeMm} mm</td>
                  <td className="px-3 py-2 font-mono">{r.designKey}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${confidenceBadgeClass(r.usedConf)}`}>
                      {confidenceLabel(r.usedConf)}
                    </span>
                    {r.floorBelowSuggested ? (
                      <span className="ml-1 text-[10px] font-semibold text-amber-800">floor&lt;sug</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">
                    {r.floor > 0 ? formatNgn(r.floor) : '—'}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums font-semibold">
                    {r.listNgn > 0 ? formatNgn(r.listNgn) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-ui-xs text-slate-600 leading-relaxed">
          After publish, review{' '}
          <Link to="/operations/material-exceptions" className="font-semibold text-zarewa-teal hover:underline">
            Material Exceptions
          </Link>{' '}
          for quotations below the new floor.
        </p>
        <div className="flex flex-wrap gap-2 justify-end pt-1">
          <button
            type="button"
            disabled={publishing}
            onClick={() => setPublishPreviewOpen(false)}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={publishing || !publishPreviewRows.length}
            onClick={() => void confirmPublish()}
            className="rounded-lg bg-zarewa-teal px-4 py-2 text-xs font-black uppercase text-white disabled:opacity-50"
          >
            {publishing ? 'Publishing…' : `Publish ${publishPreviewRows.length} row(s)`}
          </button>
        </div>
      </div>
    </ModalFrame>
  );

  const workbookPanel = (
      <div
        className={
          isPage
            ? 'flex flex-col rounded-xl border border-slate-200/90 bg-white shadow-sm overflow-hidden min-h-[min(70vh,720px)]'
            : 'z-modal-panel max-w-[min(96vw,1100px)] max-h-[min(90vh,820px)] flex flex-col p-0 overflow-hidden'
        }
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 bg-slate-50/80 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <h2 className="text-base font-black text-zarewa-teal">Material pricing workbook</h2>
            <p className="text-ui-xs text-slate-600 mt-1 max-w-xl leading-relaxed">
              Build draft floors from conversion and cost, then <strong className="text-slate-800">Publish</strong> to
              update the selling price list. Save only stores drafts — it does not change quotations until you publish.
            </p>
            {branchName ? (
              <p className="mt-2 text-ui-xs font-semibold text-zarewa-teal bg-teal-50/80 border border-teal-100 rounded-lg px-2.5 py-1.5 inline-block">
                Editing prices for {branchName}
              </p>
            ) : null}
            <details className="mt-2 max-w-xl text-ui-xs text-slate-600">
              <summary className="cursor-pointer font-semibold text-slate-700 hover:text-zarewa-teal">
                How pricing works
              </summary>
              <ul className="mt-2 space-y-1.5 list-disc pl-4 leading-relaxed">
                <li>
                  <strong>Std</strong> — catalog/theory kg/m (read-only).
                </li>
                <li>
                  <strong>Ref</strong> — supplier purchase samples (≈ last {lookbackDays}d coil GRNs).
                </li>
                <li>
                  <strong>Hist</strong> — production actual conversion (≈ last {lookbackDays}d jobs).
                </li>
                <li>
                  <strong>Used</strong> — average of Std/Ref/Hist, or your override (2 dp).
                </li>
                <li>
                  <strong>Floor</strong> — minimum ₦/m; <strong>List</strong> = published round(floor + commission).
                </li>
                <li>
                  Production crosswalk: Ref ≈ Sup (supplier); Hist ≈ gauge history; Std ≈ production standard.
                </li>
                <li>
                  Confidence: <strong>None</strong> / <strong>Low</strong> / <strong>Medium</strong> / <strong>High</strong>{' '}
                  from Ref/Hist sample depth (and Std). Prefer Medium+ before publishing.
                </li>
              </ul>
            </details>
          </div>
          {!isPage ? (
            <button
              type="button"
              onClick={() => void requestClose()}
              className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-slate-800 shrink-0"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-end gap-3 px-4 py-3 sm:px-5 border-b border-slate-100 bg-white">
          <div className="min-w-[200px]">
            <span className="text-ui-xs font-bold uppercase text-slate-500 block mb-1">Material</span>
            <div
              className="inline-flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-slate-50/90 p-1"
              role="group"
              aria-label="Workbook material"
            >
              {MATERIAL_OPTIONS.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  aria-pressed={materialKey === m.key}
                  aria-busy={busy && materialKey === m.key}
                  onClick={() => void requestMaterialKey(m.key)}
                  className={`rounded-md px-2.5 py-1.5 text-ui-xs font-black uppercase tracking-wide transition-colors ${
                    materialKey === m.key
                      ? 'bg-zarewa-teal text-white shadow-sm'
                      : 'bg-white text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <label className="text-ui-xs font-bold uppercase text-slate-500 block min-w-[180px]">
            Branch
            <select
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white py-2 px-2 text-sm font-semibold text-slate-800"
              value={branchId}
              onChange={(e) => void requestBranchId(e.target.value)}
            >
              {branches.length === 0 ? <option value="">No branches</option> : null}
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name || b.code || b.id}
                </option>
              ))}
            </select>
          </label>
          {!isReferenceTab ? (
            <label
              className="text-ui-xs font-bold uppercase text-slate-500 block min-w-[160px]"
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
                      ? `Avg purchase ~${recCostLabel} (${lookbackDays}d)`
                      : sheet?.isStoneCoatedWorkbook
                        ? 'N/A stone'
                        : ''
                }
                disabled={Boolean(sheet?.isStoneCoatedWorkbook)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white py-2 px-2 text-sm font-semibold text-slate-800 font-mono tabular-nums disabled:opacity-50"
                value={materialCostPerKgFieldValue}
                onChange={(e) => setCostPerKgAllLines(e.target.value)}
              />
            </label>
          ) : null}
          {!isReferenceTab ? (
            <>
              <label
                className="text-ui-xs font-bold uppercase text-slate-500 block min-w-[130px]"
                title="Marks rows to include when you Publish to price list"
              >
                Include in publish (all)
                <span className="mt-1 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={syncListAllChecked}
                    onChange={(e) => setSyncListForAll(e.target.checked)}
                    aria-label="Include all workbook rows in next publish"
                  />
                  Apply to all rows
                </span>
              </label>
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  disabled={busy || savingAll || !sheet}
                  onClick={() => void persistAllRows()}
                  className="rounded-lg bg-zarewa-teal px-3 py-2 text-ui-xs font-black uppercase text-white disabled:opacity-50"
                >
                  {savingAll ? 'Saving…' : 'Save all'}
                </button>
                {isDirty ? (
                  <span className="text-ui-xs font-semibold text-amber-700 tabular-nums">
                    {dirtyCount} unsaved change{dirtyCount === 1 ? '' : 's'}
                  </span>
                ) : null}
              </div>
              <button
                type="button"
                disabled={busy || savingAll || publishing || !sheet || !canPricingManage}
                onClick={() => void openPublishPreview()}
                className="rounded-lg border border-zarewa-teal/40 bg-teal-50 px-3 py-2 text-ui-xs font-black uppercase text-zarewa-teal disabled:opacity-50"
                title={
                  canPricingManage
                    ? 'Push rows marked Include in publish to the floor price list'
                    : 'Publishing requires Pricing Manager'
                }
              >
                Publish to price list
              </button>
            </>
          ) : materialKey === 'ridge-flashing' ? (
            <>
              <button
                type="button"
                disabled={busy || !sheet || !canPolicyManage}
                onClick={addRidgePolicyRow}
                className="rounded-lg border border-dashed border-zarewa-teal/40 bg-teal-50/80 px-3 py-2 text-ui-xs font-black uppercase text-zarewa-teal disabled:opacity-50 inline-flex items-center gap-1"
              >
                <Plus size={14} className="shrink-0" aria-hidden />
                Add add-on rate
              </button>
              <button
                type="button"
                disabled={busy || !sheet}
                onClick={addRidgeRow}
                className="rounded-lg border border-dashed border-zarewa-teal/40 bg-teal-50/80 px-3 py-2 text-ui-xs font-black uppercase text-zarewa-teal disabled:opacity-50 inline-flex items-center gap-1"
              >
                <Plus size={14} className="shrink-0" aria-hidden />
                Add ridge row
              </button>
              <button
                type="button"
                disabled={busy || savingRidges || !sheet || !canPolicyManage}
                onClick={() => void saveRidgeRows()}
                className="rounded-lg bg-zarewa-teal px-3 py-2 text-ui-xs font-black uppercase text-white disabled:opacity-50"
              >
                {savingRidges ? 'Saving…' : 'Save add-ons'}
              </button>
            </>
          ) : materialKey === 'stone-flatsheet' ? (
            <>
              <button
                type="button"
                disabled={busy || savingStoneFlatsheets || !sheet || !canSetupManage}
                onClick={addStoneFlatsheetRow}
                className="rounded-lg border border-dashed border-zarewa-teal/40 bg-teal-50/80 px-3 py-2 text-ui-xs font-black uppercase text-zarewa-teal disabled:opacity-50 inline-flex items-center gap-1"
              >
                <Plus size={14} className="shrink-0" aria-hidden />
                Add length
              </button>
              <button
                type="button"
                disabled={busy || savingStoneFlatsheets || !sheet || !canSetupManage}
                onClick={() => void saveStoneFlatsheets()}
                className="rounded-lg bg-zarewa-teal px-3 py-2 text-ui-xs font-black uppercase text-white disabled:opacity-50"
              >
                {savingStoneFlatsheets ? 'Saving…' : 'Save stone flatsheet'}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                disabled={busy || savingAccessories || !sheet || !canSetupManage}
                onClick={addAccessoryRow}
                className="rounded-lg border border-dashed border-zarewa-teal/40 bg-teal-50/80 px-3 py-2 text-ui-xs font-black uppercase text-zarewa-teal disabled:opacity-50 inline-flex items-center gap-1"
              >
                <Plus size={14} className="shrink-0" aria-hidden />
                Add accessory
              </button>
              <button
                type="button"
                disabled={busy || savingAccessories || !sheet || !canSetupManage}
                onClick={() => void saveAccessories()}
                className="rounded-lg bg-zarewa-teal px-3 py-2 text-ui-xs font-black uppercase text-white disabled:opacity-50"
              >
                {savingAccessories ? 'Saving…' : 'Save accessories'}
              </button>
            </>
          )}
          {canPricingManage ? (
            <button
              type="button"
              disabled={busy || !sheet || printLoading}
              onClick={() => void loadPrintPack('official')}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-ui-xs font-black uppercase text-zarewa-teal disabled:opacity-50 inline-flex items-center gap-1.5"
              title="Internal economics print — Pricing Manager only"
            >
              <Printer size={14} className="shrink-0" aria-hidden />
              {printLoading ? 'Preparing print…' : 'Internal (costs — confidential)'}
            </button>
          ) : null}
          <button
            type="button"
            disabled={busy || !sheet || printLoading}
            onClick={() => void loadPrintPack('customer')}
            className="rounded-lg border border-slate-200 bg-zarewa-teal/10 px-3 py-2 text-ui-xs font-black uppercase text-zarewa-teal disabled:opacity-50"
          >
            {printLoading ? 'Preparing print…' : 'Customer price list'}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              if (isDirty) {
                const ok = await appConfirm({
                  message: 'You have unsaved draft changes. Refresh and discard them?',
                  variant: 'danger',
                  confirmLabel: 'Discard and refresh',
                });
                if (!ok) return;
              }
              void loadSheet();
            }}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-ui-xs font-black uppercase text-zarewa-teal disabled:opacity-50"
          >
            Refresh
          </button>
          {!isReferenceTab ? (
            <button
              type="button"
              disabled={busy || !sheet}
              onClick={addWorkbookLine}
              className="rounded-lg border border-dashed border-zarewa-teal/40 bg-teal-50/80 px-3 py-2 text-ui-xs font-black uppercase text-zarewa-teal disabled:opacity-50 inline-flex items-center gap-1"
            >
              <Plus size={14} className="shrink-0" aria-hidden />
              Add line
            </button>
          ) : null}
        </div>

        <div className="flex-1 min-h-0 overflow-auto px-2 sm:px-4 py-3">
          {materialKey === 'stone-coated' && !isReferenceTab ? (
            <p className="mb-3 text-ui-xs text-slate-600 leading-relaxed rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              Stone-coated pricing uses <strong className="text-slate-800">minimum ₦/m (Floor)</strong> and commission
              only — no kg/m conversion economics. Conversion columns stay blank by design.
            </p>
          ) : null}
          {Array.isArray(events) && events.length > 0 && !isReferenceTab ? (
            <p className="mb-2 text-ui-xs text-slate-500">
              Last change:{' '}
              <span className="font-semibold text-slate-700">
                {events[0]?.changedAtIso
                  ? new Date(events[0].changedAtIso).toLocaleString()
                  : '—'}
              </span>
              {events[0]?.action ? (
                <>
                  {' '}
                  · <span className="uppercase tracking-wide">{events[0].action}</span>
                </>
              ) : null}
              {events[0]?.changedByUserId ? <> · {events[0].changedByUserId}</> : null}
            </p>
          ) : null}
          {busy && !sheet ? (
            <p className="text-sm text-slate-500 px-2">Loading…</p>
          ) : !sheet ? (
            <p className="text-sm text-slate-500 px-2">Could not load this section.</p>
          ) : isReferenceTab && materialKey === 'ridge-flashing' ? (
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                Ridge/flat-sheet calculator by gauge and material using your split rule:
                <strong className="text-slate-800"> 150=÷8, 300=÷4, 400=÷3, 600=÷2 </strong>
                plus configured add-ons. Base is the workbook published <strong className="text-slate-800">List ₦/m</strong> for the selected
                gauge/material. Gauge labels include the <strong className="text-slate-800">customer label</strong> from each workbook row when
                set.
              </p>
              <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 space-y-2">
                <p className="text-ui-xs font-black uppercase tracking-wide text-slate-600">Add-on rates (policy)</p>
                <div className="z-scroll-x overflow-x-auto rounded-lg border border-slate-200 bg-white">
                  <table className="min-w-[720px] w-full border-collapse text-left text-xs">
                    <thead className="bg-slate-50 text-ui-xs font-black uppercase tracking-wide text-slate-600">
                      <tr>
                        <th className="px-2 py-2 border-b border-slate-200 w-10" aria-label="Remove" />
                        <th className="px-2 py-2 border-b border-slate-200">Girth mm</th>
                        <th className="px-2 py-2 border-b border-slate-200">Material family</th>
                        <th className="px-2 py-2 border-b border-slate-200 text-right">Add-on ₦/m</th>
                        <th className="px-2 py-2 border-b border-slate-200 text-right">Customer list ₦/m</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {refRidgeAddOns.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-3 py-4 text-center text-slate-500">
                            No add-on rows yet. Use <strong>Add add-on rate</strong> above, then <strong>Save add-ons</strong>.
                          </td>
                        </tr>
                      ) : (
                        refRidgeAddOns.map((row, ri) => (
                          <tr key={row.id || `ridge-pol-${ri}`}>
                            <td className="px-1 py-1 align-middle">
                              <button
                                type="button"
                                title="Remove rate row"
                                className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                                onClick={() => removeRidgePolicyRow(ri)}
                                disabled={!canPolicyManage}
                              >
                                <Trash2 size={16} aria-hidden />
                              </button>
                            </td>
                            <td className="px-2 py-1">
                              <input
                                type="number"
                                className="w-20 rounded border border-slate-200 px-2 py-1"
                                value={row.girthMm}
                                onChange={(e) =>
                                  setRefRidgeAddOns((prev) =>
                                    prev.map((x, idx) => (idx === ri ? { ...x, girthMm: e.target.value } : x))
                                  )
                                }
                                disabled={!canPolicyManage}
                              />
                            </td>
                            <td className="px-2 py-1">
                              <input
                                className="w-36 rounded border border-slate-200 px-2 py-1"
                                placeholder="blank = any"
                                value={row.materialFamily ?? ''}
                                onChange={(e) =>
                                  setRefRidgeAddOns((prev) =>
                                    prev.map((x, idx) => (idx === ri ? { ...x, materialFamily: e.target.value } : x))
                                  )
                                }
                                disabled={!canPolicyManage}
                              />
                            </td>
                            <td className="px-2 py-1 text-right">
                              <input
                                type="number"
                                min={0}
                                className="w-24 rounded border border-slate-200 px-2 py-1 text-right font-mono tabular-nums"
                                value={row.addOnNgn}
                                onChange={(e) =>
                                  setRefRidgeAddOns((prev) =>
                                    prev.map((x, idx) => (idx === ri ? { ...x, addOnNgn: e.target.value } : x))
                                  )
                                }
                                disabled={!canPolicyManage}
                              />
                            </td>
                            <td className="px-2 py-1 text-right">
                              <input
                                type="number"
                                min={0}
                                placeholder="optional"
                                className="w-24 rounded border border-slate-200 px-2 py-1 text-right font-mono tabular-nums"
                                value={row.listAddOnNgn ?? ''}
                                onChange={(e) =>
                                  setRefRidgeAddOns((prev) =>
                                    prev.map((x, idx) => (idx === ri ? { ...x, listAddOnNgn: e.target.value } : x))
                                  )
                                }
                                disabled={!canPolicyManage}
                              />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <p className="text-ui-xs text-slate-500">
                  Customer list ₦/m is optional: when set, that add-on is what appears on the customer price list / print. Totals below use
                  internal add-on; if the list value differs, the second line shows the customer-list total.
                </p>
              </div>
              <div className="z-scroll-x overflow-x-auto rounded-lg border border-slate-200 bg-white">
                <table className="min-w-[620px] w-full border-collapse text-left text-xs">
                  <thead className="bg-slate-50 text-ui-xs font-black uppercase tracking-wide text-slate-600">
                    <tr>
                      <th className="px-3 py-2 border-b border-slate-200 w-10" aria-label="Remove row" />
                      <th className="px-3 py-2 border-b border-slate-200">Gauge</th>
                      <th className="px-3 py-2 border-b border-slate-200">Material</th>
                      <th className="px-3 py-2 border-b border-slate-200 text-right">150mm</th>
                      <th className="px-3 py-2 border-b border-slate-200 text-right">300mm</th>
                      <th className="px-3 py-2 border-b border-slate-200 text-right">400mm</th>
                      <th className="px-3 py-2 border-b border-slate-200 text-right">600mm</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ridgeCalcRows.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-3 py-6 text-center text-sm text-slate-500">
                          No rows yet. Use <strong>Add ridge row</strong>.
                        </td>
                      </tr>
                    ) : (
                      ridgeCalcRows.map((r, i) => (
                        <tr key={r.id || i}>
                          <td className="px-2 py-1.5 align-middle">
                            <button
                              type="button"
                              title="Remove row"
                              className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                              onClick={() => removeRidgeRow(i)}
                            >
                              <Trash2 size={16} aria-hidden />
                            </button>
                          </td>
                          <td className="px-3 py-2">
                            <select
                              className="w-full rounded border border-slate-200 px-2 py-1"
                              value={String(r.gaugeMm || '')}
                              onChange={(e) =>
                                setRidgeCalcRows((prev) =>
                                  prev.map((x, idx) => (idx === i ? { ...x, gaugeMm: e.target.value } : x))
                                )
                              }
                            >
                              <option value="">— Select —</option>
                              {ridgeGaugeSelectOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <select
                              className="w-full rounded border border-slate-200 px-2 py-1"
                              value={String(r.materialKey || 'alu')}
                              onChange={(e) =>
                                setRidgeCalcRows((prev) =>
                                  prev.map((x, idx) => (idx === i ? { ...x, materialKey: e.target.value } : x))
                                )
                              }
                            >
                              {RIDGE_MATERIAL_OPTIONS.map((m) => (
                                <option key={m.key} value={m.key}>
                                  {m.label}
                                </option>
                              ))}
                            </select>
                          </td>
                          {RIDGE_GIRTH_COLUMNS_MM.map((girth) => {
                            const amount = ridgeAutoAmount(r.materialKey, r.gaugeMm, girth);
                            const base = Math.max(
                              0,
                              Math.round(Number(ridgeBaseByMatGauge[`${r.materialKey}::${r.gaugeMm}`]) || 0)
                            );
                            const divisor = 1200 / Number(girth || 0);
                            const splitPart =
                              base && Number.isFinite(divisor) && divisor > 0 ? Math.round(base / divisor) : 0;
                            const calcAdd = ridgeAddOnFor(r.materialKey, girth);
                            const listAdd = ridgeCustomerListAddOnFor(r.materialKey, girth);
                            const listTotal =
                              base && Number.isFinite(divisor) && divisor > 0 ? Math.round(base / divisor + listAdd) : 0;
                            const showListLine = amount > 0 && listTotal > 0 && listTotal !== amount;
                            return (
                              <td key={girth} className="px-3 py-2 text-right font-mono tabular-nums text-slate-900 align-top">
                                <div>{amount > 0 ? formatNgn(amount) : '—'}</div>
                                {amount > 0 ? (
                                  <div className="mt-0.5 text-ui-xs font-sans text-slate-500 normal-nums text-left sm:text-right">
                                    Split {formatNgn(splitPart)} + add-on {formatNgn(calcAdd)}
                                  </div>
                                ) : null}
                                {showListLine ? (
                                  <div className="mt-0.5 text-ui-xs font-sans text-zarewa-teal font-semibold normal-nums">
                                    Customer list total {formatNgn(listTotal)}
                                  </div>
                                ) : null}
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <p className="text-ui-xs text-slate-500">
                Edit add-on rates in the policy table above, then <strong>Save add-ons</strong>. Calculator updates after refresh or reload.
              </p>
            </div>
          ) : isReferenceTab && materialKey === 'stone-flatsheet' ? (
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                Set <strong className="text-slate-800">list</strong> and <strong className="text-slate-800">floor</strong>{' '}
                ₦/m² for stone flatsheet lengths used on quotations. These are not coil metre workbook rows — save here to
                update quotation defaults. Use <strong className="text-slate-800">Save stone flatsheet</strong> when done.
              </p>
              <div className="z-scroll-x overflow-x-auto rounded-lg border border-slate-200 bg-white">
                <table className="min-w-[780px] w-full border-collapse text-left text-xs">
                  <thead className="bg-slate-50 text-ui-xs font-black uppercase tracking-wide text-slate-600">
                    <tr>
                      <th className="px-3 py-2 border-b border-slate-200">Item</th>
                      <th className="px-3 py-2 border-b border-slate-200">Unit</th>
                      <th className="px-3 py-2 border-b border-slate-200">Active</th>
                      <th
                        className="px-3 py-2 border-b border-slate-200 text-right"
                        title="Default selling ₦/m² filled on quotations"
                      >
                        List ₦/m²
                      </th>
                      <th
                        className="px-3 py-2 border-b border-slate-200 text-right"
                        title="Minimum ₦/m² shown on the quotation line"
                      >
                        Floor ₦/m²
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {refStoneFlatsheets.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-6 text-center text-sm text-slate-500">
                          No stone flatsheet products in master data. Use <strong>Add length</strong>.
                        </td>
                      </tr>
                    ) : (
                      refStoneFlatsheets.map((a, i) => {
                        const missingPrice = !(Number(a.defaultUnitPriceNgn) > 0) && a.active !== false;
                        return (
                          <tr key={a.id || i} className={missingPrice ? 'bg-amber-50/80' : undefined}>
                            <td className="px-3 py-2">
                              <input
                                className="w-full rounded border border-slate-200 px-2 py-1"
                                value={a.name ?? ''}
                                onChange={(e) =>
                                  setRefStoneFlatsheets((prev) =>
                                    prev.map((x, idx) => (idx === i ? { ...x, name: e.target.value } : x))
                                  )
                                }
                                disabled={!canSetupManage}
                                placeholder="Stone flatsheet 1.4"
                              />
                              {missingPrice ? (
                                <div className="mt-0.5 text-[10px] font-semibold text-amber-800">No list price</div>
                              ) : null}
                            </td>
                            <td className="px-3 py-2">
                              <input
                                className="w-full rounded border border-slate-200 px-2 py-1"
                                value={a.unit ?? 'm²'}
                                onChange={(e) =>
                                  setRefStoneFlatsheets((prev) =>
                                    prev.map((x, idx) => (idx === i ? { ...x, unit: e.target.value } : x))
                                  )
                                }
                                disabled={!canSetupManage}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <label className="inline-flex items-center gap-1 text-ui-xs text-slate-600">
                                <input
                                  type="checkbox"
                                  checked={a.active !== false}
                                  onChange={(e) =>
                                    setRefStoneFlatsheets((prev) =>
                                      prev.map((x, idx) => (idx === i ? { ...x, active: e.target.checked } : x))
                                    )
                                  }
                                  disabled={!canSetupManage}
                                />
                                Active
                              </label>
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                className="w-full rounded border border-slate-200 px-2 py-1 text-right font-mono tabular-nums"
                                value={a.defaultUnitPriceNgn ?? 0}
                                onChange={(e) =>
                                  setRefStoneFlatsheets((prev) =>
                                    prev.map((x, idx) =>
                                      idx === i ? { ...x, defaultUnitPriceNgn: e.target.value } : x
                                    )
                                  )
                                }
                                disabled={!canSetupManage}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                className="w-full rounded border border-slate-200 px-2 py-1 text-right font-mono tabular-nums"
                                value={a.floorUnitPriceNgn ?? 0}
                                onChange={(e) =>
                                  setRefStoneFlatsheets((prev) =>
                                    prev.map((x, idx) =>
                                      idx === i ? { ...x, floorUnitPriceNgn: e.target.value } : x
                                    )
                                  )
                                }
                                disabled={!canSetupManage}
                              />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : isReferenceTab && materialKey === 'accessories' ? (
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                Edit accessory rows and default unit prices used in workbook prints and quotation master data. Use{' '}
                <strong className="text-slate-800">Save accessories</strong> to apply changes.
                {refAccessories.some((a) => !(Number(a.defaultUnitPriceNgn) > 0) && a.active !== false) ? (
                  <span className="ml-1 text-amber-800 font-semibold">
                    Highlighted rows still have no default ₦ — set a price so quotations can auto-fill.
                  </span>
                ) : null}
              </p>
              <div className="z-scroll-x overflow-x-auto rounded-lg border border-slate-200 bg-white">
                <table className="min-w-[720px] w-full border-collapse text-left text-xs">
                  <thead className="bg-slate-50 text-ui-xs font-black uppercase tracking-wide text-slate-600">
                    <tr>
                      <th className="px-3 py-2 border-b border-slate-200 w-10" aria-label="Remove row" />
                      <th className="px-3 py-2 border-b border-slate-200">Item</th>
                      <th className="px-3 py-2 border-b border-slate-200">Unit</th>
                      <th className="px-3 py-2 border-b border-slate-200">Active</th>
                      <th className="px-3 py-2 border-b border-slate-200 text-right">Default ₦</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {refAccessories.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-6 text-center text-sm text-slate-500">
                          No active accessories in master data.
                        </td>
                      </tr>
                    ) : (
                      refAccessories.map((a, i) => {
                        const missingPrice = !(Number(a.defaultUnitPriceNgn) > 0) && a.active !== false;
                        return (
                          <tr key={i} className={missingPrice ? 'bg-amber-50/80' : undefined}>
                            <td className="px-2 py-1.5 align-middle">
                              <button
                                type="button"
                                title="Remove accessory"
                                className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                                onClick={() => void removeAccessoryRow(i)}
                                disabled={!canSetupManage}
                              >
                                <Trash2 size={16} aria-hidden />
                              </button>
                            </td>
                            <td className="px-3 py-2">
                              <input
                                className="w-full rounded border border-slate-200 px-2 py-1"
                                value={a.name ?? ''}
                                onChange={(e) =>
                                  setRefAccessories((prev) =>
                                    prev.map((x, idx) => (idx === i ? { ...x, name: e.target.value } : x))
                                  )
                                }
                                disabled={!canSetupManage}
                              />
                              {missingPrice ? (
                                <div className="mt-0.5 text-[10px] font-semibold text-amber-800">No default price</div>
                              ) : null}
                            </td>
                            <td className="px-3 py-2">
                              <input
                                className="w-full rounded border border-slate-200 px-2 py-1"
                                value={a.unit ?? ''}
                                onChange={(e) =>
                                  setRefAccessories((prev) =>
                                    prev.map((x, idx) => (idx === i ? { ...x, unit: e.target.value } : x))
                                  )
                                }
                                disabled={!canSetupManage}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <label className="inline-flex items-center gap-1 text-ui-xs text-slate-600">
                                <input
                                  type="checkbox"
                                  checked={a.active !== false}
                                  onChange={(e) =>
                                    setRefAccessories((prev) =>
                                      prev.map((x, idx) => (idx === i ? { ...x, active: e.target.checked } : x))
                                    )
                                  }
                                  disabled={!canSetupManage}
                                />
                                Active
                              </label>
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                className="w-full rounded border border-slate-200 px-2 py-1 text-right font-mono tabular-nums"
                                value={a.defaultUnitPriceNgn ?? 0}
                                onChange={(e) =>
                                  setRefAccessories((prev) =>
                                    prev.map((x, idx) => (idx === i ? { ...x, defaultUnitPriceNgn: e.target.value } : x))
                                  )
                                }
                                disabled={!canSetupManage}
                              />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <>
              <div className="z-scroll-x overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="min-w-[1120px] w-full border-collapse text-left text-xs">
                <thead className="bg-slate-50 text-ui-xs font-black uppercase tracking-wide text-slate-600 sticky top-0 z-[1]">
                  <tr>
                    <th className="px-2 py-2 border-b border-slate-200 whitespace-nowrap w-10" aria-label="Remove row" />
                    <th className="px-2 py-2 border-b border-slate-200 whitespace-nowrap">Gauge (mm)</th>
                    <th
                      className="px-2 py-2 border-b border-slate-200 whitespace-nowrap min-w-[120px]"
                      title="Shown on customer price list instead of raw mm when set"
                    >
                      Customer label
                    </th>
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
                    <th
                      className="px-2 py-2 border-b border-slate-200 whitespace-nowrap"
                      title="Include this row when you Publish to price list"
                    >
                      Publish
                    </th>
                    <th className="px-2 py-2 border-b border-slate-200 whitespace-nowrap min-w-[100px]">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {workbookLines.length === 0 ? (
                    <tr>
                      <td colSpan={16} className="px-4 py-8 text-center text-sm text-slate-500">
                        No lines yet. Use <strong>Add line</strong>, choose a gauge, enter prices, then Save all.
                      </td>
                    </tr>
                  ) : (
                    workbookLines.map((line) => {
                      const g = String(line.gaugeMm ?? '').trim();
                      const dr = line.draft || {};
                      const rv = g ? sheet?.resolvedByGauge?.[g] || {} : {};
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
                      const floorBelowSuggested =
                        displaySug != null &&
                        displaySug > 0 &&
                        minimumNgn > 0 &&
                        minimumNgn < displaySug;
                      const refChip = metaNChip(rv.refMeta, 'coils');
                      const histChip = metaNChip(rv.histMeta, 'jobs');
                      const usedConf = String(rv.usedConfidence || 'none').toLowerCase();
                      const refEmpty = g && Number(rv.refMeta?.n) === 0;
                      const histEmpty = g && Number(rv.histMeta?.n) === 0;
                      const stdSourceLabel =
                        rv.stdSource === 'catalog' ? 'catalog' : rv.stdSource === 'theory' ? 'theory' : null;
                      const costMRounded = cm == null ? null : Math.round(cm);
                      const inp =
                        'w-full min-w-[64px] rounded border border-slate-200 px-1 py-1 font-mono text-xs tabular-nums';
                      const cell =
                        'min-w-[72px] rounded border border-slate-100 bg-slate-50/80 px-2 py-1 font-mono text-xs tabular-nums text-slate-800';
                      const dkShow = String(line.designKey || '').trim();
                      return (
                        <tr key={line.key} className="hover:bg-teal-50/20">
                          <td className="px-1 py-1.5 align-middle">
                            <button
                              type="button"
                              title="Remove row"
                              className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                              onClick={() => void removeWorkbookLine(line.key)}
                            >
                              <Trash2 size={16} aria-hidden />
                            </button>
                          </td>
                          <td className="px-2 py-1.5 align-top min-w-[100px]">
                            <select
                              className="w-full rounded border border-slate-200 px-1 py-1 text-xs font-semibold text-slate-800"
                              value={g}
                              onChange={(e) => setLineGauge(line.key, e.target.value)}
                              aria-label="Gauge thickness mm"
                            >
                              <option value="">— Select —</option>
                              {(sheet?.gauges || []).map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt} mm
                                </option>
                              ))}
                            </select>
                            {dkShow.startsWith('wb-') ? (
                              <p className="text-ui-xs text-slate-400 mt-0.5 font-mono truncate max-w-[96px]" title={dkShow}>
                                Alt line
                              </p>
                            ) : null}
                          </td>
                          <td className="px-2 py-1.5 align-top">
                            <input
                              className={`${inp} font-sans`}
                              placeholder="Customer print label"
                              title="Optional: how this row appears on the customer price list (e.g. full 0.55)"
                              value={dr.gaugeCustomerLabel ?? ''}
                              onChange={(e) => updateLineDraft(line.key, { gaugeCustomerLabel: e.target.value })}
                            />
                          </td>
                          <td className="px-2 py-1.5 align-top">
                            <div className={cell}>{g ? fmtConv2(rv.std) : '—'}</div>
                            {stdSourceLabel ? (
                              <p className="text-ui-xs text-slate-400 mt-0.5">{stdSourceLabel}</p>
                            ) : null}
                          </td>
                          <td className="px-2 py-1.5 align-top">
                            <div className="flex flex-wrap items-center gap-1">
                              <div className={cell}>
                                {refEmpty ? (
                                  <span className="font-sans text-[10px] text-slate-500 normal-nums">No purchase samples</span>
                                ) : g ? (
                                  fmtConv2(rv.ref)
                                ) : (
                                  '—'
                                )}
                              </div>
                              {refChip ? (
                                <span className="rounded bg-slate-100 px-1 py-0.5 text-[10px] font-semibold text-slate-600 tabular-nums">
                                  {refChip}
                                </span>
                              ) : null}
                            </div>
                            {!sheet?.isStoneCoatedWorkbook && g ? (
                              <p className="text-ui-xs text-slate-400 mt-0.5">Purchases {lookbackDays}d</p>
                            ) : null}
                          </td>
                          <td className="px-2 py-1.5 align-top">
                            <div className="flex flex-wrap items-center gap-1">
                              <div className={cell}>
                                {histEmpty ? (
                                  <span className="font-sans text-[10px] text-slate-500 normal-nums">No production samples</span>
                                ) : g ? (
                                  fmtConv2(rv.hist)
                                ) : (
                                  '—'
                                )}
                              </div>
                              {histChip ? (
                                <span className="rounded bg-slate-100 px-1 py-0.5 text-[10px] font-semibold text-slate-600 tabular-nums">
                                  {histChip}
                                </span>
                              ) : null}
                            </div>
                            {!sheet?.isStoneCoatedWorkbook && g ? (
                              <p className="text-ui-xs text-slate-400 mt-0.5">Production {lookbackDays}d</p>
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
                                    g && rv.usedSuggested != null && Number.isFinite(Number(rv.usedSuggested))
                                      ? `~${fmtConv2(rv.usedSuggested)}`
                                      : '—'
                                  }
                                  title="Leave blank to use the average of Std, Ref, and Hist"
                                  value={dr.conversionUsedKgPerM ?? ''}
                                  onChange={(e) => updateLineDraft(line.key, { conversionUsedKgPerM: e.target.value })}
                                  disabled={!g}
                                />
                                <div className="mt-0.5 flex flex-wrap items-center gap-1">
                                  <p className="text-ui-xs text-slate-400">Override avg (kg/m)</p>
                                  {g ? (
                                    <span
                                      className={`rounded px-1 py-0.5 text-[10px] font-bold uppercase tracking-wide ${confidenceBadgeClass(usedConf)}`}
                                      title="Confidence from Ref/Hist sample depth and Std: None / Low / Medium / High"
                                    >
                                      {confidenceLabel(usedConf)}
                                    </span>
                                  ) : null}
                                </div>
                              </>
                            )}
                          </td>
                          <td className="px-2 py-1.5 font-mono text-xs text-slate-600 tabular-nums">
                            {cm == null ? '—' : formatNgn(Math.round(cm))}
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              className={inp}
                              value={dr.overheadNgnPerM ?? ''}
                              onChange={(e) => updateLineDraft(line.key, { overheadNgnPerM: e.target.value })}
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              className={inp}
                              value={dr.profitNgnPerM ?? ''}
                              onChange={(e) => updateLineDraft(line.key, { profitNgnPerM: e.target.value })}
                            />
                          </td>
                          <td className="px-2 py-1.5 align-top">
                            <div className="font-mono text-xs font-semibold text-zarewa-teal tabular-nums">
                              {displaySug == null ? '—' : formatNgn(displaySug)}
                            </div>
                            {!sheet?.isStoneCoatedWorkbook && (costMRounded != null || displaySug != null || minimumNgn > 0 || listNgn > 0) ? (
                              <p
                                className={`mt-0.5 text-[10px] leading-snug ${
                                  floorBelowSuggested ? 'text-amber-700 font-semibold' : 'text-slate-400'
                                }`}
                                title={
                                  floorBelowSuggested
                                    ? 'Floor is below Suggested — check margin'
                                    : 'Price waterfall'
                                }
                              >
                                {costMRounded != null ? formatNgn(costMRounded) : '—'} →{' '}
                                {displaySug != null ? formatNgn(displaySug) : '—'} →{' '}
                                {minimumNgn > 0 ? formatNgn(minimumNgn) : '—'} →{' '}
                                {listNgn > 0 ? formatNgn(listNgn) : '—'}
                                {floorBelowSuggested ? ' ⚠' : ''}
                              </p>
                            ) : null}
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              className={inp}
                              value={dr.minimumPricePerMeterNgn ?? ''}
                              onChange={(e) => updateLineDraft(line.key, { minimumPricePerMeterNgn: e.target.value })}
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              className={inp}
                              inputMode="decimal"
                              placeholder="0"
                              title="Commission ₦/m added to floor for published list price"
                              value={dr.commissionNgnPerM ?? ''}
                              onChange={(e) => updateLineDraft(line.key, { commissionNgnPerM: e.target.value })}
                            />
                          </td>
                          <td className="px-2 py-1.5 font-mono text-xs font-semibold text-slate-800 tabular-nums">
                            {listNgn > 0 ? formatNgn(listNgn) : '—'}
                          </td>
                          <td className="px-2 py-1.5 align-top space-y-1">
                            <label
                              className="flex items-center gap-1 text-ui-xs text-slate-600 whitespace-nowrap"
                              title="Include in next Publish to price list"
                            >
                              <input
                                type="checkbox"
                                checked={Boolean(dr.syncMinimumToPriceList)}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  const patch = { syncMinimumToPriceList: checked };
                                  if (checked && !String(dr.syncDesignKey ?? '').trim() && materialKey !== 'stone-coated') {
                                    patch.syncDesignKey = 'longspan';
                                  }
                                  updateLineDraft(line.key, patch);
                                }}
                              />
                              Include
                            </label>
                            <input
                              className={`${inp} text-ui-xs`}
                              placeholder={materialKey !== 'stone-coated' ? 'longspan' : 'Design key'}
                              title="Design key written to the floor price list (e.g. longspan, metcoppo). Defaults to longspan for coil materials."
                              value={dr.syncDesignKey ?? ''}
                              onChange={(e) => updateLineDraft(line.key, { syncDesignKey: e.target.value })}
                            />
                            {listNgn > 0 && !dr.syncMinimumToPriceList ? (
                              <p className="text-ui-xs text-emerald-700 font-semibold">
                                ✓ list set — tick Include to publish
                              </p>
                            ) : null}
                          </td>
                          <td className="px-2 py-1.5 align-top">
                            <input
                              className={`${inp} font-sans min-w-[88px]`}
                              placeholder="Notes"
                              title="Draft notes for this gauge line"
                              value={dr.notes ?? ''}
                              onChange={(e) => updateLineDraft(line.key, { notes: e.target.value })}
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
              <h3 className="text-ui-xs font-black uppercase text-zarewa-teal mb-2">Price change log</h3>
              {(() => {
                const branchEvents = (events || []).filter(
                  (ev) => !branchId || !ev.branchId || String(ev.branchId) === String(branchId)
                );
                if (branchEvents.length === 0) {
                  return <p className="text-xs text-slate-500">No changes recorded for this material/branch yet.</p>;
                }
                return (
                <ul className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {branchEvents.map((ev) => {
                    const snap = ev.payload?.after || {};
                    const when = ev.changedAtIso ? new Date(ev.changedAtIso).toLocaleString() : '';
                    const actor =
                      ev.changedByDisplayName ||
                      ev.actorDisplayName ||
                      ev.changedByUserId ||
                      ev.actorUserId ||
                      '';
                    const evBranch = branches.find((b) => b.id === ev.branchId);
                    const evBranchLabel = evBranch?.name || evBranch?.code || ev.branchId || '';
                    const actionLabel = String(ev.action || 'upsert').replace(/^pricing\.material_sheet_/, '');
                    return (
                      <li
                        key={ev.id}
                        className="text-ui-xs text-slate-700 border-b border-slate-200/80 pb-2 last:border-0 leading-snug"
                      >
                        <span className="font-bold text-slate-900">{when}</span>
                        {actor ? (
                          <>
                            {' · '}
                            <span className="font-semibold text-slate-800">{actor}</span>
                          </>
                        ) : null}
                        {' · '}
                        <span className="uppercase tracking-wide text-slate-500">{actionLabel}</span>
                        {evBranchLabel ? (
                          <>
                            {' · '}
                            <span>{evBranchLabel}</span>
                          </>
                        ) : null}
                        {' · gauge '}
                        {ev.gaugeMm} mm
                        {snap.minimumPricePerMeterNgn != null ? (
                          <>
                            {' '}
                            · min <span className="font-mono">{formatNgn(snap.minimumPricePerMeterNgn)}</span>/m
                          </>
                        ) : null}
                        {snap.suggestedPricePerMeterNgn != null ? (
                          <>
                            {' '}
                            · suggested{' '}
                            <span className="font-mono">{formatNgn(snap.suggestedPricePerMeterNgn)}</span>/m
                          </>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
                );
              })()}
            </div>
            </>
          )}
        </div>
      </div>
  );

  if (isPage) {
    if (!canAccessWorkbook) {
      return (
        <PageShell>
          <PageHeader
            eyebrow="Procurement"
            title="Material pricing workbook"
            subtitle="Pricing desk access is limited to Pricing Managers and MD price-exception approvers."
            toolbar={
              <Link
                to="/procurement"
                state={{ focusTab: 'conversion' }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-ui-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <ArrowLeft size={14} aria-hidden />
                Back to Procurement
              </Link>
            }
          />
          <div className="rounded-xl border border-amber-200/90 bg-amber-50/80 p-5 sm:p-6 max-w-xl space-y-3">
            <p className="text-sm text-amber-950 leading-relaxed">
              This workbook is locked for your role. Ask a <strong>Pricing Manager</strong> (or an MD price-exception
              approver) if you need to edit floors or publish selling prices.
            </p>
            <Link to="/procurement" state={{ focusTab: 'conversion' }} className="z-btn-primary inline-flex text-xs">
              Return to Procurement
            </Link>
          </div>
        </PageShell>
      );
    }
    return (
      <PageShell>
        <PageHeader
          eyebrow="Procurement"
          title="Material pricing workbook"
          subtitle="Build floors from Std / Ref / Hist, save drafts, then publish to the price list."
          toolbar={
            <button
              type="button"
              onClick={() => void requestBackToProcurement()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-ui-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft size={14} aria-hidden />
              Back to Pricing
            </button>
          }
        />
        {workbookPanel}
        {publishPreviewModal}
        {printPortal}
      </PageShell>
    );
  }

  return (
    <>
      <ModalFrame isOpen={open} onClose={() => void requestClose()} modal={!printPreview && !publishPreviewOpen}>
        {workbookPanel}
      </ModalFrame>
      {publishPreviewModal}
      {printPortal}
    </>
  );
}

/** Thin modal wrapper — prefer `MaterialPricingWorkbook` with `mode="page"` for the full desk. */
export function MaterialPricingWorkbookModal({ open, onClose, initialMaterialKey = 'alu' }) {
  return (
    <MaterialPricingWorkbook
      mode="modal"
      open={open}
      onClose={onClose}
      initialMaterialKey={initialMaterialKey}
    />
  );
}
