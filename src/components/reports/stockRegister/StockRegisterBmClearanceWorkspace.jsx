import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Filter,
  HelpCircle,
  Layers,
  LayoutGrid,
  List,
  Loader2,
  PackageCheck,
  Printer,
  RotateCcw,
  Save,
  Scale,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import {
  bulkClearUnchangedLines,
  computeClearanceProgress,
  enumerateRegisterLineKeys,
  FINISHED_CONFIRM,
  getLineEntry,
  LINE_STATUS,
  parseLineClearance,
  roundKg,
  roundM,
  setLineEntry,
  validateBmApprove,
} from '../../../lib/stockRegisterLineClearance';
import { BM_STATUS_FILTERS, BM_TABS, LINE_STATUS_LABELS } from './stockRegisterConstants';
import { postLineClearance, postStockRegisterWorkflow } from './stockRegisterApi';
import { StockRegisterLineDetailModal } from './StockRegisterLineDetailModal';
import { StockRegisterBmConfirmModal } from './StockRegisterBmConfirmModal';
import { StockRegisterReturnToStoreModal } from './StockRegisterReturnToStoreModal';

function statusBadge(entry, kind) {
  if (kind === 'finished') {
    if (entry.finishedConfirm === FINISHED_CONFIRM.PENDING) {
      return { label: 'Pending', cls: 'bg-amber-100 text-amber-900 border-amber-200' };
    }
    if (entry.finishedConfirm === FINISHED_CONFIRM.DISPUTED) {
      return { label: 'Disputed', cls: 'bg-rose-100 text-rose-900 border-rose-200' };
    }
    return { label: 'Confirmed', cls: 'bg-teal-100 text-teal-900 border-teal-200' };
  }
  const st = entry.status || LINE_STATUS.PENDING;
  const map = {
    [LINE_STATUS.PENDING]: 'bg-slate-100 text-slate-700 border-slate-200',
    [LINE_STATUS.CLEARED]: 'bg-emerald-100 text-emerald-900 border-emerald-200',
    [LINE_STATUS.ADJUSTED]: 'bg-amber-100 text-amber-900 border-amber-200',
    [LINE_STATUS.QUERY]: 'bg-rose-100 text-rose-900 border-rose-200',
    [LINE_STATUS.FINISHED]: 'bg-slate-800 text-white border-slate-800',
  };
  return { label: LINE_STATUS_LABELS[st] || st, cls: map[st] || map[LINE_STATUS.PENDING] };
}

function lineTitle(item) {
  if (!item) return 'Line item';
  if (item.kind === 'coil' || item.kind === 'finished') {
    return `#${item.row?.coilNoDisplay || item.row?.coilNo || '—'}`;
  }
  if (item.kind === 'stone') return item.row?.colourDisplay || item.row?.colourAbbrev || item.row?.productID || 'Stone';
  if (item.kind === 'accessory') return item.row?.itemName || item.row?.productID || 'Accessory';
  return item.row?.itemName || item.row?.referenceNo || 'In-transit';
}

function lineQty(item) {
  const r = item.row || {};
  if (item.kind === 'coil') {
    return r.closingKg != null ? `${roundKg(r.closingKg).toLocaleString()} kg` : '—';
  }
  if (item.kind === 'finished') {
    const bal = r.closingKg != null ? roundKg(r.closingKg) : 0;
    return `Used ${roundKg(r.usedKg ?? 0).toLocaleString()} kg · bal ${bal} kg`;
  }
  if (item.kind === 'stone') return `${roundM(r.remainingM ?? 0).toLocaleString()} m`;
  if (item.kind === 'accessory') return `${roundM(r.balance ?? 0).toLocaleString()} ${r.unit || ''}`;
  return `${roundM(r.qtyExpected ?? 0).toLocaleString()} ${r.unit || ''}`;
}

function tabKind(tab) {
  if (tab === 'active') return 'coil';
  if (tab === 'finished') return 'finished';
  if (tab === 'stone') return 'stone';
  if (tab === 'accessories') return 'accessory';
  return 'intransit';
}

function groupKeyForItem(item) {
  if (item.kind === 'coil') {
    const fam = item.family || 'Other';
    const famCap = fam.charAt(0).toUpperCase() + fam.slice(1);
    const gauge = item.gaugeLabel || 'Standard';
    return `${famCap} · ${gauge}`;
  }
  if (item.kind === 'stone') {
    return item.gaugeLabel ? `Stone · ${item.gaugeLabel}` : 'Stone-Coated';
  }
  if (item.kind === 'accessory') {
    return item.row?.typeLabel || 'General Accessories';
  }
  if (item.kind === 'finished') {
    const fam = item.family || 'Coils';
    const famCap = fam.charAt(0).toUpperCase() + fam.slice(1);
    return `${famCap} Finished in Period`;
  }
  return 'In-Transit Shipments';
}

/**
 * Professional Branch Manager Monthly Stock Review Workspace.
 * Comprehensive search, arrangement/grouping, discrepancy indicators, batch clearance,
 * line clearance modal with navigation, and executive sign-off confirmation.
 */
export function StockRegisterBmClearanceWorkspace({
  register,
  workflow,
  periodKey,
  showToast,
  onSaved,
  onPrint,
  onApproved,
  onReturned,
}) {
  const [tab, setTab] = useState('active');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [arrangementMode, setArrangementMode] = useState('grouped'); // 'grouped' | 'flat'
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [pendingOnly, setPendingOnly] = useState(false);
  const [variancesOnly, setVariancesOnly] = useState(false);
  const [sortBy, setSortBy] = useState('coil_asc'); // 'coil_asc' | 'coil_desc' | 'weight_desc' | 'weight_asc' | 'status' | 'variance'

  const [lineClearance, setLineClearance] = useState({ lines: {}, version: 1 });
  const [selectedLineKey, setSelectedLineKey] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [confirmSubmitting, setConfirmSubmitting] = useState(false);
  const [batchClearing, setBatchClearing] = useState(false);

  useEffect(() => {
    setLineClearance(parseLineClearance(workflow?.lineClearance));
    setSelectedLineKey(null);
  }, [workflow?.lineClearance, periodKey]);

  const allItems = useMemo(() => enumerateRegisterLineKeys(register), [register]);

  const progress = useMemo(
    () => computeClearanceProgress(register, lineClearance),
    [register, lineClearance]
  );

  const kindProgress = progress.byKind || {};

  // Filter items by active tab, status, search, and quick toggles
  const filteredItems = useMemo(() => {
    const kind = tabKind(tab);
    const q = searchQuery.trim().toLowerCase();

    return allItems
      .filter((item) => {
        if (item.kind !== kind) return false;

        const entry = getLineEntry(lineClearance, item.key);
        const st = entry.status || LINE_STATUS.PENDING;

        // Status filter
        if (statusFilter !== 'all') {
          if (kind === 'finished') {
            if (statusFilter === 'pending' && entry.finishedConfirm !== FINISHED_CONFIRM.PENDING) return false;
            if (statusFilter === 'query' && entry.finishedConfirm !== FINISHED_CONFIRM.DISPUTED) return false;
            if (statusFilter === 'cleared' && entry.finishedConfirm !== FINISHED_CONFIRM.CONFIRMED) return false;
          } else {
            if (statusFilter === 'pending' && st !== LINE_STATUS.PENDING) return false;
            if (statusFilter === 'cleared' && st !== LINE_STATUS.CLEARED) return false;
            if (statusFilter === 'adjusted' && st !== LINE_STATUS.ADJUSTED) return false;
            if (statusFilter === 'finished' && st !== LINE_STATUS.FINISHED) return false;
            if (statusFilter === 'query' && st !== LINE_STATUS.QUERY) return false;
          }
        }

        // Quick Toggles
        if (pendingOnly) {
          if (kind === 'finished') {
            if (entry.finishedConfirm !== FINISHED_CONFIRM.PENDING) return false;
          } else if (st !== LINE_STATUS.PENDING) {
            return false;
          }
        }

        if (variancesOnly) {
          if (kind === 'finished') {
            if (entry.finishedConfirm !== FINISHED_CONFIRM.DISPUTED) return false;
          } else if (st !== LINE_STATUS.ADJUSTED && st !== LINE_STATUS.QUERY) {
            return false;
          }
        }

        // Search query
        if (q) {
          const r = item.row || {};
          const hay = [
            r.coilNo,
            r.coilNoDisplay,
            r.colourAbbrev,
            r.colourDisplay,
            r.colour,
            r.productID,
            r.itemName,
            r.referenceNo,
            item.gaugeLabel,
            item.family,
            entry.materialExceptionId,
            entry.note,
            entry.queryReason,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();

          if (!hay.includes(q)) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const rA = a.row || {};
        const rB = b.row || {};
        const eA = getLineEntry(lineClearance, a.key);
        const eB = getLineEntry(lineClearance, b.key);

        if (sortBy === 'coil_asc') {
          return String(rA.coilNo || rA.productID || rA.itemName || '').localeCompare(
            String(rB.coilNo || rB.productID || rB.itemName || ''),
            undefined,
            { numeric: true }
          );
        }
        if (sortBy === 'coil_desc') {
          return String(rB.coilNo || rB.productID || rB.itemName || '').localeCompare(
            String(rA.coilNo || rA.productID || rA.itemName || ''),
            undefined,
            { numeric: true }
          );
        }
        if (sortBy === 'weight_desc') {
          return (Number(rB.closingKg ?? rB.remainingM ?? rB.balance ?? 0)) -
            (Number(rA.closingKg ?? rA.remainingM ?? rA.balance ?? 0));
        }
        if (sortBy === 'weight_asc') {
          return (Number(rA.closingKg ?? rA.remainingM ?? rA.balance ?? 0)) -
            (Number(rB.closingKg ?? rB.remainingM ?? rB.balance ?? 0));
        }
        if (sortBy === 'status') {
          const rank = (e, k) => {
            if (k === 'finished') {
              if (e.finishedConfirm === FINISHED_CONFIRM.PENDING) return 0;
              if (e.finishedConfirm === FINISHED_CONFIRM.DISPUTED) return 1;
              return 2;
            }
            const s = e.status || LINE_STATUS.PENDING;
            if (s === LINE_STATUS.PENDING) return 0;
            if (s === LINE_STATUS.QUERY) return 1;
            if (s === LINE_STATUS.ADJUSTED) return 2;
            if (s === LINE_STATUS.FINISHED) return 3;
            return 4;
          };
          return rank(eA, a.kind) - rank(eB, b.kind);
        }
        if (sortBy === 'variance') {
          const diffA = Math.abs((Number(eA.countedClosingKg) || Number(rA.closingKg) || 0) - (Number(rA.closingKg) || 0));
          const diffB = Math.abs((Number(eB.countedClosingKg) || Number(rB.closingKg) || 0) - (Number(rB.closingKg) || 0));
          return diffB - diffA;
        }
        return 0;
      });
  }, [allItems, tab, statusFilter, searchQuery, pendingOnly, variancesOnly, sortBy, lineClearance]);

  // Grouped items
  const groupedSections = useMemo(() => {
    const map = new Map();
    for (const item of filteredItems) {
      const gKey = groupKeyForItem(item);
      if (!map.has(gKey)) {
        map.set(gKey, {
          title: gKey,
          items: [],
          totalKg: 0,
          clearedCount: 0,
          pendingCount: 0,
        });
      }
      const grp = map.get(gKey);
      grp.items.push(item);

      const kg = Number(item.row?.closingKg) || 0;
      grp.totalKg += kg;

      const entry = getLineEntry(lineClearance, item.key);
      const isCleared =
        item.kind === 'finished'
          ? entry.finishedConfirm === FINISHED_CONFIRM.CONFIRMED
          : entry.status === LINE_STATUS.CLEARED ||
            entry.status === LINE_STATUS.ADJUSTED ||
            entry.status === LINE_STATUS.FINISHED;

      if (isCleared) grp.clearedCount += 1;
      else grp.pendingCount += 1;
    }
    return Array.from(map.values());
  }, [filteredItems, lineClearance]);

  // Current line index for modal navigation
  const currentLineIndex = useMemo(() => {
    if (!selectedLineKey) return -1;
    return filteredItems.findIndex((it) => it.key === selectedLineKey);
  }, [selectedLineKey, filteredItems]);

  const approveBlockers = useMemo(() => {
    const check = validateBmApprove(register, lineClearance, workflow?.bmAdjustments);
    return check.ok ? [] : check.blockers || [check.error];
  }, [register, lineClearance, workflow?.bmAdjustments]);

  const persistClearance = useCallback(
    async (nextClearance) => {
      const { ok, data } = await postLineClearance(periodKey, nextClearance);
      if (!ok || !data?.ok) {
        showToast?.(data?.error || 'Could not save clearance.', { variant: 'error' });
        return false;
      }
      setLineClearance(parseLineClearance(nextClearance));
      onSaved?.(data);
      return true;
    },
    [periodKey, showToast, onSaved]
  );

  const saveAll = async () => {
    setSaving(true);
    try {
      const ok = await persistClearance(lineClearance);
      if (ok) showToast?.('Line clearance progress saved.');
    } finally {
      setSaving(false);
    }
  };

  // 1-Click Quick Clear on row
  const handleQuickMarkOk = async (e, item) => {
    e.stopPropagation();
    const isFin = item.kind === 'finished';
    const sys = item.kind === 'coil'
      ? roundKg(item.row?.closingKg)
      : item.kind === 'stone'
        ? roundM(item.row?.remainingM)
        : item.kind === 'accessory'
          ? roundM(item.row?.balance)
          : null;

    const patch = isFin
      ? { finishedConfirm: FINISHED_CONFIRM.CONFIRMED, status: LINE_STATUS.CLEARED }
      : {
          status: LINE_STATUS.CLEARED,
          queryReason: '',
          ...(item.kind === 'coil' && sys != null ? { countedClosingKg: sys } : {}),
          ...(item.kind === 'stone' && sys != null ? { countedRemainingM: sys } : {}),
          ...(item.kind === 'accessory' && sys != null ? { countedBalance: sys } : {}),
        };

    const next = setLineEntry(lineClearance, item.key, patch);
    setLineClearance(next);
    await persistClearance(next);
    showToast?.(`Marked ${lineTitle(item)} as OK.`);
  };

  // Batch clear all matching lines
  const handleBatchClearMatched = async () => {
    const { clearance: nextClearance, updatedCount } = bulkClearUnchangedLines(
      register,
      lineClearance
    );
    if (updatedCount === 0) {
      showToast?.('No pending lines with matching system balances found.', { variant: 'info' });
      return;
    }
    const confirmed = window.confirm(
      `Mark ${updatedCount} matching line(s) as OK?\n\nThis will clear all pending lines whose physical counts match system balances. Custom notes, adjustments, and MEX tickets will remain untouched.`
    );
    if (!confirmed) return;

    setBatchClearing(true);
    try {
      setLineClearance(nextClearance);
      const ok = await persistClearance(nextClearance);
      if (ok) {
        showToast?.(`Successfully cleared ${updatedCount} matching line(s).`);
      }
    } finally {
      setBatchClearing(false);
    }
  };

  // Confirm BM Sign-off
  const handleConfirmSubmit = async (data) => {
    setConfirmSubmitting(true);
    try {
      await persistClearance(lineClearance);
      const { ok, data: resData } = await postStockRegisterWorkflow({
        action: 'bm_approve',
        periodKey,
        lineClearance,
        countNotes: data.managerNotes || workflow?.countNotes || '',
      });
      if (!ok || !resData?.ok) {
        showToast?.(resData?.error || 'Approval failed.', { variant: 'error' });
        return;
      }
      showToast?.('Monthly stock review approved — sent to Head of Procurement.');
      setShowConfirmModal(false);
      onSaved?.(resData);
      onApproved?.(resData);
    } finally {
      setConfirmSubmitting(false);
    }
  };

  // Return to store for recount
  const handleReturnToStore = async (reason) => {
    setConfirmSubmitting(true);
    try {
      const { ok, data } = await postStockRegisterWorkflow({
        action: 'bm_return_to_store',
        periodKey,
        reason,
      });
      if (!ok || !data?.ok) {
        showToast?.(data?.error || 'Could not return to store.', { variant: 'error' });
        return;
      }
      showToast?.('Register returned to store for physical re-count.');
      setShowReturnModal(false);
      onSaved?.(data);
      onReturned?.(data);
    } finally {
      setConfirmSubmitting(false);
    }
  };

  const pct =
    progress.total > 0
      ? Math.round(
          ((progress.total - progress.pending - progress.finishedPending - progress.query) /
            progress.total) *
            100
        )
      : 0;

  const status = workflow?.status || 'draft';
  const canEdit = ['store_confirmed', 'printed'].includes(status);
  const viewOnly = [
    'bm_approved',
    'procurement_costed',
    'md_approved',
    'locked',
  ].includes(status);

  const approveOk = validateBmApprove(register, lineClearance, workflow?.bmAdjustments).ok;

  const toggleGroup = (key) => {
    setCollapsedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const expandAll = () => setCollapsedGroups({});
  const collapseAll = () => {
    const next = {};
    groupedSections.forEach((g) => {
      next[g.title] = true;
    });
    setCollapsedGroups(next);
  };

  const branchLabel = register?.branchLabel || register?.branchId || 'Branch';

  return (
    <>
      <div className="flex flex-col min-h-0 flex-1 gap-3.5">
        {/* Approved view-only banner */}
        {viewOnly ? (
          <div className="rounded-xl border border-teal-200 bg-teal-50/70 px-4 py-2.5 flex items-center justify-between text-xs text-teal-950">
            <span className="font-bold flex items-center gap-1.5">
              <CheckCircle2 size={16} className="text-teal-700" />
              Branch Manager review approved — register has moved to Procurement costing. View-only mode.
            </span>
            <span className="text-[11px] font-semibold text-teal-800">
              Approved by {workflow?.bmApprovedByName || 'Manager'}
            </span>
          </div>
        ) : null}

        {/* Store notes & cutoff briefing */}
        {(workflow?.countNotes || workflow?.countCutoffIso) && (
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-xs text-slate-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 shadow-2xs">
            <div>
              <p className="font-bold text-slate-900 flex items-center gap-1.5">
                <ClipboardCheck size={14} className="text-zarewa-teal" />
                Storekeeper Count Briefing
              </p>
              {workflow?.countNotes ? (
                <p className="mt-0.5 text-slate-600 leading-relaxed font-medium">
                  {workflow.countNotes}
                </p>
              ) : null}
            </div>
            {workflow?.countCutoffIso ? (
              <span className="shrink-0 text-[11px] font-mono text-slate-500 bg-white border border-slate-200 rounded-md px-2 py-1 self-start sm:self-center">
                Cutoff: {String(workflow.countCutoffIso).replace('T', ' ').slice(0, 16)}
              </span>
            ) : null}
          </div>
        )}

        {/* Interactive Top Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`rounded-xl border p-2.5 text-left transition ${
              statusFilter === 'all'
                ? 'border-slate-800 bg-slate-900 text-white shadow-xs'
                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
            }`}
          >
            <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">
              Total Lines
            </p>
            <p className="text-xl font-black mt-0.5 tabular-nums">{progress.total}</p>
            <p className="text-[10px] mt-0.5 opacity-75">All items in yard</p>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('pending')}
            className={`rounded-xl border p-2.5 text-left transition ${
              statusFilter === 'pending'
                ? 'border-amber-600 bg-amber-600 text-white shadow-xs'
                : 'border-amber-200 bg-amber-50/50 text-amber-950 hover:border-amber-300'
            }`}
          >
            <p className="text-[10px] font-bold uppercase tracking-wider opacity-80 flex items-center gap-1">
              {progress.pending + progress.finishedPending > 0 ? (
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              ) : null}
              Pending Review
            </p>
            <p className="text-xl font-black mt-0.5 tabular-nums">
              {progress.pending + progress.finishedPending}
            </p>
            <p className="text-[10px] mt-0.5 opacity-75">Awaiting manager check</p>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('cleared')}
            className={`rounded-xl border p-2.5 text-left transition ${
              statusFilter === 'cleared'
                ? 'border-emerald-700 bg-emerald-700 text-white shadow-xs'
                : 'border-emerald-200 bg-emerald-50/50 text-emerald-950 hover:border-emerald-300'
            }`}
          >
            <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">
              Exact Matches
            </p>
            <p className="text-xl font-black mt-0.5 tabular-nums">{progress.cleared}</p>
            <p className="text-[10px] mt-0.5 opacity-75">Physical = System</p>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('adjusted')}
            className={`rounded-xl border p-2.5 text-left transition ${
              statusFilter === 'adjusted'
                ? 'border-teal-700 bg-teal-700 text-white shadow-xs'
                : 'border-teal-200 bg-teal-50/50 text-teal-950 hover:border-teal-300'
            }`}
          >
            <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">
              Adjusted (MEX)
            </p>
            <p className="text-xl font-black mt-0.5 tabular-nums">{progress.adjusted}</p>
            <p className="text-[10px] mt-0.5 opacity-75">Weight variances</p>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('query')}
            className={`rounded-xl border p-2.5 text-left transition ${
              statusFilter === 'query'
                ? 'border-rose-600 bg-rose-600 text-white shadow-xs'
                : 'border-rose-200 bg-rose-50/50 text-rose-950 hover:border-rose-300'
            }`}
          >
            <p className="text-[10px] font-bold uppercase tracking-wider opacity-80 flex items-center gap-1">
              {progress.query > 0 ? (
                <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
              ) : null}
              Under Query
            </p>
            <p className="text-xl font-black mt-0.5 tabular-nums">{progress.query}</p>
            <p className="text-[10px] mt-0.5 opacity-75">Requires resolution</p>
          </button>
        </div>

        {/* Progress bar */}
        <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
            <span className="flex items-center gap-1.5">
              <ClipboardList size={14} className="text-zarewa-teal" />
              Review Progress: <strong>{pct}%</strong>
            </span>
            <span className="tabular-nums">
              Cleared {progress.cleared + progress.adjusted} of {progress.total} lines
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-teal-500 to-zarewa-teal transition-all duration-300"
              style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
            />
          </div>
        </div>

        {/* Category Tabs with live section badge counts */}
        <div className="flex flex-wrap gap-1.5 border-b border-slate-200 pb-2">
          {BM_TABS.map((t) => {
            const k = tabKind(t.key);
            const kp = kindProgress[k] || { total: 0, pending: 0 };
            const isActive = tab === t.key;

            return (
              <button
                key={t.key}
                type="button"
                className={`relative px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                  isActive
                    ? 'bg-zarewa-teal text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-teal-300 hover:text-zarewa-teal'
                }`}
                onClick={() => setTab(t.key)}
              >
                <span>{t.label}</span>
                {kp.total > 0 ? (
                  <span
                    className={`rounded-md px-1.5 py-0.2 text-[10px] tabular-nums font-mono ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : kp.pending > 0
                          ? 'bg-amber-100 text-amber-900 font-black'
                          : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {kp.total - kp.pending}/{kp.total}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Search, Arrangement & Filter Toolbar */}
        <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2.5 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search coil #, colour, gauge, MEX ID, SKU…"
                className="w-full pl-9 pr-8 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-zarewa-teal/20"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={13} />
                </button>
              ) : null}
            </div>

            {/* Arrangement & Sort Controls */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {/* Grouped vs Flat Toggle */}
              <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                <button
                  type="button"
                  onClick={() => setArrangementMode('grouped')}
                  title="Group by Gauge & Mill Family"
                  className={`px-2 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 transition ${
                    arrangementMode === 'grouped'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <LayoutGrid size={12} />
                  Grouped
                </button>
                <button
                  type="button"
                  onClick={() => setArrangementMode('flat')}
                  title="Flat comprehensive list"
                  className={`px-2 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 transition ${
                    arrangementMode === 'flat'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <List size={12} />
                  Flat List
                </button>
              </div>

              {/* Sort By Dropdown */}
              <select
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-zarewa-teal/20"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="coil_asc">Sort: Coil # (Asc)</option>
                <option value="coil_desc">Sort: Coil # (Desc)</option>
                <option value="weight_desc">Sort: Weight (High → Low)</option>
                <option value="weight_asc">Sort: Weight (Low → High)</option>
                <option value="status">Sort: Pending First</option>
                <option value="variance">Sort: Largest Variance</option>
              </select>

              {/* Batch Action */}
              {canEdit && (
                <button
                  type="button"
                  onClick={handleBatchClearMatched}
                  disabled={batchClearing || saving}
                  className="rounded-lg border border-teal-200 bg-teal-50 px-2.5 py-1 text-xs font-bold text-teal-900 hover:bg-teal-100 transition inline-flex items-center gap-1 shadow-2xs disabled:opacity-50"
                  title="Clear all pending lines that match system records"
                >
                  {batchClearing ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <PackageCheck size={13} className="text-teal-700" />
                  )}
                  Clear Matched Lines
                </button>
              )}
            </div>
          </div>

          {/* Quick Attention Filter Chips */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mr-1 flex items-center gap-1">
                <Filter size={11} /> Filters:
              </span>

              {BM_STATUS_FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setStatusFilter(f.key)}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-bold border transition ${
                    statusFilter === f.key
                      ? 'bg-slate-800 text-white border-slate-800'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {f.label}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setPendingOnly(!pendingOnly)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-bold border transition ${
                  pendingOnly
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-amber-300'
                }`}
              >
                Pending Only
              </button>

              <button
                type="button"
                onClick={() => setVariancesOnly(!variancesOnly)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-bold border transition ${
                  variancesOnly
                    ? 'bg-rose-600 text-white border-rose-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-rose-300'
                }`}
              >
                Variances &amp; Issues Only
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-slate-500">
                Showing <strong>{filteredItems.length}</strong> of{' '}
                {allItems.filter((it) => it.kind === tabKind(tab)).length} items
              </span>

              {arrangementMode === 'grouped' && groupedSections.length > 1 ? (
                <div className="flex items-center gap-1 text-[11px] text-teal-800">
                  <button
                    type="button"
                    onClick={expandAll}
                    className="hover:underline font-bold"
                  >
                    Expand all
                  </button>
                  <span>·</span>
                  <button
                    type="button"
                    onClick={collapseAll}
                    className="hover:underline font-bold"
                  >
                    Collapse all
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Lines Display Container (Grouped or Flat) */}
        <div className="min-h-[16rem] max-h-[46vh] overflow-y-auto custom-scrollbar rounded-xl border border-slate-200 bg-white shadow-2xs">
          {filteredItems.length === 0 ? (
            <div className="py-14 text-center px-4 space-y-2">
              <PackageCheck size={32} className="mx-auto text-slate-300" />
              <p className="text-sm font-bold text-slate-700">No stock lines found</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No items match your search query or filter selection in this category. Try clearing filters or switching tabs.
              </p>
              {(searchQuery || statusFilter !== 'all' || pendingOnly || variancesOnly) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                    setPendingOnly(false);
                    setVariancesOnly(false);
                  }}
                  className="z-btn-secondary text-xs mt-2"
                >
                  Clear all filters
                </button>
              )}
            </div>
          ) : arrangementMode === 'grouped' ? (
            /* GROUPED BY GAUGE & FAMILY ACCORDION */
            <div className="divide-y divide-slate-200">
              {groupedSections.map((group) => {
                const isCollapsed = Boolean(collapsedGroups[group.title]);

                return (
                  <div key={group.title} className="bg-white">
                    {/* Group Header */}
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.title)}
                      className="w-full flex items-center justify-between gap-3 px-4 py-2.5 bg-slate-50/80 hover:bg-slate-100/80 text-left transition"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {isCollapsed ? (
                          <ChevronRight size={15} className="text-slate-400 shrink-0" />
                        ) : (
                          <ChevronDown size={15} className="text-slate-400 shrink-0" />
                        )}
                        <h4 className="text-xs font-black text-slate-900 truncate">
                          {group.title}
                        </h4>
                        <span className="text-[11px] font-semibold text-slate-500 tabular-nums">
                          ({group.items.length} {group.items.length === 1 ? 'line' : 'lines'}
                          {group.totalKg > 0 ? ` · ${group.totalKg.toLocaleString()} kg` : ''})
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {group.pendingCount > 0 ? (
                          <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900 border border-amber-200">
                            {group.pendingCount} pending
                          </span>
                        ) : (
                          <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-900 border border-emerald-200">
                            ✓ All cleared ({group.clearedCount})
                          </span>
                        )}
                      </div>
                    </button>

                    {/* Group Items */}
                    {!isCollapsed && (
                      <ul className="divide-y divide-slate-100">
                        {group.items.map((item) => (
                          <LineRowItem
                            key={item.key}
                            item={item}
                            lineClearance={lineClearance}
                            canEdit={canEdit}
                            viewOnly={viewOnly}
                            onSelect={() => setSelectedLineKey(item.key)}
                            onQuickOk={(e) => handleQuickMarkOk(e, item)}
                          />
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* FLAT LIST */
            <ul className="divide-y divide-slate-100">
              {filteredItems.map((item) => (
                <LineRowItem
                  key={item.key}
                  item={item}
                  lineClearance={lineClearance}
                  canEdit={canEdit}
                  viewOnly={viewOnly}
                  onSelect={() => setSelectedLineKey(item.key)}
                  onQuickOk={(e) => handleQuickMarkOk(e, item)}
                />
              ))}
            </ul>
          )}
        </div>

        {/* Readiness Checklist / Blocker Banner */}
        {approveBlockers.length ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 space-y-2">
            <div className="flex items-center gap-2 text-amber-950">
              <AlertTriangle size={16} className="text-amber-700 shrink-0" />
              <h4 className="text-xs font-bold uppercase tracking-wider">
                Review Blockers Remaining ({approveBlockers.length})
              </h4>
            </div>
            <ul className="space-y-1 pl-6 list-disc text-xs text-amber-900">
              {approveBlockers.slice(0, 3).map((b, i) => (
                <li key={i}>{b}</li>
              ))}
              {approveBlockers.length > 3 ? (
                <li className="font-semibold">
                  …and {approveBlockers.length - 3} more line(s)
                </li>
              ) : null}
            </ul>
          </div>
        ) : (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 size={18} className="text-emerald-700 shrink-0" />
              <div>
                <p className="text-xs font-bold text-emerald-950">
                  Ready for Branch Manager Sign-Off
                </p>
                <p className="text-[11px] text-emerald-800">
                  All {progress.total} stock lines have been reviewed and reconciled.
                </p>
              </div>
            </div>
            {canEdit && (
              <button
                type="button"
                onClick={() => setShowConfirmModal(true)}
                className="z-btn-primary text-xs shrink-0 inline-flex items-center gap-1.5 shadow-sm"
              >
                <span>Sign-Off &amp; Send to Procurement</span>
                <ArrowRight size={14} />
              </button>
            )}
          </div>
        )}

        {/* Bottom Actions Bar */}
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center justify-between pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="z-btn-secondary text-xs inline-flex items-center gap-1.5"
              onClick={() => onPrint?.()}
              disabled={!register}
            >
              <Printer size={13} />
              Screen Preview
            </button>

            {canEdit && (
              <>
                <button
                  type="button"
                  className="z-btn-secondary text-xs inline-flex items-center gap-1.5"
                  onClick={saveAll}
                  disabled={saving}
                >
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                  Save Progress
                </button>

                <button
                  type="button"
                  className="z-btn-secondary text-xs inline-flex items-center gap-1.5 text-rose-700 border-rose-200 hover:bg-rose-50"
                  onClick={() => setShowReturnModal(true)}
                  disabled={status !== 'store_confirmed'}
                  title="Return register to storekeeper for physical recount"
                >
                  <RotateCcw size={13} />
                  Return to Store
                </button>
              </>
            )}
          </div>

          {canEdit && (
            <button
              type="button"
              className="z-btn-primary text-xs inline-flex items-center justify-center gap-2 w-full sm:w-auto shadow-sm disabled:opacity-50"
              onClick={() => setShowConfirmModal(true)}
              disabled={!approveOk || confirmSubmitting}
              title={!approveOk ? approveBlockers[0] || 'Complete all line reviews first' : ''}
            >
              <ShieldCheck size={15} />
              <span>Confirm &amp; Send to Procurement</span>
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>

      {/* LINE CLEARANCE MODAL WITH PREVIOUS/NEXT NAVIGATION */}
      <StockRegisterLineDetailModal
        open={Boolean(selectedLineKey)}
        onClose={() => setSelectedLineKey(null)}
        periodKey={periodKey}
        lineKey={selectedLineKey}
        lineClearance={lineClearance}
        linesList={filteredItems}
        currentLineIndex={currentLineIndex}
        onNavigateLine={(nextKey) => setSelectedLineKey(nextKey)}
        showToast={showToast}
        onSaveLine={async (next) => {
          setLineClearance(next);
          await persistClearance(next);
        }}
      />

      {/* CONFIRMATION SIGN-OFF MODAL */}
      <StockRegisterBmConfirmModal
        open={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        register={register}
        workflow={workflow}
        periodKey={periodKey}
        periodEnd={register?.periodEnd || register?.periodKey}
        branchLabel={branchLabel}
        lineClearance={lineClearance}
        onConfirm={handleConfirmSubmit}
        submitting={confirmSubmitting}
      />

      {/* RETURN TO STORE MODAL */}
      <StockRegisterReturnToStoreModal
        open={showReturnModal}
        onClose={() => setShowReturnModal(false)}
        branchLabel={branchLabel}
        periodLabel={periodKey}
        onConfirm={handleReturnToStore}
        submitting={confirmSubmitting}
      />
    </>
  );
}

/**
 * Individual row renderer for a stock register item with inline quick-actions.
 */
function LineRowItem({
  item,
  lineClearance,
  canEdit,
  _viewOnly,
  onSelect,
  onQuickOk,
}) {
  const entry = getLineEntry(lineClearance, item.key);
  const badge = statusBadge(entry, item.kind);
  const isPending =
    item.kind === 'finished'
      ? entry.finishedConfirm === FINISHED_CONFIRM.PENDING
      : (entry.status || LINE_STATUS.PENDING) === LINE_STATUS.PENDING;

  const isCoil = item.kind === 'coil';
  const r = item.row || {};

  // Variance calculation for display
  const sysKg = isCoil ? roundKg(r.closingKg) : null;
  const countedKg = isCoil && entry.countedClosingKg != null ? roundKg(entry.countedClosingKg) : null;
  const diffKg = sysKg != null && countedKg != null ? countedKg - sysKg : 0;

  return (
    <li>
      <div
        className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-2.5 hover:bg-teal-50/30 transition cursor-pointer"
        onClick={onSelect}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-zarewa-teal border border-teal-100 group-hover:border-teal-200">
            <ClipboardList size={16} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-mono text-xs font-bold text-slate-900">
                {item.kind === 'coil' || item.kind === 'finished'
                  ? `#${r.coilNoDisplay || r.coilNo}`
                  : r.productID || r.referenceNo || 'Item'}
              </span>

              {(r.colourDisplay || r.colourAbbrev) ? (
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-800 border border-slate-200">
                  {r.colourDisplay || r.colourAbbrev}
                </span>
              ) : null}

              {item.gaugeLabel ? (
                <span className="text-[11px] text-slate-500 font-medium">
                  {item.gaugeLabel}
                </span>
              ) : null}

              {entry.materialExceptionId ? (
                <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-mono font-bold text-amber-900 border border-amber-200">
                  {entry.materialExceptionId}
                </span>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-slate-500">
              <span className="font-semibold text-slate-700">{lineQty(item)}</span>
              {isCoil && entry.status === LINE_STATUS.FINISHED ? (
                <span className="text-slate-700 font-bold">
                  Marked finished — remaining kg clears when you approve
                </span>
              ) : isCoil && countedKg != null && countedKg !== sysKg ? (
                <span className="text-amber-700 font-bold">
                  (Counted: {countedKg.toLocaleString()} kg · diff {diffKg > 0 ? `+${diffKg}` : diffKg} kg)
                </span>
              ) : null}
              {entry.note ? (
                <span className="italic text-slate-400 truncate max-w-xs">
                  “{entry.note}”
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {/* Status Badge & Inline Quick Actions */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <span
            className={`text-ui-xs font-bold px-2.5 py-0.5 rounded-full border ${badge.cls}`}
          >
            {badge.label}
          </span>

          {canEdit && isPending && (
            <button
              type="button"
              onClick={onQuickOk}
              className="z-btn-secondary text-[11px] py-1 px-2.5 inline-flex items-center gap-1 text-emerald-800 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 shadow-2xs"
              title="Confirm count matches system (1-click clearance)"
            >
              <Check size={12} />
              Mark OK
            </button>
          )}

          <button
            type="button"
            onClick={onSelect}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-600 hover:border-zarewa-teal hover:text-zarewa-teal shadow-2xs"
          >
            Review
          </button>
        </div>
      </div>
    </li>
  );
}
