import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  CircleHelp,
  ClipboardList,
  FileWarning,
  Gauge,
  Info,
  Play,
  Plus,
  Save,
  Sparkles,
  Trash2,
  Undo2,
  Ban,
  X,
  ChevronDown,
} from 'lucide-react';
import { apiFetch } from '../lib/apiBase';
import { APP_DATA_TABLE_PAGE_SIZE, useAppTablePaging } from '../lib/appDataTable';
import { AppTablePager } from './ui/AppDataTable';
import {
  buildExpectedCoilSpecFromQuotation,
  coilMatchesQuotationSpec,
  coilVersusQuotationAndProductWarning,
} from '../lib/coilSpecVersusProduct';
import { productionJobNeedsManagerReviewAttention } from '../lib/productionReview';
import { normalizeJobStatus, pickProductionJobForCuttingList } from '../lib/productionJobPick';
import { useToast } from '../context/ToastContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { editMutationNeedsSecondApprovalRole } from '../lib/editApprovalUi';
import { EditSecondApprovalInline } from './EditSecondApprovalInline';

/** Matches server: closing below this (kg) may use “Finish roll” on completion to clear the tail from stock. */
const COIL_TAIL_FINISH_MAX_KG = 85;

const PROD_ACCESSORY_DRAFT_STORAGE_PREFIX = 'zarewa.prodAccessoryDraft.v1:';

function prodAccessoryDraftStorageKey(jobId) {
  return PROD_ACCESSORY_DRAFT_STORAGE_PREFIX + encodeURIComponent(String(jobId || ''));
}

function readProdAccessoryDraftMap(jobId) {
  if (typeof sessionStorage === 'undefined' || !jobId) return {};
  try {
    const raw = sessionStorage.getItem(prodAccessoryDraftStorageKey(jobId));
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function writeProdAccessoryDraftEntry(jobId, stableKey, value) {
  if (typeof sessionStorage === 'undefined' || !jobId || !stableKey) return;
  try {
    const map = readProdAccessoryDraftMap(jobId);
    map[stableKey] = value;
    sessionStorage.setItem(prodAccessoryDraftStorageKey(jobId), JSON.stringify(map));
  } catch {
    // quota / private mode
  }
}

function clearProdAccessoryDraftStorage(jobId) {
  if (typeof sessionStorage === 'undefined' || !jobId) return;
  try {
    sessionStorage.removeItem(prodAccessoryDraftStorageKey(jobId));
  } catch {
    // ignore
  }
}

function createDraftLine(row = {}) {
  const hasPersistedId = row.id != null && row.id !== '';
  return {
    id: hasPersistedId ? row.id : `draft-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    coilNo: row.coilNo || '',
    openingWeightKg:
      row.openingWeightKg != null && row.openingWeightKg !== 0 ? String(row.openingWeightKg) : '',
    closingWeightKg:
      row.closingWeightKg != null && row.closingWeightKg !== 0 ? String(row.closingWeightKg) : '',
    metersProduced:
      row.metersProduced != null && row.metersProduced !== 0 ? String(row.metersProduced) : '',
    note: row.note || '',
    specMismatch: Boolean(row.specMismatch),
    finishCoil: Boolean(row.finishCoil),
  };
}

function formatKg(value) {
  const next = Number(value);
  return Number.isFinite(next) ? `${next.toFixed(2)} kg` : '—';
}

function formatMeters(value) {
  const next = Number(value);
  return Number.isFinite(next) ? `${next.toFixed(2)} m` : '—';
}

/** In compact views, omit “Design” when it matches or nests inside the FG product line label. */
function designRedundantVersusProductLine(design, productName, productID) {
  const d = String(design || '').trim().toLowerCase();
  if (!d) return true;
  const p = String(productName || productID || '').trim().toLowerCase();
  if (!p) return false;
  if (d === p) return true;
  if (d.length >= 4 && p.includes(d)) return true;
  if (p.length >= 4 && d.includes(p)) return true;
  return false;
}

function formatKgPerM(value) {
  const next = Number(value);
  return Number.isFinite(next) && next > 0 ? `${next.toFixed(4)} kg/m` : '—';
}

/** Table cells for posted conversion (readable size, full precision). */
function formatKgPerMCompact(value) {
  const next = Number(value);
  return Number.isFinite(next) && next > 0 ? next.toFixed(4) : '—';
}

/** Metres implied by free kg using supplier conversion, else scaled from supplier nominal length vs received kg. */
function estimatedMetresFromFreeKg(coil, freeKg) {
  const kg = Number(freeKg);
  if (!Number.isFinite(kg) || kg <= 0) return null;
  const conv = Number(coil?.supplierConversionKgPerM);
  if (Number.isFinite(conv) && conv > 0) {
    const m = kg / conv;
    return Number.isFinite(m) && m > 0 ? m : null;
  }
  const sem = Number(coil?.supplierExpectedMeters);
  const recv = Number(coil?.qtyReceived);
  if (Number.isFinite(sem) && sem > 0 && Number.isFinite(recv) && recv > 0) {
    const m = sem * (kg / recv);
    return Number.isFinite(m) && m > 0 ? m : null;
  }
  return null;
}

function supplierNominalMetres(coil) {
  const sem = Number(coil?.supplierExpectedMeters);
  return Number.isFinite(sem) && sem > 0 ? sem : null;
}

/** Lower sorts earlier: best match to planned metres when estimate exists. */
function coilMetresPickSortKey(estimatedM, plannedM) {
  if (estimatedM == null || !Number.isFinite(estimatedM)) return 3000;
  if (!Number.isFinite(plannedM) || plannedM <= 0) return 1000;
  const diff = estimatedM - plannedM;
  if (diff >= 0) return 1000 + diff;
  return 2000 - diff;
}

/** One-line label for coil `<option>`s: material, spec, estimated metres vs free kg, optional job plan hint. */
function coilPickerOptionText(coil, freeKg, plannedJobM) {
  const mat = String(coil?.materialTypeName || '').trim();
  const matPrefix = mat ? `${mat} · ` : '';
  const colour = coil?.colour || '—';
  const gauge = coil?.gaugeLabel || '—';
  const est = estimatedMetresFromFreeKg(coil, freeKg);
  const nominal = supplierNominalMetres(coil);
  let metresPart = '';
  if (est != null) {
    metresPart = `≈${est.toFixed(1)} m est`;
    if (Number.isFinite(plannedJobM) && plannedJobM > 0) {
      metresPart += ` · plan ${plannedJobM.toFixed(1)} m`;
    }
  } else if (nominal != null) {
    metresPart = `supplier ~${nominal.toFixed(0)} m roll`;
    if (Number.isFinite(plannedJobM) && plannedJobM > 0) {
      metresPart += ` · plan ${plannedJobM.toFixed(1)} m`;
    }
  } else {
    metresPart = 'm est n/a';
  }
  return `${coil.coilNo} — ${matPrefix}${colour} ${gauge} · ${metresPart} · free ${freeKg.toFixed(1)} kg`;
}

function formatPct(value) {
  const next = Number(value);
  if (!Number.isFinite(next)) return '—';
  const sign = next > 0 ? '+' : '';
  return `${sign}${next.toFixed(1)}%`;
}

function alertTone(alertState) {
  switch (alertState) {
    case 'High':
      return 'border-red-200 bg-red-50 text-red-900';
    case 'Low':
      return 'border-amber-200 bg-amber-50 text-amber-900';
    case 'Watch':
      return 'border-sky-200 bg-sky-50 text-sky-900';
    default:
      return 'border-emerald-200 bg-emerald-50 text-emerald-900';
  }
}

/** Table row background only (posted conversion). */
function postedCheckRowClass(alertState) {
  switch (alertState) {
    case 'High':
      return 'bg-red-50/85 text-red-950';
    case 'Low':
      return 'bg-amber-50/85 text-amber-950';
    case 'Watch':
      return 'bg-sky-50/85 text-sky-950';
    default:
      return 'bg-emerald-50/50 text-emerald-950';
  }
}

function statusTone(status) {
  switch (status) {
    case 'Completed':
      return 'bg-emerald-100 text-emerald-800';
    case 'Cancelled':
      return 'bg-slate-200 text-slate-700';
    case 'Running':
      return 'bg-sky-100 text-sky-800';
    default:
      return 'bg-amber-100 text-amber-900';
  }
}

function isDraftAllocationRow(row) {
  return String(row?.id ?? '').startsWith('draft-');
}

/** One coil line has enough data to include in live conversion preview (multi-coil jobs can preview per finished roll). */
function draftRowConversionPreviewReady(row) {
  const coil = row.coilNo?.trim();
  const op = Number(row.openingWeightKg);
  const cl = Number(row.closingWeightKg);
  const m = Number(row.metersProduced);
  return (
    Boolean(coil) &&
    Number.isFinite(op) &&
    op > 0 &&
    Number.isFinite(cl) &&
    cl >= 0 &&
    cl <= op &&
    Number.isFinite(m) &&
    m > 0
  );
}

function completionLineFromDraft(row) {
  const line = {
    coilNo: row.coilNo.trim(),
    closingWeightKg: Number(row.closingWeightKg),
    metersProduced: Number(row.metersProduced),
    note: row.note.trim(),
  };
  const opening = Number(String(row.openingWeightKg ?? '').replace(/,/g, ''));
  if (Number.isFinite(opening) && opening > 0) {
    line.openingWeightKg = opening;
  }
  if (row.finishCoil) {
    line.finishCoil = true;
  }
  if (!isDraftAllocationRow(row) && row.id != null && row.id !== '') {
    return { ...line, allocationId: row.id };
  }
  return line;
}

/**
 * @param {{ focusCuttingListId?: string | null; hideJobSidebar?: boolean; inModal?: boolean; viewOnly?: boolean; onModalClose?: () => void; showModalCloseButton?: boolean; operationsRegisterEdit?: boolean }} [props]
 */
export function LiveProductionMonitor({
  focusCuttingListId = null,
  hideJobSidebar = false,
  inModal = false,
  viewOnly = false,
  onModalClose = null,
  showModalCloseButton = true,
  operationsRegisterEdit = false,
} = {}) {
  const ws = useWorkspace();
  const { show: showToast } = useToast();
  const [selectedJobId, setSelectedJobId] = useState('');
  const [draftAllocations, setDraftAllocations] = useState([createDraftLine()]);
  const [savingAction, setSavingAction] = useState('');
  const [signoffRemark, setSignoffRemark] = useState('');
  const [signoffEditApprovalId, setSignoffEditApprovalId] = useState('');
  /** Edit OKs token for post-completion register fixes (coil-line correction + FG metre adjustment). */
  const [postCompletionEditApprovalId, setPostCompletionEditApprovalId] = useState('');
  const [signoffSaving, setSignoffSaving] = useState(false);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [returnSaving, setReturnSaving] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelSaving, setCancelSaving] = useState(false);
  const [fgAdjDelta, setFgAdjDelta] = useState('');
  const [fgAdjNote, setFgAdjNote] = useState('');
  const [fgAdjSaving, setFgAdjSaving] = useState(false);
  const [stoneMetersConsumed, setStoneMetersConsumed] = useState('');
  const [stoneAllocAck, setStoneAllocAck] = useState(false);
  const [completionSourceMode, setCompletionSourceMode] = useState('coil');
  const [offcutMetersProduced, setOffcutMetersProduced] = useState('');

  const productionJobs = useMemo(
    () => (ws?.hasWorkspaceData && Array.isArray(ws?.snapshot?.productionJobs) ? ws.snapshot.productionJobs : []),
    [ws?.hasWorkspaceData, ws?.snapshot?.productionJobs]
  );
  const cuttingLists = useMemo(
    () => (ws?.hasWorkspaceData && Array.isArray(ws?.snapshot?.cuttingLists) ? ws.snapshot.cuttingLists : []),
    [ws?.hasWorkspaceData, ws?.snapshot?.cuttingLists]
  );
  const jobCoils = useMemo(
    () => (ws?.hasWorkspaceData && Array.isArray(ws?.snapshot?.productionJobCoils) ? ws.snapshot.productionJobCoils : []),
    [ws?.hasWorkspaceData, ws?.snapshot?.productionJobCoils]
  );
  const conversionChecks = useMemo(
    () =>
      ws?.hasWorkspaceData && Array.isArray(ws?.snapshot?.productionConversionChecks)
        ? ws.snapshot.productionConversionChecks
        : [],
    [ws?.hasWorkspaceData, ws?.snapshot?.productionConversionChecks]
  );
  const completionAdjustments = useMemo(
    () =>
      ws?.hasWorkspaceData && Array.isArray(ws?.snapshot?.productionCompletionAdjustments)
        ? ws.snapshot.productionCompletionAdjustments
        : [],
    [ws?.hasWorkspaceData, ws?.snapshot?.productionCompletionAdjustments]
  );
  const coilLots = useMemo(
    () => (ws?.hasWorkspaceData && Array.isArray(ws?.snapshot?.coilLots) ? ws.snapshot.coilLots : []),
    [ws?.hasWorkspaceData, ws?.snapshot?.coilLots]
  );
  const products = useMemo(
    () => (ws?.hasWorkspaceData && Array.isArray(ws?.snapshot?.products) ? ws.snapshot.products : []),
    [ws?.hasWorkspaceData, ws?.snapshot?.products]
  );
  const coilAllocationCountByJob = useMemo(() => {
    const m = new Map();
    for (const row of jobCoils) {
      const id = row.jobID;
      if (!id) continue;
      m.set(id, (m.get(id) || 0) + 1);
    }
    return m;
  }, [jobCoils]);

  const sortedJobs = useMemo(() => {
    const order = { Running: 0, Planned: 1, Completed: 2, Cancelled: 3 };
    return [...productionJobs].sort((a, b) => {
      const byStatus =
        (order[normalizeJobStatus(a.status)] ?? 99) - (order[normalizeJobStatus(b.status)] ?? 99);
      if (byStatus !== 0) return byStatus;
      return String(b.createdAtISO || '').localeCompare(String(a.createdAtISO || ''));
    });
  }, [productionJobs]);

  const focusClTrim = useMemo(
    () => (focusCuttingListId != null ? String(focusCuttingListId).trim() : ''),
    [focusCuttingListId]
  );

  const selectedJob = useMemo(() => {
    const found = sortedJobs.find((job) => job.jobID === selectedJobId);
    const base = found ?? (focusClTrim ? null : sortedJobs[0] ?? null);
    if (!base) return null;
    const status = normalizeJobStatus(base.status);
    if (status === base.status) return base;
    return { ...base, status };
  }, [selectedJobId, sortedJobs, focusClTrim]);

  useEffect(() => {
    setSignoffEditApprovalId('');
    setPostCompletionEditApprovalId('');
    setCompletionSourceMode('coil');
    setOffcutMetersProduced('');
  }, [selectedJob?.jobID]);

  const selectedJobAllocations = useMemo(
    () =>
      jobCoils
        .filter((row) => row.jobID === selectedJob?.jobID)
        .sort((a, b) => (a.sequenceNo || 0) - (b.sequenceNo || 0)),
    [jobCoils, selectedJob?.jobID]
  );
  /** Stable while server row *content* is unchanged — avoids re-seeding drafts when `ws` or array identity churns. */
  const selectedJobAllocationsSyncKey = useMemo(
    () =>
      selectedJobAllocations
        .map((row) =>
          [
            row.id,
            row.coilNo,
            row.openingWeightKg,
            row.closingWeightKg,
            row.metersProduced,
            row.sequenceNo,
            row.note,
            row.finishCoil,
          ].join(':')
        )
        .join('|'),
    [selectedJobAllocations]
  );
  const selectedChecks = useMemo(
    () => conversionChecks.filter((row) => row.jobID === selectedJob?.jobID),
    [conversionChecks, selectedJob?.jobID]
  );
  const checksPage = useAppTablePaging(selectedChecks, APP_DATA_TABLE_PAGE_SIZE, selectedJob?.jobID);
  const selectedJobAdjustments = useMemo(
    () => completionAdjustments.filter((a) => a.jobID === selectedJob?.jobID),
    [completionAdjustments, selectedJob?.jobID]
  );
  const jobProductAttrs = useMemo(() => {
    const p = products.find((x) => x.productID === selectedJob?.productID);
    return p?.dashboardAttrs ?? null;
  }, [products, selectedJob?.productID]);
  const linkedQuotation = useMemo(() => {
    const ref = String(selectedJob?.quotationRef || '').trim();
    if (!ref || !Array.isArray(ws?.snapshot?.quotations)) return null;
    return ws.snapshot.quotations.find((q) => q.id === ref) ?? null;
  }, [selectedJob?.quotationRef, ws?.snapshot?.quotations]);
  const isStoneMeterQuote = Boolean(
    linkedQuotation && String(linkedQuotation.materialTypeId || '').trim() === 'MAT-005'
  );
  const completionUsesOffcutMode = !isStoneMeterQuote && completionSourceMode === 'offcut';
  const jobSt = normalizeJobStatus(selectedJob?.status);
  /** Same gate as post-completion FG metre adjustments — not plain production.manage. */
  const canEditCompletedCoilCorrections =
    jobSt === 'Completed' &&
    !Boolean(viewOnly) &&
    !isStoneMeterQuote &&
    (Boolean(ws?.hasPermission?.('production.release')) || Boolean(ws?.hasPermission?.('operations.manage')));
  const readOnly =
    Boolean(viewOnly) ||
    jobSt === 'Cancelled' ||
    (jobSt === 'Completed' && !canEditCompletedCoilCorrections);
  const canEditPlannedAllocations = jobSt === 'Planned' && !readOnly;
  const canAddSupplementalCoil = jobSt === 'Running' && !readOnly && !isStoneMeterQuote;
  /** Planned / mid-run supplemental rows, or post-completion register correction (add missing roll). */
  const canAppendCoilRow =
    canEditPlannedAllocations ||
    canAddSupplementalCoil ||
    (canEditCompletedCoilCorrections && !isStoneMeterQuote);
  const canCaptureRun = jobSt === 'Running' && !readOnly;

  const quotationMaterialSpec = useMemo(
    () => buildExpectedCoilSpecFromQuotation(linkedQuotation, jobProductAttrs),
    [linkedQuotation, jobProductAttrs]
  );
  const plannedMetersValue = Number(selectedJob?.plannedMeters || 0);
  const coilByNo = useMemo(
    () => Object.fromEntries(coilLots.map((lot) => [lot.coilNo, lot])),
    [coilLots]
  );

  /** Opening kg already reserved for this job per coil (server state) — add back when showing kg free to allocate. */
  const savedOpeningKgByCoil = useMemo(() => {
    const m = new Map();
    for (const a of selectedJobAllocations) {
      const kg = Number(a.openingWeightKg);
      if (a.coilNo && Number.isFinite(kg) && kg > 0) m.set(a.coilNo, kg);
    }
    return m;
  }, [selectedJobAllocations]);

  const hasPersistedCoilAllocations = selectedJobAllocations.length > 0;

  const availableCoils = useMemo(() => {
    const selectedCoils = new Set(selectedJobAllocations.map((row) => row.coilNo));
    return coilLots
      .filter((coil) => {
        const rem = Number(coil.qtyRemaining ?? coil.currentWeightKg ?? 0);
        const empty = !Number.isFinite(rem) || rem <= 0.0001;
        if (empty && !selectedCoils.has(coil.coilNo)) return false;
        return coil.currentStatus !== 'Consumed' || selectedCoils.has(coil.coilNo);
      })
      .sort((a, b) => String(a.coilNo || '').localeCompare(String(b.coilNo || '')));
  }, [coilLots, selectedJobAllocations]);
  const masterDataForCoilSpec = ws?.snapshot?.masterData ?? null;

  const recommendedCoils = useMemo(() => {
    const filtered = availableCoils.filter((coil) =>
      coilMatchesQuotationSpec(coil, linkedQuotation, jobProductAttrs, masterDataForCoilSpec)
    );
    const planOk = Number.isFinite(plannedMetersValue) && plannedMetersValue > 0;
    if (!planOk) {
      return filtered.slice().sort((a, b) => String(a.coilNo || '').localeCompare(String(b.coilNo || '')));
    }
    return filtered.slice().sort((a, b) => {
      const addA = savedOpeningKgByCoil.get(a.coilNo) ?? 0;
      const addB = savedOpeningKgByCoil.get(b.coilNo) ?? 0;
      const freeA = Math.max(0, Number(a.qtyRemaining || 0) - Number(a.qtyReserved || 0) + addA);
      const freeB = Math.max(0, Number(b.qtyRemaining || 0) - Number(b.qtyReserved || 0) + addB);
      const estA = estimatedMetresFromFreeKg(a, freeA);
      const estB = estimatedMetresFromFreeKg(b, freeB);
      const skA = coilMetresPickSortKey(estA, plannedMetersValue);
      const skB = coilMetresPickSortKey(estB, plannedMetersValue);
      if (skA !== skB) return skA - skB;
      return String(a.coilNo || '').localeCompare(String(b.coilNo || ''));
    });
  }, [
    availableCoils,
    linkedQuotation,
    jobProductAttrs,
    masterDataForCoilSpec,
    plannedMetersValue,
    savedOpeningKgByCoil,
  ]);
  const recommendedCoilNoSet = useMemo(
    () => new Set(recommendedCoils.map((c) => c.coilNo)),
    [recommendedCoils]
  );
  const otherCoilsForSelect = useMemo(
    () => availableCoils.filter((c) => !recommendedCoilNoSet.has(c.coilNo)),
    [availableCoils, recommendedCoilNoSet]
  );

  const reservedKg = useMemo(
    () =>
      draftAllocations.reduce((sum, row) => {
        const opening = Number(row.openingWeightKg);
        return sum + (Number.isFinite(opening) ? opening : 0);
      }, 0),
    [draftAllocations]
  );
  const recordedMeters = useMemo(() => {
    if (isStoneMeterQuote && jobSt === 'Running') {
      const m = Number(String(stoneMetersConsumed).replace(/,/g, ''));
      return Number.isFinite(m) && m > 0 ? m : 0;
    }
    if (completionUsesOffcutMode && jobSt === 'Running') {
      const m = Number(String(offcutMetersProduced).replace(/,/g, ''));
      return Number.isFinite(m) && m >= 0 ? m : 0;
    }
    return draftAllocations.reduce((sum, row) => {
      const meters = Number(row.metersProduced);
      return sum + (Number.isFinite(meters) ? meters : 0);
    }, 0);
  }, [completionUsesOffcutMode, draftAllocations, isStoneMeterQuote, jobSt, offcutMetersProduced, stoneMetersConsumed]);
  const recordedConsumedKg = useMemo(
    () =>
      draftAllocations.reduce((sum, row) => {
        const opening = Number(row.openingWeightKg);
        const closing = Number(row.closingWeightKg);
        if (!Number.isFinite(opening) || !Number.isFinite(closing) || closing > opening) return sum;
        return sum + (opening - closing);
      }, 0),
    [draftAllocations]
  );

  const canRunConversionPreview = useMemo(() => {
    if (!selectedJob?.jobID) return false;
    if (isStoneMeterQuote) {
      const m = Number(String(stoneMetersConsumed).replace(/,/g, ''));
      if (!Number.isFinite(m) || m <= 0) return false;
      return jobSt === 'Running' || (jobSt === 'Completed' && canEditCompletedCoilCorrections);
    }
    if (completionUsesOffcutMode) {
      const m = Number(String(offcutMetersProduced).replace(/,/g, ''));
      if (!Number.isFinite(m) || m < 0) return false;
      return jobSt === 'Running';
    }
    const hasPreviewRows = draftAllocations.some((row) => draftRowConversionPreviewReady(row));
    if (!hasPreviewRows) return false;
    return jobSt === 'Running' || (jobSt === 'Completed' && canEditCompletedCoilCorrections);
  }, [
    canEditCompletedCoilCorrections,
    completionUsesOffcutMode,
    draftAllocations,
    isStoneMeterQuote,
    jobSt,
    offcutMetersProduced,
    selectedJob?.jobID,
    stoneMetersConsumed,
  ]);

  /** Persisted coil rows — can save closing / metres / note to server while the run is open. */
  const runLogSaveReady = useMemo(
    () =>
      Boolean(jobSt === 'Running' && !isStoneMeterQuote) &&
      draftAllocations.some((r) => !isDraftAllocationRow(r)),
    [draftAllocations, isStoneMeterQuote, jobSt]
  );

  const conversionPreviewTimerRef = useRef(null);
  const conversionPreviewSeqRef = useRef(0);
  /** When job/quote identity changes, accessory draft resets merge-from-prev; null = not yet tracked in this mount. */
  const accessoryDraftJobRef = useRef(null);
  const [conversionPreview, setConversionPreview] = useState(null);
  const [conversionPreviewError, setConversionPreviewError] = useState('');
  const [conversionPreviewLoading, setConversionPreviewLoading] = useState(false);

  useEffect(() => {
    if (focusClTrim) {
      const j = pickProductionJobForCuttingList(focusClTrim, productionJobs, cuttingLists);
      if (j) {
        if (selectedJobId !== j.jobID) setSelectedJobId(j.jobID);
      } else if (selectedJobId !== '') {
        setSelectedJobId('');
      }
      return;
    }
    if (!sortedJobs.length) {
      setSelectedJobId('');
      return;
    }
    if (!selectedJobId || !sortedJobs.some((job) => job.jobID === selectedJobId)) {
      setSelectedJobId(sortedJobs[0].jobID);
    }
  }, [selectedJobId, sortedJobs, focusClTrim, productionJobs, cuttingLists]);

  useEffect(() => {
    if (!selectedJob?.jobID) {
      setDraftAllocations([createDraftLine()]);
      return;
    }
    setDraftAllocations(
      selectedJobAllocations.length
        ? selectedJobAllocations.map((row) => createDraftLine(row))
        : [createDraftLine()]
    );
    // Intentionally omit selectedJobAllocations from deps: array identity churns on unrelated `ws` updates; syncKey captures server edits.
  }, [selectedJob?.jobID, selectedJobAllocationsSyncKey]);

  useEffect(() => {
    setSignoffRemark('');
    setReturnModalOpen(false);
    setReturnReason('');
    setCancelModalOpen(false);
    setCancelReason('');
    setFgAdjDelta('');
    setFgAdjNote('');
    setStoneMetersConsumed('');
    setStoneAllocAck(false);
  }, [selectedJob?.jobID]);

  const quotedAccessoryLines = useMemo(() => {
    const ref = selectedJob?.quotationRef;
    if (!ref || !Array.isArray(ws?.snapshot?.quotations)) return [];
    const q = ws.snapshot.quotations.find((x) => x.id === ref);
    const acc = q?.quotationLines?.accessories;
    if (!Array.isArray(acc)) return [];
    return acc
      .filter((r) => {
        const n = String(r?.name ?? '').trim();
        const qn = Number(String(r?.qty ?? '').replace(/,/g, '')) || 0;
        return n && qn > 0;
      })
      .map((r) => ({
        quoteLineId: String(r.id ?? '').trim(),
        name: String(r.name ?? '').trim(),
        ordered: Number(String(r.qty ?? '').replace(/,/g, '')) || 0,
      }));
  }, [selectedJob?.quotationRef, ws?.snapshot?.quotations]);

  const [accessoryCompletionDraft, setAccessoryCompletionDraft] = useState([]);

  useEffect(() => {
    const quotationRef = selectedJob?.quotationRef;
    const jobId = selectedJob?.jobID;
    if (!quotationRef || !jobId || !quotedAccessoryLines.length) {
      accessoryDraftJobRef.current = null;
      setAccessoryCompletionDraft([]);
      return;
    }
    const prevTracked = accessoryDraftJobRef.current;
    const jobSwitch =
      prevTracked != null &&
      (prevTracked.jobId !== jobId || prevTracked.quotationRef !== quotationRef);
    accessoryDraftJobRef.current = { jobId, quotationRef };

    const usage = (ws?.snapshot?.productionJobAccessoryUsage || []).filter((u) => u.quotationRef === quotationRef);
    const hasPostedAccessoryRowsForJob = usage.some((u) => u.jobID === jobId);

    setAccessoryCompletionDraft((prev) => {
      if (hasPostedAccessoryRowsForJob) {
        clearProdAccessoryDraftStorage(jobId);
      }
      const prevByKey = jobSwitch ? new Map() : new Map(prev.map((r) => [r.key, r]));
      const storedMap = hasPostedAccessoryRowsForJob ? {} : readProdAccessoryDraftMap(jobId);

      return quotedAccessoryLines.map((line) => {
        const stableKey = line.quoteLineId || `name:${line.name}`;
        let prior = 0;
        for (const u of usage) {
          if (u.jobID === jobId) continue;
          if (String(u.quoteLineId || '') === stableKey) prior += Number(u.suppliedQty) || 0;
        }
        const remaining = Math.max(0, line.ordered - prior);

        const postedRows = usage.filter((u) => {
          if (u.jobID !== jobId) return false;
          const uq = String(u.quoteLineId || '').trim();
          return uq === stableKey || (line.quoteLineId && uq === String(line.quoteLineId).trim());
        });
        const hasPostedForLine = postedRows.length > 0;
        const postedQty = hasPostedForLine
          ? postedRows.reduce((s, u) => s + (Number(u.suppliedQty) || 0), 0)
          : null;

        const old = prevByKey.get(stableKey);
        let suppliedThisJob = remaining;

        if (hasPostedForLine) {
          suppliedThisJob = postedQty ?? 0;
        } else if (old && !jobSwitch) {
          const raw = old.suppliedThisJob;
          const n = Number(String(raw).replace(/,/g, ''));
          if (Number.isFinite(n)) {
            suppliedThisJob = Math.min(Math.max(0, n), remaining);
          } else if (raw != null && String(raw).trim() !== '') {
            suppliedThisJob = raw;
          }
        } else {
          const storedRaw = storedMap[stableKey];
          if (storedRaw !== undefined && storedRaw !== null && String(storedRaw).trim() !== '') {
            const n = Number(String(storedRaw).replace(/,/g, ''));
            if (Number.isFinite(n)) {
              suppliedThisJob = Math.min(Math.max(0, n), remaining);
            } else {
              suppliedThisJob = storedRaw;
            }
          }
        }

        return {
          key: stableKey,
          quoteLineId: line.quoteLineId,
          name: line.name,
          ordered: line.ordered,
          priorSupplied: prior,
          suppliedThisJob,
        };
      });
    });
  }, [selectedJob?.jobID, selectedJob?.quotationRef, quotedAccessoryLines, ws?.snapshot?.productionJobAccessoryUsage]);

  const accessoriesSuppliedForApi = useMemo(
    () =>
      accessoryCompletionDraft.map((r) => ({
        quoteLineId: r.quoteLineId,
        name: r.name,
        suppliedQty: Number(String(r.suppliedThisJob).replace(/,/g, '')) || 0,
      })),
    [accessoryCompletionDraft]
  );
  const accessoryDraftPage = useAppTablePaging(
    accessoryCompletionDraft,
    APP_DATA_TABLE_PAGE_SIZE,
    selectedJob?.jobID
  );

  const conversionPreviewKey = useMemo(() => {
    if (!canRunConversionPreview || !selectedJob?.jobID) return '';
    if (isStoneMeterQuote) {
      return JSON.stringify({
        job: selectedJob.jobID,
        stone: true,
        stoneMetersConsumed: Number(String(stoneMetersConsumed).replace(/,/g, '')),
        accessoriesSupplied: accessoriesSuppliedForApi,
      });
    }
    if (completionUsesOffcutMode) {
      return JSON.stringify({
        job: selectedJob.jobID,
        offcut: true,
        offcutMetersProduced: Number(String(offcutMetersProduced).replace(/,/g, '')) || 0,
        accessoriesSupplied: accessoriesSuppliedForApi,
      });
    }
    const previewLines = draftAllocations
      .filter((row) => draftRowConversionPreviewReady(row))
      .map((row) => completionLineFromDraft(row));
    return JSON.stringify({
      job: selectedJob.jobID,
      lines: previewLines,
      accessoriesSupplied: accessoriesSuppliedForApi,
    });
  }, [
    accessoriesSuppliedForApi,
    canRunConversionPreview,
    completionUsesOffcutMode,
    draftAllocations,
    isStoneMeterQuote,
    offcutMetersProduced,
    selectedJob,
    stoneMetersConsumed,
  ]);

  useEffect(() => {
    if (conversionPreviewTimerRef.current) {
      clearTimeout(conversionPreviewTimerRef.current);
      conversionPreviewTimerRef.current = null;
    }
    if (!conversionPreviewKey || !selectedJob?.jobID) {
      conversionPreviewSeqRef.current += 1;
      setConversionPreview(null);
      setConversionPreviewError('');
      setConversionPreviewLoading(false);
      return;
    }
    setConversionPreviewLoading(true);
    setConversionPreviewError('');
    const seq = ++conversionPreviewSeqRef.current;
    conversionPreviewTimerRef.current = window.setTimeout(() => {
      conversionPreviewTimerRef.current = null;
      void (async () => {
        const parsed = JSON.parse(conversionPreviewKey);
        const previewPath = `/api/production-jobs/${encodeURIComponent(parsed.job)}/conversion-preview`;
        const previewBody = parsed.stone
          ? {
              stoneMetersConsumed: parsed.stoneMetersConsumed,
              accessoriesSupplied: parsed.accessoriesSupplied || [],
            }
          : parsed.offcut
            ? {
                completeMode: 'offcut',
                offcutMetersProduced: parsed.offcutMetersProduced,
                accessoriesSupplied: parsed.accessoriesSupplied || [],
              }
          : {
              allocations: parsed.lines,
              accessoriesSupplied: parsed.accessoriesSupplied || [],
            };
        const { ok, data } = await apiFetch(previewPath, {
          method: 'POST',
          body: JSON.stringify(previewBody),
        });
        if (seq !== conversionPreviewSeqRef.current) return;
        setConversionPreviewLoading(false);
        if (!ok || !data?.ok) {
          setConversionPreview(null);
          setConversionPreviewError(data?.error || 'Could not preview conversion.');
          return;
        }
        setConversionPreview(data);
        setConversionPreviewError('');
      })();
    }, 450);
    return () => {
      if (conversionPreviewTimerRef.current) {
        clearTimeout(conversionPreviewTimerRef.current);
        conversionPreviewTimerRef.current = null;
      }
    };
  }, [conversionPreviewKey, selectedJob?.jobID]);

  const completionValidation = useMemo(() => {
    if (completionUsesOffcutMode) {
      const rawMeters = String(offcutMetersProduced).trim();
      if (!rawMeters) {
        return { validLineCount: 1, errors: [], canComplete: true };
      }
      const m = Number(String(offcutMetersProduced).replace(/,/g, ''));
      if (!Number.isFinite(m) || m < 0) {
        return { validLineCount: 0, errors: ['Offcut produced metres must be zero or greater.'], canComplete: false };
      }
      return { validLineCount: 1, errors: [], canComplete: true };
    }
    if (isStoneMeterQuote) {
      const m = Number(String(stoneMetersConsumed).replace(/,/g, ''));
      if (!Number.isFinite(m) || m <= 0) {
        return { validLineCount: 0, errors: ['Enter stone metres consumed.'], canComplete: false };
      }
      return { validLineCount: 1, errors: [], canComplete: true };
    }
    const errors = [];
    const seenCoils = new Set();
    let validLineCount = 0;
    draftAllocations.forEach((row, idx) => {
      const label = `Line ${idx + 1}`;
      const coil = row.coilNo?.trim();
      const opening = Number(row.openingWeightKg);
      const closing = Number(row.closingWeightKg);
      const meters = Number(row.metersProduced);
      if (!coil && !row.openingWeightKg && !row.closingWeightKg && !row.metersProduced) return;
      if (!coil) errors.push(`${label}: select a coil.`);
      if (!Number.isFinite(opening) || opening <= 0) errors.push(`${label}: opening kg must be greater than 0.`);
      if (!Number.isFinite(closing) || closing < 0) errors.push(`${label}: closing kg is required.`);
      if (Number.isFinite(opening) && Number.isFinite(closing) && closing > opening) {
        errors.push(`${label}: closing kg cannot exceed opening kg.`);
      }
      if (!Number.isFinite(meters) || meters <= 0) errors.push(`${label}: meters produced must be greater than 0.`);
      if (coil) {
        if (seenCoils.has(coil)) errors.push(`${label}: duplicate coil ${coil}.`);
        seenCoils.add(coil);
      }
      if (
        coil &&
        Number.isFinite(opening) &&
        opening > 0 &&
        Number.isFinite(closing) &&
        closing >= 0 &&
        closing <= opening &&
        Number.isFinite(meters) &&
        meters > 0
      ) {
        validLineCount += 1;
      }
    });
    return { validLineCount, errors, canComplete: validLineCount > 0 && errors.length === 0 };
  }, [completionUsesOffcutMode, draftAllocations, isStoneMeterQuote, offcutMetersProduced, stoneMetersConsumed]);

  const appendSaveReady = useMemo(
    () =>
      draftAllocations.some(
        (r) => isDraftAllocationRow(r) && r.coilNo?.trim() && Number(r.openingWeightKg) > 0
      ),
    [draftAllocations]
  );
  const runningCheckpointSaveReady = useMemo(
    () => appendSaveReady || runLogSaveReady,
    [appendSaveReady, runLogSaveReady]
  );
  const completedCoilCorrectionSaveReady = useMemo(() => {
    if (!canEditCompletedCoilCorrections || draftAllocations.length === 0) return false;
    const persistedIds = new Set(
      selectedJobAllocations.map((a) => String(a.id ?? '').trim()).filter(Boolean)
    );
    const coveredIds = new Set(
      draftAllocations.filter((r) => !isDraftAllocationRow(r)).map((r) => String(r.id).trim())
    );
    if (persistedIds.size > 0 && ![...persistedIds].every((id) => coveredIds.has(id))) return false;
    return draftAllocations.every((r) => draftRowConversionPreviewReady(r));
  }, [canEditCompletedCoilCorrections, draftAllocations, selectedJobAllocations]);
  const plannedAllocSaveReady = useMemo(
    () =>
      isStoneMeterQuote ||
      completionUsesOffcutMode ||
      draftAllocations.some((r) => r.coilNo?.trim() && Number(r.openingWeightKg) > 0),
    [completionUsesOffcutMode, draftAllocations, isStoneMeterQuote]
  );
  const canManageConversionSignoff =
    Boolean(ws?.hasPermission?.('production.release')) ||
    Boolean(ws?.hasPermission?.('operations.manage')) ||
    Boolean(ws?.hasPermission?.('production.manage'));
  /** Undo “Start” — same broad gate as other production fixes (tighten in roles if needed). */
  const canReturnJobToPlanned =
    Boolean(ws?.hasPermission?.('production.release')) ||
    Boolean(ws?.hasPermission?.('operations.manage')) ||
    Boolean(ws?.hasPermission?.('production.manage'));
  /** Finished-goods metre corrections after completion — manager / release only (not plain production.manage). */
  const canPostFgCompletionAdjustment =
    Boolean(ws?.hasPermission?.('production.release')) || Boolean(ws?.hasPermission?.('operations.manage'));
  const hasPlannedMeters = Number.isFinite(plannedMetersValue) && plannedMetersValue > 0;
  const overProducedMeters =
    hasPlannedMeters && Number.isFinite(recordedMeters) ? recordedMeters - plannedMetersValue : 0;
  const requiresManagerOverrunApproval = overProducedMeters > 0.01;

  /** Unique rolls in the draft: summed est. metres from free kg (same coil on two rows counted once). */
  const allocationUniqueRollCapacityInsight = useMemo(() => {
    if (isStoneMeterQuote) return null;
    const seen = new Set();
    let sumEst = 0;
    let anyUnknown = false;
    for (const row of draftAllocations) {
      const cn = String(row.coilNo || '').trim();
      if (!cn || seen.has(cn)) continue;
      seen.add(cn);
      const lot = coilByNo[cn];
      if (!lot) {
        anyUnknown = true;
        continue;
      }
      const addBack = savedOpeningKgByCoil.get(cn) ?? 0;
      const freeKg = Math.max(0, Number(lot.qtyRemaining || 0) - Number(lot.qtyReserved || 0) + addBack);
      const est = estimatedMetresFromFreeKg(lot, freeKg);
      if (est == null) anyUnknown = true;
      else sumEst += est;
    }
    if (seen.size === 0) return { rollCount: 0, sumEst: null, anyUnknown: false };
    return {
      rollCount: seen.size,
      sumEst: sumEst > 0 ? sumEst : null,
      anyUnknown,
    };
  }, [isStoneMeterQuote, draftAllocations, coilByNo, savedOpeningKgByCoil]);

  const planProgressPct = useMemo(() => {
    if (!hasPlannedMeters) return null;
    const pct = (recordedMeters / plannedMetersValue) * 100;
    return Math.min(200, Math.round(pct * 10) / 10);
  }, [hasPlannedMeters, recordedMeters, plannedMetersValue]);

  const postedOutputM = Number(selectedJob?.actualMeters ?? 0);
  const fgAdjTotalM = Number(selectedJob?.fgAdjustmentMetersTotal ?? 0);
  const effectiveOutputM = Number(
    selectedJob?.effectiveOutputMeters ?? postedOutputM + fgAdjTotalM
  );

  const submitManagerSignoff = async () => {
    if (!selectedJob?.jobID) return;
    const remark = signoffRemark.trim();
    if (remark.length < 3) {
      showToast('Enter a sign-off remark (at least 3 characters).', { variant: 'error' });
      return;
    }
    if (!ws?.canMutate) {
      showToast('Reconnect to sign off — workspace is read-only.', { variant: 'error' });
      return;
    }
    /** Always use job-scoped URL — cutting-list routes require `production_registered` and can 404 on legacy rows. */
    const path = `/api/production-jobs/${encodeURIComponent(selectedJob.jobID)}/manager-review-signoff`;
    setSignoffSaving(true);
    try {
      const { ok, data } = await apiFetch(path, {
        method: 'PATCH',
        body: JSON.stringify({
          remark,
          ...(signoffEditApprovalId.trim() ? { editApprovalId: signoffEditApprovalId.trim() } : {}),
        }),
      });
      if (!ok || !data?.ok) {
        showToast(data?.error || `Could not record sign-off (${data?.code || 'request failed'}).`, {
          variant: 'error',
        });
        return;
      }
      await ws.refresh();
      showToast('Manager sign-off recorded.');
      setSignoffRemark('');
      setSignoffEditApprovalId('');
    } catch (e) {
      showToast(e?.message || 'Network error — could not reach server.', { variant: 'error' });
    } finally {
      setSignoffSaving(false);
    }
  };

  const submitCancelJob = async () => {
    if (!selectedJob?.jobID) return;
    const reason = cancelReason.trim();
    if (reason.length < 8) {
      showToast('Enter a reason (at least 8 characters) for the audit trail.', { variant: 'error' });
      return;
    }
    if (!ws?.canMutate) {
      showToast('Reconnect to apply changes — workspace is read-only.', { variant: 'error' });
      return;
    }
    const path = `/api/production-jobs/${encodeURIComponent(selectedJob.jobID)}/cancel`;
    setCancelSaving(true);
    try {
      const { ok, data } = await apiFetch(path, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      if (!ok || !data?.ok) {
        showToast(data?.error || 'Could not cancel this job.', { variant: 'error' });
        return;
      }
      setCancelModalOpen(false);
      setCancelReason('');
      await ws.refresh();
      showToast('Job cancelled — coil reservations released; cutting list set to Waiting.');
    } catch (e) {
      showToast(e?.message || 'Network error.', { variant: 'error' });
    } finally {
      setCancelSaving(false);
    }
  };

  const submitReturnToPlanned = async () => {
    if (!selectedJob?.jobID) return;
    const reason = returnReason.trim();
    if (reason.length < 8) {
      showToast('Enter a reason (at least 8 characters) for the audit trail.', { variant: 'error' });
      return;
    }
    if (!ws?.canMutate) {
      showToast('Reconnect to apply changes — workspace is read-only.', { variant: 'error' });
      return;
    }
    const path = `/api/production-jobs/${encodeURIComponent(selectedJob.jobID)}/return-to-planned`;
    setReturnSaving(true);
    try {
      const { ok, data } = await apiFetch(path, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      if (!ok || !data?.ok) {
        showToast(data?.error || 'Could not return job to plan.', { variant: 'error' });
        return;
      }
      setReturnModalOpen(false);
      setReturnReason('');
      await ws.refresh();
      showToast('Job returned to plan — you can fix coils and save allocation again.');
    } catch (e) {
      showToast(e?.message || 'Network error.', { variant: 'error' });
    } finally {
      setReturnSaving(false);
    }
  };

  const submitFgAdjustment = async () => {
    if (!selectedJob?.jobID) return;
    const delta = Number(String(fgAdjDelta).replace(/,/g, ''));
    const note = fgAdjNote.trim();
    if (!Number.isFinite(delta) || Math.abs(delta) < 1e-6) {
      showToast('Enter a non-zero adjustment in metres (use negative to reduce stock).', { variant: 'error' });
      return;
    }
    if (note.length < 12) {
      showToast('Enter a detailed note (at least 12 characters).', { variant: 'error' });
      return;
    }
    if (!ws?.canMutate) {
      showToast('Reconnect to apply changes — workspace is read-only.', { variant: 'error' });
      return;
    }
    const rk = ws?.session?.user?.roleKey;
    if (editMutationNeedsSecondApprovalRole(rk) && !postCompletionEditApprovalId.trim()) {
      showToast(
        'Finished-goods stock corrections after completion need an Edit OKs code — request approval, enter the 6-digit code, then post again.',
        { variant: 'error' }
      );
      return;
    }
    const okConfirm = window.confirm(
      `Post output-product stock correction of ${delta >= 0 ? '+' : ''}${delta.toFixed(2)} m to ${selectedJob.productID || 'SKU'}? This is logged and updates warehouse stock — it does not change the original completion record.`
    );
    if (!okConfirm) return;
    const path = `/api/production-jobs/${encodeURIComponent(selectedJob.jobID)}/completion-adjustments`;
    setFgAdjSaving(true);
    try {
      const { ok, data } = await apiFetch(path, {
        method: 'POST',
        body: JSON.stringify({
          deltaFinishedGoodsM: delta,
          note,
          ...(postCompletionEditApprovalId.trim() ? { editApprovalId: postCompletionEditApprovalId.trim() } : {}),
        }),
      });
      if (!ok || !data?.ok) {
        showToast(data?.error || 'Could not post adjustment.', { variant: 'error' });
        return;
      }
      setFgAdjDelta('');
      setFgAdjNote('');
      setPostCompletionEditApprovalId('');
      await ws.refresh();
      showToast(`Adjustment recorded. Stock now ~${Number(data.productStockMetersAfter).toFixed(2)} m for SKU.`);
    } catch (e) {
      showToast(e?.message || 'Network error.', { variant: 'error' });
    } finally {
      setFgAdjSaving(false);
    }
  };

  const updateDraftRow = (id, patch) => {
    setDraftAllocations((prev) => {
      if (Object.prototype.hasOwnProperty.call(patch, 'coilNo')) {
        const newCoil = String(patch.coilNo ?? '').trim();
        if (newCoil && prev.some((r) => r.id !== id && String(r.coilNo ?? '').trim() === newCoil)) {
          queueMicrotask(() =>
            showToast('That coil is already selected on another line. Pick a different coil.', { variant: 'error' })
          );
          return prev;
        }
      }
      return prev.map((row) => {
        if (row.id !== id) return row;
        const next = { ...row, ...patch };
        if (Object.prototype.hasOwnProperty.call(patch, 'closingWeightKg')) {
          const cl = Number(next.closingWeightKg);
          if (!Number.isFinite(cl) || cl < 0 || cl >= COIL_TAIL_FINISH_MAX_KG) {
            next.finishCoil = false;
          }
        }
        if (
          Object.prototype.hasOwnProperty.call(patch, 'coilNo') &&
          !Object.prototype.hasOwnProperty.call(patch, 'openingWeightKg')
        ) {
          const newCoil = String(patch.coilNo ?? '').trim();
          if (newCoil) {
            const lot = coilByNo[newCoil];
            if (lot) {
              const addBack = savedOpeningKgByCoil.get(newCoil) ?? 0;
              const free = Number(lot.qtyRemaining || 0) - Number(lot.qtyReserved || 0) + addBack;
              if (Number.isFinite(free) && free > 0) {
                const suggested = Math.max(1, Math.round(free * 0.995));
                next.openingWeightKg = String(suggested);
              }
            }
          }
        }
        return next;
      });
    });
  };

  const addDraftRow = () => {
    if (!canAppendCoilRow) return;
    setDraftAllocations((prev) => [...prev, createDraftLine()]);
  };

  const removeDraftRow = (id) => {
    const row = draftAllocations.find((r) => r.id === id);
    if (!row) return;
    if (canEditPlannedAllocations) {
      setDraftAllocations((prev) => (prev.length <= 1 ? [createDraftLine()] : prev.filter((r) => r.id !== id)));
      return;
    }
    if ((canAddSupplementalCoil || canEditCompletedCoilCorrections) && isDraftAllocationRow(row)) {
      setDraftAllocations((prev) => (prev.length <= 1 ? [createDraftLine()] : prev.filter((r) => r.id !== id)));
    }
  };

  const buildCompleteBody = () => {
    if (isStoneMeterQuote) {
      return {
        completedAtISO: new Date().toISOString().slice(0, 10),
        stoneMetersConsumed: Number(String(stoneMetersConsumed).replace(/,/g, '')),
        accessoriesSupplied: accessoriesSuppliedForApi,
        allocations: [],
      };
    }
    if (completionUsesOffcutMode) {
      const parsedMeters = Number(String(offcutMetersProduced).replace(/,/g, ''));
      return {
        completedAtISO: new Date().toISOString().slice(0, 10),
        completeMode: 'offcut',
        offcutMetersProduced: Number.isFinite(parsedMeters) && parsedMeters >= 0 ? parsedMeters : 0,
        accessoriesSupplied: accessoriesSuppliedForApi,
        allocations: [],
      };
    }
    return {
      completedAtISO: new Date().toISOString().slice(0, 10),
      allocations: draftAllocations.map((row) => completionLineFromDraft(row)),
      accessoriesSupplied: accessoriesSuppliedForApi,
    };
  };

  const persist = async (type) => {
    if (!selectedJob?.jobID) return;
    if (!ws?.canMutate) {
      showToast(
        ws?.usingCachedData
          ? 'Read-only workspace — reconnect to save production changes.'
          : 'Start the API server to use live production traceability.',
        { variant: 'error' }
      );
      return;
    }
    const jobApi = `/api/production-jobs/${encodeURIComponent(selectedJob.jobID)}`;
    const listLabel = selectedJob.cuttingListId || selectedJob.jobID;
    setSavingAction(type);
    let path = '';
    let body = {};
    const alsoStartAfterAlloc = type === 'allocationsAndStart';

    if (type === 'completedCoilCorrection') {
      if (!completedCoilCorrectionSaveReady) {
        setSavingAction('');
        showToast(
          'Complete every coil row (opening, closing, metres), remove empty “add coil” rows, and keep all original lines before saving a correction.',
          { variant: 'info' }
        );
        return;
      }
      const reason = window.prompt(
        'Reason for correcting this completed job (at least 12 characters — audited like other completion fixes):'
      );
      if (!reason || reason.trim().length < 12) {
        setSavingAction('');
        showToast('Correction requires a reason of at least 12 characters.', { variant: 'error' });
        return;
      }
      const rk = ws?.session?.user?.roleKey;
      if (editMutationNeedsSecondApprovalRole(rk) && !postCompletionEditApprovalId.trim()) {
        setSavingAction('');
        showToast(
          'After completion, coil-line corrections need an Edit OKs code — request approval, enter the 6-digit code, then save again.',
          { variant: 'error' }
        );
        return;
      }
      try {
        const buildBody = (withAck) => ({
          reason: reason.trim(),
          readings: draftAllocations
            .filter((r) => draftRowConversionPreviewReady(r))
            .map((row) => ({
              allocationId: isDraftAllocationRow(row) ? '' : row.id,
              coilNo: String(row.coilNo ?? '').trim(),
              openingWeightKg: Number(String(row.openingWeightKg).replace(/,/g, '')) || 0,
              closingWeightKg: Number(String(row.closingWeightKg).replace(/,/g, '')) || 0,
              metersProduced: Number(String(row.metersProduced).replace(/,/g, '')) || 0,
              note: String(row.note ?? '').trim(),
              ...(withAck ? { specMismatchAcknowledged: true } : {}),
            })),
          ...(postCompletionEditApprovalId.trim() ? { editApprovalId: postCompletionEditApprovalId.trim() } : {}),
        });
        let res = await apiFetch(`${jobApi}/completion-coil-corrections`, {
          method: 'POST',
          body: JSON.stringify(buildBody(false)),
        });
        if (!res.ok && res.data?.code === 'PRODUCTION_SPEC_MISMATCH') {
          const detail = (res.data.mismatches || [])
            .map((m) => `${m.coilNo}: ${m.detail}`)
            .join('\n');
          const go = window.confirm(
            `These coils do not match the quotation material specification (gauge / colour / material):\n\n${detail}\n\nSave anyway and flag the branch manager for review?`
          );
          if (go) {
            res = await apiFetch(`${jobApi}/completion-coil-corrections`, {
              method: 'POST',
              body: JSON.stringify(buildBody(true)),
            });
          }
        }
        if (!res.ok || !res.data?.ok) {
          setSavingAction('');
          showToast(res.data?.error || 'Could not apply correction.', { variant: 'error' });
          await ws.refresh();
          return;
        }
        await ws.refresh();
        setSavingAction('');
        setPostCompletionEditApprovalId('');
        showToast('Completed job coil correction saved.');
      } catch (e) {
        setSavingAction('');
        showToast(e?.message || 'Save failed.', { variant: 'error' });
      }
      return;
    }

    if (type === 'runningCheckpoint') {
      if (!runningCheckpointSaveReady) {
        setSavingAction('');
        showToast('Nothing to save — add a new coil line or edit a saved coil first.', { variant: 'info' });
        return;
      }
      try {
        if (runLogSaveReady && !isStoneMeterQuote) {
          const buildRunLog = (withAck) => ({
            readings: draftAllocations
              .filter((r) => !isDraftAllocationRow(r))
              .map((row) => ({
                allocationId: row.id,
                coilNo: String(row.coilNo ?? '').trim(),
                openingWeightKg: Number(String(row.openingWeightKg).replace(/,/g, '')) || 0,
                closingWeightKg: Number(String(row.closingWeightKg).replace(/,/g, '')) || 0,
                metersProduced: Number(String(row.metersProduced).replace(/,/g, '')) || 0,
                note: String(row.note ?? '').trim(),
                ...(withAck ? { specMismatchAcknowledged: true } : {}),
              })),
          });
          let resRl = await apiFetch(`${jobApi}/coil-run-log`, {
            method: 'POST',
            body: JSON.stringify(buildRunLog(false)),
          });
          if (!resRl.ok && resRl.data?.code === 'PRODUCTION_SPEC_MISMATCH') {
            const detail = (resRl.data.mismatches || [])
              .map((m) => `${m.coilNo}: ${m.detail}`)
              .join('\n');
            const go = window.confirm(
              `These coils do not match the quotation material specification (gauge / colour / material):\n\n${detail}\n\nSave anyway and flag the branch manager for review?`
            );
            if (go) {
              resRl = await apiFetch(`${jobApi}/coil-run-log`, {
                method: 'POST',
                body: JSON.stringify(buildRunLog(true)),
              });
            }
          }
          if (!resRl.ok || !resRl.data?.ok) {
            setSavingAction('');
            showToast(resRl.data?.error || 'Could not save run log.', { variant: 'error' });
            await ws.refresh();
            return;
          }
        }
        if (appendSaveReady && !isStoneMeterQuote && selectedJob.status === 'Running') {
          const pathAlloc = `${jobApi}/allocations`;
          const buildRunAppend = (withAck) => {
            const toAppend = draftAllocations.filter(
              (row) => isDraftAllocationRow(row) && row.coilNo?.trim() && Number(row.openingWeightKg) > 0
            );
            if (!toAppend.length) return null;
            return {
              append: true,
              allocations: toAppend.map((row) => ({
                coilNo: row.coilNo.trim(),
                openingWeightKg: Number(row.openingWeightKg),
                note: row.note.trim(),
                ...(withAck ? { specMismatchAcknowledged: true } : {}),
              })),
            };
          };
          const firstAppend = buildRunAppend(false);
          if (firstAppend) {
            let resA = await apiFetch(pathAlloc, { method: 'POST', body: JSON.stringify(firstAppend) });
            if (!resA.ok && resA.data?.code === 'PRODUCTION_SPEC_MISMATCH') {
              const detail = (resA.data.mismatches || [])
                .map((m) => `${m.coilNo}: ${m.detail}`)
                .join('\n');
              const go = window.confirm(
                `These coils do not match the quotation material specification (gauge / colour / material):\n\n${detail}\n\nSave anyway and flag the branch manager for review?`
              );
              if (go) {
                const second = buildRunAppend(true);
                if (second) resA = await apiFetch(pathAlloc, { method: 'POST', body: JSON.stringify(second) });
              }
            }
            if (!resA.ok || !resA.data?.ok) {
              setSavingAction('');
              showToast(resA.data?.error || 'Could not save new coil.', { variant: 'error' });
              await ws.refresh();
              return;
            }
          }
        }
        await ws.refresh();
        setSavingAction('');
        showToast('Saved.');
      } catch (e) {
        setSavingAction('');
        showToast(e?.message || 'Save failed.', { variant: 'error' });
      }
      return;
    }

    if (type === 'allocations' || type === 'allocationsAndStart') {
      path = `${jobApi}/allocations`;
      if (isStoneMeterQuote && selectedJob.status === 'Planned') {
        const res = await apiFetch(path, { method: 'POST', body: JSON.stringify({ allocations: [] }) });
        if (!res.ok || !res.data?.ok) {
          setSavingAction('');
          showToast(res.data?.error || 'Could not save stone job allocation.', { variant: 'error' });
          return;
        }
        await ws.refresh();
        const startRes = await apiFetch(`${jobApi}/start`, {
          method: 'POST',
          body: JSON.stringify({ startedAtISO: new Date().toISOString().slice(0, 10) }),
        });
        setSavingAction('');
        if (!startRes.ok || !startRes.data?.ok) {
          showToast(
            startRes.data?.error ||
              'Stone step saved, but production could not be started (e.g. price-list approval). Fix the issue, then use Save & start again.',
            { variant: 'error' }
          );
          await ws.refresh();
          return;
        }
        setStoneAllocAck(true);
        await ws.refresh();
        showToast(`Stone-coated job saved and production started for ${listLabel}.`);
        return;
      }
      if (completionUsesOffcutMode && selectedJob.status === 'Planned') {
        const startRes = await apiFetch(`${jobApi}/start`, {
          method: 'POST',
          body: JSON.stringify({ startedAtISO: new Date().toISOString().slice(0, 10), startMode: 'offcut' }),
        });
        setSavingAction('');
        if (!startRes.ok || !startRes.data?.ok) {
          showToast(
            startRes.data?.error ||
              'Could not start offcut/accessories run (e.g. price-list approval). Fix the issue, then use Save & start again.',
            { variant: 'error' }
          );
          await ws.refresh();
          return;
        }
        await ws.refresh();
        showToast(`Offcut/accessories run started for ${listLabel}.`);
        return;
      }
      const buildAllocBody = (withAck) => {
        if (selectedJob.status === 'Running') {
          const toAppend = draftAllocations.filter(
            (row) => isDraftAllocationRow(row) && row.coilNo?.trim() && Number(row.openingWeightKg) > 0
          );
          if (!toAppend.length) return null;
          return {
            append: true,
            allocations: toAppend.map((row) => ({
              coilNo: row.coilNo.trim(),
              openingWeightKg: Number(row.openingWeightKg),
              note: row.note.trim(),
              ...(withAck ? { specMismatchAcknowledged: true } : {}),
            })),
          };
        }
        const allocations = draftAllocations
          .map((row) => ({
            coilNo: row.coilNo.trim(),
            openingWeightKg: Number(row.openingWeightKg),
            note: row.note.trim(),
            ...(withAck ? { specMismatchAcknowledged: true } : {}),
          }))
          .filter((row) => row.coilNo && row.openingWeightKg > 0);
        if (!allocations.length) return null;
        return { allocations };
      };
      const firstBody = buildAllocBody(false);
      if (!firstBody) {
        showToast(
          selectedJob.status === 'Running'
            ? 'Add a new coil row with opening kg, then save to attach it to this run.'
            : 'Add at least one coil with opening kg before saving.',
          { variant: 'info' }
        );
        setSavingAction('');
        return;
      }
      let res = await apiFetch(path, { method: 'POST', body: JSON.stringify(firstBody) });
      if (!res.ok && res.data?.code === 'PRODUCTION_SPEC_MISMATCH') {
        const detail = (res.data.mismatches || [])
          .map((m) => `${m.coilNo}: ${m.detail}`)
          .join('\n');
        const go = window.confirm(
          `These coils do not match the quotation material specification (gauge / colour / material):\n\n${detail}\n\nSave anyway and flag the branch manager for review${
            alsoStartAfterAlloc ? ', then start production' : ''
          }?`
        );
        if (go) {
          const second = buildAllocBody(true);
          if (second) res = await apiFetch(path, { method: 'POST', body: JSON.stringify(second) });
        }
      }
      if (!res.ok || !res.data?.ok) {
        setSavingAction('');
        showToast(res.data?.error || 'Could not update production.', { variant: 'error' });
        return;
      }
      await ws.refresh();
      if (alsoStartAfterAlloc && selectedJob.status === 'Planned') {
        const startRes = await apiFetch(`${jobApi}/start`, {
          method: 'POST',
          body: JSON.stringify({ startedAtISO: new Date().toISOString().slice(0, 10) }),
        });
        setSavingAction('');
        if (!startRes.ok || !startRes.data?.ok) {
          let msg =
            startRes.data?.error ||
            'Coils saved, but production could not be started (e.g. price-list MD approval). Fix the issue, then use Save & start again.';
          if (
            startRes.data?.code === 'PRICE_LIST_MD_APPROVAL_REQUIRED' &&
            Array.isArray(startRes.data?.violations) &&
            startRes.data.violations.length
          ) {
            const detail = startRes.data.violations
              .map(
                (v) =>
                  `${v.lineCategory || 'line'} #${Number(v.lineIndex) + 1} (${v.code}): quoted ₦${v.quotedPerMeter}/m < min ₦${v.minAllowedPerMeter ?? v.floorPerMeter}/m`
              )
              .join(' · ');
            msg = `${msg} — ${detail}`;
          }
          showToast(msg, { variant: 'error' });
          await ws.refresh();
          return;
        }
        await ws.refresh();
        showToast(`Coils saved and production started for ${listLabel}.`);
        return;
      }
      setSavingAction('');
      showToast(
        selectedJob.status === 'Running'
          ? `Supplemental coil(s) saved on ${listLabel}.`
          : `Coil allocation saved for ${listLabel}.`
      );
      return;
    } else if (type === 'start') {
      path = `${jobApi}/start`;
      body = { startedAtISO: new Date().toISOString().slice(0, 10) };
    } else {
      if (!completionValidation.canComplete) {
        showToast(
          completionValidation.errors[0] ||
            'Complete run log fields (coil, opening, closing, meters) before completion.',
          { variant: 'error' }
        );
        setSavingAction('');
        return;
      }
      if (requiresManagerOverrunApproval) {
        if (!canManageConversionSignoff) {
          showToast(
            `Recorded metres (${recordedMeters.toFixed(2)}m) exceed planned (${plannedMetersValue.toFixed(2)}m). Seek manager approval to complete.`,
            { variant: 'error' }
          );
          setSavingAction('');
          return;
        }
        const remark = signoffRemark.trim();
        if (remark.length < 3) {
          showToast('Manager approval remark is required for meter overrun (at least 3 characters).', {
            variant: 'error',
          });
          setSavingAction('');
          return;
        }
        const proceedOverrun = window.confirm(
          `Metres recorded exceed plan by ${overProducedMeters.toFixed(2)}m. Continue as manager-approved overrun?`
        );
        if (!proceedOverrun) {
          setSavingAction('');
          return;
        }
      }
      const completeBody = buildCompleteBody();
      const previewUrl = `${jobApi}/conversion-preview`;
      const prev = await apiFetch(previewUrl, {
        method: 'POST',
        body: JSON.stringify(completeBody),
      });
      if (prev.ok && prev.data?.ok && prev.data.managerReviewRequired) {
        const proceed = window.confirm(
          'This completion will flag manager review (conversion outside expected bands versus multiple references). Post anyway?'
        );
        if (!proceed) {
          setSavingAction('');
          setConversionPreview(prev.data);
          return;
        }
      }
      if (
        prev.ok &&
        prev.data?.ok &&
        Array.isArray(prev.data.accessoryStockWarnings) &&
        prev.data.accessoryStockWarnings.length
      ) {
        const w = prev.data.accessoryStockWarnings.join('\n');
        const proceedAcc = window.confirm(
          `On-hand accessory stock is less than the quantities entered. Balances can go negative.\n\n${w}\n\nComplete production anyway?`
        );
        if (!proceedAcc) {
          setSavingAction('');
          setConversionPreview(prev.data);
          return;
        }
      }
      path = `${jobApi}/complete`;
      body = completeBody;
    }
    const { ok, data } = await apiFetch(path, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    setSavingAction('');
    if (!ok || !data?.ok) {
      showToast(data?.error || 'Could not update production.', { variant: 'error' });
      return;
    }
    await ws.refresh();
    if (type === 'start') {
      showToast(`Production started for ${listLabel}.`);
    } else {
      setConversionPreview(null);
      if (type === 'complete') {
        setSignoffRemark('');
        const accW = Array.isArray(data.accessoryStockWarnings) ? data.accessoryStockWarnings : [];
        if (data.managerReviewRequired) {
          showToast(`Production completed — manager review required (${data.alertState || 'alert'}).`, {
            variant: 'error',
          });
        } else if (data.alertState && data.alertState !== 'OK') {
          showToast(`Production completed — conversion ${String(data.alertState).toLowerCase()} band.`, {
            variant: 'warning',
          });
        } else if (accW.length) {
          showToast(
            `Production completed for ${listLabel}. Accessory stock note: ${accW.join(' ')}`,
            { variant: 'warning' }
          );
        } else {
          showToast(`Production completed for ${listLabel}.`);
        }
      }
    }
  };

  if (!ws?.hasWorkspaceData) {
    return (
      <div className="mb-8 rounded-zarewa border border-dashed border-slate-200 bg-slate-50/70 px-5 py-6 text-sm text-slate-500">
        Live production traceability appears after you sign in with a reachable server.
      </div>
    );
  }

  if (!selectedJob) {
    const missing = focusClTrim || null;
    return (
      <div
        className={`${
          inModal ? 'mb-0' : 'mb-8'
        } rounded-lg border border-dashed border-slate-200 bg-slate-50/70 px-3 py-4 text-xs text-slate-500`}
      >
        {missing ? (
          <>
            Cutting list <span className="font-mono font-bold text-slate-700">{missing}</span> is not registered for
            production or data is still syncing. Close and pick another row, or refresh the workspace.
          </>
        ) : (
          <>
            No cutting lists on the production queue yet. In Sales, open a cutting list and use{" "}
            <strong className="font-semibold text-slate-600">Send to production line</strong> after the quote is paid
            enough to qualify.
          </>
        )}
        <div className="mt-2">
          <button type="button" className="z-btn-secondary" onClick={() => void ws?.refresh?.()}>
            Refresh workspace
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={
        inModal
          ? 'mb-0 flex h-full min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-hidden bg-transparent'
          : 'mb-6 rounded-2xl border border-slate-200/90 bg-gradient-to-b from-slate-50/90 to-white shadow-md ring-1 ring-slate-900/[0.04]'
      }
    >
      {/* Header: title + help (actions in footer when inModal) */}
      <div
        className={`shrink-0 border-b border-slate-200/80 bg-gradient-to-r from-white via-teal-50/25 to-white ${
          inModal ? 'px-2.5 py-2 sm:px-3' : 'px-3 py-2 sm:px-4'
        }`}
      >
        <div
          className={`flex items-start gap-2 ${
            inModal ? 'justify-between' : 'flex-col gap-2 lg:flex-row lg:items-center lg:justify-between'
          }`}
        >
          <div className="flex min-w-0 flex-1 items-start gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#134e4a] to-teal-700 text-white shadow-sm">
              <Gauge size={18} strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <h3 className="text-sm font-bold tracking-tight text-slate-900">
                  {inModal
                    ? readOnly
                      ? 'Production record (completed)'
                      : 'Production register'
                    : 'Production record'}
                </h3>
                <details className="relative shrink-0">
                  <summary
                    className="list-none cursor-pointer rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#134e4a]/25 [&::-webkit-details-marker]:hidden"
                    aria-label="Production workflow tips and stock behaviour"
                  >
                    <Info className="size-3.5" strokeWidth={2.25} aria-hidden />
                  </summary>
                  <div
                    role="note"
                    className="absolute left-0 top-full z-30 mt-1.5 w-[min(calc(100vw-2rem),22rem)] rounded-lg border border-slate-200 bg-white p-2.5 text-[10px] leading-snug text-slate-700 shadow-lg ring-1 ring-black/5 sm:left-auto sm:right-0"
                  >
                    <p>
                      Mistakes before start: use Save &amp; start again with the corrected coils. Wrong coil after start:
                      Return to plan (reason required). Order cancelled: Cancel job (releases reservations, audit reason).
                      After completion:
                      record stays; wrong output metres in stock use manager stock correction. Conversion alerts:
                      manager sign-off.
                    </p>
                    <p className="mt-2 border-t border-slate-100 pt-2">
                      <strong className="font-semibold text-slate-800">Changing coils:</strong> while{' '}
                      <strong className="font-semibold">Planned</strong>, pick coils and opening kg, then{' '}
                      <strong className="font-semibold">Save &amp; start</strong> — the server stores the plan and moves
                      the job to <strong className="font-semibold">Running</strong> in one step (each save replaces the
                      whole allocation set). After the job is running, use <strong className="font-semibold">Return to plan</strong>{' '}
                      (reason) to edit primary coils, or <strong className="font-semibold">Save</strong> to add another roll
                      or persist closing kg / metres between visits. Completed run logs are locked; wrong metres on the FG SKU use{' '}
                      <strong className="font-semibold">Post stock correction</strong> (manager). High conversion: review
                      checks, then <strong className="font-semibold">Record manager sign-off</strong> — that does not
                      rewrite coil readings; contact support for rare posted-coil corrections.
                    </p>
                    <p className="mt-2 border-t border-slate-100 pt-2">
                      {selectedJob.status === 'Cancelled' ? (
                        <>
                          <strong className="font-semibold text-slate-800">Cancelled:</strong> reservations were released
                          when the job was cancelled; no output was posted from this run.
                        </>
                      ) : (
                        <>
                          <strong className="font-semibold text-slate-800">Stock logic:</strong> reserved kg stays on
                          the coil until you complete; only consumed kg is deducted. One coil can back several jobs.
                        </>
                      )}
                    </p>
                  </div>
                </details>
              </div>
              {inModal && focusClTrim ? (
                <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                  <span className="font-mono font-semibold text-slate-700">{focusClTrim}</span>
                  <span
                    className={`rounded-md border border-black/5 px-1.5 py-0.5 text-[8px] font-bold uppercase shadow-sm ${statusTone(selectedJob.status)}`}
                  >
                    {selectedJob.status}
                  </span>
                  {selectedJob.quotationRef ? (
                    <span className="inline-flex items-center rounded-md border border-slate-200/80 bg-white/90 px-1.5 py-0.5 text-[8px] font-semibold text-slate-700 shadow-sm">
                      Quote{' '}
                      <span className="ml-0.5 font-mono text-[#134e4a]">{selectedJob.quotationRef}</span>
                    </span>
                  ) : null}
                  <span className="inline-flex items-center rounded-md border border-slate-200/80 bg-white/90 px-1.5 py-0.5 text-[8px] font-semibold text-slate-700 shadow-sm">
                    {selectedJob.machineName || 'Line'}
                  </span>
                  {readOnly ? <span className="text-slate-400">· read-only</span> : null}
                </div>
              ) : null}
            </div>
          </div>
          {inModal && typeof onModalClose === 'function' && showModalCloseButton !== false ? (
            <button
              type="button"
              onClick={onModalClose}
              className="inline-flex shrink-0 items-center justify-center rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#134e4a]/25"
              aria-label="Close"
            >
              <X size={20} strokeWidth={2} aria-hidden />
            </button>
          ) : null}
          {!inModal ? (
            <div className="flex flex-wrap items-stretch gap-1.5 lg:justify-end">
              {readOnly ? (
                <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-600">
                  View only
                </span>
              ) : (
                <div className="flex flex-wrap gap-1 rounded-lg border border-slate-200/80 bg-white p-0.5">
                  {selectedJob.status === 'Planned' ? (
                    <button
                      type="button"
                      onClick={() => void persist('allocationsAndStart')}
                      disabled={savingAction !== '' || !canEditPlannedAllocations || !plannedAllocSaveReady}
                      title="Writes coil allocation to the server and starts the run in one step."
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold transition-colors disabled:opacity-45 ${
                        savingAction === 'allocationsAndStart'
                          ? 'bg-sky-100 text-sky-800'
                          : 'bg-sky-600 text-white hover:bg-sky-700'
                      }`}
                    >
                      <Save size={14} />
                      <Play size={13} />
                      {savingAction === 'allocationsAndStart' ? 'Saving & starting…' : 'Save & start'}
                    </button>
                  ) : null}
                  {selectedJob.status === 'Running' && !isStoneMeterQuote && !completionUsesOffcutMode ? (
                    <button
                      type="button"
                      onClick={() => void persist('runningCheckpoint')}
                      disabled={savingAction !== '' || !canCaptureRun || !runningCheckpointSaveReady}
                      title="Save new coil lines and/or closing kg, metres, and notes (safe on phone — refresh without losing draft)."
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold transition-colors disabled:opacity-45 ${
                        savingAction === 'runningCheckpoint'
                          ? 'bg-slate-100 text-slate-500'
                          : 'bg-slate-800 text-white hover:bg-slate-900'
                      }`}
                    >
                      <Save size={15} />
                      {savingAction === 'runningCheckpoint' ? 'Saving…' : 'Save'}
                    </button>
                  ) : null}
                  {selectedJob.status === 'Completed' && canEditCompletedCoilCorrections ? (
                    <button
                      type="button"
                      onClick={() => void persist('completedCoilCorrection')}
                      disabled={savingAction !== '' || !completedCoilCorrectionSaveReady}
                      title="Correct coil, opening/closing kg, or metres after completion. Requires a 12+ character reason. Adjusts stock; does not reverse posted GL automatically."
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold transition-colors disabled:opacity-45 ${
                        savingAction === 'completedCoilCorrection'
                          ? 'bg-amber-100 text-amber-900'
                          : 'border border-amber-400 bg-amber-50 text-amber-950 hover:bg-amber-100'
                      }`}
                    >
                      <Save size={15} />
                      {savingAction === 'completedCoilCorrection' ? 'Saving…' : 'Save correction'}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void persist('complete')}
                    disabled={!canCaptureRun || savingAction !== '' || !completionValidation.canComplete}
                    title={
                      completionValidation.canComplete
                        ? undefined
                        : completionValidation.errors[0] || 'Complete all run-log fields before completion.'
                    }
                    className="inline-flex items-center gap-1 rounded-md bg-[#134e4a] px-2 py-1 text-[11px] font-semibold text-white hover:bg-[#0f3d39] disabled:opacity-45"
                  >
                    <CheckCircle2 size={13} />
                    {savingAction === 'complete' ? 'Completing…' : 'Complete'}
                  </button>
                  {selectedJob.status === 'Running' && canReturnJobToPlanned ? (
                    <button
                      type="button"
                      onClick={() => setReturnModalOpen(true)}
                      disabled={savingAction !== '' || returnSaving}
                      title="Undo Start: go back to Planned so you can change coil allocation (audit reason required)."
                      className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-950 hover:bg-amber-100 disabled:opacity-45"
                    >
                      <Undo2 size={13} />
                      Return to plan
                    </button>
                  ) : null}
                  {selectedJob.status === 'Planned' || selectedJob.status === 'Running' ? (
                    <button
                      type="button"
                      onClick={() => setCancelModalOpen(true)}
                      disabled={savingAction !== '' || cancelSaving || returnSaving}
                      title="Cancel this job: releases coil reservations and marks production cancelled (order cancellation / refund path)."
                      className="inline-flex items-center gap-1 rounded-md border border-rose-300 bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-950 hover:bg-rose-100 disabled:opacity-45"
                    >
                      <Ban size={13} />
                      Cancel job
                    </button>
                  ) : null}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>

      <div
        className={
          inModal
            ? 'min-h-0 flex-1 touch-pan-y overflow-y-auto overflow-x-hidden overscroll-y-contain'
            : ''
        }
      >
      {inModal && !readOnly ? (
        <details className="group border-b border-slate-100 bg-slate-50/80 [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-2 py-2 text-[10px] font-bold text-slate-600 sm:min-h-0 sm:px-2.5 sm:py-1.5">
            <span className="inline-flex items-center gap-1.5">
              <ClipboardList size={14} className="shrink-0 text-slate-500" aria-hidden />
              Status, tips &amp; validation
            </span>
            <ChevronDown
              size={14}
              className="shrink-0 text-slate-400 transition-transform group-open:rotate-180"
              aria-hidden
            />
          </summary>
          <div className="flex flex-wrap gap-1 px-2 pb-1.5 pt-0 sm:px-2.5">
            {canEditPlannedAllocations && !hasPersistedCoilAllocations && !isStoneMeterQuote ? (
              <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-950">
                <AlertTriangle size={14} className="shrink-0" />
                Save coil + opening kg, then Save &amp; start.
              </span>
            ) : null}
            {canEditPlannedAllocations && isStoneMeterQuote && !stoneAllocAck ? (
              <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-950">
                <AlertTriangle size={14} className="shrink-0" />
                Stone: Save &amp; start (no coils) to begin.
              </span>
            ) : null}
            {canAddSupplementalCoil ? (
              <span className="inline-flex items-center gap-1 rounded-md border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] text-sky-950">
                <Plus size={14} className="shrink-0" />
                Mid-run: <strong className="font-semibold">Add coil</strong> if one roll is not enough.
              </span>
            ) : null}
            {canEditCompletedCoilCorrections ? (
              <span className="inline-flex items-center gap-1 rounded-md border border-teal-200 bg-teal-50 px-2 py-0.5 text-[10px] text-teal-950">
                <Plus size={14} className="shrink-0" />
                Completed correction: <strong className="font-semibold">Add coil</strong> if a roll was left off the register.
              </span>
            ) : null}
            {selectedJob?.coilSpecMismatchPending ? (
              <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-950">
                <AlertTriangle size={14} className="shrink-0" />
                Spec exception — manager flag active.
              </span>
            ) : null}
            {canCaptureRun && !completionValidation.canComplete ? (
              <span className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-900">
                <AlertTriangle size={14} className="shrink-0" />
                {completionValidation.errors[0] || 'Complete all coil rows to finish.'}
              </span>
            ) : null}
            {canCaptureRun && requiresManagerOverrunApproval ? (
              <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] text-amber-950">
                <BarChart3 size={14} className="shrink-0" />
                +{overProducedMeters.toFixed(2)}m over plan — manager remark to complete.
              </span>
            ) : null}
            {!readOnly &&
            canCaptureRun &&
            completionValidation.canComplete &&
            !requiresManagerOverrunApproval &&
            hasPlannedMeters ? (
              <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-900">
                <Sparkles size={14} className="shrink-0" />
                {planProgressPct != null
                  ? `${planProgressPct}% of plan logged — preview updates as you type.`
                  : 'Ready to preview conversion when inputs are valid.'}
              </span>
            ) : null}
          </div>
        </details>
      ) : (
        <div className={`border-b border-slate-100 bg-slate-50/70 ${inModal ? 'px-2 py-0.5 sm:px-2.5' : 'px-2 py-1 sm:px-3'}`}>
          <div className={`flex flex-wrap ${inModal ? 'gap-1' : 'gap-1.5'}`}>
            {readOnly && jobSt === 'Cancelled' ? (
              <span className="inline-flex max-w-full items-start gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] text-slate-600">
                <Ban size={14} className="mt-0.5 shrink-0 text-slate-600" />
                Job cancelled — no further production actions; record kept for refunds / audit.
              </span>
            ) : null}
            {readOnly && jobSt !== 'Cancelled' ? (
              <span className="inline-flex max-w-full items-start gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] text-slate-600">
                <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-600" />
                Finished run — review conversion below; actions are off.
                {Math.abs(fgAdjTotalM) > 1e-6 ? (
                  <span className="block w-full pt-0.5 text-slate-500">
                    Effective output {formatMeters(effectiveOutputM)} (posted {formatMeters(postedOutputM)} + adjustments{' '}
                    {fgAdjTotalM >= 0 ? '+' : ''}
                    {formatMeters(fgAdjTotalM)}).
                  </span>
                ) : null}
              </span>
            ) : null}
            {!readOnly && !inModal ? (
              <span className="inline-flex max-w-full items-start gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] text-slate-600">
                <ClipboardList size={14} className="mt-0.5 shrink-0 text-slate-500" />
                <span>
                  <strong className="text-slate-700">Designed for real teams:</strong> easy steps, spec hints, and
                  guarded corrections (reasons + permissions) so honest errors are fixable without hiding audit history.
                </span>
              </span>
            ) : null}
            {canEditPlannedAllocations && !hasPersistedCoilAllocations && !isStoneMeterQuote ? (
              <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-medium text-amber-950">
                <AlertTriangle size={14} className="shrink-0" />
                Save coil + opening kg, then use Save & start.
              </span>
            ) : null}
            {canEditPlannedAllocations && isStoneMeterQuote && !stoneAllocAck ? (
              <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-medium text-amber-950">
                <AlertTriangle size={14} className="shrink-0" />
                Stone-coated: use Save & start (no coils) to begin the run.
              </span>
            ) : null}
            {canAddSupplementalCoil ? (
              <span className="inline-flex items-center gap-1 rounded-md border border-sky-200 bg-sky-50 px-2 py-1 text-[10px] text-sky-950">
                <Plus size={14} className="shrink-0" />
                Mid-run: <strong className="font-semibold">Add coil</strong> if one roll is not enough.
              </span>
            ) : null}
            {canEditCompletedCoilCorrections ? (
              <span className="inline-flex items-center gap-1 rounded-md border border-teal-200 bg-teal-50 px-2 py-1 text-[10px] text-teal-950">
                <Plus size={14} className="shrink-0" />
                Completed correction: <strong className="font-semibold">Add coil</strong> if a roll was omitted.
              </span>
            ) : null}
            {selectedJob?.coilSpecMismatchPending ? (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-[11px] font-medium text-amber-950">
                <AlertTriangle size={14} className="shrink-0" />
                Spec exception logged — manager flag active.
              </span>
            ) : null}
            {canCaptureRun && !completionValidation.canComplete ? (
              <span className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-medium text-red-900">
                <AlertTriangle size={14} className="shrink-0" />
                {completionValidation.errors[0] || 'Complete all coil rows to finish.'}
              </span>
            ) : null}
            {canCaptureRun && requiresManagerOverrunApproval ? (
              <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] text-amber-950">
                <BarChart3 size={14} className="shrink-0" />
                +{overProducedMeters.toFixed(2)}m over plan — manager remark needed to complete.
              </span>
            ) : null}
            {!readOnly &&
            canCaptureRun &&
            completionValidation.canComplete &&
            !requiresManagerOverrunApproval &&
            hasPlannedMeters ? (
              <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-900">
                <Sparkles size={14} className="shrink-0" />
                {planProgressPct != null
                  ? `${planProgressPct}% of planned metres logged — preview updates as you type.`
                  : 'Ready to preview conversion when all fields are valid.'}
              </span>
            ) : null}
          </div>
        </div>
      )}

      <div
        className={`grid ${inModal ? 'gap-1.5 p-1.5 sm:p-2' : 'gap-3 p-3 sm:p-3.5'} ${
          hideJobSidebar ? '' : 'lg:grid-cols-[minmax(0,11.5rem)_minmax(0,1fr)] xl:grid-cols-[minmax(0,12.5rem)_minmax(0,1fr)]'
        }`}
      >
        {!hideJobSidebar ? (
          <aside className="space-y-1 lg:sticky lg:top-2 lg:self-start">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Queue</p>
              <span className="rounded-md bg-slate-200/80 px-1.5 py-0.5 text-[9px] font-bold text-slate-600">
                {sortedJobs.length}
              </span>
            </div>
            <div className="flex max-h-[min(58vh,22rem)] flex-col gap-1 overflow-y-auto pr-0.5 custom-scrollbar">
              {sortedJobs.map((job) => {
                const active = selectedJob.jobID === job.jobID;
                const allocN = coilAllocationCountByJob.get(job.jobID) || 0;
                return (
                  <button
                    key={job.jobID}
                    type="button"
                    data-testid={`production-queue-job-${job.jobID}`}
                    onClick={() => setSelectedJobId(job.jobID)}
                    className={`w-full rounded-lg border p-1.5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#134e4a]/30 ${
                      active
                        ? 'border-[#134e4a]/40 bg-white shadow-sm ring-1 ring-[#134e4a]/15'
                        : 'border-slate-200/90 bg-white/80 hover:border-teal-300/60 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-mono text-[11px] font-bold text-[#134e4a]">
                        {job.cuttingListId || job.jobID}
                      </p>
                      <span
                        className={`shrink-0 rounded-md px-1.5 py-0.5 text-[8px] font-bold uppercase ${statusTone(job.status)}`}
                      >
                        {job.status === 'Running'
                          ? 'Run'
                          : job.status === 'Planned'
                            ? 'Plan'
                            : job.status === 'Cancelled'
                              ? 'Off'
                              : 'Done'}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-[10px] font-semibold text-slate-700">{job.customerName || '—'}</p>
                    <p className="truncate text-[9px] text-slate-500">{job.productName || job.productID || '—'}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[9px] text-slate-500">
                      <span className="tabular-nums">{formatMeters(job.plannedMeters)} plan</span>
                      {job.quotationRef ? <span className="text-slate-400">· {job.quotationRef}</span> : null}
                    </div>
                    {job.status === 'Planned' ? (
                      <p
                        className={`mt-1 text-[9px] font-semibold ${allocN === 0 ? 'text-amber-700' : 'text-slate-500'}`}
                      >
                        {allocN === 0 ? 'No coils saved' : `${allocN} coil(s)`}
                      </p>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </aside>
        ) : null}

        <div className={`min-w-0 ${inModal ? 'space-y-2' : 'space-y-2.5'}`}>
          {/* Mission control — single dense card */}
          <div
            className={
              inModal
                ? 'overflow-hidden rounded-lg border border-slate-200/50 bg-white/70'
                : 'overflow-hidden rounded-lg border border-slate-200/90 bg-white shadow-sm'
            }
          >
            <div
              className={`bg-gradient-to-br from-slate-50/95 via-white to-teal-50/35 ${
                inModal ? 'space-y-2 p-2 sm:p-2.5' : 'space-y-3 p-2.5 sm:p-3'
              }`}
            >
              <div className="flex items-center gap-2 border-b border-slate-200/50 pb-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#134e4a]">Job &amp; target</p>
              </div>
              <div
                className={`flex min-w-0 ${
                  inModal ? 'flex-col gap-2' : 'flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4'
                }`}
              >
                <div className="min-w-0 flex-1 space-y-1">
                  {!inModal ? (
                    <>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-mono text-base font-black tracking-tight text-[#134e4a] sm:text-[1.05rem]">
                          {selectedJob.cuttingListId || '—'}
                        </p>
                        <span
                          className={`rounded-md border border-black/5 px-2 py-0.5 text-[9px] font-bold uppercase shadow-sm ${statusTone(selectedJob.status)}`}
                        >
                          {selectedJob.status}
                        </span>
                      </div>
                    </>
                  ) : null}
                  <p className="text-sm font-semibold leading-snug text-slate-900">{selectedJob.customerName || '—'}</p>
                  <p className="text-[11px] font-medium leading-snug text-slate-600">
                    {selectedJob.productName || selectedJob.productID || '—'}
                  </p>
                  {!inModal ? (
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {selectedJob.quotationRef ? (
                        <span className="inline-flex items-center rounded-md border border-slate-200/80 bg-white/90 px-2 py-0.5 text-[9px] font-semibold text-slate-700 shadow-sm">
                          Quote{' '}
                          <span className="ml-0.5 font-mono text-[#134e4a]">{selectedJob.quotationRef}</span>
                        </span>
                      ) : null}
                      <span className="inline-flex items-center rounded-md border border-slate-200/80 bg-white/90 px-2 py-0.5 text-[9px] font-semibold text-slate-700 shadow-sm">
                        {selectedJob.machineName || 'Line'}
                      </span>
                    </div>
                  ) : null}
                </div>
                {!inModal ? (
                  <div
                    className="grid w-full shrink-0 grid-cols-3 gap-1.5 sm:w-auto sm:min-w-[14.5rem]"
                    aria-label="Live coil weights and output"
                  >
                    <div
                      className="rounded-lg border border-teal-200/80 bg-white/95 px-2 py-1.5 text-center shadow-sm ring-1 ring-teal-500/10"
                      title="Reserved kg"
                    >
                      <p className="text-[7px] font-bold uppercase tracking-wider text-teal-800/90">Rsvd</p>
                      <p className="mt-0.5 text-sm font-black tabular-nums leading-none text-[#134e4a]">
                        {formatKg(reservedKg)}
                      </p>
                    </div>
                    <div
                      className="rounded-lg border border-teal-200/80 bg-white/95 px-2 py-1.5 text-center shadow-sm ring-1 ring-teal-500/10"
                      title="Output metres"
                    >
                      <p className="text-[7px] font-bold uppercase tracking-wider text-teal-800/90">Out</p>
                      <p className="mt-0.5 text-sm font-black tabular-nums leading-none text-[#134e4a]">
                        {formatMeters(recordedMeters)}
                      </p>
                    </div>
                    <div
                      className="rounded-lg border border-slate-200/90 bg-white/95 px-2 py-1.5 text-center shadow-sm"
                      title="Consumed kg"
                    >
                      <p className="text-[7px] font-bold uppercase tracking-wider text-slate-500">Used</p>
                      <p className="mt-0.5 text-sm font-black tabular-nums leading-none text-slate-900">
                        {formatKg(recordedConsumedKg)}
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>

              {inModal ? (
                <div
                  className="rounded-md border border-slate-200/70 bg-slate-50/50 px-1.5 py-1.5"
                  aria-label="Run weights, output, and plan summary"
                >
                  {(() => {
                    const postedM = Number(selectedJob?.actualMeters ?? 0);
                    const liveM = Number(recordedMeters);
                    const metresMatch =
                      Number.isFinite(postedM) && Number.isFinite(liveM) && Math.abs(postedM - liveM) < 1e-4;
                    return (
                      <>
                        <div className="grid grid-cols-3 gap-x-1 gap-y-0.5 text-center">
                          <div title="Reserved kg">
                            <p className="text-[6px] font-bold uppercase tracking-wide text-teal-800/85">Rsvd</p>
                            <p className="text-[11px] font-black tabular-nums leading-tight text-[#134e4a]">
                              {formatKg(reservedKg)}
                            </p>
                            <p className="text-[6px] font-medium text-slate-500">kg</p>
                          </div>
                          <div title="Consumed kg">
                            <p className="text-[6px] font-bold uppercase tracking-wide text-slate-500">Used</p>
                            <p className="text-[11px] font-black tabular-nums leading-tight text-slate-900">
                              {formatKg(recordedConsumedKg)}
                            </p>
                            <p className="text-[6px] font-medium text-slate-500">kg</p>
                          </div>
                          <div title="Planned job metres">
                            <p className="text-[6px] font-bold uppercase tracking-wide text-slate-500">Plan</p>
                            <p className="text-[11px] font-black tabular-nums leading-tight text-[#134e4a]">
                              {formatMeters(selectedJob.plannedMeters)}
                            </p>
                            <p className="text-[6px] font-medium text-slate-500">m</p>
                          </div>
                        </div>
                        <div className="mt-1 grid grid-cols-2 gap-x-1 gap-y-0.5 border-t border-slate-200/60 pt-1 text-center">
                          <div
                            title={
                              metresMatch
                                ? 'Output metres (run log matches posted actual)'
                                : `Run log total ${formatMeters(liveM)} m · posted actual ${formatMeters(postedM)} m`
                            }
                          >
                            <p className="text-[6px] font-bold uppercase tracking-wide text-teal-800/85">Output</p>
                            <p className="text-[11px] font-black tabular-nums leading-tight text-[#134e4a]">
                              {metresMatch ? formatMeters(liveM) : `${formatMeters(liveM)} / ${formatMeters(postedM)}`}
                            </p>
                            <p className="text-[6px] font-medium text-slate-500">{metresMatch ? 'm' : 'live / post m'}</p>
                          </div>
                          <div>
                            <p className="text-[6px] font-bold uppercase tracking-wide text-slate-500">Alert</p>
                            <p className="truncate text-[11px] font-black leading-tight text-slate-900">
                              {selectedJob.conversionAlertState || '—'}
                            </p>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              ) : null}

              {allocationUniqueRollCapacityInsight &&
              allocationUniqueRollCapacityInsight.rollCount > 0 &&
              !isStoneMeterQuote &&
              !readOnly ? (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[#134e4a]/20 bg-[#134e4a]/[0.07] px-2 py-1.5 text-[10px] text-slate-800">
                  <span className="min-w-0 font-semibold leading-tight">
                    <span className="text-[#134e4a]">{allocationUniqueRollCapacityInsight.rollCount} roll(s)</span>
                    {allocationUniqueRollCapacityInsight.sumEst != null ? (
                      <>
                        {' '}
                        · free est.{' '}
                        <span className="font-mono font-black tabular-nums">
                          {allocationUniqueRollCapacityInsight.sumEst.toFixed(1)} m
                        </span>
                        {hasPlannedMeters ? (
                          <>
                            {' '}
                            vs plan{' '}
                            <span className="font-mono font-bold tabular-nums">{plannedMetersValue.toFixed(1)} m</span>
                          </>
                        ) : null}
                      </>
                    ) : allocationUniqueRollCapacityInsight.anyUnknown ? (
                      <span className="text-slate-600">
                        {' '}
                        · metre estimate unavailable — add supplier kg/m or expected metres on coil receipts.
                      </span>
                    ) : null}
                  </span>
                  {hasPlannedMeters && allocationUniqueRollCapacityInsight.sumEst != null ? (
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${
                        allocationUniqueRollCapacityInsight.sumEst + 0.25 >= plannedMetersValue
                          ? 'bg-emerald-100 text-emerald-900'
                          : 'bg-amber-100 text-amber-950'
                      }`}
                    >
                      {allocationUniqueRollCapacityInsight.sumEst + 0.25 >= plannedMetersValue
                        ? 'Capacity OK'
                        : 'Tight vs plan'}
                    </span>
                  ) : null}
                </div>
              ) : null}

              {hasPlannedMeters && (selectedJob.status === 'Running' || selectedJob.status === 'Planned') ? (
                <div className="rounded-md border border-slate-200/60 bg-white/60 px-2 py-1.5">
                  <div className="flex items-center justify-between gap-2 text-[9px] font-semibold text-slate-600">
                    <span className="uppercase tracking-wide text-slate-500">vs plan</span>
                    <span className="tabular-nums text-slate-800">
                      {formatMeters(recordedMeters)} / {formatMeters(plannedMetersValue)}
                      {planProgressPct != null ? (
                        <span className="ml-1 font-bold text-[#134e4a]">({planProgressPct}%)</span>
                      ) : null}
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-200/90">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        planProgressPct != null && planProgressPct > 100 ? 'bg-amber-500' : 'bg-gradient-to-r from-teal-500 to-[#134e4a]'
                      }`}
                      style={{
                        width: `${Math.min(100, planProgressPct != null ? planProgressPct : 0)}%`,
                      }}
                    />
                  </div>
                </div>
              ) : null}

              <div
                className={
                  inModal
                    ? 'mt-2 border-t border-slate-200/60 pt-2'
                    : 'rounded-lg border border-slate-200/70 bg-white/85 p-2.5 shadow-sm ring-1 ring-slate-900/[0.04] sm:p-3'
                }
              >
                <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-[#134e4a]">Target spec</p>
                <div
                  className={`mt-2 grid gap-x-4 gap-y-1.5 text-[11px] leading-snug ${
                    inModal ? 'grid-cols-2 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
                  } ${inModal ? 'text-[10px]' : ''}`}
                >
                  {[
                    ['Gauge', quotationMaterialSpec.gauge],
                    ['Colour', quotationMaterialSpec.colour],
                    ['Material', quotationMaterialSpec.materialType],
                    ...(inModal &&
                    designRedundantVersusProductLine(
                      quotationMaterialSpec.design,
                      selectedJob.productName,
                      selectedJob.productID
                    )
                      ? []
                      : [['Design', quotationMaterialSpec.design]]),
                  ].map(([k, v]) => (
                    <p key={k} className="min-w-0 border-l-2 border-teal-200/80 pl-2">
                      <span className="text-[9px] font-bold uppercase tracking-wide text-slate-500">{k}</span>
                      <span className="mt-0.5 block truncate font-semibold text-slate-900">{v || '—'}</span>
                    </p>
                  ))}
                </div>
                {recommendedCoils.length > 0 ? (
                  <p className="mt-2 flex items-start gap-2 rounded-md border border-teal-200/60 bg-teal-50/50 px-2 py-1.5 text-[10px] font-medium leading-snug text-teal-900">
                    <Sparkles size={14} className="mt-0.5 shrink-0 text-teal-600" aria-hidden />
                    <span>
                      <span className="font-bold text-teal-950">Stock tip</span>{' '}
                      {recommendedCoils.length} matching coil{recommendedCoils.length === 1 ? '' : 's'} — listed first in
                      the picker
                      {hasPlannedMeters
                        ? ', ordered by fit to planned metres (from supplier kg/m or roll length).'
                        : '.'}
                    </span>
                  </p>
                ) : linkedQuotation || jobProductAttrs ? (
                  <p className="mt-2 flex items-start gap-2 rounded-md border border-amber-200/70 bg-amber-50/50 px-2 py-1.5 text-[10px] font-medium leading-snug text-amber-950">
                    <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-600" aria-hidden />
                    <span>
                      <span className="font-bold">Match</span> — no perfect stock hit; pick the closest coil or save with
                      acknowledgement.
                    </span>
                  </p>
                ) : null}
                {!inModal ? (
                  <div className="mt-2.5 flex flex-col gap-2 border-t border-slate-200/70 pt-2.5 sm:flex-row sm:flex-wrap sm:items-stretch sm:gap-2">
                    {[
                      ['Planned', formatMeters(selectedJob.plannedMeters), 'text-[#134e4a]'],
                      ['Actual', formatMeters(selectedJob.actualMeters), 'text-[#134e4a]'],
                      ['Alert', selectedJob.conversionAlertState || 'Pending', 'text-slate-900'],
                    ].map(([label, value, valueClass]) => (
                      <div
                        key={label}
                        className="flex min-w-0 flex-1 flex-col justify-center rounded-md border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/90 px-2 py-1.5 text-center shadow-sm sm:min-w-[5.5rem] sm:text-left sm:px-2.5"
                      >
                        <p className="text-[8px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
                        <p className={`mt-0.5 truncate text-sm font-black tabular-nums leading-none ${valueClass}`}>
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {canCaptureRun && accessoryCompletionDraft.length > 0 ? (
            <div className="rounded-lg border border-teal-200/80 bg-teal-50/40 p-2 sm:p-2.5 space-y-1.5">
              <p className="text-[9px] font-black uppercase tracking-widest text-[#134e4a]">
                Accessories issued (this completion)
              </p>
              <p className="text-[9px] text-slate-600 leading-snug">
                Ordered on the quote vs already posted from other completed jobs. Adjust &ldquo;This job&rdquo; to match
                what leaves stock; shortfalls can be refunded under Accessory shortfall.
              </p>
              <div className="min-w-0 max-w-full rounded-lg border border-slate-200 bg-white">
                <div className="z-scroll-x min-w-0 max-w-full overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
                  <table className="w-full min-w-[520px] border-collapse text-left text-sm">
                    <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-600">
                      <tr>
                        <th className="px-2 py-2">Item</th>
                        <th className="px-2 py-2 text-right">Ordered</th>
                        <th className="px-2 py-2 text-right">Prior jobs</th>
                        <th className="px-2 py-2 text-right">Remaining</th>
                        <th className="px-2 py-2 text-right">This job</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {accessoryDraftPage.slice.map((row) => {
                        const remaining = Math.max(0, row.ordered - row.priorSupplied);
                        return (
                          <tr key={row.key} className="hover:bg-teal-50/20">
                            <td className="max-w-0 px-2 py-2 font-semibold text-slate-800 whitespace-nowrap truncate" title={row.name}>
                              {row.name}
                            </td>
                            <td className="px-2 py-2 text-right tabular-nums text-slate-600">{row.ordered}</td>
                            <td className="px-2 py-2 text-right tabular-nums text-slate-600">{row.priorSupplied}</td>
                            <td className="px-2 py-2 text-right tabular-nums text-slate-600">{remaining}</td>
                            <td className="px-2 py-2 text-right whitespace-nowrap">
                              <input
                                type="text"
                                inputMode="decimal"
                                value={row.suppliedThisJob}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  const jId = selectedJob?.jobID;
                                  if (jId && selectedJob?.status === 'Running') {
                                    writeProdAccessoryDraftEntry(jId, row.key, v);
                                  }
                                  setAccessoryCompletionDraft((prev) =>
                                    prev.map((r) => (r.key === row.key ? { ...r, suppliedThisJob: v } : r))
                                  );
                                }}
                                className="w-20 rounded-md border border-slate-200 bg-white px-2 py-1 text-right font-mono text-sm font-bold text-[#134e4a] outline-none focus:ring-2 focus:ring-teal-500/20"
                                aria-label={`Supplied this job for ${row.name}`}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {accessoryCompletionDraft.length > APP_DATA_TABLE_PAGE_SIZE ? (
                  <div className="border-t border-slate-100 px-2 py-2">
                    <AppTablePager
                      showingFrom={accessoryDraftPage.showingFrom}
                      showingTo={accessoryDraftPage.showingTo}
                      total={accessoryDraftPage.total}
                      hasPrev={accessoryDraftPage.hasPrev}
                      hasNext={accessoryDraftPage.hasNext}
                      onPrev={accessoryDraftPage.goPrev}
                      onNext={accessoryDraftPage.goNext}
                    />
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {canCaptureRun && requiresManagerOverrunApproval ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50/90 p-2 sm:p-2.5 space-y-1.5">
              <div className="flex items-start gap-1.5">
                <BarChart3 size={15} className="mt-0.5 shrink-0 text-amber-800" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] font-black uppercase tracking-widest text-amber-950">
                    Metre overrun — manager note before Complete
                  </p>
                  <p className="mt-1 text-[10px] leading-snug text-amber-950/90">
                    Logged metres are <strong>+{overProducedMeters.toFixed(2)} m</strong> over plan. There is no separate
                    approval page: a user with the right role types the approval below, then presses{' '}
                    <strong className="font-semibold">Complete</strong> (and confirms the overrun prompt).
                  </p>
                </div>
              </div>
              {canManageConversionSignoff ? (
                <label className="block space-y-1 rounded-md border border-amber-200/80 bg-white/90 p-2">
                  <span className="text-[9px] font-bold uppercase tracking-wide text-amber-900">
                    Approval remark (at least 3 characters)
                  </span>
                  <textarea
                    value={signoffRemark}
                    onChange={(e) => setSignoffRemark(e.target.value)}
                    rows={2}
                    placeholder="e.g. Customer approved extra length — overrun accepted."
                    className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[11px] text-slate-800 outline-none focus:ring-2 focus:ring-amber-300 resize-y min-h-[2.5rem]"
                  />
                </label>
              ) : (
                <p className="text-[10px] font-medium text-amber-950">
                  A user with <strong className="font-semibold">Production manage</strong>,{' '}
                  <strong className="font-semibold">Production release</strong>, or{' '}
                  <strong className="font-semibold">Operations manage</strong> must open this job, enter the remark here,
                  and press <strong className="font-semibold">Complete</strong>.
                </p>
              )}
            </div>
          ) : null}

          {readOnly &&
          selectedJob?.status === 'Completed' &&
          (ws?.snapshot?.productionJobAccessoryUsage || []).some((u) => u.jobID === selectedJob.jobID) ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-2 sm:p-2.5 space-y-1">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Accessories posted</p>
              <ul className="space-y-1 text-[10px] text-slate-700">
                {(ws?.snapshot?.productionJobAccessoryUsage || [])
                  .filter((u) => u.jobID === selectedJob.jobID)
                  .map((u) => (
                    <li key={u.id} className="flex justify-between gap-2">
                      <span className="font-semibold">{u.name}</span>
                      <span className="font-mono tabular-nums">
                        supplied {u.suppliedQty} / ordered {u.orderedQty}
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          ) : null}

          {selectedJob.status === 'Completed' && selectedJob.managerReviewSignedAtISO ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/90 px-2.5 py-2 text-xs text-emerald-950">
              <div className="flex items-start gap-1.5">
                <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-700" />
                <div className="min-w-0 space-y-1">
                  <p className="font-black uppercase tracking-wide text-emerald-900">Manager sign-off recorded</p>
                  <p className="text-xs text-emerald-900/90">
                    <span className="font-semibold">{selectedJob.managerReviewSignedByName || 'Manager'}</span>
                    {selectedJob.managerReviewSignedAtISO ? (
                      <span className="text-emerald-800/80">
                        {' '}
                        · {String(selectedJob.managerReviewSignedAtISO).slice(0, 10)}
                      </span>
                    ) : null}
                  </p>
                  {selectedJob.managerReviewRemark ? (
                    <p className="text-xs text-emerald-900/85 border-t border-emerald-200/80 pt-2 mt-2 whitespace-pre-wrap">
                      {selectedJob.managerReviewRemark}
                    </p>
                  ) : null}
                  <p className="text-[9px] text-emerald-800/70 pt-0.5">
                    Conversion alert on this job remains visible below for audit; dashboards no longer flag it for
                    action.
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {jobSt === 'Completed' && selectedJob.productID ? (
            <div className="rounded-lg border border-indigo-200/90 bg-indigo-50/60 p-2.5 sm:p-3 space-y-2">
              <p className="text-[9px] font-black uppercase tracking-widest text-indigo-900/90">
                Output product stock (after completion)
              </p>
              <p className="text-[11px] leading-snug text-indigo-950/90">
                When you hit <strong className="font-semibold">Complete</strong>, the system credits the{' '}
                <strong className="font-semibold">finished product SKU</strong> (e.g. roofing sheet metres in the
                warehouse), not the coil lines. That first credit is{' '}
                <span className="font-mono font-bold">{formatMeters(postedOutputM)}</span> on this job
                {Math.abs(fgAdjTotalM) > 1e-6 ? (
                  <>
                    {' '}
                    · Later corrections{' '}
                    <span className="font-mono font-bold">
                      {fgAdjTotalM >= 0 ? '+' : ''}
                      {formatMeters(fgAdjTotalM)}
                    </span>{' '}
                    · Stock today{' '}
                    <span className="font-mono font-bold">{formatMeters(effectiveOutputM)}</span>
                  </>
                ) : (
                  <> · no stock corrections yet</>
                )}
                . With <strong className="font-semibold">production.release</strong> or{' '}
                <strong className="font-semibold">operations.manage</strong>, use{' '}
                <strong className="font-semibold">Save correction</strong> on the coil lines above to fix wrong coil,
                opening/closing kg, or metres (updates coil and finished-goods stock; does not reverse posted GL). If
                metres in the warehouse were wrong for other reasons, a manager posts a <strong className="font-semibold">separate</strong>{' '}
                finished-goods adjustment below so stock matches reality without erasing the original completion.
              </p>
              {selectedJobAdjustments.length > 0 ? (
                <ul className="space-y-1 rounded-md border border-indigo-100 bg-white/90 px-2 py-1.5 text-[10px] text-slate-800">
                  {selectedJobAdjustments.map((a) => (
                    <li key={a.id} className="flex flex-col gap-0.5 border-b border-slate-100 pb-1 last:border-0 last:pb-0">
                      <span className="font-mono font-bold text-[#134e4a]">
                        {a.deltaFinishedGoodsM >= 0 ? '+' : ''}
                        {formatMeters(a.deltaFinishedGoodsM)} m
                      </span>
                      <span className="text-slate-600">
                        {a.createdByName || '—'} · {String(a.atISO || '').slice(0, 10)}
                      </span>
                      <span className="whitespace-pre-wrap text-slate-700">{a.note}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
              {canPostFgCompletionAdjustment ? (
                <div className="rounded-md border border-indigo-200 bg-white/95 p-2 space-y-1.5">
                  <p className="text-[10px] font-semibold text-indigo-950">
                    Correct <span className="font-mono">{selectedJob.productID}</span> metres in stock (manager)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <label className="flex min-w-[8rem] flex-1 flex-col gap-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-500">
                      Add or remove metres
                      <input
                        type="text"
                        inputMode="decimal"
                        value={fgAdjDelta}
                        onChange={(e) => setFgAdjDelta(e.target.value)}
                        placeholder="e.g. -2.5 or +10"
                        className="rounded-md border border-slate-200 px-2 py-1 font-mono text-[11px] text-slate-900"
                      />
                    </label>
                    <label className="flex min-w-[12rem] flex-[2] flex-col gap-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-500">
                      Reason (≥12 characters)
                      <input
                        type="text"
                        value={fgAdjNote}
                        onChange={(e) => setFgAdjNote(e.target.value)}
                        placeholder="e.g. Offcut — yard count 10 m less than system"
                        className="rounded-md border border-slate-200 px-2 py-1 text-[11px] text-slate-900"
                      />
                    </label>
                  </div>
                  <button
                    type="button"
                    disabled={fgAdjSaving || !ws?.canMutate}
                    onClick={() => void submitFgAdjustment()}
                    className="inline-flex items-center justify-center gap-1 rounded-md bg-indigo-700 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-indigo-800 disabled:opacity-45"
                  >
                    {fgAdjSaving ? 'Posting…' : 'Post stock correction'}
                  </button>
                </div>
              ) : (
                <p className="text-[10px] text-indigo-900/80">
                  Changing credited output metres requires <strong className="font-semibold">Production release</strong>{' '}
                  or <strong className="font-semibold">Operations manager</strong> (line operators cannot edit warehouse
                  stock alone after the job is closed).
                </p>
              )}
            </div>
          ) : null}

          {productionJobNeedsManagerReviewAttention(selectedJob) ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-xs text-red-900 space-y-2">
              <div className="flex items-start gap-1.5">
                <FileWarning size={15} className="mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-black uppercase tracking-wide">Manager review required</p>
                  <p className="mt-1 text-xs">
                    Conversion is outside the expected band (High/Low versus references). Review the four-reference
                    checks below, then sign off with a short remark when satisfied.
                  </p>
                </div>
              </div>
              {canManageConversionSignoff ? (
                <div className="rounded-md border border-red-200/80 bg-white/80 p-2 space-y-1.5">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-red-900/80">
                    Sign-off remark
                  </label>
                  <textarea
                    value={signoffRemark}
                    onChange={(e) => setSignoffRemark(e.target.value)}
                    rows={2}
                    placeholder="e.g. Variance explained — coil edge trim / scale loss. Approved to close."
                    className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-medium text-slate-800 outline-none focus:ring-2 focus:ring-red-200 resize-y min-h-[2.75rem]"
                  />
                  {selectedJob?.jobID ? (
                    <EditSecondApprovalInline
                      entityKind="production_job"
                      entityId={selectedJob.jobID}
                      value={signoffEditApprovalId}
                      onChange={setSignoffEditApprovalId}
                    />
                  ) : null}
                  <button
                    type="button"
                    disabled={signoffSaving || !ws?.canMutate}
                    onClick={() => void submitManagerSignoff()}
                    className="z-btn-primary w-full sm:w-auto justify-center"
                  >
                    <CheckCircle2 size={16} /> {signoffSaving ? 'Saving…' : 'Record manager sign-off'}
                  </button>
                </div>
              ) : (
                <p className="text-[11px] text-red-900/85 font-medium">
                  Sign-off requires <strong className="font-semibold">Production manage</strong>,{' '}
                  <strong className="font-semibold">Production release</strong>, or{' '}
                  <strong className="font-semibold">Operations manage</strong> (admin has full access).
                </p>
              )}
            </div>
          ) : null}

          {jobSt === 'Completed' &&
          selectedJob?.jobID &&
          (canEditCompletedCoilCorrections || canPostFgCompletionAdjustment) ? (
            <EditSecondApprovalInline
              entityKind="production_job"
              entityId={selectedJob.jobID}
              value={postCompletionEditApprovalId}
              onChange={setPostCompletionEditApprovalId}
              className="mb-2"
            />
          ) : null}

          <div className="overflow-hidden rounded-lg border border-slate-200/90 bg-white shadow-sm">
            <div
              className={`flex flex-col gap-1.5 border-b border-slate-100 bg-slate-50/50 sm:flex-row sm:items-center sm:justify-between ${
                inModal ? 'px-2 py-1.5 sm:px-2' : 'px-2 py-2 sm:px-2.5'
              }`}
            >
              <div className="flex min-w-0 items-start gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#134e4a]">
                    {isStoneMeterQuote ? 'Stone-coated run' : completionUsesOffcutMode ? 'Offcut / accessories run' : 'Coils &amp; run log'}
                  </p>
                  <p className="mt-px flex flex-wrap items-center gap-1 text-[10px] leading-tight text-slate-600">
                    <span className="line-clamp-2">
                      {isStoneMeterQuote
                        ? 'Metres only → Save & start → Complete.'
                        : completionUsesOffcutMode
                          ? 'No coil selection required. Enter output metres (optional) and complete.'
                        : canEditPlannedAllocations
                          ? 'Pick coil + opening kg → Save & start.'
                          : canAddSupplementalCoil
                            ? 'Next roll: Add coil, then Save.'
                            : canEditCompletedCoilCorrections
                              ? 'Correction: Add coil for a missing roll, fill all rows, then Save correction.'
                            : canCaptureRun
                              ? 'Closing kg + metres per row → Save anytime → Complete.'
                              : 'Closed.'}
                    </span>
                    <details className="relative shrink-0">
                      <summary
                        className="list-none cursor-pointer rounded-full p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 [&::-webkit-details-marker]:hidden"
                        aria-label="Coil run log details"
                      >
                        <CircleHelp className="size-3.5" strokeWidth={2} aria-hidden />
                      </summary>
                      <div className="absolute right-0 top-full z-20 mt-1 w-[min(calc(100vw-1.5rem),18rem)] rounded-lg border border-slate-200 bg-white p-2 text-[9px] leading-snug text-slate-700 shadow-lg">
                        {completionUsesOffcutMode
                          ? 'Use when output came from offcuts or this job only supplies accessories. Coil allocation is skipped and completion posts accessories plus optional finished-goods metres.'
                          : !isStoneMeterQuote && canEditPlannedAllocations
                          ? 'While Planned you can change the whole set and Save & start again. After start, use Return to plan to swap primary coils (audit reason).'
                          : !isStoneMeterQuote && canAddSupplementalCoil
                            ? 'Running: only new blank rows attach as extra coils when you Save. Finished rolls stay on the list for the full job.'
                            : !isStoneMeterQuote && canEditCompletedCoilCorrections
                              ? 'Completed job correction: use Add coil for a roll that was omitted; every row must have full readings before Save correction.'
                            : !isStoneMeterQuote && canCaptureRun
                              ? `Closing below ${COIL_TAIL_FINISH_MAX_KG} kg is allowed. Tick “Roll finished” only when clearing unusable spool/core tail from stock; otherwise leave it unchecked if steel stays on the roll. Conversion preview updates coil-by-coil.`
                              : 'Read-only record.'}
                      </div>
                    </details>
                  </p>
                </div>
              </div>
              {!isStoneMeterQuote && !completionUsesOffcutMode && canAppendCoilRow ? (
                <button
                  type="button"
                  onClick={addDraftRow}
                  className="inline-flex shrink-0 items-center justify-center gap-1 rounded-lg border border-dashed border-[#134e4a]/35 bg-white px-2 py-1 text-[11px] font-semibold text-[#134e4a] hover:bg-teal-50"
                >
                  <Plus size={14} strokeWidth={2.5} />
                  Add coil
                </button>
              ) : null}
            </div>

            <div className={`${inModal ? 'space-y-1.5 p-2' : 'space-y-2 p-2 sm:p-2.5'}`}>
              {!isStoneMeterQuote && (canCaptureRun || canEditPlannedAllocations) ? (
                <div className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-slate-50/70 p-1">
                  <button
                    type="button"
                    onClick={() => setCompletionSourceMode('coil')}
                    className={`inline-flex items-center rounded-md px-2 py-1 text-[10px] font-semibold ${
                      !completionUsesOffcutMode
                        ? 'bg-[#134e4a] text-white'
                        : 'text-slate-700 hover:bg-white'
                    }`}
                  >
                    Use coil run log
                  </button>
                  <button
                    type="button"
                    onClick={() => setCompletionSourceMode('offcut')}
                    className={`inline-flex items-center rounded-md px-2 py-1 text-[10px] font-semibold ${
                      completionUsesOffcutMode
                        ? 'bg-[#134e4a] text-white'
                        : 'text-slate-700 hover:bg-white'
                    }`}
                  >
                    Produced from offcut / accessories only
                  </button>
                </div>
              ) : null}
              {isStoneMeterQuote ? (
                <div className="rounded-lg border border-teal-100 bg-teal-50/50 p-3 text-[11px] text-slate-700 space-y-2">
                  <p>
                    <strong className="text-[#134e4a]">Stone-coated</strong> stock is tracked in metres (no coil
                    numbers). Use <strong>Save &amp; start</strong> once to begin the run.
                  </p>
                  {selectedJob.status === 'Running' ? (
                    <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      Metres consumed (stone stock)
                      <input
                        type="text"
                        inputMode="decimal"
                        value={stoneMetersConsumed}
                        onChange={(e) => setStoneMetersConsumed(e.target.value)}
                        placeholder="e.g. 120.5"
                        className="mt-1 w-full max-w-[12rem] rounded-md border border-slate-200 bg-white px-2 py-1.5 font-mono text-sm font-bold text-[#134e4a]"
                      />
                    </label>
                  ) : null}
                </div>
              ) : null}
              {completionUsesOffcutMode ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-[11px] text-slate-700 space-y-2">
                  <p>
                    Offcut / accessories completion skips coil validation and marks this run complete directly.
                  </p>
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Output metres produced (optional)
                    <input
                      type="text"
                      inputMode="decimal"
                      value={offcutMetersProduced}
                      onChange={(e) => setOffcutMetersProduced(e.target.value)}
                      placeholder="Leave blank for 0"
                      className="mt-1 w-full max-w-[12rem] rounded-md border border-slate-200 bg-white px-2 py-1.5 font-mono text-sm font-bold text-[#134e4a]"
                    />
                  </label>
                </div>
              ) : null}
              {!isStoneMeterQuote && !completionUsesOffcutMode
                ? draftAllocations.map((row, index) => {
                const lot = coilByNo[row.coilNo];
                const addBackThisJob = row.coilNo ? savedOpeningKgByCoil.get(row.coilNo) ?? 0 : 0;
                const freeKg = lot
                  ? Math.max(
                      0,
                      Number(lot.qtyRemaining || 0) - Number(lot.qtyReserved || 0) + addBackThisJob
                    )
                  : 0;
                const draftRow = isDraftAllocationRow(row);
                const coilsSelectedOnOtherLines = new Set(
                  draftAllocations
                    .filter((r) => r.id !== row.id)
                    .map((r) => String(r.coilNo ?? '').trim())
                    .filter(Boolean)
                );
                /** Running persisted lines: allow correcting wrong coil / opening kg (server run-log save adjusts reservations). */
                const canPickCoilAndOpening =
                  canEditPlannedAllocations ||
                  (canAddSupplementalCoil && draftRow) ||
                  (jobSt === 'Running' && !readOnly && !isStoneMeterQuote && !draftRow) ||
                  canEditCompletedCoilCorrections;
                const coilSelectLockedRunningPrimary =
                  operationsRegisterEdit &&
                  inModal &&
                  !readOnly &&
                  jobSt === 'Running' &&
                  !draftRow &&
                  !canPickCoilAndOpening;
                const specWarn =
                  lot && (linkedQuotation || jobProductAttrs)
                    ? coilVersusQuotationAndProductWarning(lot, linkedQuotation, jobProductAttrs, masterDataForCoilSpec)
                    : null;
                const showRemove =
                  canEditPlannedAllocations ||
                  (canAddSupplementalCoil && draftRow && draftAllocations.length > 1) ||
                  (canEditCompletedCoilCorrections && draftRow && draftAllocations.length > 1);
                const lotEst = lot ? estimatedMetresFromFreeKg(lot, freeKg) : null;
                const lotNom = lot ? supplierNominalMetres(lot) : null;
                const lotMat = lot ? String(lot.materialTypeName || '').trim() : '';
                const planHint =
                  hasPlannedMeters && plannedMetersValue > 0 ? ` · job plan ${plannedMetersValue.toFixed(1)} m` : '';
                const coilSelectTitle = lot
                  ? `Remaining ${formatKg(lot.qtyRemaining)}${lot.productID ? ` · ${lot.productID}` : ''}${
                      lotMat ? ` · ${lotMat}` : ''
                    } · free ${formatKg(freeKg)}${
                      lotEst != null
                        ? ` · ≈${lotEst.toFixed(1)} m est from free kg`
                        : lotNom != null
                          ? ` · supplier ~${lotNom.toFixed(0)} m roll`
                          : ''
                    }${planHint}`
                  : 'Choose a received coil from stock.';
                return (
                  <div
                    key={row.id}
                    className={`rounded-xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/40 shadow-sm ${
                      inModal ? 'p-1.5' : 'p-2'
                    } ${draftRowConversionPreviewReady(row) ? 'ring-1 ring-teal-400/35' : ''}`}
                  >
                    <div
                      className={`min-w-0 flex flex-col gap-2 pb-1 lg:grid lg:items-end lg:gap-x-2 lg:overflow-visible lg:pb-0 ${
                        inModal
                          ? 'lg:grid-cols-[1.25rem_3.25rem_minmax(0,1fr)_minmax(3.25rem,1fr)_minmax(3.25rem,1fr)_minmax(3.25rem,1fr)_minmax(0,1fr)_2.25rem_2rem] lg:gap-x-1.5'
                          : 'lg:grid-cols-[2rem_4rem_minmax(0,1.1fr)_4rem_4rem_4rem_minmax(0,1fr)_2.75rem_2rem]'
                      }`}
                    >
                      {inModal ? (
                        <span
                          className="shrink-0 self-end pb-1 text-right text-[11px] font-bold tabular-nums text-slate-600 lg:pb-1.5"
                          title={`Row ${index + 1}`}
                        >
                          {index + 1}
                        </span>
                      ) : (
                        <span
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#134e4a] text-[9px] font-black text-white lg:h-7 lg:w-7"
                          title={`Coil line ${index + 1}`}
                        >
                          {index + 1}
                        </span>
                      )}
                      {lot ? (
                        <span
                          className="max-w-full truncate text-[9px] leading-tight text-slate-500 lg:max-w-[4.5rem] lg:shrink-0"
                          title={
                            lotMat
                              ? `${lot.productID} · ${lotMat} · free ${formatKg(freeKg)}`
                              : `${lot.productID} · free ${formatKg(freeKg)}`
                          }
                        >
                          {lot.productID}
                        </span>
                      ) : (
                        <span className="hidden min-w-0 lg:block" aria-hidden />
                      )}
                      <div className="flex min-w-0 flex-1 flex-col gap-px">
                        <label className="whitespace-nowrap text-[8px] font-bold uppercase tracking-wide text-slate-500">
                          Coil
                        </label>
                        <select
                          disabled={!canPickCoilAndOpening}
                          title={
                            coilSelectLockedRunningPrimary
                              ? 'Primary coil is fixed while the run is open. Use Return to plan to change coils, or add a new coil row for an extra roll.'
                              : coilSelectTitle
                          }
                          value={row.coilNo}
                          onChange={(e) => updateDraftRow(row.id, { coilNo: e.target.value })}
                          className="min-h-11 w-full min-w-0 max-w-full rounded-md border border-slate-200 bg-white py-2 px-2 text-[11px] font-bold text-[#134e4a] outline-none transition-all focus:border-[#134e4a]/40 focus:ring-1 focus:ring-[#134e4a]/20 disabled:opacity-60 lg:min-h-0 lg:py-1.5"
                        >
                          <option value="">Select coil...</option>
                          {recommendedCoils.length > 0 ? (
                            <optgroup label="Recommended (matches quotation)">
                              {recommendedCoils.map((coil) => {
                                const addBack = savedOpeningKgByCoil.get(coil.coilNo) ?? 0;
                                const optFree = Math.max(
                                  0,
                                  Number(coil.qtyRemaining || 0) - Number(coil.qtyReserved || 0) + addBack
                                );
                                return (
                                  <option
                                    key={coil.coilNo}
                                    value={coil.coilNo}
                                    disabled={coilsSelectedOnOtherLines.has(coil.coilNo)}
                                  >
                                    {coilPickerOptionText(coil, optFree, plannedMetersValue)}
                                  </option>
                                );
                              })}
                            </optgroup>
                          ) : null}
                          {otherCoilsForSelect.length > 0 ? (
                            <optgroup
                              label={recommendedCoils.length > 0 ? 'Other coils' : 'Available coils'}
                            >
                              {otherCoilsForSelect.map((coil) => {
                                const addBack = savedOpeningKgByCoil.get(coil.coilNo) ?? 0;
                                const optFree = Math.max(
                                  0,
                                  Number(coil.qtyRemaining || 0) - Number(coil.qtyReserved || 0) + addBack
                                );
                                return (
                                  <option
                                    key={coil.coilNo}
                                    value={coil.coilNo}
                                    disabled={coilsSelectedOnOtherLines.has(coil.coilNo)}
                                  >
                                    {coilPickerOptionText(coil, optFree, plannedMetersValue)}
                                  </option>
                                );
                              })}
                            </optgroup>
                          ) : null}
                        </select>
                      </div>

                      <div className="grid min-w-0 grid-cols-3 gap-2 lg:contents">
                        <div className="flex min-w-0 flex-col gap-px lg:w-[4.25rem] lg:shrink-0">
                          <label className="whitespace-nowrap text-[8px] font-bold uppercase tracking-wide text-slate-500">
                            Open kg
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            disabled={!canPickCoilAndOpening}
                            value={row.openingWeightKg}
                            onChange={(e) => updateDraftRow(row.id, { openingWeightKg: e.target.value })}
                            className="min-h-10 w-full rounded-md border border-slate-200 bg-white py-2 px-1.5 text-xs font-bold tabular-nums text-[#134e4a] outline-none transition-all focus:border-[#134e4a]/40 focus:ring-1 focus:ring-[#134e4a]/20 disabled:opacity-60 lg:min-h-0 lg:py-1.5"
                          />
                        </div>

                        <div className="flex min-w-0 flex-col gap-px lg:w-[4.25rem] lg:shrink-0">
                          <label className="whitespace-nowrap text-[8px] font-bold uppercase tracking-wide text-slate-500">
                            Close kg
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            disabled={!(canCaptureRun || canEditCompletedCoilCorrections)}
                            value={row.closingWeightKg}
                            onChange={(e) => updateDraftRow(row.id, { closingWeightKg: e.target.value })}
                            className="min-h-10 w-full rounded-md border border-slate-200 bg-white py-2 px-1.5 text-xs font-bold tabular-nums text-[#134e4a] outline-none transition-all focus:border-[#134e4a]/40 focus:ring-1 focus:ring-[#134e4a]/20 disabled:opacity-60 lg:min-h-0 lg:py-1.5"
                          />
                        </div>

                        <div className="flex min-w-0 flex-col gap-px lg:w-[4.25rem] lg:shrink-0">
                          <label className="whitespace-nowrap text-[8px] font-bold uppercase tracking-wide text-slate-500">
                            Metres
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            disabled={!(canCaptureRun || canEditCompletedCoilCorrections)}
                            value={row.metersProduced}
                            onChange={(e) => updateDraftRow(row.id, { metersProduced: e.target.value })}
                            className="min-h-10 w-full rounded-md border border-slate-200 bg-white py-2 px-1.5 text-xs font-bold tabular-nums text-[#134e4a] outline-none transition-all focus:border-[#134e4a]/40 focus:ring-1 focus:ring-[#134e4a]/20 disabled:opacity-60 lg:min-h-0 lg:py-1.5"
                          />
                        </div>
                      </div>

                      <div className="flex min-w-0 flex-1 flex-col gap-px">
                        <label className="whitespace-nowrap text-[8px] font-bold uppercase tracking-wide text-slate-500">
                          Note
                        </label>
                        <input
                          type="text"
                          value={row.note}
                          onChange={(e) => updateDraftRow(row.id, { note: e.target.value })}
                          disabled={
                            (readOnly && !canEditCompletedCoilCorrections) ||
                            (jobSt === 'Running' && !draftRow && !canCaptureRun)
                          }
                          placeholder="Trim, splice…"
                          className="min-h-10 min-w-0 w-full rounded-md border border-slate-200 bg-white py-2 px-2 text-[11px] font-medium text-slate-800 outline-none transition-all focus:border-slate-300 focus:ring-1 focus:ring-slate-200/80 disabled:opacity-60 lg:min-h-0 lg:py-1.5"
                        />
                      </div>

                      <div className="flex w-full flex-col gap-px text-center lg:w-[3.25rem] lg:shrink-0">
                        <span className="whitespace-nowrap text-[8px] font-bold uppercase tracking-wide text-teal-800/90">
                          Used
                        </span>
                        <span className="text-xs font-black tabular-nums leading-none text-[#134e4a]">
                          {Number(row.openingWeightKg) >= Number(row.closingWeightKg || 0) && row.closingWeightKg !== ''
                            ? formatKg(Number(row.openingWeightKg) - Number(row.closingWeightKg || 0))
                            : '—'}
                        </span>
                      </div>

                      {showRemove ? (
                        <button
                          type="button"
                          onClick={() => removeDraftRow(row.id)}
                          className="inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center self-end rounded-md border border-transparent p-2 text-slate-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 lg:mb-px lg:min-h-0 lg:min-w-0 lg:self-auto lg:p-1"
                          aria-label="Remove coil row"
                        >
                          <Trash2 size={14} />
                        </button>
                      ) : null}
                    </div>

                    {canCaptureRun &&
                    row.coilNo?.trim() &&
                    Number(row.openingWeightKg) > 0 &&
                    Number.isFinite(Number(row.closingWeightKg)) &&
                    Number(row.closingWeightKg) >= 0 &&
                    Number(row.closingWeightKg) < COIL_TAIL_FINISH_MAX_KG &&
                    Number(row.closingWeightKg) <= Number(row.openingWeightKg) ? (
                      <label className="mt-2 flex cursor-pointer items-center gap-2 rounded-md border border-amber-200/90 bg-amber-50/80 px-2 py-2 text-[11px] font-medium text-amber-950">
                        <input
                          type="checkbox"
                          checked={Boolean(row.finishCoil)}
                          onChange={(e) => updateDraftRow(row.id, { finishCoil: e.target.checked })}
                          className="h-[1.125rem] w-[1.125rem] shrink-0 rounded border-amber-400 text-[#134e4a] focus:ring-2 focus:ring-[#134e4a]/30"
                        />
                        <span className="min-w-0 flex-1 leading-snug">
                          <strong className="font-semibold">Roll finished</strong>
                          <span className="text-amber-900/90"> (tail under {COIL_TAIL_FINISH_MAX_KG} kg)</span>
                        </span>
                        <button
                          type="button"
                          className="shrink-0 rounded-full p-1 text-amber-800/80 hover:bg-amber-100"
                          title="Tick only when this coil’s tail under the threshold is unusable spool/core and should be cleared from coil stock. Leave unchecked if usable steel remains on the roll — you can complete without finishing the roll."
                          aria-label="About roll finished"
                        >
                          <CircleHelp className="size-4" strokeWidth={2} />
                        </button>
                      </label>
                    ) : null}

                    {row.specMismatch || specWarn ? (
                      <div className="mt-1 space-y-1 border-t border-slate-100/80 pt-1">
                        {row.specMismatch ? (
                          <p className="flex items-start gap-1 rounded border border-amber-300 bg-amber-100/90 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-amber-950">
                            <AlertTriangle size={12} className="mt-0.5 shrink-0" aria-hidden />
                            Saved as spec exception — manager review
                          </p>
                        ) : null}
                        {specWarn ? (
                          <p className="flex items-start gap-1 rounded border border-amber-200 bg-amber-50/90 px-2 py-0.5 text-[9px] font-semibold text-amber-950">
                            <AlertTriangle size={12} className="mt-0.5 shrink-0" aria-hidden />
                            {specWarn}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })
                : null}
            </div>
          </div>

          {canCaptureRun || canEditCompletedCoilCorrections ? (
            <div className="overflow-hidden rounded-lg border border-indigo-200/60 bg-gradient-to-br from-indigo-50/35 via-white to-white shadow-sm">
              <div
                className={`flex flex-col gap-0.5 border-b border-indigo-100/80 bg-indigo-50/30 sm:flex-row sm:items-center sm:justify-between ${
                  inModal ? 'px-2 py-2' : 'px-2.5 py-2'
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <BarChart3 size={15} className="text-indigo-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900">Conversion preview</p>
                    <p className="text-[10px] text-slate-500">
                      {jobSt === 'Completed' && canEditCompletedCoilCorrections
                        ? 'Live estimate for this correction — same kg/m rules as completion.'
                        : 'Live estimate — nothing posts until Complete.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="ml-auto shrink-0 rounded-full p-1 text-slate-400 hover:bg-white hover:text-slate-700"
                    title="Uses the same rules as completion: four-reference kg/m and alert bands. While several coils are open, only rows with closing kg and metres filled appear here; the rest join when you finish each roll."
                    aria-label="About conversion preview"
                  >
                    <CircleHelp className="size-4" />
                  </button>
                </div>
                {conversionPreviewLoading ? (
                  <span className="text-[11px] font-medium text-indigo-600">Updating…</span>
                ) : null}
              </div>
              <div className={inModal ? 'p-2' : 'p-2.5'}>
                {!canRunConversionPreview ? (
                  <p className="rounded-md border border-dashed border-slate-200 bg-slate-50/80 px-2 py-2 text-[11px] text-slate-600">
                    {completionUsesOffcutMode ? (
                      <>Offcut mode preview is ready after you choose this source. Output metres are optional.</>
                    ) : (
                      <>
                        Enter <strong className="font-semibold text-slate-800">closing kg</strong> and{' '}
                        <strong className="font-semibold text-slate-800">metres</strong> on each coil to preview conversion
                        and alerts.
                      </>
                    )}
                  </p>
                ) : conversionPreviewLoading ? (
                  <p className="text-xs font-semibold text-slate-500">Calculating…</p>
                ) : conversionPreviewError ? (
                  <p className="text-xs text-red-700">{conversionPreviewError}</p>
                ) : conversionPreview?.rows?.length ? (
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-600">
                      <span className="font-semibold text-[#134e4a]">
                        Job rollup: {formatMeters(conversionPreview.totalMeters)} ·{' '}
                        {formatKg(conversionPreview.totalWeightKg)} consumed
                      </span>
                      {conversionPreview.previewCoilsTotal != null &&
                      conversionPreview.previewCoilCount != null &&
                      conversionPreview.previewCoilCount < conversionPreview.previewCoilsTotal ? (
                        <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[9px] font-semibold text-sky-950">
                          Showing {conversionPreview.previewCoilCount} of {conversionPreview.previewCoilsTotal} coil(s)
                          — add closing & metres on other rows when each roll finishes
                        </span>
                      ) : null}
                      <span
                        className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${
                          conversionPreview.aggregatedAlertState === 'OK'
                            ? 'bg-emerald-100 text-emerald-900'
                            : 'bg-amber-100 text-amber-900'
                        }`}
                      >
                        {conversionPreview.aggregatedAlertState}
                      </span>
                      {conversionPreview.managerReviewRequired ? (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-[9px] font-black uppercase text-red-900">
                          Manager review likely
                        </span>
                      ) : null}
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                      {conversionPreview.rows.map((row, rowIdx) => {
                        const lot = coilByNo[row.coilNo];
                        return (
                          <div
                            key={
                              row.allocationId != null && row.allocationId !== ''
                                ? `conv-${row.allocationId}`
                                : `conv-${row.coilNo}-${rowIdx}`
                            }
                            className={`rounded-lg border p-2 text-xs shadow-sm ${alertTone(row.alertState)}`}
                          >
                            <div className="flex flex-wrap items-start justify-between gap-1.5">
                              <div className="min-w-0">
                                <p className="font-mono text-[11px] font-bold">{row.coilNo}</p>
                                <p className="mt-px text-[9px] font-medium text-slate-700 line-clamp-2">
                                  {lot?.gaugeLabel || '—'} · {lot?.colour || '—'} ·{' '}
                                  {lot?.materialTypeName || '—'}
                                </p>
                              </div>
                              <span className="rounded-md bg-white/80 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide">
                                {row.alertState}
                              </span>
                            </div>
                            <div className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-3">
                              <div className="rounded-md bg-white/70 px-1.5 py-1">
                                <p className="text-[7px] font-black uppercase opacity-70">Act</p>
                                <p className="text-[11px] font-black tabular-nums">{formatKgPerM(row.actualConversionKgPerM)}</p>
                              </div>
                              <div
                                className="rounded-md bg-white/70 px-1.5 py-1"
                                title={
                                  row.standardConversionSource === 'procurement_catalog'
                                    ? 'Standard kg/m from Procurement → Conversion catalogue'
                                    : row.standardConversionSource === 'setup_density'
                                      ? 'Standard kg/m from setup material density × width × gauge'
                                      : undefined
                                }
                              >
                                <p className="text-[7px] font-black uppercase opacity-70">
                                  Std
                                  {row.standardConversionSource === 'procurement_catalog' ? (
                                    <span className="normal-case font-semibold text-slate-600"> · conv.</span>
                                  ) : null}
                                </p>
                                <p className="text-[11px] font-black tabular-nums">{formatKgPerM(row.standardConversionKgPerM)}</p>
                              </div>
                              <div className="rounded-md bg-white/70 px-1.5 py-1">
                                <p className="text-[7px] font-black uppercase opacity-70">Sup</p>
                                <p className="text-[11px] font-black tabular-nums">{formatKgPerM(row.supplierConversionKgPerM)}</p>
                              </div>
                              <div className="rounded-md bg-white/70 px-1.5 py-1">
                                <p className="text-[7px] font-black uppercase opacity-70">G hist</p>
                                <p className="text-[11px] font-black tabular-nums">{formatKgPerM(row.gaugeHistoryAvgKgPerM)}</p>
                              </div>
                              <div className="rounded-md bg-white/70 px-1.5 py-1">
                                <p className="text-[7px] font-black uppercase opacity-70">C hist</p>
                                <p className="text-[11px] font-black tabular-nums">{formatKgPerM(row.coilHistoryAvgKgPerM)}</p>
                              </div>
                              <div className="col-span-2 rounded-md bg-white/70 px-1.5 py-1 sm:col-span-3">
                                <p className="text-[7px] font-black uppercase opacity-70">Var %</p>
                                <p className="text-[9px] font-semibold tabular-nums leading-tight">
                                  Std {formatPct(row.variances?.standardPct)} · Supp{' '}
                                  {formatPct(row.variances?.supplierPct)} · G hist {formatPct(row.variances?.gaugeHistoryPct)}{' '}
                                  · C hist {formatPct(row.variances?.coilHistoryPct)}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">Preview when inputs are valid.</p>
                )}
              </div>
            </div>
          ) : null}

          <div className="overflow-hidden rounded-lg border border-slate-200/90 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50/70 px-3 py-2">
              <p className="text-sm font-bold text-slate-900">Posted conversion check</p>
              {!inModal ? (
                <p className="mt-0.5 text-xs leading-snug text-slate-600">
                  One row per coil after completion — scroll horizontally on a narrow screen.
                </p>
              ) : null}
            </div>

            <div className="p-2 sm:p-3">
              {selectedChecks.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/70 px-3 py-3 text-center text-sm text-slate-500">
                  Complete the job with closing weights and metres — checks will show here for audit.
                </div>
              ) : (
                <div className="min-w-0 max-w-full rounded-md border border-slate-100">
                  <div className="z-scroll-x min-w-0 max-w-full overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
                    <table className="w-full min-w-[44rem] border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/90 text-xs font-bold uppercase tracking-wide text-slate-600">
                          <th className="sticky left-0 z-[1] bg-slate-50 px-2 py-2 text-left font-mono normal-case tracking-normal text-slate-800">
                            Coil
                          </th>
                          <th className="px-2 py-2 text-right whitespace-nowrap">Actual</th>
                          <th className="px-2 py-2 text-right whitespace-nowrap">Standard</th>
                          <th className="px-2 py-2 text-right whitespace-nowrap">Supplier</th>
                          <th className="px-2 py-2 text-right whitespace-nowrap">Gauge hist.</th>
                          <th className="px-2 py-2 text-right whitespace-nowrap">Coil hist.</th>
                          <th className="min-w-[7rem] px-2 py-2 text-right whitespace-nowrap">Variance %</th>
                          <th className="px-2 py-2 text-center whitespace-nowrap">Alert</th>
                          <th className="min-w-[5rem] px-2 py-2 text-left">Note</th>
                        </tr>
                      </thead>
                      <tbody>
                        {checksPage.slice.map((check) => {
                          const v = check.varianceSummary?.variances;
                          const deltaTitle = `Std ${formatPct(v?.standardPct)} · Sup ${formatPct(v?.supplierPct)} · Gauge ${formatPct(v?.gaugeHistoryPct)} · Coil ${formatPct(v?.coilHistoryPct)}`;
                          const deltaCell = `${formatPct(v?.standardPct)} / ${formatPct(v?.supplierPct)} · ${formatPct(v?.gaugeHistoryPct)} / ${formatPct(v?.coilHistoryPct)}`;
                          const noteShort = check.managerReviewRequired
                            ? 'Manager review'
                            : check.alertState === 'Watch'
                              ? 'Near threshold'
                              : 'In range';
                          const noteTitle = check.managerReviewRequired
                            ? 'Out of band — escalate to manager.'
                            : check.alertState === 'Watch'
                              ? 'Close to the alert threshold.'
                              : 'Within expected range.';
                          const gaugeMat = `${check.gaugeLabel || '—'} · ${check.materialTypeName || '—'}`;
                          return (
                            <tr
                              key={check.id}
                              className={`border-b border-slate-100 last:border-0 ${postedCheckRowClass(check.alertState)}`}
                            >
                              <td
                                className={`sticky left-0 z-[1] max-w-[9rem] px-2 py-2 font-mono text-sm font-bold shadow-[2px_0_0_rgba(148,163,184,0.2)] ${postedCheckRowClass(check.alertState)}`}
                                title={gaugeMat}
                              >
                                <span className="block truncate">{check.coilNo}</span>
                              </td>
                              <td className="px-2 py-2 text-right font-semibold tabular-nums whitespace-nowrap" title={formatKgPerM(check.actualConversionKgPerM)}>
                                {formatKgPerMCompact(check.actualConversionKgPerM)}
                              </td>
                              <td className="px-2 py-2 text-right font-semibold tabular-nums whitespace-nowrap" title={formatKgPerM(check.standardConversionKgPerM)}>
                                {formatKgPerMCompact(check.standardConversionKgPerM)}
                              </td>
                              <td className="px-2 py-2 text-right font-semibold tabular-nums whitespace-nowrap" title={formatKgPerM(check.supplierConversionKgPerM)}>
                                {formatKgPerMCompact(check.supplierConversionKgPerM)}
                              </td>
                              <td className="px-2 py-2 text-right font-semibold tabular-nums whitespace-nowrap" title={formatKgPerM(check.gaugeHistoryAvgKgPerM)}>
                                {formatKgPerMCompact(check.gaugeHistoryAvgKgPerM)}
                              </td>
                              <td className="px-2 py-2 text-right font-semibold tabular-nums whitespace-nowrap" title={formatKgPerM(check.coilHistoryAvgKgPerM)}>
                                {formatKgPerMCompact(check.coilHistoryAvgKgPerM)}
                              </td>
                              <td
                                className="max-w-0 px-2 py-2 text-right text-xs font-medium tabular-nums text-slate-800 whitespace-nowrap truncate"
                                title={deltaTitle}
                              >
                                {deltaCell}
                              </td>
                              <td className="px-2 py-2 text-center text-xs font-black whitespace-nowrap">{check.alertState}</td>
                              <td className="max-w-0 px-2 py-2 text-xs font-medium text-slate-800 whitespace-nowrap truncate" title={noteTitle}>
                                {noteShort}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {selectedChecks.length > 0 ? (
                    <div className="border-t border-slate-100 px-2 py-2 bg-white">
                      <AppTablePager
                        showingFrom={checksPage.showingFrom}
                        showingTo={checksPage.showingTo}
                        total={checksPage.total}
                        hasPrev={checksPage.hasPrev}
                        hasNext={checksPage.hasNext}
                        onPrev={checksPage.goPrev}
                        onNext={checksPage.goNext}
                      />
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
      </div>

      {inModal ? (
        <div className="shrink-0 border-t border-slate-200/90 bg-white/95 px-2 py-1 backdrop-blur-sm sm:px-2.5 sm:py-1.5">
          {readOnly ? (
            <span className="inline-flex rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-600">
              View only
            </span>
          ) : (
            <div className="flex flex-wrap items-center justify-end gap-1">
              {selectedJob.status === 'Planned' ? (
                <button
                  type="button"
                  onClick={() => void persist('allocationsAndStart')}
                  disabled={savingAction !== '' || !canEditPlannedAllocations || !plannedAllocSaveReady}
                  title="Writes coil allocation to the server and starts the run in one step."
                  className={`inline-flex items-center gap-0.5 rounded-md px-2 py-0.5 text-[10px] font-semibold transition-colors disabled:opacity-45 ${
                    savingAction === 'allocationsAndStart'
                      ? 'bg-sky-100 text-sky-800'
                      : 'bg-sky-600 text-white hover:bg-sky-700'
                  }`}
                >
                  <Save size={12} />
                  <Play size={11} />
                  {savingAction === 'allocationsAndStart' ? 'Saving…' : 'Save & start'}
                </button>
              ) : null}
              {selectedJob.status === 'Running' && !isStoneMeterQuote && !completionUsesOffcutMode ? (
                <button
                  type="button"
                  onClick={() => void persist('runningCheckpoint')}
                  disabled={savingAction !== '' || !canCaptureRun || !runningCheckpointSaveReady}
                  title="Save new coil lines and/or closing kg, metres, and notes."
                  className={`inline-flex items-center gap-0.5 rounded-md px-2 py-0.5 text-[10px] font-semibold transition-colors disabled:opacity-45 ${
                    savingAction === 'runningCheckpoint'
                      ? 'bg-slate-100 text-slate-500'
                      : 'bg-slate-800 text-white hover:bg-slate-900'
                  }`}
                >
                  <Save size={12} />
                  {savingAction === 'runningCheckpoint' ? 'Saving…' : 'Save'}
                </button>
              ) : null}
              {selectedJob.status === 'Completed' && canEditCompletedCoilCorrections ? (
                <button
                  type="button"
                  onClick={() => void persist('completedCoilCorrection')}
                  disabled={savingAction !== '' || !completedCoilCorrectionSaveReady}
                  title="Correct coil or weights after completion (reason required). Stock only — GL not auto-reversed."
                  className={`inline-flex items-center gap-0.5 rounded-md px-2 py-0.5 text-[10px] font-semibold transition-colors disabled:opacity-45 ${
                    savingAction === 'completedCoilCorrection'
                      ? 'bg-amber-100 text-amber-900'
                      : 'border border-amber-400 bg-amber-50 text-amber-950 hover:bg-amber-100'
                  }`}
                >
                  <Save size={12} />
                  {savingAction === 'completedCoilCorrection' ? 'Saving…' : 'Save correction'}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => void persist('complete')}
                disabled={!canCaptureRun || savingAction !== '' || !completionValidation.canComplete}
                title={
                  completionValidation.canComplete
                    ? undefined
                    : completionValidation.errors[0] || 'Complete all run-log fields before completion.'
                }
                className="inline-flex items-center gap-0.5 rounded-md bg-[#134e4a] px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-[#0f3d39] disabled:opacity-45"
              >
                <CheckCircle2 size={12} />
                {savingAction === 'complete' ? 'Completing…' : 'Complete'}
              </button>
              {selectedJob.status === 'Running' && canReturnJobToPlanned ? (
                <button
                  type="button"
                  onClick={() => setReturnModalOpen(true)}
                  disabled={savingAction !== '' || returnSaving}
                  title="Undo Start: go back to Planned (audit reason required)."
                  className="inline-flex items-center gap-0.5 rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-950 hover:bg-amber-100 disabled:opacity-45"
                >
                  <Undo2 size={12} />
                  Return to plan
                </button>
              ) : null}
              {selectedJob.status === 'Planned' || selectedJob.status === 'Running' ? (
                <button
                  type="button"
                  onClick={() => setCancelModalOpen(true)}
                  disabled={savingAction !== '' || cancelSaving || returnSaving}
                  title="Cancel this job: releases reservations and marks production cancelled."
                  className="inline-flex items-center gap-0.5 rounded-md border border-rose-300 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-950 hover:bg-rose-100 disabled:opacity-45"
                >
                  <Ban size={12} />
                  Cancel job
                </button>
              ) : null}
            </div>
          )}
        </div>
      ) : null}

      {returnModalOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="return-to-plan-title"
        >
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-amber-200 bg-white p-4 shadow-xl">
            <h4 id="return-to-plan-title" className="text-sm font-bold text-amber-950">
              Return job to plan?
            </h4>
            <p className="mt-2 text-xs leading-snug text-slate-600">
              This undoes <strong className="font-semibold">Start</strong> only. Coil reservations stay as saved; you can
              then change allocation and save again. Use a clear reason — it is stored in the audit log.
            </p>
            <label className="mt-3 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Reason (≥8 characters)
            </label>
            <textarea
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-amber-200"
              placeholder="e.g. Wrong coil selected — need to swap CL-12 for CL-15 before run."
            />
            <div className="mt-3 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  setReturnModalOpen(false);
                  setReturnReason('');
                }}
                disabled={returnSaving}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={returnSaving || returnReason.trim().length < 8}
                onClick={() => void submitReturnToPlanned()}
                className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-45"
              >
                {returnSaving ? 'Applying…' : 'Confirm return to plan'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {cancelModalOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-job-title"
        >
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-rose-200 bg-white p-4 shadow-xl">
            <h4 id="cancel-job-title" className="text-sm font-bold text-rose-950">
              Cancel production job?
            </h4>
            <p className="mt-2 text-xs leading-snug text-slate-600">
              This ends the run without posting output: <strong className="font-semibold">coil reservations are released</strong>, allocations are cleared, the job is marked <strong className="font-semibold">Cancelled</strong>, and the cutting list returns to <strong className="font-semibold">Waiting</strong>. Use for order cancellations (refunds may reference this record).
            </p>
            <label className="mt-3 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Reason (≥8 characters)
            </label>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-rose-200"
              placeholder="e.g. Customer cancelled order — no production to run."
            />
            <div className="mt-3 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  setCancelModalOpen(false);
                  setCancelReason('');
                }}
                disabled={cancelSaving}
              >
                Back
              </button>
              <button
                type="button"
                disabled={cancelSaving || cancelReason.trim().length < 8}
                onClick={() => void submitCancelJob()}
                className="rounded-md bg-rose-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-800 disabled:opacity-45"
              >
                {cancelSaving ? 'Cancelling…' : 'Confirm cancel'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
