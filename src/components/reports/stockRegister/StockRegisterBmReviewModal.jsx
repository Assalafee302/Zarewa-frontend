import React, { useCallback, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ClipboardList,
  Loader2,
  Printer,
  RotateCcw,
  Save,
  X,
} from 'lucide-react';
import { ModalFrame } from '../../layout';
import {
  computeClearanceProgress,
  enumerateRegisterLineKeys,
  FINISHED_CONFIRM,
  getLineEntry,
  LINE_STATUS,
  parseLineClearance,
  validateBmApprove,
} from '../../../lib/stockRegisterLineClearance.js';
import { BM_STATUS_FILTERS, BM_TABS, LINE_STATUS_LABELS } from './stockRegisterConstants';
import { postLineClearance, postStockRegisterWorkflow } from './stockRegisterApi';
import { StockRegisterLineDetailModal } from './StockRegisterLineDetailModal';

function statusBadge(entry, kind) {
  if (kind === 'finished') {
    if (entry.finishedConfirm === FINISHED_CONFIRM.PENDING) return { label: 'Pending', cls: 'bg-amber-100 text-amber-900 border-amber-200' };
    if (entry.finishedConfirm === FINISHED_CONFIRM.DISPUTED) return { label: 'Disputed', cls: 'bg-red-100 text-red-900 border-red-200' };
    return { label: 'Confirmed', cls: 'bg-teal-100 text-teal-900 border-teal-200' };
  }
  const st = entry.status || LINE_STATUS.PENDING;
  const map = {
    [LINE_STATUS.PENDING]: 'bg-slate-100 text-slate-700 border-slate-200',
    [LINE_STATUS.CLEARED]: 'bg-teal-100 text-teal-900 border-teal-200',
    [LINE_STATUS.ADJUSTED]: 'bg-amber-100 text-amber-900 border-amber-200',
    [LINE_STATUS.QUERY]: 'bg-red-100 text-red-900 border-red-200',
  };
  return { label: LINE_STATUS_LABELS[st] || st, cls: map[st] || map[LINE_STATUS.PENDING] };
}

function lineLabel(item) {
  if (item.kind === 'coil' || item.kind === 'finished') {
    return `${item.row?.colourAbbrev || '—'} · ${item.row?.coilNoDisplay || item.row?.coilNo}`;
  }
  if (item.kind === 'stone') return item.row?.colourDisplay || item.row?.colourAbbrev || item.row?.productID;
  if (item.kind === 'accessory') return item.row?.itemName || item.row?.productID;
  return item.row?.itemName || item.row?.referenceNo || 'In-transit';
}

function lineQty(item) {
  const r = item.row;
  if (item.kind === 'coil') return r.closingKg != null ? `${r.closingKg} kg` : '—';
  if (item.kind === 'finished') return `Used ${r.usedKg ?? 0} kg`;
  if (item.kind === 'stone') return `${r.remainingM ?? 0} m`;
  if (item.kind === 'accessory') return `${r.balance ?? 0} ${r.unit || ''}`;
  return `${r.qtyExpected ?? 0} ${r.unit || ''}`;
}

function tabKind(tab) {
  if (tab === 'active') return 'coil';
  if (tab === 'finished') return 'finished';
  if (tab === 'stone') return 'stone';
  if (tab === 'accessories') return 'accessory';
  return 'intransit';
}

/**
 * Branch manager register review — tabs, progress, line detail, approve / return.
 */
export function StockRegisterBmReviewModal({
  open,
  onClose,
  register,
  workflow,
  periodKey,
  periodEnd,
  branchLabel,
  showToast,
  onSaved,
  onPrint,
}) {
  const [tab, setTab] = useState('active');
  const [statusFilter, setStatusFilter] = useState('all');
  const [lineClearance, setLineClearance] = useState({ lines: {}, version: 1 });
  const [selectedLineKey, setSelectedLineKey] = useState(null);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);

  React.useEffect(() => {
    if (!open) return;
    setLineClearance(parseLineClearance(workflow?.lineClearance));
    setTab('active');
    setStatusFilter('all');
    setSelectedLineKey(null);
  }, [open, workflow?.lineClearance]);

  const allItems = useMemo(() => enumerateRegisterLineKeys(register), [register]);
  const progress = useMemo(
    () => computeClearanceProgress(register, lineClearance),
    [register, lineClearance]
  );

  const filteredItems = useMemo(() => {
    const kind = tabKind(tab);
    return allItems.filter((item) => {
      if (item.kind !== kind) return false;
      if (statusFilter === 'all') return true;
      const entry = getLineEntry(lineClearance, item.key);
      if (kind === 'finished') {
        if (statusFilter === 'pending') return entry.finishedConfirm === FINISHED_CONFIRM.PENDING;
        if (statusFilter === 'query') return entry.finishedConfirm === FINISHED_CONFIRM.DISPUTED;
        if (statusFilter === 'cleared') return entry.finishedConfirm === FINISHED_CONFIRM.CONFIRMED;
        return true;
      }
      const st = entry.status || LINE_STATUS.PENDING;
      if (statusFilter === 'pending') return st === LINE_STATUS.PENDING;
      if (statusFilter === 'cleared') return st === LINE_STATUS.CLEARED;
      if (statusFilter === 'adjusted') return st === LINE_STATUS.ADJUSTED;
      if (statusFilter === 'query') return st === LINE_STATUS.QUERY;
      return true;
    });
  }, [allItems, tab, statusFilter, lineClearance]);

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
      if (ok) showToast?.('Line clearance saved.');
    } finally {
      setSaving(false);
    }
  };

  const approve = async () => {
    if (!progress.complete) {
      showToast?.('Complete all line reviews before approving.', { variant: 'error' });
      return;
    }
    setApproving(true);
    try {
      await persistClearance(lineClearance);
      const { ok, data } = await postStockRegisterWorkflow({
        action: 'bm_approve',
        periodKey,
        lineClearance,
        countNotes: workflow?.countNotes || '',
      });
      if (!ok || !data?.ok) {
        showToast?.(data?.error || 'Approval failed.', { variant: 'error' });
        return;
      }
      showToast?.('Approved — sent to procurement.');
      onSaved?.(data);
      onClose?.();
    } finally {
      setApproving(false);
    }
  };

  const returnToStore = async () => {
    const { ok, data } = await postStockRegisterWorkflow({ action: 'bm_return_to_store', periodKey });
    if (!ok || !data?.ok) {
      showToast?.(data?.error || 'Could not return to store.', { variant: 'error' });
      return;
    }
    showToast?.('Returned to store for re-count.');
    onSaved?.(data);
    onClose?.();
  };

  const pct = progress.total > 0 ? Math.round(((progress.total - progress.pending - progress.finishedPending) / progress.total) * 100) : 0;
  const status = workflow?.status || 'draft';
  const canEdit = ['store_confirmed', 'printed', 'bm_approved'].includes(status);

  return (
    <>
      <ModalFrame isOpen={open} onClose={onClose} showCloseButton={false} surface="plain" title="Manager stock review">
        <div className="z-modal-panel-lg flex max-h-[92dvh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <header className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
            <div className="min-w-0">
              <p className="text-ui-xs font-black uppercase tracking-widest text-slate-400">Branch manager review</p>
              <h2 className="text-lg font-bold text-zarewa-teal">Stock register clearance</h2>
              <p className="text-sm text-slate-600 mt-0.5">
                {branchLabel} · period ending {periodEnd}
              </p>
            </div>
            <button type="button" onClick={onClose} className="z-btn-secondary p-2" aria-label="Close">
              <X size={18} />
            </button>
          </header>

          <div className="shrink-0 border-b border-slate-100 px-4 py-3 sm:px-5 bg-slate-50/80 space-y-3">
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1">
                <span>Review progress</span>
                <span>{pct}% · {progress.total - progress.pending - progress.finishedPending}/{progress.total} lines</span>
              </div>
              <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                <div className="h-full bg-teal-700 transition-all" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-ui-xs text-slate-500 mt-1">
                OK {progress.cleared} · Adjusted {progress.adjusted} · Query {progress.query} · Pending{' '}
                {progress.pending + progress.finishedPending}
              </p>
            </div>

            <div className="flex flex-wrap gap-1">
              {BM_TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  className={`text-ui-xs font-bold px-2.5 py-1 rounded-full border ${
                    tab === t.key ? 'bg-teal-700 text-white border-teal-700' : 'bg-white text-slate-600 border-slate-200'
                  }`}
                  onClick={() => setTab(t.key)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-1">
              {BM_STATUS_FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  className={`text-ui-xs font-bold px-2 py-0.5 rounded border ${
                    statusFilter === f.key ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200'
                  }`}
                  onClick={() => setStatusFilter(f.key)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-4 py-3 sm:px-5">
            {filteredItems.length === 0 ? (
              <p className="text-sm text-slate-500 italic py-6 text-center">No lines in this tab / filter.</p>
            ) : (
              <ul className="space-y-1">
                {filteredItems.map((item) => {
                  const entry = getLineEntry(lineClearance, item.key);
                  const badge = statusBadge(entry, item.kind);
                  return (
                    <li key={item.key}>
                      <button
                        type="button"
                        className="w-full flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left hover:border-teal-300 hover:bg-teal-50/30 transition"
                        onClick={() => setSelectedLineKey(item.key)}
                        disabled={!canEdit}
                      >
                        <ClipboardList size={14} className="shrink-0 text-teal-800" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-800 truncate">{lineLabel(item)}</p>
                          <p className="text-xs text-slate-500">{lineQty(item)}</p>
                        </div>
                        <span className={`text-ui-xs font-bold px-2 py-0.5 rounded-full border shrink-0 ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {approveBlockers.length && progress.complete === false ? (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2 mt-3">
                {approveBlockers[0]}
              </p>
            ) : null}
          </div>

          <footer className="shrink-0 flex flex-wrap gap-2 border-t border-slate-100 px-4 py-3 sm:px-5">
            <button type="button" className="z-btn-secondary text-sm inline-flex items-center gap-1" onClick={() => onPrint?.()} disabled={!register}>
              <Printer size={14} /> Print
            </button>
            <button type="button" className="z-btn-secondary text-sm inline-flex items-center gap-1" onClick={saveAll} disabled={!canEdit || saving}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Save clearance
            </button>
            <button
              type="button"
              className="z-btn-secondary text-sm inline-flex items-center gap-1"
              onClick={returnToStore}
              disabled={status !== 'store_confirmed'}
            >
              <RotateCcw size={14} /> Return to store
            </button>
            <button
              type="button"
              className="z-btn-primary text-sm inline-flex items-center gap-1 ml-auto"
              onClick={approve}
              disabled={!canEdit || !progress.complete || approving || status === 'bm_approved'}
              title={!progress.complete ? 'Complete all lines first' : approveBlockers[0] || ''}
            >
              {approving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              Approve &amp; send to procurement
            </button>
          </footer>
        </div>
      </ModalFrame>

      <StockRegisterLineDetailModal
        open={Boolean(selectedLineKey)}
        onClose={() => setSelectedLineKey(null)}
        periodKey={periodKey}
        lineKey={selectedLineKey}
        lineClearance={lineClearance}
        showToast={showToast}
        onSaveLine={async (next) => {
          setLineClearance(next);
          await persistClearance(next);
          showToast?.('Line saved.');
        }}
      />
    </>
  );
}
