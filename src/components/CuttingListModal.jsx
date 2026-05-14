import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Plus,
  Trash2,
  Scissors,
  Calendar,
  Cog,
  ChevronDown,
  Printer,
  Info,
  Factory,
  Search,
  AlertTriangle,
} from 'lucide-react';
import { ModalFrame } from './layout/ModalFrame';
import { useToast } from '../context/ToastContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { useTrackedUnsavedForm } from '../hooks/useTrackedUnsavedForm';
import { apiFetch } from '../lib/apiBase';
import { formatNgn } from '../Data/mockData';
import { receiptCashReceivedNgn, normalizeReceiptMatchDashes } from '../lib/salesReceiptsList';
import { STONE_METER_INVENTORY_MODEL } from '../lib/stoneCoatedQuotationPolicy';

/** Compare quote / receipt links when pasted refs use en-dash etc. */
function normQuoteKey(s) {
  return normalizeReceiptMatchDashes(String(s ?? '').trim()).toLowerCase();
}
import CuttingListReportPrintView from './CuttingListReportPrintView';
import { EditSecondApprovalInline } from './EditSecondApprovalInline';
const LINE_TYPE_SET = new Set(['Roof', 'Flatsheet', 'Cladding']);

const CATEGORIES = [
  { type: 'Roof', title: 'Roofing sheet' },
  { type: 'Flatsheet', title: 'Flatsheet' },
  { type: 'Cladding', title: 'Cladding' },
];

function newLineId() {
  return `cl-line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function blankRow() {
  return { id: newLineId(), sheets: '', lengthM: '' };
}

function emptyLinesByCat() {
  return {
    Roof: [blankRow()],
    Flatsheet: [blankRow()],
    Cladding: [blankRow()],
  };
}

/** Stable key for which cutting list is open — avoids re-hydrating when only workspace `quotations` churns. */
function cuttingListHydrateSignature(editData) {
  if (!editData?.id) {
    return `new:${String(editData?.quotationRef ?? '').trim()}`;
  }
  let linesKey = '';
  try {
    linesKey = JSON.stringify(editData.lines ?? []);
  } catch {
    linesKey = '';
  }
  return [
    editData.id,
    String(editData.quotationRef ?? '').trim(),
    editData.dateISO ?? '',
    editData.machineName ?? '',
    editData.operatorName ?? '',
    editData.handledBy ?? '',
    editData.sheetsToCut ?? '',
    editData.productionRegistered ? '1' : '0',
    editData.productionEditLocked ? '1' : '0',
    String(editData.status ?? '').trim(),
    linesKey,
  ].join('\u0000');
}

function parseNum(value) {
  const n = Number(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function quotationHasPositiveLines(q, cat) {
  const arr = q?.quotationLines?.[cat];
  if (!Array.isArray(arr)) return false;
  return arr.some((row) => String(row?.name ?? '').trim() && parseNum(row?.qty) > 0);
}

function quotationIsAccessoriesOnly(q) {
  return quotationHasPositiveLines(q, 'accessories') && !quotationHasPositiveLines(q, 'products');
}

function displayCuttingListStatus(s) {
  if (!s) return '—';
  if (s === 'Completed') return 'Finished';
  if (s === 'Planned' || s === 'Queued for production') return 'Waiting';
  return s;
}

function cuttingListMinPaidFractionFromSession(session) {
  const bid = String(session?.currentBranchId || '').trim();
  const branches = Array.isArray(session?.branches) ? session.branches : [];
  const row = branches.find((b) => String(b.id) === bid);
  const f = Number(row?.cuttingListMinPaidFraction);
  if (Number.isFinite(f) && f >= 0.05 && f <= 1) return f;
  return 0.7;
}

function branchCodeForDraft(session) {
  const bid = String(session?.currentBranchId || '').trim();
  const branches = Array.isArray(session?.branches) ? session.branches : [];
  const row = branches.find((b) => b.id === bid);
  if (row?.code) {
    const c = String(row.code).trim().toUpperCase();
    if (c === 'KAD') return 'KD';
    if (c === 'YOL') return 'YL';
    if (c === 'MAI') return 'MDG';
    return c;
  }
  if (bid === 'BR-KAD' || bid === 'BR-KD') return 'KD';
  if (bid === 'BR-YOL' || bid === 'BR-YL') return 'YL';
  if (bid === 'BR-MAI' || bid === 'BR-MDG') return 'MDG';
  return 'KD';
}

function nextDraftCuttingListId(cuttingLists, branchCode, yearFull = new Date().getFullYear()) {
  const yy = String(yearFull).slice(-2);
  const esc = branchCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const reHumanYy = new RegExp(`^CL-${esc}-${yy}-(\\d+)$`);
  const reHumanFull = new RegExp(`^CL-${esc}-${yearFull}-(\\d+)$`);
  const reLegacyYear = new RegExp(`^CL-${yearFull}-(\\d+)$`);
  const reLegacyYy = new RegExp(`^CL-${yy}-(\\d+)$`);
  let max = 0;
  for (const row of cuttingLists || []) {
    const id = String(row.id || '');
    let m = id.match(reHumanYy);
    if (m) max = Math.max(max, parseInt(m[1], 10));
    else {
      m = id.match(reHumanFull);
      if (m) max = Math.max(max, parseInt(m[1], 10));
      else {
        m = id.match(reLegacyYear);
        if (m) max = Math.max(max, parseInt(m[1], 10));
        else {
          m = id.match(reLegacyYy);
          if (m) max = Math.max(max, parseInt(m[1], 10));
        }
      }
    }
  }
  return `CL-${branchCode}-${yy}-${String(max + 1).padStart(4, '0')}`;
}

/** Book paid on quote: receipt allocations in DB + ADVANCE_APPLIED (matches `quotations.paid_ngn`). */
function bookPaidTowardQuotation(q) {
  return Math.max(0, Number(q.paidNgn ?? q.paid_ngn) || 0);
}

function sumAdvanceAppliedNgnForQuotation(ledgerEntries, quotationId) {
  const idKey = normQuoteKey(quotationId);
  if (!idKey || !Array.isArray(ledgerEntries)) return 0;
  let s = 0;
  for (const e of ledgerEntries) {
    if (e.type !== 'ADVANCE_APPLIED') continue;
    if (normQuoteKey(e.quotationRef) !== idKey) continue;
    s += Math.round(Number(e.amountNgn) || 0);
  }
  return s;
}

/** Till / bank cash on receipts for this quote only (no advance applied — avoids double-count in UI). */
function receiptTillCashOnlyOnQuotation(quotationId, receiptRows) {
  const idKey = normQuoteKey(quotationId);
  if (!idKey || !Array.isArray(receiptRows)) return 0;
  let s = 0;
  for (const r of receiptRows) {
    if (normQuoteKey(r.quotationRef) !== idKey) continue;
    if (String(r.status || '').toLowerCase() === 'reversed') continue;
    s += receiptCashReceivedNgn(r);
  }
  return s;
}

/** Cash actually received for this quote: merged receipt rows + ledger advance applied. */
function cashPaidOnQuotation(quotationId, receiptRows, ledgerEntries) {
  const idKey = normQuoteKey(quotationId);
  if (!idKey) return 0;
  let s = sumAdvanceAppliedNgnForQuotation(ledgerEntries, quotationId);
  for (const r of receiptRows || []) {
    if (normQuoteKey(r.quotationRef) !== idKey) continue;
    if (String(r.status || '').toLowerCase() === 'reversed') continue;
    s += receiptCashReceivedNgn(r);
  }
  return s;
}

/** Paid fraction gate (branch setting): actual cash in, or book allocation, or manager override. */
function meetsCuttingListPayThreshold(q, receiptRows, ledgerEntries, minPaidFraction = 0.7) {
  if (q.manager_production_approved_at_iso || q.managerProductionApprovedAtISO) return true;
  const total = Number(q.totalNgn ?? q.total_ngn) || 0;
  if (total <= 0) return false;
  const mf =
    Number.isFinite(minPaidFraction) && minPaidFraction >= 0.05 && minPaidFraction <= 1
      ? minPaidFraction
      : 0.7;
  const threshold = total * mf - 1e-6;
  const book = bookPaidTowardQuotation(q);
  const cash = cashPaidOnQuotation(q.id, receiptRows, ledgerEntries);
  return cash >= threshold || book >= threshold;
}

/** Resolve colour / gauge / profile from API or mock quotation objects. */
function materialSpecFromQuotation(q) {
  if (!q) return { colour: '—', gauge: '—', profile: '—' };
  const colour = String(q.materialColor ?? q.material_color ?? q.color ?? '').trim();
  const gauge = String(q.materialGauge ?? q.material_gauge ?? q.gauge ?? '').trim();
  const profile = String(q.materialDesign ?? q.material_design ?? q.profile ?? '').trim();
  return {
    colour: colour || '—',
    gauge: gauge || '—',
    profile: profile || '—',
  };
}

const label = 'text-[9px] font-semibold text-slate-400 uppercase tracking-wide ml-0.5 mb-1 block';
const field =
  'w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs font-semibold text-[#134e4a] outline-none focus:ring-2 focus:ring-orange-500/15';

function CategoryBlock({
  title,
  lines,
  readOnly,
  onUpdateLine,
  onAddAfter,
  onRemoveLine,
}) {
  return (
    <div className="rounded-xl border border-slate-200/90 bg-slate-50/80 p-3 space-y-2">
      <h4 className="text-[10px] font-bold text-[#134e4a] uppercase tracking-widest border-b border-slate-200/80 pb-2">
        {title}
      </h4>
      <div className="hidden sm:grid grid-cols-[2rem_4.5rem_4rem_3.5rem_4.5rem] gap-1 px-1 text-[8px] font-semibold text-slate-400 uppercase tracking-wider items-center">
        <div>#</div>
        <div>Length (m)</div>
        <div>Qty</div>
        <div className="text-center">m line</div>
        <div className="text-center"> </div>
      </div>
      {lines.map((line, idx) => {
        const totalM = parseNum(line.sheets) * parseNum(line.lengthM);
        return (
          <div
            key={line.id}
            className="grid grid-cols-1 sm:grid-cols-[2rem_4.5rem_4rem_3.5rem_4.5rem] gap-1.5 sm:gap-1 items-center bg-white p-2 rounded-lg border border-slate-200"
          >
            <div className="flex sm:justify-center text-[10px] font-bold text-slate-300">{idx + 1}</div>
            <div>
              <label className="sm:hidden text-[8px] font-semibold text-slate-400 uppercase">Length (m)</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="4.5"
                value={line.lengthM}
                onChange={(e) => onUpdateLine(line.id, { lengthM: e.target.value })}
                className="w-full border border-slate-200 rounded-lg py-1.5 px-2 text-[11px] font-semibold text-[#134e4a]"
              />
            </div>
            <div>
              <label className="sm:hidden text-[8px] font-semibold text-slate-400 uppercase">Qty</label>
              <input
                type="number"
                min="1"
                placeholder="Qty"
                value={line.sheets}
                onChange={(e) => onUpdateLine(line.id, { sheets: e.target.value })}
                className="w-full border border-slate-200 rounded-lg py-1.5 px-2 text-[11px] font-semibold text-[#134e4a]"
              />
            </div>
            <div className="text-center">
              <span className="text-[11px] font-bold text-orange-600 tabular-nums">{totalM.toLocaleString()} m</span>
            </div>
            <div className="flex justify-end gap-0.5 sm:justify-center">
              {!readOnly ? (
                <>
                  <button
                    type="button"
                    title="Add row after"
                    onClick={() => onAddAfter(line.id)}
                    className="p-1.5 rounded-lg text-orange-600 hover:bg-orange-50"
                  >
                    <Plus size={16} strokeWidth={2.5} />
                  </button>
                  <button
                    type="button"
                    title="Remove row"
                    onClick={() => onRemoveLine(line.id)}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50"
                  >
                    <Trash2 size={14} />
                  </button>
                </>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const CuttingListModal = ({
  isOpen,
  onClose,
  editData = null,
  accessMode = 'edit',
  quotations = [],
  receipts = [],
  cuttingLists = [],
  onPersist,
  onCuttingListUpdated,
  handledByLabel = 'Sales',
}) => {
  const { show: showToast } = useToast();
  const ws = useWorkspace();
  const activeDisplayName = String(ws?.session?.user?.displayName ?? '').trim();
  const minPaidFraction = useMemo(() => cuttingListMinPaidFractionFromSession(ws?.session), [ws?.session]);
  const minPaidPercentLabel = Math.round(minPaidFraction * 100);
  const navigate = useNavigate();
  const productionCompletedLock = Boolean(
    editData?.productionEditLocked ??
      (editData?.productionRegistered && String(editData?.status || '').trim().toLowerCase() === 'finished')
  );
  const productionOnQueue = Boolean(editData?.productionRegistered && !productionCompletedLock);
  const readOnly = accessMode === 'view' || productionCompletedLock;
  const [quotationRef, setQuotationRef] = useState('');
  const [dateISO, setDateISO] = useState('');
  const [machineName, setMachineName] = useState('Machine 01 (Longspan)');
  const [linesByCat, setLinesByCat] = useState(emptyLinesByCat);
  const [saving, setSaving] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [holdForProductionApproval, setHoldForProductionApproval] = useState(false);
  const [clearingHold, setClearingHold] = useState(false);
  const [quoteSearch, setQuoteSearch] = useState('');
  const [showQuotePicker, setShowQuotePicker] = useState(false);
  const [cuttingListEditApprovalId, setCuttingListEditApprovalId] = useState('');
  const lastCuttingListHydrateSigRef = useRef('');

  const cuttingListHydrateSig = useMemo(
    () => (isOpen ? cuttingListHydrateSignature(editData) : ''),
    [
      isOpen,
      editData?.id,
      editData?.quotationRef,
      editData?.dateISO,
      editData?.machineName,
      editData?.operatorName,
      editData?.handledBy,
      editData?.sheetsToCut,
      editData?.lines,
      editData?.productionRegistered,
      editData?.productionEditLocked,
      editData?.status,
    ]
  );

  const { captureEdited, wrapClose, abandonUnsavedAndRun } = useTrackedUnsavedForm('modal-cutting-list', {
    isOpen,
    blockTracking: readOnly,
    hydrateKey: cuttingListHydrateSig,
  });
  const handleClose = () => wrapClose(() => onClose());

  useEffect(() => {
    if (!isOpen) return;
    setCuttingListEditApprovalId('');
  }, [isOpen, editData?.id]);

  const canRegisterProduction =
    ws?.hasPermission?.('sales.manage') ||
    ws?.hasPermission?.('quotations.manage') ||
    ws?.hasPermission?.('production.manage') ||
    ws?.hasPermission?.('operations.manage');

  const canClearProductionHold = Boolean(ws?.hasPermission?.('production.release'));

  const ledgerEntries = useMemo(
    () => (Array.isArray(ws?.snapshot?.ledgerEntries) ? ws.snapshot.ledgerEntries : []),
    [ws?.snapshot?.ledgerEntries]
  );

  const selectableQuotations = useMemo(() => {
    const editingId = editData?.id ?? '';
    const takenByAnother = (quoteId) =>
      cuttingLists.some(
        (cl) => normQuoteKey(cl.quotationRef) === normQuoteKey(quoteId) && String(cl.id) !== String(editingId)
      );

    const base = quotations.filter((q) => {
      if (!q?.id || takenByAnother(q.id)) return false;
      const total = Number(q.totalNgn ?? q.total_ngn) || 0;
      return total > 0;
    });
    const sorted = [...base].sort((a, b) => {
      const aOk = meetsCuttingListPayThreshold(a, receipts, ledgerEntries, minPaidFraction) ? 0 : 1;
      const bOk = meetsCuttingListPayThreshold(b, receipts, ledgerEntries, minPaidFraction) ? 0 : 1;
      if (aOk !== bOk) return aOk - bOk;
      return a.id.localeCompare(b.id);
    });
    if (editData?.quotationRef) {
      const current = quotations.find((x) => x.id === editData.quotationRef);
      if (current && !sorted.some((x) => x.id === current.id)) {
        return [current, ...sorted.filter((x) => x.id !== current.id)];
      }
    }
    return sorted;
  }, [quotations, cuttingLists, editData, receipts, ledgerEntries, minPaidFraction]);

  const filteredQuotePicker = useMemo(() => {
    const raw = quoteSearch.trim();
    const s = raw.toLowerCase();
    const nk = normQuoteKey(raw);
    if (!s) return selectableQuotations;
    return selectableQuotations.filter((q) => {
      const id = String(q.id).toLowerCase();
      const idNorm = normQuoteKey(q.id);
      const cust = String(q.customer ?? q.customer_name ?? '').toLowerCase();
      const cid = String(q.customerID ?? q.customer_id ?? '').toLowerCase();
      return id.includes(s) || idNorm.includes(nk) || cust.includes(s) || cid.includes(s);
    });
  }, [selectableQuotations, quoteSearch]);

  /** Quotation exists in workspace but is excluded from "new list" picker (hidden CL, zero total, etc.). */
  const knownQuotePickerBlocker = useMemo(() => {
    const raw = quoteSearch.trim();
    if (!raw) return null;
    const token = normQuoteKey(raw.split('·')[0] || raw);
    if (!token) return null;
    const q = quotations.find((row) => row?.id && normQuoteKey(row.id) === token);
    if (!q) return null;
    if (selectableQuotations.some((row) => row.id === q.id)) return null;
    const total = Number(q.totalNgn ?? q.total_ngn) || 0;
    if (total <= 0) return { kind: 'zero_total', q };
    const linked = cuttingLists.find(
      (cl) => normQuoteKey(cl.quotationRef) === normQuoteKey(q.id) && String(cl.id) !== String(editData?.id ?? '')
    );
    if (linked) return { kind: 'has_list', q, listId: linked.id, branchId: linked.branchId ?? '' };
    return null;
  }, [quoteSearch, quotations, selectableQuotations, cuttingLists, editData?.id]);

  const selectedQuotation = useMemo(
    () => quotations.find((q) => q.id === quotationRef) ?? null,
    [quotations, quotationRef]
  );
  const selectedQuotationAccessoriesOnly = useMemo(
    () => quotationIsAccessoriesOnly(selectedQuotation),
    [selectedQuotation]
  );

  const materialSpec = useMemo(() => materialSpecFromQuotation(selectedQuotation), [selectedQuotation]);

  /** Master material type only (Aluzinc, Aluminium, Stone coated, …) — never product line names like "roofing sheet". */
  const materialTypeLabel = useMemo(() => {
    const q = selectedQuotation;
    if (!q) return '';
    const named = String(q.materialTypeName ?? q.material_type_name ?? '').trim();
    if (named) return named;
    const id = String(
      q.materialTypeId ?? q.material_type_id ?? q.quotationLines?.materialTypeId ?? ''
    ).trim();
    if (!id) return '';
    const types = ws?.snapshot?.masterData?.materialTypes ?? [];
    const row = types.find((t) => String(t?.id ?? '').trim() === id);
    return String(row?.name ?? '').trim();
  }, [selectedQuotation, ws?.snapshot?.masterData?.materialTypes]);

  const isStoneMeterCuttingList = useMemo(() => {
    const q = selectedQuotation;
    if (!q) return false;
    if (q.stoneMeterQuote) return true;
    const mid = String(q.materialTypeId || '').trim();
    const types = ws?.snapshot?.masterData?.materialTypes ?? [];
    const row = types.find((t) => String(t?.id ?? '').trim() === mid);
    return String(row?.inventoryModel || '').trim() === STONE_METER_INVENTORY_MODEL;
  }, [selectedQuotation, ws?.snapshot?.masterData?.materialTypes]);

  const cuttingCategoriesUi = useMemo(() => {
    if (!isStoneMeterCuttingList) return CATEGORIES;
    return CATEGORIES.map((c) => (c.type === 'Cladding' ? { ...c, title: 'Stone flatsheet' } : c));
  }, [isStoneMeterCuttingList]);

  const draftBranchCode = useMemo(() => branchCodeForDraft(ws?.session), [ws?.session]);

  /** Next CL serial if you save *now* — branch-wide; not reserved; same preview for every unsaved draft until one saves. */
  const nextBranchCuttingListSerialPreview = useMemo(
    () => nextDraftCuttingListId(cuttingLists, draftBranchCode),
    [cuttingLists, draftBranchCode]
  );

  const savedCuttingListId = String(editData?.id ?? '').trim();

  const bookPaidOnQuote = selectedQuotation ? bookPaidTowardQuotation(selectedQuotation) : 0;
  const advanceAppliedOnQuote = selectedQuotation
    ? sumAdvanceAppliedNgnForQuotation(ledgerEntries, selectedQuotation.id)
    : 0;
  const receiptTillOnQuote = selectedQuotation
    ? receiptTillCashOnlyOnQuotation(selectedQuotation.id, receipts)
    : 0;
  const totalQuoteNgn = selectedQuotation ? Number(selectedQuotation.totalNgn) || 0 : 0;
  const balanceQuote = Math.max(0, totalQuoteNgn - bookPaidOnQuote);
  const payPercentOnQuote = totalQuoteNgn > 0 ? Math.round((bookPaidOnQuote / totalQuoteNgn) * 100) : 0;

  const quoteReceipts = useMemo(() => {
    if (!quotationRef) return [];
    const k = normQuoteKey(quotationRef);
    return receipts.filter((r) => normQuoteKey(r.quotationRef) === k);
  }, [receipts, quotationRef]);

  const quoteLineSnippet = useMemo(() => {
    const ql = selectedQuotation?.quotationLines;
    if (!ql) return [];
    const rows = [];
    for (const cat of ['products', 'accessories', 'services']) {
      const arr = ql[cat];
      if (!Array.isArray(arr)) continue;
      for (const row of arr) {
        if (row?.name) rows.push({ cat, name: row.name, qty: row.qty });
      }
    }
    return rows;
  }, [selectedQuotation?.quotationLines]);

  const flatLinesWithType = useMemo(() => {
    const out = [];
    for (const { type } of CATEGORIES) {
      for (const line of linesByCat[type]) {
        const sheets = parseNum(line.sheets);
        const lengthM = parseNum(line.lengthM);
        if (sheets > 0 && lengthM > 0) out.push({ type, sheets, lengthM, id: line.id });
      }
    }
    return out;
  }, [linesByCat]);

  const totalMeters = useMemo(
    () => flatLinesWithType.reduce((sum, line) => sum + line.sheets * line.lengthM, 0),
    [flatLinesWithType]
  );
  const computedSheets = useMemo(
    () => flatLinesWithType.reduce((sum, line) => sum + line.sheets, 0),
    [flatLinesWithType]
  );

  const printPayload = useMemo(
    () => ({
      cuttingListId: savedCuttingListId,
      quotationRef,
      selectedQuotation,
      materialSpec,
      materialTypeLabel,
      dateISO,
      machineName,
      operatorName: editData?.operatorName ?? '',
      totalMeters,
      sheetsToCut: editData?.sheetsToCut ?? computedSheets,
      linesByCat,
      receiptsForQuotation: quoteReceipts,
      productionFooterName: editData?.handledBy || activeDisplayName || handledByLabel,
      treasuryMovements: Array.isArray(ws?.snapshot?.treasuryMovements) ? ws.snapshot.treasuryMovements : [],
      claddingSectionTitle: isStoneMeterCuttingList ? 'Stone flatsheet' : '',
    }),
    [
      savedCuttingListId,
      quotationRef,
      selectedQuotation,
      materialSpec,
      materialTypeLabel,
      isStoneMeterCuttingList,
      dateISO,
      machineName,
      editData,
      handledByLabel,
      totalMeters,
      computedSheets,
      linesByCat,
      quoteReceipts,
      activeDisplayName,
      ws?.snapshot?.treasuryMovements,
    ]
  );

   
  useEffect(() => {
    if (!isOpen) {
      setShowPrintPreview(false);
      setShowQuotePicker(false);
      return;
    }
    if (!editData?.id && quotationRef && !selectableQuotations.some((q) => q.id === quotationRef)) {
      setQuotationRef('');
      setQuoteSearch('');
    }
  }, [isOpen, editData?.id, selectableQuotations, quotationRef]);

  useEffect(() => {
    if (!showPrintPreview) return undefined;
    const tagPrintSession = () => {
      document.documentElement.setAttribute('data-print-cutting-list-a4', '');
    };
    const clearPrintSession = () => {
      document.documentElement.removeAttribute('data-print-cutting-list-a4');
    };
    window.addEventListener('beforeprint', tagPrintSession);
    window.addEventListener('afterprint', clearPrintSession);
    return () => {
      window.removeEventListener('beforeprint', tagPrintSession);
      window.removeEventListener('afterprint', clearPrintSession);
      clearPrintSession();
    };
  }, [showPrintPreview]);

  useEffect(() => {
    if (!isOpen) {
      lastCuttingListHydrateSigRef.current = '';
      return;
    }
    if (lastCuttingListHydrateSigRef.current === cuttingListHydrateSig) return;
    lastCuttingListHydrateSigRef.current = cuttingListHydrateSig;

    if (editData?.id) {
      const buckets = { Roof: [], Flatsheet: [], Cladding: [] };
      if (Array.isArray(editData.lines)) {
        for (const line of editData.lines) {
          const t = LINE_TYPE_SET.has(line.lineType) ? line.lineType : 'Roof';
          buckets[t].push({
            id: `cl-line-${line.lineNo ?? newLineId()}`,
            sheets: String(line.sheets ?? ''),
            lengthM: String(line.lengthM ?? ''),
          });
        }
      }
      const next = {};
      for (const { type } of CATEGORIES) {
        next[type] = buckets[type].length ? buckets[type] : [blankRow()];
      }
      setLinesByCat(next);
      const qref = editData.quotationRef ?? '';
      setQuotationRef(qref);
      setDateISO(editData.dateISO ?? new Date().toISOString().slice(0, 10));
      setMachineName(editData.machineName ?? 'Machine 01 (Longspan)');
    } else {
      setQuotationRef('');
      setQuoteSearch('');
      setDateISO(new Date().toISOString().slice(0, 10));
      setMachineName('Machine 01 (Longspan)');
      setLinesByCat(emptyLinesByCat());
    }
    setSaving(false);
    if (!editData?.id) setHoldForProductionApproval(false);
  }, [isOpen, cuttingListHydrateSig, editData]);

  /** Workspace poll updates quotation rows: refresh the resolved quote label without re-hydrating line editors. */
  useEffect(() => {
    if (!isOpen || !editData?.id) return;
    const qref = String(quotationRef || editData.quotationRef || '').trim();
    if (!qref) return;
    const eq = quotations.find((x) => x.id === qref);
    if (!eq) return;
    const label = `${eq.id} · ${eq.customer ?? eq.customer_name ?? ''}`.trim();
    setQuoteSearch((prev) => {
      const t = String(prev).trim();
      if (!t) return label;
      if (t === qref) return label;
      if (t.startsWith(`${qref} ·`)) return label;
      return prev;
    });
  }, [isOpen, editData?.id, editData?.quotationRef, quotations, quotationRef]);

   

  const updateLine = useCallback((cat, id, patch) => {
    setLinesByCat((prev) => ({
      ...prev,
      [cat]: prev[cat].map((line) => (line.id === id ? { ...line, ...patch } : line)),
    }));
  }, []);

  const addLineAfter = useCallback((cat, afterId) => {
    setLinesByCat((prev) => {
      const arr = prev[cat];
      const i = arr.findIndex((l) => l.id === afterId);
      const nl = blankRow();
      const nextArr = i < 0 ? [...arr, nl] : [...arr.slice(0, i + 1), nl, ...arr.slice(i + 1)];
      return { ...prev, [cat]: nextArr };
    });
  }, []);

  const removeLine = useCallback((cat, id) => {
    setLinesByCat((prev) => {
      const arr = prev[cat];
      if (arr.length <= 1) return { ...prev, [cat]: [blankRow()] };
      return { ...prev, [cat]: arr.filter((line) => line.id !== id) };
    });
  }, []);

  const headerBadge = productionCompletedLock
    ? 'bg-amber-100 text-amber-900 ring-1 ring-amber-300/50'
    : readOnly
      ? 'bg-slate-200 text-slate-700'
      : productionOnQueue
        ? 'bg-teal-100 text-teal-900 ring-1 ring-teal-300/50'
        : 'bg-orange-100 text-orange-800 ring-1 ring-orange-400/30';
  const headerBadgeText = productionCompletedLock
    ? 'Locked'
    : readOnly
      ? 'View'
      : productionOnQueue
        ? 'Production'
        : editData?.id
          ? 'Edit'
          : 'New';
  const isCreate = !editData?.id;

  const submit = async (e) => {
    e.preventDefault();
    if (readOnly || saving) return;
    if (!quotationRef || !selectedQuotation) {
      showToast('Select a quotation before saving.', { variant: 'error' });
      return;
    }
    const normalizedLines = flatLinesWithType.map((line) => ({
      sheets: line.sheets,
      lengthM: line.lengthM,
      lineType: line.type,
    }));
    if (normalizedLines.length === 0 && !selectedQuotationAccessoriesOnly) {
      showToast('Add at least one valid line (length and quantity) in any section.', { variant: 'error' });
      return;
    }
    if (
      isCreate &&
      selectedQuotation &&
      !meetsCuttingListPayThreshold(selectedQuotation, receipts, ledgerEntries, minPaidFraction)
    ) {
      showToast(
        `Under ${minPaidPercentLabel}% paid: a manager must approve production on the Manager dashboard before you can save this cutting list.`,
        { variant: 'error' }
      );
      return;
    }
    setSaving(true);
    const result = await onPersist?.({
      id: editData?.id,
      quotationRef,
      customerID: selectedQuotation.customerID,
      customerName: selectedQuotation.customer,
      dateISO,
      sheetsToCut: selectedQuotationAccessoriesOnly ? 0 : computedSheets,
      machineName,
      handledBy: activeDisplayName || handledByLabel,
      lines: normalizedLines,
      totalMeters: selectedQuotationAccessoriesOnly ? 0 : totalMeters,
      ...(selectedQuotationAccessoriesOnly ? { productName: 'Accessories only' } : {}),
      ...(isCreate ? { holdForProductionApproval } : {}),
      ...(!isCreate && cuttingListEditApprovalId.trim()
        ? { editApprovalId: cuttingListEditApprovalId.trim() }
        : {}),
    });
    setSaving(false);
    if (!result?.ok) {
      showToast(result?.error || 'Could not save cutting list.', { variant: 'error' });
      return;
    }
    abandonUnsavedAndRun(() => onClose());
  };

  const clearProductionHold = useCallback(async () => {
    const id = editData?.id;
    if (!id || !ws?.canMutate || !canClearProductionHold) return;
    setClearingHold(true);
    const { ok, data } = await apiFetch(`/api/cutting-lists/${encodeURIComponent(id)}/clear-production-hold`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    setClearingHold(false);
    if (!ok) {
      showToast(data?.error || 'Could not clear production hold.', { variant: 'error' });
      return;
    }
    showToast('Production hold cleared. You can send this list to the queue.', { variant: 'success' });
    if (data?.cuttingList) onCuttingListUpdated?.(data.cuttingList);
    await ws?.refresh?.();
  }, [editData?.id, ws.refresh, ws.canMutate, showToast, onCuttingListUpdated, canClearProductionHold]);

  const registerProduction = useCallback(async () => {
    const id = editData?.id;
    if (!id || !ws?.canMutate) return;
    if (editData?.productionRegistered) {
      showToast('This cutting list is already linked to a production job.', { variant: 'error' });
      return;
    }
    if (editData?.productionReleasePending) {
      showToast(
        'This list is on hold until operations clears the production release (Manager / operations with release permission).',
        { variant: 'error' }
      );
      return;
    }
    setRegistering(true);
    const { ok, data } = await apiFetch(
      `/api/cutting-lists/${encodeURIComponent(id)}/register-production`,
      {
        method: 'POST',
        body: JSON.stringify({ machineName }),
      }
    );
    setRegistering(false);
    if (!ok) {
      showToast(data?.error || 'Could not add to production queue.', { variant: 'error' });
      return;
    }
    showToast('Cutting list added to the production queue.', { variant: 'success' });
    if (data?.cuttingList) onCuttingListUpdated?.(data.cuttingList);
    await ws?.refresh?.();
  }, [editData?.id, editData?.productionRegistered, editData?.productionReleasePending, machineName, ws.refresh, ws.canMutate, showToast, onCuttingListUpdated]);

  return (
    <ModalFrame isOpen={isOpen} onClose={handleClose} modal={!showPrintPreview}>
      <form
        onSubmit={submit}
        onInput={captureEdited}
        onChange={captureEdited}
        className="z-modal-panel max-w-[min(100%,52rem)] w-full min-w-0 max-h-[min(92vh,860px)] flex flex-col"
      >
        <div className="no-print px-5 py-4 border-b border-slate-200 flex justify-between items-center bg-white shrink-0 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0">
              <Scissors size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 gap-y-1">
                <h2 className="text-base font-bold text-[#134e4a] tracking-tight">Cutting list</h2>
                <span
                  className={`shrink-0 rounded-md px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${headerBadge}`}
                >
                  {headerBadgeText}
                </span>
              </div>
              <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5 leading-snug">
                {savedCuttingListId ? (
                  <>
                    ID <span className="font-mono text-[#134e4a]">{savedCuttingListId}</span>
                    {' '}
                    · status <span className="text-[#134e4a]">{displayCuttingListStatus(editData.status)}</span>
                  </>
                ) : (
                  <span className="font-normal normal-case text-slate-600">
                    <span className="font-semibold text-amber-800 uppercase tracking-wide">Draft (not saved)</span>
                    {quotationRef ? (
                      <>
                        {' '}
                        · quotation <span className="font-mono font-semibold text-[#134e4a]">{quotationRef}</span>
                      </>
                    ) : null}
                    {' '}
                    · next list # <em className="not-italic font-normal text-slate-500">if you save now</em>:{' '}
                    <span className="font-mono font-semibold text-[#134e4a]">{nextBranchCuttingListSerialPreview}</span>
                    <span className="block text-[8px] font-normal text-slate-500 normal-case mt-0.5">
                      That number is a branch-wide preview only — it is not reserved, and every new draft shows the same
                      preview until someone saves. Save to get a real ID and appear under Sales → Cutting list.
                    </span>
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (!ws?.canMutate) {
                  showToast('System offline (read-only). Reconnect and refresh before printing.', { variant: 'error' });
                  return;
                }
                if (!editData?.id) {
                  showToast('Save cutting list successfully before printing.', { variant: 'error' });
                  return;
                }
                setShowPrintPreview(true);
              }}
              disabled={!ws?.canMutate || !editData?.id}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[9px] font-semibold uppercase tracking-wide text-[#134e4a] hover:bg-slate-50 disabled:opacity-40"
            >
              <Printer size={14} /> Print
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="p-2.5 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-xl transition-all"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {productionCompletedLock ? (
          <div className="no-print px-5 py-2 bg-amber-50 border-b border-amber-200 text-[10px] font-medium text-amber-900">
            Production is finished for this list — editing is blocked to protect the completed record.
          </div>
        ) : null}
        {productionOnQueue ? (
          <div className="no-print px-5 py-2 bg-teal-50 border-b border-teal-200 text-[10px] font-medium text-teal-900">
            On the production queue — you can still update lengths and quantities until the run is completed.
          </div>
        ) : null}
        {editData?.id && editData?.productionReleasePending && !productionCompletedLock ? (
          <div className="no-print px-5 py-2.5 bg-sky-50 border-b border-sky-200 text-[10px] text-sky-950 space-y-2">
            <p className="font-semibold">Receipts and cutting lists are separate: this list is on hold until operations releases it for production.</p>
            {canClearProductionHold ? (
              <button
                type="button"
                disabled={clearingHold}
                onClick={clearProductionHold}
                className="inline-flex items-center gap-1.5 rounded-lg border border-sky-300 bg-white px-3 py-2 text-[9px] font-bold uppercase tracking-wide text-sky-900 hover:bg-sky-100 disabled:opacity-50"
              >
                {clearingHold ? 'Clearing…' : 'Clear production hold'}
              </button>
            ) : (
              <p className="text-sky-800/90">Ask an operations user with release permission to clear this hold.</p>
            )}
          </div>
        ) : null}
        {accessMode === 'view' ? (
          <div className="no-print px-5 py-2 bg-slate-50 border-b border-slate-200 text-[10px] font-medium text-slate-600">
            View only.
          </div>
        ) : null}
        {!ws?.canMutate ? (
          <div className="no-print px-5 py-2 bg-amber-50 border-b border-amber-200 text-[10px] font-semibold text-amber-900">
            System offline (read-only). Reconnect and refresh before saving, queueing, or printing cutting lists.
          </div>
        ) : null}

        <div className="no-print flex-1 min-h-0 overflow-y-auto lg:overflow-hidden flex flex-col lg:flex-row bg-white">
          <div
            className={`w-full lg:flex-1 lg:min-h-0 lg:overflow-y-auto p-5 custom-scrollbar lg:border-r border-slate-100 ${readOnly ? 'pointer-events-none opacity-75' : ''}`}
          >
            <div className="rounded-xl border border-slate-200/90 p-4 mb-5 bg-slate-50/50">
              <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest mb-3">Job header</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2 space-y-2 relative z-20">
                  <label className={label}>Quotation</label>
                  <p className="text-[9px] text-slate-500 leading-snug -mt-1 mb-1">
                    Search by quotation ID, customer, or customer code, then click a row to link. If less than{' '}
                    <span className="font-semibold text-slate-700">{minPaidPercentLabel}%</span> of the quote is paid on the customer ledger, a manager must use{' '}
                    <span className="font-semibold text-slate-700">Manager dashboard</span> → Transaction Intel →{' '}
                    <span className="font-semibold text-slate-700">Override</span> before you can save a cutting list here.
                  </p>
                  {productionCompletedLock ? (
                    <div className={`${field} bg-slate-50 text-slate-700`}>{quotationRef || '—'}</div>
                  ) : (
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        value={quoteSearch}
                        onChange={(e) => {
                          setQuoteSearch(e.target.value);
                          setShowQuotePicker(true);
                        }}
                        onFocus={() => setShowQuotePicker(true)}
                        placeholder="Search quotations…"
                        className={`${field} pl-9 pr-10`}
                        autoComplete="off"
                      />
                      {quoteSearch ? (
                        <button
                          type="button"
                          onClick={() => {
                            setQuoteSearch('');
                            setQuotationRef('');
                            setShowQuotePicker(false);
                          }}
                          className="absolute right-8 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                          aria-label="Clear quotation"
                        >
                          <X size={14} />
                        </button>
                      ) : null}
                      <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                      {showQuotePicker ? (
                        <button
                          type="button"
                          className="fixed inset-0 z-[5] cursor-default bg-black/10"
                          aria-label="Close quotation list"
                          onClick={() => setShowQuotePicker(false)}
                        />
                      ) : null}
                      {showQuotePicker ? (
                        <div className="absolute z-[25] left-0 right-0 mt-1 max-h-[min(360px,55vh)] overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl custom-scrollbar p-1">
                          {filteredQuotePicker.length === 0 ? (
                            <div className="p-3 text-[10px] font-medium text-slate-600 space-y-2">
                              {knownQuotePickerBlocker?.kind === 'has_list' ? (
                                <div className="text-left rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-950">
                                  <p className="font-bold text-[11px] text-amber-900">
                                    {knownQuotePickerBlocker.q.id} already has cutting list{' '}
                                    <span className="font-mono">{knownQuotePickerBlocker.listId}</span>
                                    {knownQuotePickerBlocker.branchId ? (
                                      <span className="font-normal text-amber-800">
                                        {' '}
                                        (branch {knownQuotePickerBlocker.branchId})
                                      </span>
                                    ) : null}
                                  </p>
                                  <p className="text-[9px] text-amber-900/90 leading-snug mt-1">
                                    It will not appear under &quot;New cutting list&quot;. Go to Sales → Cutting list and search that list
                                    ID. If you do not see it, switch the workspace branch to match the branch above, or ask an admin to remove
                                    a stray record.
                                  </p>
                                </div>
                              ) : knownQuotePickerBlocker?.kind === 'zero_total' ? (
                                <div className="text-left rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800">
                                  <p className="font-bold text-[11px]">Quotation {knownQuotePickerBlocker.q.id} has zero total</p>
                                  <p className="text-[9px] leading-snug mt-1">Add priced lines to the quotation before creating a cutting list.</p>
                                </div>
                              ) : (
                                <p className="text-center font-semibold text-slate-400 uppercase">No matching quotations</p>
                              )}
                            </div>
                          ) : (
                            filteredQuotePicker.map((q) => {
                              const cust = q.customer ?? q.customer_name ?? '';
                              const okPay = meetsCuttingListPayThreshold(q, receipts, ledgerEntries, minPaidFraction);
                              return (
                                <button
                                  key={q.id}
                                  type="button"
                                  onClick={() => {
                                    setQuotationRef(q.id);
                                    setQuoteSearch(`${q.id}${cust ? ` · ${cust}` : ''}`);
                                    setShowQuotePicker(false);
                                  }}
                                  className={`flex w-full flex-col p-2.5 text-left transition-colors rounded-md border border-transparent hover:border-orange-100 hover:bg-orange-50/80 ${
                                    quotationRef === q.id ? 'bg-orange-50 border-orange-100' : ''
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-bold text-[#134e4a]">{q.id}</span>
                                    <span
                                      className={`text-[8px] font-bold uppercase tracking-tight shrink-0 px-1.5 py-0.5 rounded ${
                                        okPay ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                      }`}
                                    >
                                      {okPay ? `≥${minPaidPercentLabel}% / ok` : `Under ${minPaidPercentLabel}%`}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between gap-2 mt-0.5">
                                    <span className="text-[11px] font-semibold text-slate-800 truncate">{cust || '—'}</span>
                                    <span className="text-[10px] font-bold text-orange-700 tabular-nums shrink-0">
                                      {formatNgn(bookPaidTowardQuotation(q))} /{' '}
                                      {formatNgn(Number(q.totalNgn ?? q.total_ngn) || 0)}
                                    </span>
                                  </div>
                                </button>
                              );
                            })
                          )}
                        </div>
                      ) : null}
                    </div>
                  )}
                  {isCreate && selectableQuotations.length === 0 ? (
                    <p className="text-[10px] font-medium text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                      No open quotations in workspace. Create a quotation with a line total, or ensure an existing order has no cutting list
                      yet.
                    </p>
                  ) : null}
                </div>

                <div className="relative">
                  <label className={label}>Cutting date</label>
                  <input
                    type="date"
                    value={dateISO}
                    onChange={(e) => setDateISO(e.target.value)}
                    className={`${field} cursor-pointer`}
                  />
                  <Calendar size={12} className="absolute right-2 bottom-2.5 text-slate-300 pointer-events-none" />
                </div>

                <div className="relative">
                  <label className={label}>Machine</label>
                  <select
                    value={machineName}
                    onChange={(e) => setMachineName(e.target.value)}
                    className={`${field} appearance-none pr-8`}
                  >
                    <option value="Machine 01 (Longspan)">Machine 01 (Longspan)</option>
                    <option value="Machine 02 (Steeltile)">Machine 02 (Steeltile)</option>
                    <option value="Machine 03 (Metcoppo)">Machine 03 (Metcoppo)</option>
                  </select>
                  <Cog size={12} className="absolute right-2 bottom-2.5 text-slate-300 pointer-events-none" />
                </div>
                {isCreate &&
                  quotationRef &&
                  selectedQuotation &&
                  !meetsCuttingListPayThreshold(selectedQuotation, receipts, ledgerEntries, minPaidFraction) && (
                  <div className="md:col-span-2 p-4 rounded-xl border border-amber-200 bg-amber-50 space-y-3">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={20} />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-amber-900">
                          Low payment ({payPercentOnQuote}% book · need {minPaidPercentLabel}% for cutting without override)
                        </p>
                        <p className="text-[10px] text-amber-800 leading-snug">
                          You cannot save this cutting list until a manager approves production for this quotation on the Manager dashboard
                          (Transaction Intel → Override). After approval, refresh and try again.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        wrapClose(() => {
                          onClose();
                          navigate(`/manager?quoteRef=${encodeURIComponent(quotationRef)}`);
                        });
                      }}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-[#134e4a] text-white text-[9px] font-bold uppercase tracking-wider hover:bg-[#0f3d39] transition-colors"
                    >
                      Open Manager dashboard for this quotation
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              {selectedQuotationAccessoriesOnly ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 text-xs text-emerald-950">
                  <p className="font-bold uppercase tracking-wider text-[10px]">Accessories-only release</p>
                  <p className="mt-1 leading-snug">
                    This quotation has accessory quantities and no sheet product lines, so the list will save with
                    0 metres. Send it to production, start it as “Produced from offcut / accessories only”, then
                    complete to issue accessory stock.
                  </p>
                </div>
              ) : (
                cuttingCategoriesUi.map(({ type, title }) => (
                  <CategoryBlock
                    key={type}
                    title={title}
                    lines={linesByCat[type]}
                    readOnly={readOnly}
                    onUpdateLine={(id, patch) => updateLine(type, id, patch)}
                    onAddAfter={(id) => addLineAfter(type, id)}
                    onRemoveLine={(id) => removeLine(type, id)}
                  />
                ))
              )}
            </div>
          </div>

          <div className="w-full lg:w-72 lg:shrink-0 lg:min-h-0 bg-slate-50/90 p-4 flex flex-col gap-3 border-t lg:border-t-0 lg:border-l border-slate-100 lg:overflow-y-auto custom-scrollbar">
            <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
              <Info size={12} className="text-orange-500 shrink-0" />
              Job spec
            </p>
            <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
              <p className="text-[8px] font-semibold text-slate-400 uppercase">From quotation</p>
              <div className="flex justify-between gap-2 text-[10px] font-semibold">
                <span className="text-slate-500 shrink-0">Customer</span>
                <span className="text-[#134e4a] text-right">{selectedQuotation?.customer ?? '—'}</span>
              </div>
              <div className="flex justify-between gap-2 text-[10px] font-semibold">
                <span className="text-slate-500 shrink-0">Colour</span>
                <span className="text-[#134e4a] text-right">{materialSpec.colour}</span>
              </div>
              <div className="flex justify-between gap-2 text-[10px] font-semibold">
                <span className="text-slate-500 shrink-0">Gauge</span>
                <span className="text-[#134e4a] text-right tabular-nums">{materialSpec.gauge}</span>
              </div>
              <div className="flex justify-between gap-2 text-[10px] font-semibold">
                <span className="text-slate-500 shrink-0">Profile</span>
                <span className="text-[#134e4a] text-right">{materialSpec.profile}</span>
              </div>
              {selectedQuotation ? (
                <div className="border-t border-slate-100 pt-2 mt-1 space-y-1 text-[10px]">
                  <div className="flex justify-between gap-2 font-semibold">
                    <span className="text-slate-500">Quote total</span>
                    <span className="text-[#134e4a] tabular-nums">
                      {selectedQuotation.total ?? formatNgn(totalQuoteNgn)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2 font-semibold">
                    <span className="text-slate-500">Booked paid</span>
                    <span className="text-[#134e4a] tabular-nums">{formatNgn(bookPaidOnQuote)}</span>
                  </div>
                  <div className="flex justify-between gap-2 text-[9px] font-semibold text-slate-600">
                    <span className="text-slate-500">Receipts (till)</span>
                    <span className="tabular-nums">{formatNgn(receiptTillOnQuote)}</span>
                  </div>
                  {advanceAppliedOnQuote > 0 ? (
                    <div className="flex justify-between gap-2 text-[9px] font-semibold text-slate-600">
                      <span className="text-slate-500">Advance applied</span>
                      <span className="tabular-nums">{formatNgn(advanceAppliedOnQuote)}</span>
                    </div>
                  ) : null}
                  <p className="text-[8px] text-slate-500 leading-snug pt-0.5">
                    Booked matches the quotation. Receipts is customer cash; advance is deposit credited to this quote (not added again to
                    receipts).
                  </p>
                  <div className="flex justify-between gap-2 font-semibold">
                    <span className="text-slate-500">Outstanding</span>
                    <span className="text-orange-700 tabular-nums">{formatNgn(balanceQuote)}</span>
                  </div>
                </div>
              ) : null}
            </div>

            <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest">This order — detail</p>
            {!selectedQuotation ? (
              <p className="text-[10px] text-slate-500">Select a quotation to see line items and receipts for this order.</p>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-3 text-[10px] leading-snug">
                {quoteLineSnippet.length > 0 ? (
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Quoted lines</p>
                    <ul className="space-y-0.5 max-h-36 overflow-y-auto custom-scrollbar">
                      {quoteLineSnippet.map((row, i) => (
                        <li key={`${row.cat}-${i}`} className="flex justify-between gap-2 border-b border-slate-50 pb-1 last:border-0">
                          <span className="text-slate-700 truncate">{row.name}</span>
                          <span className="text-slate-500 shrink-0 tabular-nums">{row.qty}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-slate-500">No line items on file for this quotation.</p>
                )}

                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Receipts (this quotation)</p>
                  {quoteReceipts.length === 0 ? (
                    <p className="text-slate-500">No receipts linked.</p>
                  ) : (
                    <ul className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                      {quoteReceipts.map((r) => (
                        <li key={r.id} className="flex justify-between gap-2 border-b border-slate-100 pb-1 last:border-0">
                          <span className="text-slate-600">{r.date ?? r.dateISO}</span>
                          <span className="font-semibold text-[#134e4a] tabular-nums">
                            {formatNgn(receiptCashReceivedNgn(r))}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {editData?.id ? (
                  <div className="rounded-lg border border-orange-100 bg-orange-50/60 p-2">
                    <p className="font-bold text-orange-900 text-[9px] uppercase">This cutting list</p>
                    <p className="text-slate-800 mt-1 tabular-nums">{editData.total ?? `${editData.totalMeters ?? totalMeters} m`}</p>
                  </div>
                ) : null}

                {isCreate ? (
                  <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 bg-slate-50/80 p-2 text-[10px] text-slate-700">
                    <input
                      type="checkbox"
                      checked={holdForProductionApproval}
                      onChange={(ev) => setHoldForProductionApproval(ev.target.checked)}
                      className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-[#134e4a]"
                    />
                    <span>
                      <span className="font-bold text-slate-800">Request operations approval</span> before this list
                      can join the production queue (splits payment/cutting from shop-floor release).
                    </span>
                  </label>
                ) : null}
              </div>
            )}

            {editData?.id && !editData?.productionRegistered && editData?.productionReleasePending ? (
              <p className="text-[9px] font-medium text-amber-900 bg-amber-50 border border-amber-100 rounded-lg p-2 leading-snug">
                Clear the operations production hold above before sending to the queue.
              </p>
            ) : null}

            {editData?.id && !editData?.productionRegistered && ws?.canMutate && canRegisterProduction && !editData?.productionReleasePending ? (
              <button
                type="button"
                onClick={registerProduction}
                disabled={registering || readOnly}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#134e4a]/20 bg-[#134e4a] px-3 py-2.5 text-[9px] font-semibold uppercase tracking-wide text-white hover:bg-[#0f3d39] disabled:opacity-40"
              >
                <Factory size={14} className="shrink-0" />
                {registering ? 'Sending…' : 'Send to production queue'}
              </button>
            ) : null}
            {editData?.id && !editData?.productionRegistered && ws?.canMutate && !canRegisterProduction ? (
              <p className="text-[9px] text-slate-500 leading-snug">
                Ask an admin for sales, operations, or production access to send this list to the queue.
              </p>
            ) : null}
            {editData?.id && !editData?.productionRegistered && !ws?.canMutate ? (
              <p className="text-[9px] text-slate-500 leading-snug">
                Connect and sign in to send this cutting list to the production queue.
              </p>
            ) : null}

            <p className="text-[9px] leading-snug text-orange-900 bg-orange-50 border border-orange-100 rounded-lg p-2 font-medium">
              Status: Waiting → In production when the line starts → Finished when production completes.
            </p>
          </div>
        </div>

        {editData?.id && !readOnly ? (
          <div className="no-print px-5 py-3 border-t border-slate-200 bg-white shrink-0">
            <EditSecondApprovalInline
              entityKind="cutting_list"
              entityId={editData.id}
              value={cuttingListEditApprovalId}
              onChange={setCuttingListEditApprovalId}
            />
          </div>
        ) : null}

        <div className="no-print px-5 py-4 bg-[#134e4a] flex justify-between items-center text-white shrink-0 flex-wrap gap-3">
          <div>
            <p className="text-[9px] font-semibold text-white/50 uppercase tracking-widest mb-0.5">
              Total linear metres
            </p>
            <p className="text-2xl font-bold text-white tabular-nums">
              {totalMeters.toLocaleString()} <span className="text-sm text-white/40 font-semibold ml-0.5">m</span>
            </p>
            <p className="text-[9px] text-white/40 mt-1">Sheets (qty sum): {computedSheets.toLocaleString()}</p>
          </div>
          <button
            type="submit"
            disabled={readOnly || saving}
            className="bg-white/10 text-white px-4 py-2.5 rounded-lg text-[9px] font-semibold uppercase tracking-wide hover:bg-white/20 disabled:opacity-40"
          >
            {saving ? 'Saving…' : editData?.id ? 'Update list' : 'Save draft'}
          </button>
        </div>
      </form>

      {showPrintPreview &&
        typeof document !== 'undefined' &&
        createPortal(
          <>
            <button
              type="button"
              aria-label="Close print preview"
              className="no-print fixed inset-0 z-[11060] bg-black/50"
              onClick={() => setShowPrintPreview(false)}
            />
            <div
              className="print-portal-scroll fixed inset-0 z-[11070] overflow-y-auto overscroll-y-contain p-4 sm:p-8"
              onClick={() => setShowPrintPreview(false)}
            >
              <div
                className="mx-auto max-w-[297mm] pb-16 print-cutting-list-a4-host"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="rounded-lg border border-slate-200 bg-white shadow-2xl print:rounded-none print:border-0 print:shadow-none">
                  <CuttingListReportPrintView {...printPayload} />
                </div>
                <div className="no-print mt-4 flex flex-col items-center gap-2">
                  <div className="flex flex-wrap justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => window.print()}
                      title="The layout uses A4 landscape (@page). Most browsers open the print dialog with A4 and landscape pre-selected; if not, choose them manually. Use Scale → Fit to page only if content still clips."
                      className="rounded-lg bg-[#134e4a] px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow-lg"
                    >
                      Print / Save PDF · A4 landscape
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPrintPreview(false)}
                      className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700"
                    >
                      Close
                    </button>
                  </div>
                  <p className="text-center text-[9px] text-slate-500 max-w-sm leading-snug">
                    Stylesheet uses <span className="font-semibold text-slate-600">A4 landscape</span> (named @page) so one sheet usually fits
                    without a blank second page. If the dialog shows Letter or portrait, switch to A4 and landscape. Use{' '}
                    <span className="font-semibold text-slate-600">Fit to page</span> only if something still clips.
                  </p>
                </div>
              </div>
            </div>
          </>,
          document.body
        )}
    </ModalFrame>
  );
};

export default CuttingListModal;
