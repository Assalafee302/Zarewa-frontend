import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  X,
  RotateCcw,
  Hash,
  AlertTriangle,
  DollarSign,
  Save,
  Link2,
  Printer,
  Info,
  Search,
} from 'lucide-react';
import { ModalFrame } from './layout/ModalFrame';
import { useTrackedUnsavedForm } from '../hooks/useTrackedUnsavedForm';
import { useToast } from '../context/ToastContext';
import { apiFetch } from '../lib/apiBase';
import { printRefundRecord } from '../lib/refundRecordPrint';
import {
  refundApprovedAmount,
  refundOutstandingAmount,
  refundStatusIsWithdrawn,
} from '../lib/refundsStore';
import { flattenQuotationLineItems } from '../lib/managerDashboardCore';
import {
  productionJobStatusClosesRefundEligibility,
  quotationOrderFullySettledForRefundPicker,
  quotationVoidPaidRefundEligible,
} from '../lib/refundEligibility';
import {
  quotationLinesJsonShapeForGauge,
  quotedGaugeLabelForSubstitutionComparison,
} from '../lib/quotedGaugeForSubstitution';
import {
  REFUND_REASON_CATEGORY_VALUES as REFUND_REASON_CATEGORIES,
  REFUND_PREVIEW_VERSION,
  MIN_REFUND_QUOTATION_REMAINING_NGN,
} from '../shared/refundConstants.js';

const REFUND_CATEGORY_HINTS = {
  'Unproduced meterage':
    'Quoted line metres exceed production metres (completed/cancelled jobs). Distinct from order cancellation (cancelled production only).',
  'Customer commission':
    'Not added automatically — use “Add commission to preview”. Capped by minimum selling ₦/m and refundable headroom.',
  'Substitution Difference':
    'When quoted gauge differs from the coil actually allocated, credit follows quoted ₦/m (from the quote) minus workbook ₦/m for that coil gauge/design (see breakdown under the line).',
};

function roundMoneyLocal(n) {
  return Math.round(Number(n) || 0);
}

/** Build reason categories from included breakdown lines (expands bundled transport/install). */
function deriveReasonCategoriesFromLines(lines) {
  const s = new Set();
  for (const l of lines || []) {
    if (l?.include === false) continue;
    const amt = Number(String(l?.amountNgn ?? '').replace(/,/g, ''));
    if (!String(l?.label ?? '').trim() || !Number.isFinite(amt) || amt <= 0) continue;
    const multi = l.appliesToCategories;
    if (Array.isArray(multi) && multi.length) {
      for (const c of multi) {
        if (c) s.add(String(c).trim());
      }
    } else if (l.category) {
      s.add(String(l.category).trim());
    }
  }
  return Array.from(s);
}

function parseQuoteQtyDisplay(qty, unit) {
  const raw = qty != null ? String(qty).trim() : '';
  const u = unit != null ? String(unit).trim() : '';
  if (!raw && !u) return '—';
  return u ? `${raw} ${u}`.replace(/\s+/g, ' ').trim() : raw;
}

function parseQuoteQtyNumeric(qty) {
  const n = Number(String(qty ?? '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

function formatQuoteUnitPriceLabel(unitPrice) {
  const n = Number(String(unitPrice ?? '').replace(/,/g, ''));
  if (!Number.isFinite(n)) return '—';
  return `₦${Math.round(n).toLocaleString('en-NG')}`;
}

/** Align intelligence accessory summary to a flattened quotation line (by id or name). */
/** First 10 chars YYYY-MM-DD from pick row or full workspace quotation. */
function quotationYmdForPickRow(q, quotationsArr) {
  const iso = String(q?.dateISO || '').trim();
  if (iso.length >= 10) return iso.slice(0, 10);
  const full = (quotationsArr || []).find((x) => String(x.id) === String(q?.id));
  const fiso = String(full?.dateISO || full?.date_iso || '').trim();
  if (fiso.length >= 10) return fiso.slice(0, 10);
  return '';
}

/** Align refund table rows to intelligence accessory lines when labels differ trivially (nail vs nails). */
function accessoryRefundNameKeys(raw) {
  const base = String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
  if (!base) return [];
  const v = new Set([base]);
  if (base.length > 2 && base.endsWith('s') && !base.endsWith('ss')) {
    v.add(base.slice(0, -1));
  } else if (base.length > 0 && !base.endsWith('s')) {
    v.add(base + 's');
  }
  return [...v];
}

function findAccessoryFulfillmentRow(quotLine, accSummaryLines) {
  if (quotLine.category !== 'accessories') return null;
  const name = String(quotLine.name || '').trim();
  const nameKeys = new Set(accessoryRefundNameKeys(name));
  const lineId = String(quotLine.id || '').trim();
  for (const a of accSummaryLines) {
    const key = String(a.quoteLineId || '').trim();
    if (lineId && key === lineId) return a;
    if (name && key === `name:${name}`) return a;
  }
  for (const a of accSummaryLines) {
    const an = String(a.name || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
    if (an && nameKeys.has(an)) return a;
  }
  return null;
}

const emptyLine = () => ({
  lineKey: `m-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  include: true,
  label: '',
  amountNgn: '',
  category: 'Other',
  appliesToCategories: undefined,
});

/** Stable key for jobs on a quotation — when this changes, refund preview should re-run from the server. */
function productionJobsFingerprintForQuotation(productionJobs, quotationRef) {
  const ref = String(quotationRef || '').trim();
  if (!ref) return '';
  return (productionJobs || [])
    .filter((j) => String(j.quotationRef || '').trim() === ref)
    .map((j) =>
      [
        String(j.jobID || '').trim(),
        String(j.status || '').trim().toLowerCase(),
        Math.round(Number(j.actualMeters) || 0),
        Math.round(Number(j.effectiveOutputMeters ?? j.actualMeters) || 0),
        String(j.productID || '').trim(),
        String(j.conversionAlertState || '').trim(),
        j.coilSpecMismatchPending ? '1' : '0',
      ].join('|')
    )
    .sort()
    .join('~');
}

/** Workspace accessory issue rows for this quote — when these change, refund preview + intelligence should refresh. */
function accessoryUsageFingerprintForQuotation(productionJobAccessoryUsage, quotationRef) {
  const ref = String(quotationRef || '').trim();
  if (!ref) return '';
  return (productionJobAccessoryUsage || [])
    .filter((u) => String(u.quotationRef || u.quotation_ref || '').trim() === ref)
    .map((u) =>
      [
        String(u.jobID || u.job_id || '').trim(),
        String(u.quoteLineId || u.quote_line_id || '').trim(),
        Math.round(Number(u.suppliedQty ?? u.supplied_qty) || 0),
        String(u.name || '')
          .trim()
          .toLowerCase(),
      ].join('|')
    )
    .sort()
    .join('~');
}

function refundWorkspaceSnapshotFingerprint(productionJobs, productionJobAccessoryUsage, quotationRef) {
  const j = productionJobsFingerprintForQuotation(productionJobs, quotationRef);
  const a = accessoryUsageFingerprintForQuotation(productionJobAccessoryUsage, quotationRef);
  return `${j}##${a}`;
}

const emptyRequest = {
  customerID: '',
  customerName: '',
  quotationRef: '',
  reasonCategory: [],
  reasonNotes: '',
  amountNgn: '',
  calculationLines: [],
  calculationNotes: '',
  suggestedLines: [],
  alreadyRefundedCategories: [],
  payeeName: '',
  payeeAccountNo: '',
  payeeBankName: '',
};

const initFormFromRecord = (record) => {
  if (!record) return { ...emptyRequest, calculationLines: [emptyLine()] };
  let cats = [];
  try {
    const raw = record.reason_category || record.reasonCategory;
    cats = Array.isArray(raw) ? raw : JSON.parse(raw || '[]');
  } catch {
    cats = record.reasonCategory ? [record.reasonCategory] : [];
  }

  const lines =
    Array.isArray(record.calculationLines || record.calculation_lines_json) && (record.calculationLines || record.calculation_lines_json).length > 0
      ? (record.calculationLines || record.calculation_lines_json).map((l, idx) => ({
          lineKey: l.lineKey || `v-${idx}-${String(l.category || '')}`,
          include: l.include !== false,
          label: l.label ?? '',
          amountNgn: l.amountNgn != null ? String(l.amountNgn) : '',
          category: l.category ?? '',
          appliesToCategories: l.appliesToCategories,
        }))
      : [emptyLine()];
  return {
    customerID: record.customerID || record.customer_id || '',
    customerName: record.customerName || record.customer_name || '',
    quotationRef: record.quotationRef || record.quotation_ref || '',
    reasonCategory: cats,
    reasonNotes: record.reasonNotes || record.reason || '',
    amountNgn: record.amountNgn != null ? String(record.amountNgn) : (record.amount_ngn != null ? String(record.amount_ngn) : ''),
    calculationLines: lines,
    calculationNotes: record.calculationNotes || record.calculation_notes || '',
    suggestedLines: Array.isArray(record.suggestedLines) ? record.suggestedLines : [],
    alreadyRefundedCategories: [],
    payeeName: record.payeeName || record.payee_name || '',
    payeeAccountNo: record.payeeAccountNo || record.payee_account_no || '',
    payeeBankName: record.payeeBankName || record.payee_bank_name || '',
  };
};

function sumLines(lines) {
  return (lines || []).reduce((s, l) => {
    if (l?.include === false) return s;
    const n = Number(String(l.amountNgn ?? '').replace(/,/g, ''));
    return s + (Number.isNaN(n) ? 0 : n);
  }, 0);
}

const AMOUNT_LINE_TOL = 1;

/**
 * When an approver sets a lower approved amount but lines still sum to the original request,
 * scale included line amounts proportionally so the API line-sum check passes.
 */
function scaleCalculationLinesToApprovedAmount(lines, targetNgn) {
  const target = roundMoneyLocal(targetNgn);
  if (!Array.isArray(lines) || target <= 0) return lines;
  const includedIndices = [];
  let sum = 0;
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i]?.include === false) continue;
    const n = Number(String(lines[i]?.amountNgn ?? '').replace(/,/g, ''));
    if (!Number.isNaN(n) && n > 0) {
      includedIndices.push(i);
      sum += roundMoneyLocal(n);
    }
  }
  if (includedIndices.length === 0 || sum <= 0) return lines;
  if (Math.abs(sum - target) <= AMOUNT_LINE_TOL) return lines;

  const scale = target / sum;
  const next = lines.map((l) => ({ ...l }));
  let allocated = 0;
  for (let j = 0; j < includedIndices.length; j += 1) {
    const i = includedIndices[j];
    const raw = Number(String(lines[i]?.amountNgn ?? '').replace(/,/g, ''));
    const isLast = j === includedIndices.length - 1;
    const amt = isLast ? target - allocated : roundMoneyLocal(raw * scale);
    next[i] = { ...next[i], amountNgn: amt };
    allocated += amt;
  }
  return next;
}

/** API rows use snake_case; workspace snapshot uses camelCase — unify for the quotation dropdown. */
function normalizeQuoteForRefundSelect(q) {
  if (!q?.id) return null;
  const paid = Number(q.paid_ngn ?? q.paidNgn ?? 0);
  if (paid <= 0) return null;
  const total = Number(q.total_ngn ?? q.totalNgn ?? 0);
  const totalRefunded = Number(q.total_refunded ?? q.totalRefunded ?? 0);
  const eligibleRefundCategories = Array.isArray(q.eligible_refund_categories)
    ? q.eligible_refund_categories.map((x) => String(x || '').trim()).filter(Boolean)
    : Array.isArray(q.eligibleRefundCategories)
      ? q.eligibleRefundCategories.map((x) => String(x || '').trim()).filter(Boolean)
      : [];
  const suggestedPreviewNgn = Math.round(
    Number(q.suggested_preview_amount_ngn ?? q.suggestedPreviewAmountNgn) || 0
  );
  return {
    id: String(q.id),
    customer_name: q.customer_name ?? q.customer ?? '—',
    paid_ngn: paid,
    total_ngn: total,
    total_refunded_ngn: Number.isFinite(totalRefunded) ? totalRefunded : 0,
    eligible_refund_categories: eligibleRefundCategories,
    suggested_preview_amount_ngn: suggestedPreviewNgn,
    dateISO: String(q.dateISO ?? q.date_iso ?? '').trim(),
    status: String(q.status ?? '').trim(),
  };
}

/**
 * @param {{
 *   isOpen: boolean;
 *   onClose: () => void;
 *   mode?: 'create'|'approve'|'view';
 *   record?: object | null;
 *   onPersist?: (payload: object) => void;
 *   requesterLabel?: string;
 *   approverLabel?: string;
 *   quotations?: object[];
 *   receipts?: object[];
 *   cuttingLists?: object[];
 *   availableStock?: object[];
 *   refunds?: object[];
 *   productionJobs?: object[];
 *   productionJobAccessoryUsage?: object[];
 *   productionJobCoils?: object[];
 * }} props
 */
const RefundModal = ({
  isOpen,
  onClose,
  mode = 'create',
  record = null,
  onPersist,
  quotations = [],
  refunds = [],
  productionJobs = [],
  productionJobAccessoryUsage = [],
  productionJobCoils = [],
}) => {
  const { show: showToast } = useToast();
  const [form, setForm] = useState(() => initFormFromRecord(record));
  const [eligibleQuotes, setEligibleQuotes] = useState([]);
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [syncPaidId, setSyncPaidId] = useState('');
  const [syncPaidBusy, setSyncPaidBusy] = useState(false);
  const [syncPaidError, setSyncPaidError] = useState('');
  const [approvalStatus, setApprovalStatus] = useState(() =>
    record?.status === 'Rejected' ? 'Rejected' : 'Approved'
  );
  const [approvalDate, setApprovalDate] = useState(() => record?.approvalDate ?? '');
  const [approvedAmountNgn, setApprovedAmountNgn] = useState(() =>
    String(refundApprovedAmount(record) || Number(record?.amountNgn) || '')
  );
  const [managerComments, setManagerComments] = useState(() => record?.managerComments ?? '');
  const [saving, setSaving] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [warnings, setWarnings] = useState([]);
  const [substitutionPerMeterBreakdown, setSubstitutionPerMeterBreakdown] = useState([]);
  const [blockedRefundCategories, setBlockedRefundCategories] = useState([]);
  const [intelligence, setIntelligence] = useState({
    receipts: [],
    cuttingLists: [],
    summary: { producedMeters: 0, accessoriesSummary: { lines: [] } },
    dataQualityIssues: [],
  });
  const [loadingIntelligence, setLoadingIntelligence] = useState(false);
  const [lastPreviewSnapshot, setLastPreviewSnapshot] = useState(null);
  const [previewRemainingNgn, setPreviewRemainingNgn] = useState(null);
  const [eligibleRefundCategoriesFromPreview, setEligibleRefundCategoriesFromPreview] = useState(null);
  /** When true, next preview includes Customer commission (opt-in; capped server-side by floor + headroom). */
  const [includeCommissionInPreview, setIncludeCommissionInPreview] = useState(false);
  /** Optional list ₦/m for the **produced** coil when `price_list_items` has no row for coil gauge + design (substitution preview). */
  const [substitutionWorkbookPpmOverride, setSubstitutionWorkbookPpmOverride] = useState('');
  const [refundIntelExpanded, setRefundIntelExpanded] = useState(() => mode !== 'create');
  /** From refund preview: paid on quote vs overpay split (ledger RECEIPT + OVERPAY_ADVANCE). */
  const [moneyContext, setMoneyContext] = useState(null);
  const [refundGuideOpen, setRefundGuideOpen] = useState(false);
  /** Filter quotation dropdown by quote date (YYYY-MM-DD); empty = all dates. */
  const [quotationPickDate, setQuotationPickDate] = useState('');
  /** Typeahead / paste quotation id (Step 1). */
  const [quotationSearchText, setQuotationSearchText] = useState('');
  const [quotationSuggestOpen, setQuotationSuggestOpen] = useState(false);
  /** Seeded create / edge cases: quotation ref allowed even if not yet in eligible pick list. */
  const [quotationServerVerifiedRef, setQuotationServerVerifiedRef] = useState('');
  const [manualQuotationVerifyBusy, setManualQuotationVerifyBusy] = useState(false);
  const [manualQuotationVerifyError, setManualQuotationVerifyError] = useState('');

  const productionFingerprintRef = useRef('');
  const previewLoadedForQuoteRef = useRef('');
  /** Monotonic counter so out-of-order `/api/refunds/preview` responses cannot overwrite newer results (e.g. after production accessory correction). */
  const refundsPreviewSeqRef = useRef(0);
  /** Line key from last preview that carried substitution credit — breakdown stays visible if category is renamed. */
  const substitutionBreakdownLineKeyRef = useRef('');

  useEffect(() => {
    if (!isOpen) setRefundGuideOpen(false);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setRefundIntelExpanded(mode !== 'create');
  }, [isOpen, mode]);

  const fetchEligibleQuotes = useCallback(async () => {
    setLoadingQuotes(true);
    const { ok, data } = await apiFetch('/api/refunds/eligible-quotations');
    setLoadingQuotes(false);
    if (ok && data?.ok) {
      setEligibleQuotes(data.quotations || []);
    } else {
      setEligibleQuotes([]);
    }
  }, []);

  const syncPaidFromLedger = useCallback(async () => {
    const id = String(syncPaidId || '').trim();
    if (!id) {
      setSyncPaidError('Enter the quotation id (e.g. QT-KD-26-0001).');
      return;
    }
    setSyncPaidBusy(true);
    setSyncPaidError('');
    const { ok, data } = await apiFetch(`/api/quotations/${encodeURIComponent(id)}/sync-paid-from-ledger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    setSyncPaidBusy(false);
    if (!ok || !data?.ok) {
      setSyncPaidError(data?.error || 'Could not sync payment total.');
      return;
    }
    const n = Number(data.paidNgn) || 0;
    showToast(
      n > 0
        ? `Updated ${id}: paid total is now ₦${n.toLocaleString()} — it should appear in the list.`
        : `Updated ${id}: ledger shows ₦0 paid toward this quote (check receipt is linked to this id).`,
      { variant: n > 0 ? 'success' : 'info' }
    );
    void fetchEligibleQuotes();
  }, [syncPaidId, fetchEligibleQuotes, showToast]);

  /* Sync form state when the modal opens or the record/mode changes (intentional reset). */
   
  useEffect(() => {
    if (!isOpen) return;
    const initialForm = initFormFromRecord(record);
    setForm(initialForm);
    setQuotationSearchText(String(initialForm.quotationRef || '').trim());
    setQuotationSuggestOpen(false);
    setQuotationServerVerifiedRef('');
    setApprovalStatus(record?.status === 'Rejected' ? 'Rejected' : 'Approved');
    setApprovalDate(record?.approvalDate ?? '');
    setApprovedAmountNgn(String(refundApprovedAmount(record) || Number(record?.amountNgn) || ''));
    setManagerComments(record?.managerComments ?? '');
    setSaving(false);
    setPreviewLoading(false);
    setPreviewError('');
    setWarnings([]);
    setSubstitutionPerMeterBreakdown([]);
    setBlockedRefundCategories([]);
    setSyncPaidId('');
    setSyncPaidError('');
    setMoneyContext(null);
    setQuotationPickDate('');
    setLastPreviewSnapshot(null);
    setPreviewRemainingNgn(null);
    setEligibleRefundCategoriesFromPreview(null);
    setIncludeCommissionInPreview(false);
    setSubstitutionWorkbookPpmOverride('');
    setManualQuotationVerifyBusy(false);
    setManualQuotationVerifyError('');

    if (mode === 'create') {
      void fetchEligibleQuotes();
    }
  }, [isOpen, record, mode, fetchEligibleQuotes]);

  /** Quotation refs that already have a refund still “on file” (rejected / cancel-before-pay excluded). */
  const quotationRefsWithBlockingRefund = useMemo(() => {
    const s = new Set();
    for (const r of refunds) {
      const ref = String(r.quotationRef || '').trim();
      if (!ref || refundStatusIsWithdrawn(r.status)) continue;
      s.add(ref);
    }
    return s;
  }, [refunds]);

  /**
   * When snapshot includes jobs, quotes need a Completed or Cancelled production job for the gate,
   * unless they are paid Void (sales cancellation) — matched server-side in `getEligibleRefundQuotations`.
   */
  const quotationRefsProduced = useMemo(() => {
    if (!Array.isArray(productionJobs) || productionJobs.length === 0) return null;
    const s = new Set();
    for (const j of productionJobs) {
      if (!productionJobStatusClosesRefundEligibility(j.status)) continue;
      const ref = String(j.quotationRef || '').trim();
      if (ref) s.add(ref);
    }
    return s;
  }, [productionJobs]);

  /** Server-eligible quotes only; keep an explicitly-selected quote visible as an exception. */
  const quotationPickMerged = useMemo(() => {
    const byId = new Map();
    for (const q of eligibleQuotes) {
      const n = normalizeQuoteForRefundSelect(q);
      if (n) byId.set(n.id, n);
    }
    const activeRef = String(form.quotationRef || '').trim();
    if (activeRef && !byId.has(activeRef)) {
      const forced = normalizeQuoteForRefundSelect(
        quotations.find((x) => String(x.id).trim() === activeRef)
      );
      if (forced) byId.set(forced.id, forced);
    }
    const merged = Array.from(byId.values()).sort((a, b) => b.paid_ngn - a.paid_ngn);
    return merged.filter((q) => {
      const id = String(q.id).trim();
      if (String(form.quotationRef || '').trim() === id) return true;
      const remainingNgn = Math.max(
        0,
        Math.round(Number(q.paid_ngn) || 0) - Math.round(Number(q.total_refunded_ngn) || 0)
      );
      if (remainingNgn <= MIN_REFUND_QUOTATION_REMAINING_NGN) return false;
      if (!quotationOrderFullySettledForRefundPicker(q.paid_ngn, q.total_ngn)) return false;
      if (!Array.isArray(q.eligible_refund_categories) || q.eligible_refund_categories.length === 0) {
        return false;
      }
      const suggestedPreviewNgn =
        Math.round(Number(q.suggested_preview_amount_ngn ?? q.suggestedPreviewAmountNgn) || 0);
      if (suggestedPreviewNgn < MIN_REFUND_QUOTATION_REMAINING_NGN) return false;
      if (quotationRefsWithBlockingRefund.has(id)) return false;
      if (quotationRefsProduced != null && !quotationRefsProduced.has(id)) {
        const full = quotations.find((x) => String(x.id).trim() === id);
        const voidPaid =
          quotationVoidPaidRefundEligible(q) || quotationVoidPaidRefundEligible(full);
        if (!voidPaid) return false;
      }
      return true;
    });
  }, [
    eligibleQuotes,
    quotations,
    quotationRefsWithBlockingRefund,
    quotationRefsProduced,
    mode,
    form.quotationRef,
  ]);

  /** Dropdown list (optional filter by quotation date). */
  const quotationPickList = useMemo(() => {
    const d = String(quotationPickDate || '').trim();
    if (!d) return quotationPickMerged;
    return quotationPickMerged.filter((q) => quotationYmdForPickRow(q, quotations) === d);
  }, [quotationPickMerged, quotationPickDate, quotations]);

  /** Paid/total for intelligence panel when pick row is missing (date filter or manual-only quotation). */
  const selectedQuoteMoneyRow = useMemo(() => {
    const ref = String(form.quotationRef || '').trim();
    if (!ref) return null;
    return (
      quotationPickMerged.find((q) => q.id === ref) ||
      normalizeQuoteForRefundSelect(quotations.find((x) => String(x.id) === ref))
    );
  }, [form.quotationRef, quotationPickMerged, quotations]);

  const quotationSearchFiltered = useMemo(() => {
    const q = String(quotationSearchText || '').trim().toLowerCase();
    if (!q) return quotationPickList;
    return quotationPickList.filter((row) => {
      const id = String(row.id || '').toLowerCase();
      const name = String(row.customer_name || '').toLowerCase();
      return id.includes(q) || name.includes(q);
    });
  }, [quotationPickList, quotationSearchText]);

  const refundMoneyBreakdown = useMemo(() => {
    const ref = form.quotationRef;
    if (!ref) return { booked: 0, overpay: 0, cashIn: 0 };
    const pick =
      quotationPickMerged.find((q) => q.id === ref) ||
      normalizeQuoteForRefundSelect(quotations.find((x) => String(x.id) === ref));
    const booked = moneyContext ? moneyContext.paidOnQuoteNgn : pick?.paid_ngn ?? 0;
    const overpay = moneyContext
      ? moneyContext.overpayAdvanceNgn
      : Number(intelligence.summary?.overpayAdvanceNgn) || 0;
    const cashIn = moneyContext ? moneyContext.quotationCashInNgn : booked + overpay;
    return { booked, overpay, cashIn };
  }, [form.quotationRef, quotationPickMerged, quotations, moneyContext, intelligence.summary]);

  /** Sum of cash from sales receipts linked to this quotation (intelligence payload). */
  const refundIntelReceiptsTotalNgn = useMemo(
    () => (intelligence.receipts || []).reduce((s, r) => s + (Number(r.amountNgn) || 0), 0),
    [intelligence.receipts]
  );

  /** When to show receipt vs advance vs booked paid explainer (avoids noise when totals match). */
  const showRefundPaidBreakdown = useMemo(() => {
    const adv = Number(intelligence.summary?.advanceAppliedNgn) || 0;
    const ra = Number(intelligence.summary?.receiptAllocatedSumNgn) || 0;
    const booked = Number(intelligence.summary?.bookedOnQuotationNgn) || 0;
    if (adv > 0) return true;
    if (booked <= 0 && ra <= 0) return false;
    return Math.abs(booked - ra - adv) > 1;
  }, [intelligence.summary]);

  const selectedQuotationSnapshot = useMemo(() => {
    const ref = String(form.quotationRef || '').trim();
    if (!ref) return null;
    return quotations.find((x) => String(x.id) === ref) ?? null;
  }, [form.quotationRef, quotations]);

  /** Thickest gauge among quote header + product lines — matches server substitution comparison. */
  const refundQuotationGaugeDisplay = useMemo(() => {
    const q = selectedQuotationSnapshot;
    if (!q) return { value: '—', hint: '' };
    const shape = quotationLinesJsonShapeForGauge(q);
    const picked = shape ? String(quotedGaugeLabelForSubstitutionComparison(shape) || '').trim() : '';
    const header = String(q.materialGauge || q.material_gauge || '').trim();
    const value = picked || header || '—';
    const hint =
      header && picked && header !== picked
        ? `Header shows ${header}; refund substitution compares ${picked} to the coil gauge below.`
        : '';
    return { value, hint };
  }, [selectedQuotationSnapshot]);

  const refundProductionConversionSummary = useMemo(() => {
    const ref = String(form.quotationRef || '').trim();
    if (!ref) return null;
    const jobs = (productionJobs || []).filter((j) => String(j.quotationRef || '').trim() === ref);
    const coils = productionJobCoils || [];
    if (jobs.length === 0) {
      return {
        jobs: [],
        emptyMessage: 'No production jobs linked to this quotation in the workspace.',
      };
    }
    return {
      jobs: jobs.map((j) => {
        const jid = String(j.jobID || '').trim();
        const jobCoils = coils
          .filter((c) => String(c.jobID || c.job_id || '').trim() === jid)
          .slice()
          .sort((a, b) => (Number(a.sequenceNo ?? a.sequence_no) || 0) - (Number(b.sequenceNo ?? b.sequence_no) || 0));
        return {
          jobID: j.jobID,
          status: j.status,
          conversionAlertState: String(j.conversionAlertState || 'Pending').trim() || 'Pending',
          managerReviewRequired: Boolean(j.managerReviewRequired),
          productName: String(j.productName || '').trim() || '—',
          coilRows: jobCoils.map((c) => ({
            id: c.id,
            coilNo: String(c.coilNo || c.coil_no || '').trim(),
            gaugeLabel: String(c.gaugeLabel || c.gauge_label || '').trim(),
            openingWeightKg: Number(c.openingWeightKg ?? c.opening_weight_kg),
            closingWeightKg: Number(c.closingWeightKg ?? c.closing_weight_kg),
            consumedWeightKg: Number(c.consumedWeightKg ?? c.consumed_weight_kg),
            metersProduced: Number(c.metersProduced ?? c.meters_produced),
            actualConversionKgPerM: c.actualConversionKgPerM ?? c.actual_conversion_kg_per_m,
          })),
        };
      }),
      emptyMessage: null,
    };
  }, [form.quotationRef, productionJobs, productionJobCoils]);

  /** Products, accessories, and services from the quotation with accessory supplied / shortfall from intelligence. */
  const refundIntelQuotationOrderRows = useMemo(() => {
    const q = selectedQuotationSnapshot;
    if (!q) return [];
    const flat = flattenQuotationLineItems(q);
    if (flat.length === 0) return [];
    const accLines = intelligence.summary?.accessoriesSummary?.lines || [];
    return flat.map((line, idx) => {
      const acc = findAccessoryFulfillmentRow(line, accLines);
      const ordered = acc != null ? Number(acc.ordered) || 0 : parseQuoteQtyNumeric(line.qty);
      const supplied = acc != null ? Number(acc.supplied) || 0 : null;
      const shortfall = acc != null ? Math.max(0, Number(acc.shortfall) || 0) : null;
      return {
        key: `${line.category}-${line.id || line.name}-${idx}`,
        categoryLabel:
          line.category === 'products' ? 'Product' : line.category === 'accessories' ? 'Accessory' : 'Service',
        name: String(line.name || '—'),
        qtyLabel: parseQuoteQtyDisplay(line.qty, line.unit),
        unitPriceLabel: formatQuoteUnitPriceLabel(line.unitPrice),
        ordered,
        supplied,
        shortfall,
        isAccessoryTracked: !!acc,
      };
    });
  }, [selectedQuotationSnapshot, intelligence.summary?.accessoriesSummary?.lines]);

  const fetchIntelligence = async (quoteRef, previewSeq) => {
    if (!quoteRef) return;
    setLoadingIntelligence(true);
    // Fetch detailed intelligence for the sidebar
    const { ok, data } = await apiFetch(`/api/refunds/intelligence?quotationRef=${encodeURIComponent(quoteRef)}`);
    setLoadingIntelligence(false);
    if (previewSeq != null && previewSeq !== refundsPreviewSeqRef.current) return;
    if (ok && data?.ok) {
      setIntelligence({
        receipts: data.receipts || [],
        cuttingLists: data.cuttingLists || [],
        summary: data.summary || { producedMeters: 0, accessoriesSummary: { lines: [] } },
        dataQualityIssues: Array.isArray(data.dataQualityIssues) ? data.dataQualityIssues : [],
      });
    }
  };

  const generatePreview = useCallback(
    async (quoteRef, commissionOverride) => {
      if (!quoteRef) return;
      const includeComm =
        commissionOverride !== undefined ? Boolean(commissionOverride) : includeCommissionInPreview;
      const seq = ++refundsPreviewSeqRef.current;
      setPreviewLoading(true);
      setPreviewError('');
      setWarnings([]);
      setSubstitutionPerMeterBreakdown([]);
      substitutionBreakdownLineKeyRef.current = '';
      const subPpm = Number(String(substitutionWorkbookPpmOverride ?? '').replace(/,/g, ''));
      const body = {
        quotationRef: quoteRef,
        includeCustomerCommission: includeComm,
        ...(Number.isFinite(subPpm) && subPpm > 0 ? { substitutePricePerMeterNgn: Math.round(subPpm) } : {}),
      };
      const { ok, data } = await apiFetch('/api/refunds/preview', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      if (seq !== refundsPreviewSeqRef.current) return;
      setPreviewLoading(false);
      if (!ok || !data?.ok || !data?.preview) {
        previewLoadedForQuoteRef.current = '';
        setMoneyContext(null);
        setPreviewRemainingNgn(null);
        setLastPreviewSnapshot(null);
        setEligibleRefundCategoriesFromPreview(null);
        setPreviewError(data?.error || 'Could not generate refund preview.');
        substitutionBreakdownLineKeyRef.current = '';
        return;
      }

      const preview = data.preview;
      previewLoadedForQuoteRef.current = quoteRef;
      setEligibleRefundCategoriesFromPreview(
        Array.isArray(preview.eligibleRefundCategories) ? preview.eligibleRefundCategories : null
      );
      setPreviewRemainingNgn(
        preview.remainingRefundableNgn != null ? Math.round(Number(preview.remainingRefundableNgn)) : null
      );
      setLastPreviewSnapshot({
        capturedAtISO: new Date().toISOString(),
        engineVersion: REFUND_PREVIEW_VERSION,
        quotationRef: quoteRef,
        suggestedLines: preview.suggestedLines || [],
        warnings: preview.warnings || [],
        suggestedAmountNgn: Number(preview.suggestedAmountNgn) || 0,
        substitutionPerMeterBreakdown: preview.substitutionPerMeterBreakdown || [],
        quotedMeters: preview.quotedMeters,
        actualMeters: preview.actualMeters,
        pricePerMeterNgn: preview.pricePerMeterNgn,
        quoteTotalNgn: preview.quoteTotalNgn,
        quotationCashInNgn: preview.quotationCashInNgn,
      });
      setMoneyContext({
        paidOnQuoteNgn: Number(preview.paidOnQuoteNgn) || 0,
        overpayAdvanceNgn: Number(preview.overpayAdvanceNgn) || 0,
        quotationCashInNgn: Number(preview.quotationCashInNgn) || 0,
        quoteTotalNgn: Number(preview.quoteTotalNgn) || 0,
      });

      setWarnings(preview.warnings || []);
      setSubstitutionPerMeterBreakdown(
        Array.isArray(preview.substitutionPerMeterBreakdown) ? preview.substitutionPerMeterBreakdown : []
      );
      const blocked = Array.isArray(preview.blockedRefundCategories) ? preview.blockedRefundCategories : [];
      setBlockedRefundCategories(blocked);

      const positiveSuggested = (preview.suggestedLines || []).filter((s) => roundMoneyLocal(s.amountNgn) > 0);
      const breakdownRows = positiveSuggested.map((s, idx) => ({
        lineKey: `p-${idx}-${String(s.category || 'line')}`,
        include: true,
        label: s.label ?? '',
        amountNgn: String(s.amountNgn ?? ''),
        category: s.category ?? '',
        appliesToCategories: s.appliesToCategories,
      }));

      let substitutionAnchorLineKey = '';
      for (let i = 0; i < positiveSuggested.length; i++) {
        if (String(positiveSuggested[i]?.category || '').trim() === 'Substitution Difference') {
          substitutionAnchorLineKey = `p-${i}-${String(positiveSuggested[i].category || 'line')}`;
          break;
        }
      }
      substitutionBreakdownLineKeyRef.current = substitutionAnchorLineKey;

      setForm((f) => ({
        ...f,
        customerID: preview.customerID,
        customerName: preview.customerName,
        alreadyRefundedCategories: preview.alreadyRefundedCategories || [],
        calculationLines: breakdownRows.length > 0 ? breakdownRows : [emptyLine()],
        reasonCategory: deriveReasonCategoriesFromLines(breakdownRows),
      }));

      fetchIntelligence(quoteRef, seq);
    },
    [includeCommissionInPreview, substitutionWorkbookPpmOverride]
  );

  const resetPreviewStateForQuoteChange = useCallback(() => {
    productionFingerprintRef.current = '';
    previewLoadedForQuoteRef.current = '';
    setMoneyContext(null);
    setPreviewRemainingNgn(null);
    setLastPreviewSnapshot(null);
    setEligibleRefundCategoriesFromPreview(null);
    setIncludeCommissionInPreview(false);
    setSubstitutionWorkbookPpmOverride('');
    substitutionBreakdownLineKeyRef.current = '';
  }, []);

  const applyVerifiedQuotationRef = useCallback(
    (ref) => {
      const id = String(ref || '').trim();
      setQuotationServerVerifiedRef(id);
      resetPreviewStateForQuoteChange();
      setForm((f) => ({ ...f, quotationRef: id, reasonCategory: [] }));
      setQuotationSearchText(id);
      setQuotationSuggestOpen(false);
      setManualQuotationVerifyError('');
      if (id) void generatePreview(id, false);
    },
    [generatePreview, resetPreviewStateForQuoteChange]
  );

  const verifyAndApplyQuotationId = useCallback(async () => {
    const ref = String(quotationSearchText || '').trim();
    if (!ref) {
      setManualQuotationVerifyError('Enter a quotation id (e.g. QT-…).');
      return;
    }
    setManualQuotationVerifyBusy(true);
    setManualQuotationVerifyError('');
    const { ok, data } = await apiFetch(
      `/api/refunds/eligibility-check?quotationRef=${encodeURIComponent(ref)}`
    );
    setManualQuotationVerifyBusy(false);
    if (!ok || !data?.ok) {
      setManualQuotationVerifyError(data?.error || 'Could not verify quotation.');
      return;
    }
    const allowed =
      data.wouldAppearInRefundQuotationDropdown === true || data.manualEntryRefundAllowed === true;
    if (!allowed) {
      const reasons = Array.isArray(data.blockingReasons) ? data.blockingReasons.filter(Boolean).join(' ') : '';
      setManualQuotationVerifyError(reasons || 'This quotation cannot be used for a refund request.');
      return;
    }
    applyVerifiedQuotationRef(ref);
  }, [quotationSearchText, applyVerifiedQuotationRef]);

  const generatePreviewRef = useRef(generatePreview);
  useEffect(() => {
    generatePreviewRef.current = generatePreview;
  }, [generatePreview]);

  const includeCommissionInPreviewRef = useRef(includeCommissionInPreview);
  useEffect(() => {
    includeCommissionInPreviewRef.current = includeCommissionInPreview;
  }, [includeCommissionInPreview]);

  /** When workspace `productionJobs` updates (e.g. job completed, metres posted), re-fetch preview so substitution / metres stay in sync. */
  useEffect(() => {
    if (!isOpen) {
      productionFingerprintRef.current = '';
      previewLoadedForQuoteRef.current = '';
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || mode !== 'create') return;
    const ref = String(form.quotationRef || '').trim();
    if (!ref) {
      productionFingerprintRef.current = '';
      previewLoadedForQuoteRef.current = '';
      return;
    }
    const fp = refundWorkspaceSnapshotFingerprint(productionJobs, productionJobAccessoryUsage, ref);
    const prev = productionFingerprintRef.current;
    if (fp === prev) return;
    productionFingerprintRef.current = fp;
    if (prev === '') {
      if (fp !== '' && previewLoadedForQuoteRef.current === ref) {
        void generatePreview(ref, includeCommissionInPreviewRef.current);
      }
      return;
    }
    void generatePreview(ref, includeCommissionInPreviewRef.current);
  }, [isOpen, mode, form.quotationRef, productionJobs, productionJobAccessoryUsage, generatePreview]);

  const handleQuoteChange = (ref) => {
    setQuotationServerVerifiedRef('');
    resetPreviewStateForQuoteChange();
    setManualQuotationVerifyError('');
    setForm((f) => ({ ...f, quotationRef: ref, reasonCategory: [] }));
    setQuotationSearchText(String(ref || '').trim());
    setQuotationSuggestOpen(false);
    if (ref) {
      void generatePreview(ref, false);
    }
  };

  useEffect(() => {
    if (mode !== 'create' || !form.quotationRef || loadingQuotes) return;
    const inList = quotationPickMerged.some((q) => q.id === form.quotationRef);
    const serverOk = form.quotationRef === quotationServerVerifiedRef;
    if (!inList && !serverOk) {
      setMoneyContext(null);
      setForm((f) => ({ ...f, quotationRef: '', reasonCategory: [] }));
      setQuotationServerVerifiedRef('');
    }
  }, [quotationPickMerged, form.quotationRef, mode, loadingQuotes, quotationServerVerifiedRef]);

  /** Create mode opened with a seeded quotation (e.g. Sales sidebar) — same as picking the quote in Step 1. */
  const seededCreatePreviewKeyRef = useRef('');
  useEffect(() => {
    if (!isOpen || mode !== 'create') {
      seededCreatePreviewKeyRef.current = '';
      return;
    }
    const ref = String(record?.quotationRef || record?.quotation_ref || '').trim();
    if (!ref || record?.refundID) {
      seededCreatePreviewKeyRef.current = '';
      return;
    }
    if (seededCreatePreviewKeyRef.current === ref) return;
    seededCreatePreviewKeyRef.current = ref;
    setQuotationServerVerifiedRef(ref);
    void generatePreviewRef.current(ref, false);
  }, [isOpen, mode, record?.quotationRef, record?.quotation_ref, record?.refundID]);

  const readOnly = mode === 'view';
  const showApproval = mode === 'approve' && record?.status === 'Pending';
  const identityLocked = mode !== 'create';

  const refundHydrateKey = useMemo(
    () =>
      isOpen
        ? `${mode}\0${record?.refundID ?? record?.refundId ?? record?.id ?? ''}\0${String(record?.quotationRef ?? record?.quotation_ref ?? '').trim()}`
        : '',
    [isOpen, mode, record?.refundID, record?.refundId, record?.id, record?.quotationRef, record?.quotation_ref]
  );

  const { captureEdited, wrapClose, abandonUnsavedAndRun } = useTrackedUnsavedForm('modal-refund', {
    isOpen,
    blockTracking: readOnly,
    hydrateKey: refundHydrateKey,
  });
  const handleClose = () => wrapClose(() => onClose());

  const approvalMoneyContext = useMemo(() => {
    if (!showApproval) return null;
    const ref = String(record?.quotationRef || '').trim();
    if (!ref) return null;
    const q =
      (quotations || []).find((x) => String(x.id) === ref) ||
      quotationPickMerged.find((x) => x.id === ref);
    const paidNgn = Math.round(Number(q?.paid_ngn ?? q?.paidNgn ?? 0)) || 0;
    let sumOthers = 0;
    for (const r of refunds || []) {
      if (String(r.quotationRef || '').trim() !== ref) continue;
      if (String(r.refundID || '') === String(record?.refundID || '')) continue;
      if (refundStatusIsWithdrawn(r.status)) continue;
      sumOthers += Math.round(Number(r.amountNgn) || 0);
    }
    const maxApprovable = Math.max(0, paidNgn - sumOthers);
    const requested = Math.round(Number(record?.amountNgn) || 0);
    return { paidNgn, sumOthers, maxApprovable, requested };
  }, [showApproval, record, quotations, quotationPickMerged, refunds]);

  const recordApprovedAmount = refundApprovedAmount(record) || Number(record?.approved_amount_ngn) || 0;
  const recordOutstandingAmount = refundOutstandingAmount(record);

  const derivedReasonCategories = useMemo(
    () => deriveReasonCategoriesFromLines(form.calculationLines),
    [form.calculationLines]
  );

  const excludedRefundHints = useMemo(() => {
    const excluded = [];
    const pool = eligibleRefundCategoriesFromPreview != null ? eligibleRefundCategoriesFromPreview : null;
    const poolSet = pool != null ? new Set(pool) : null;
    for (const cat of REFUND_REASON_CATEGORIES) {
      if (poolSet && !poolSet.has(cat)) continue;
      if (form.alreadyRefundedCategories.includes(cat)) {
        excluded.push({ cat, reason: 'already' });
      } else if (blockedRefundCategories.includes(cat)) {
        excluded.push({ cat, reason: 'blocked' });
      }
    }
    return excluded;
  }, [form.alreadyRefundedCategories, blockedRefundCategories, eligibleRefundCategoriesFromPreview]);

  const label = 'text-[9px] font-semibold text-slate-400 uppercase tracking-wide ml-0.5 mb-1 block';
  const input =
    'w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs font-semibold text-[#134e4a] outline-none focus:ring-2 focus:ring-red-500/15 disabled:opacity-60';
  const inputIntelDark =
    'w-full bg-slate-800/90 border border-slate-600 rounded-lg py-2 px-3 text-xs font-semibold text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-rose-500/35 disabled:opacity-50';

  const setLine = (idx, patch) => {
    setForm((f) => ({
      ...f,
      calculationLines: f.calculationLines.map((row, i) => (i === idx ? { ...row, ...patch } : row)),
    }));
  };

  const addLine = () => {
    setForm((f) => ({ ...f, calculationLines: [...f.calculationLines, emptyLine()] }));
  };

  const removeLine = (idx) => {
    setForm((f) => ({
      ...f,
      calculationLines:
        f.calculationLines.length <= 1 ? [emptyLine()] : f.calculationLines.filter((_, i) => i !== idx),
    }));
  };

  const submitRequest = async () => {
    if (!form.quotationRef || !form.amountNgn) return;
    const amountNgn = Number(form.amountNgn);
    if (Number.isNaN(amountNgn) || amountNgn <= 0) return;
    const reasonCategory = deriveReasonCategoriesFromLines(form.calculationLines);
    if (reasonCategory.length === 0) {
      setPreviewError('Include at least one line with a positive amount (check the Include box).');
      return;
    }
    if (reasonCategory.some((c) => blockedRefundCategories.includes(c))) {
      setPreviewError('Uncheck or remove lines for categories that are not allowed for this quotation.');
      return;
    }
    const payeeName = String(form.payeeName || '').trim();
    const payeeAccountNo = String(form.payeeAccountNo || '').trim();
    const payeeBankName = String(form.payeeBankName || '').trim();
    if (!payeeName || !payeeAccountNo || !payeeBankName) {
      setPreviewError('Complete Pay to: beneficiary name, account number, and bank name.');
      return;
    }

    const calculationLines = form.calculationLines
      .filter((l) => l.include !== false)
      .map((l) => {
        const row = {
          label: l.label.trim(),
          amountNgn: Number(l.amountNgn),
          category: l.category,
        };
        if (Array.isArray(l.appliesToCategories) && l.appliesToCategories.length) {
          row.appliesToCategories = l.appliesToCategories;
        }
        return row;
      })
      .filter((l) => l.label && !Number.isNaN(l.amountNgn) && l.amountNgn > 0);

    setPreviewError('');
    setSaving(true);
    const result = await onPersist?.({
      refundID: record?.refundID ?? `RF-2026-${String(Date.now()).slice(-4)}`,
      customerID: form.customerID,
      customer: form.customerName,
      quotationRef: form.quotationRef,
      reasonCategory,
      reason: form.reasonNotes.trim() || reasonCategory.join(', '),
      amountNgn,
      calculationLines,
      calculationNotes: form.calculationNotes.trim(),
      status: 'Pending',
      previewSnapshot: lastPreviewSnapshot,
      payeeName,
      payeeAccountNo,
      payeeBankName,
    });
    setSaving(false);
    if (result?.ok !== false) abandonUnsavedAndRun(() => onClose());
  };

  const submitApproval = async () => {
    if (!record?.refundID) return;
    const nextApprovedAmountNgn =
      approvalStatus === 'Approved'
        ? Number(approvedAmountNgn) || recordApprovedAmount || Number(record?.amountNgn) || 0
        : 0;

    if (approvalStatus === 'Approved' && nextApprovedAmountNgn <= 0) {
      setPreviewError('Approved amount must be positive.');
      return;
    }

    const requestedTotal = Math.round(Number(record?.amountNgn) || 0);
    const lineSum = sumLines(form.calculationLines);
    let linesForDecision = form.calculationLines;

    if (approvalStatus === 'Approved') {
      if (Math.abs(lineSum - nextApprovedAmountNgn) <= AMOUNT_LINE_TOL) {
        linesForDecision = form.calculationLines;
      } else if (
        Math.abs(lineSum - requestedTotal) <= AMOUNT_LINE_TOL &&
        nextApprovedAmountNgn <= requestedTotal + AMOUNT_LINE_TOL
      ) {
        linesForDecision = scaleCalculationLinesToApprovedAmount(
          form.calculationLines,
          nextApprovedAmountNgn
        );
        const check = sumLines(linesForDecision);
        if (Math.abs(check - nextApprovedAmountNgn) > AMOUNT_LINE_TOL) {
          setPreviewError(
            `Breakdown lines could not be aligned to ₦${nextApprovedAmountNgn.toLocaleString(
              'en-NG'
            )}. Edit line amounts so included lines sum to the approved total.`
          );
          return;
        }
      } else {
        setPreviewError(
          `Included lines total ₦${Math.round(lineSum).toLocaleString(
            'en-NG'
          )} but approved amount is ₦${nextApprovedAmountNgn.toLocaleString(
            'en-NG'
          )}. Edit lines so they match, or leave lines matching the original request to allow proportional scaling.`
        );
        return;
      }
    }

    setPreviewError('');
    setSaving(true);
    const result = await onPersist?.({
      ...record,
      status: approvalStatus,
      approvalDate: approvalDate.trim() || new Date().toISOString().slice(0, 10),
      managerComments: managerComments.trim(),
      approvedAmountNgn: nextApprovedAmountNgn,
      calculationLines: linesForDecision.map((l) => ({ ...l, amountNgn: Number(l.amountNgn) })),
      calculationNotes: form.calculationNotes.trim(),
    });
    setSaving(false);
    if (result?.ok !== false) abandonUnsavedAndRun(() => onClose());
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (readOnly || saving) return;
    if (showApproval) await submitApproval();
    else await submitRequest();
  };

  const modeBadge =
    mode === 'approve'
      ? 'bg-amber-100 text-amber-900 ring-1 ring-amber-400/40'
      : mode === 'view'
        ? 'bg-slate-200 text-slate-700'
        : 'bg-rose-100 text-rose-800 ring-1 ring-rose-300/40';

  const modeLabel =
    mode === 'approve' ? 'Review' : mode === 'view' ? 'View' : 'New request';

  const formatNgnPrint = (n) =>
    `₦${Math.round(Number(n) || 0).toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;

  const lineSum = sumLines(form.calculationLines);
  const sumMismatch =
    mode === 'create' &&
    lineSum > 0 &&
    Number(form.amountNgn) > 0 &&
    Math.round(lineSum) !== Math.round(Number(form.amountNgn));

  const requestedRefundTotal = Math.round(Number(record?.amountNgn) || 0);
  const approvalWillScaleLines =
    showApproval &&
    approvalStatus === 'Approved' &&
    requestedRefundTotal > 0 &&
    Math.abs(lineSum - requestedRefundTotal) <= AMOUNT_LINE_TOL &&
    Math.abs(lineSum - (Number(approvedAmountNgn) || 0)) > AMOUNT_LINE_TOL &&
    (Number(approvedAmountNgn) || 0) > 0 &&
    (Number(approvedAmountNgn) || 0) <= requestedRefundTotal + AMOUNT_LINE_TOL;

  const approvalSumMismatch =
    showApproval &&
    approvalStatus === 'Approved' &&
    (Number(approvedAmountNgn) || 0) > 0 &&
    Math.abs(lineSum - requestedRefundTotal) > AMOUNT_LINE_TOL &&
    Math.abs(lineSum - (Number(approvedAmountNgn) || 0)) > AMOUNT_LINE_TOL;

  return (
    <ModalFrame isOpen={isOpen} onClose={handleClose}>
      <div className="z-modal-panel max-w-[min(100%,72rem)] w-full min-w-0 max-h-[min(94vh,920px)] flex flex-col mx-auto bg-slate-50 rounded-2xl shadow-2xl transition-all duration-300">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200/60 flex justify-between items-center bg-white/80 backdrop-blur-md rounded-t-2xl shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-rose-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-rose-200 shrink-0">
              <RotateCcw size={24} className="animate-pulse-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  {mode === 'approve' ? 'Refund Approval' : mode === 'view' ? 'Refund Record' : 'Create Refund'}
                </h2>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${modeBadge}`}>
                  {modeLabel}
                </span>
              </div>
              <p className="text-xs font-medium text-slate-500">
                {record?.refundID ? `${record.refundID} · ${record.status}` : 'All refunds must be linked to a Finished Quotation'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {record?.refundID ? (
              <button
                type="button"
                onClick={() => printRefundRecord(record, formatNgnPrint)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                <Printer size={16} aria-hidden />
                Print
              </button>
            ) : null}
            <button
              type="button"
              id="refund-guide-trigger"
              aria-expanded={refundGuideOpen}
              aria-controls="refund-guide-panel"
              onClick={() => setRefundGuideOpen((o) => !o)}
              title="How refunds work"
              className="p-2.5 bg-slate-100 hover:bg-teal-50 text-teal-600 hover:text-teal-800 rounded-xl transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/40"
            >
              <Info size={22} strokeWidth={2.25} aria-hidden />
              <span className="sr-only">Show how refunds work</span>
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="p-2.5 bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition-all duration-200"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        <form
          className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar"
          onSubmit={handleFormSubmit}
          onInput={captureEdited}
          onChange={captureEdited}
        >
          {refundGuideOpen ? (
            <div
              id="refund-guide-panel"
              role="region"
              aria-labelledby="refund-guide-trigger"
              className="flex gap-4 p-4 rounded-xl bg-teal-50 border border-teal-100/50 shadow-sm shadow-teal-100/20"
            >
              <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white shrink-0 mt-0.5">
                <Link2 size={18} aria-hidden />
              </div>
              <div className="space-y-3 min-w-0">
                <div className="space-y-1">
                  <p className="text-sm font-bold text-teal-900">Quotation-linked workflow</p>
                  <p className="text-xs leading-relaxed text-teal-800/80 font-medium">
                    Quotation is the mother of all transactions. Selecting a quotation resolves the customer and loads
                    preview hints (overpayment, metres, services, accessories).{' '}
                    <span className="font-bold text-teal-900">Suggested amounts are not final</span>—always reconcile with
                    receipts, production, and delivery before submitting or approving.
                  </p>
                </div>
                <ul className="text-[11px] leading-relaxed text-teal-900/90 font-medium space-y-1.5 list-disc pl-4 border-t border-teal-200/60 pt-3">
                  <li>Choose a quotation with payment recorded; the preview fills a breakdown — uncheck lines you do not want.</li>
                  <li>Customer commission is optional: use “Add commission to preview” if it applies (capped by minimum selling ₦/m).</li>
                  <li>
                    Enter Pay to details in the Transaction intelligence column so finance can transfer the refund.
                  </li>
                  <li>Submit for approval; after approval, finance records the payout against the refund.</li>
                </ul>
                <div className="border-t border-teal-200/60 pt-3 space-y-1.5">
                  <p className="text-xs font-bold text-teal-900">Which quotations appear in the list?</p>
                  <p className="text-[11px] leading-relaxed text-teal-800/85 font-medium">
                    Listed quotes are <strong className="text-teal-950">fully paid</strong> (booked paid ≥ order total when
                    a total exists), have more than <strong className="text-teal-950">₦{MIN_REFUND_QUOTATION_REMAINING_NGN.toLocaleString('en-NG')} refundable</strong> headroom, production <strong className="text-teal-950">completed</strong> or{' '}
                    <strong className="text-teal-950">cancelled</strong> (or <strong className="text-teal-950">void</strong> with payment), and the server must produce an <strong className="text-teal-950">automatic preview total of at least ₦{MIN_REFUND_QUOTATION_REMAINING_NGN.toLocaleString('en-NG')}</strong> (overpayment, unproduced metres, service lines, etc.). The dropdown shows{' '}
                    <strong className="text-teal-950">all</strong> such matches (scroll). If a sale qualifies but the preview is below that floor (including ₦0), use <strong className="text-teal-950">Use quotation id</strong> — the server confirms eligibility; then enter amounts manually.
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {record?.refundID ? (
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Activity timeline</p>
              <ul className="text-xs text-slate-700 space-y-1.5 font-medium">
                <li>
                  <span className="text-slate-500">Requested</span>{' '}
                  {record.requestedAtISO || record.requested_at_iso || '—'}
                  {record.requestedBy ? ` · ${record.requestedBy}` : ''}
                </li>
                <li>
                  <span className="text-slate-500">Status</span> {record.status || '—'}
                  {record.approvalDate ? ` · Approved ${record.approvalDate}` : ''}
                  {record.approvedBy ? ` · ${record.approvedBy}` : ''}
                </li>
                {(record.approvedAmountNgn != null || record.approved_amount_ngn != null) && (
                  <li>
                    <span className="text-slate-500">Approved amount</span> ₦
                    {Number(record.approvedAmountNgn ?? record.approved_amount_ngn ?? 0).toLocaleString('en-NG')}
                  </li>
                )}
                {record.managerComments ? (
                  <li>
                    <span className="text-slate-500">Manager note</span> {record.managerComments}
                  </li>
                ) : null}
                {record.payeeName || record.payee_name || record.payeeAccountNo || record.payee_account_no || record.payeeBankName || record.payee_bank_name ? (
                  <li className="pt-1 border-t border-slate-100">
                    <span className="text-slate-500 block mb-0.5">Pay to</span>
                    <span className="text-xs font-semibold text-slate-800">
                      {[record.payeeName || record.payee_name, record.payeeBankName || record.payee_bank_name]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                    {record.payeeAccountNo || record.payee_account_no ? (
                      <span className="block text-[11px] font-mono text-slate-600">
                        {record.payeeAccountNo || record.payee_account_no}
                      </span>
                    ) : null}
                  </li>
                ) : null}
                <li>
                  <span className="text-slate-500">Paid</span>{' '}
                  {record.paidAtISO || record.paid_at_iso
                    ? `${(record.paidAtISO || record.paid_at_iso).slice(0, 16)} · ₦${Number(record.paidAmountNgn || 0).toLocaleString('en-NG')}`
                    : '—'}
                  {record.paidBy ? ` · ${record.paidBy}` : ''}
                </li>
                {Array.isArray(record.payoutHistory) && record.payoutHistory.length > 0 ? (
                  <li className="pt-1 border-t border-slate-100">
                    <span className="text-slate-500 block mb-1">Treasury payouts</span>
                    <ul className="space-y-1 pl-2 border-l-2 border-teal-200">
                      {record.payoutHistory.map((p) => (
                        <li key={p.id} className="text-[11px]">
                          {(p.postedAtISO || '').slice(0, 16)} · ₦{Number(p.amountNgn || 0).toLocaleString('en-NG')}
                          {p.reference ? ` · ${p.reference}` : ''}
                          {p.accountName ? ` · ${p.accountName}` : ''}
                        </li>
                      ))}
                    </ul>
                  </li>
                ) : null}
              </ul>
            </div>
          ) : null}

          {previewLoading ? (
            <p className="text-xs font-semibold text-slate-500" role="status">
              Updating refund preview…
            </p>
          ) : null}
          {mode === 'create' && String(form.quotationRef || '').trim() ? (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                className="text-[11px] font-bold uppercase tracking-wide text-teal-700 hover:text-teal-900 underline decoration-teal-300 underline-offset-2 disabled:opacity-40 disabled:no-underline"
                disabled={previewLoading}
                onClick={() => void generatePreview(String(form.quotationRef).trim(), includeCommissionInPreview)}
              >
                Refresh preview (latest production & receipts)
              </button>
            </div>
          ) : null}
          {previewError ? (
            <div
              className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-900"
              role="alert"
            >
              {previewError}
            </div>
          ) : null}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7 space-y-6">
              {/* Step 1: Quotation Selection */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200/60 shadow-sm space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-5 bg-rose-500 rounded-full" />
                  <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Step 1: Link Quotation</h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                      <div className="relative min-w-0 flex-1">
                        <label className={label} htmlFor="refund-quotation-search">
                          Search finished quotation
                        </label>
                        {identityLocked ? (
                          <div
                            className={`${input} h-11 flex items-center text-slate-600`}
                            id="refund-quotation-search"
                          >
                            {form.quotationRef || '—'}
                          </div>
                        ) : (
                          <div className="relative">
                            <Search
                              size={16}
                              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                            />
                            <input
                              id="refund-quotation-search"
                              type="text"
                              autoComplete="off"
                              placeholder={
                                loadingQuotes ? 'Loading quotations…' : 'Type quotation id or customer name'
                              }
                              disabled={loadingQuotes}
                              value={quotationSearchText}
                              onChange={(e) => {
                                const v = e.target.value;
                                setQuotationSearchText(v);
                                setQuotationSuggestOpen(true);
                                setManualQuotationVerifyError('');
                              }}
                              onFocus={() => setQuotationSuggestOpen(true)}
                              onBlur={() => {
                                window.setTimeout(() => setQuotationSuggestOpen(false), 180);
                              }}
                              onKeyDown={(e) => {
                                if (e.key !== 'Enter') return;
                                if (identityLocked || loadingQuotes || manualQuotationVerifyBusy) return;
                                const hasOpenSuggestions =
                                  quotationSuggestOpen && quotationSearchFiltered.length > 0;
                                if (hasOpenSuggestions) return;
                                e.preventDefault();
                                void verifyAndApplyQuotationId();
                              }}
                              className={`${input} h-11 pl-9 pr-3 border-slate-200 hover:border-rose-300 transition-colors`}
                            />
                            {quotationSuggestOpen &&
                            quotationSearchFiltered.length > 0 &&
                            !loadingQuotes ? (
                              <div className="absolute z-20 mt-1 w-full max-h-[min(24rem,70vh)] overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                                {quotationSearchFiltered.map((q) => {
                                  const ymd = quotationYmdForPickRow(q, quotations);
                                  const dateBit = ymd ? ` · ${ymd}` : '';
                                  const remNgn = Math.max(
                                    0,
                                    Math.round(q.paid_ngn) - Math.round(q.total_refunded_ngn || 0)
                                  );
                                  const previewHint =
                                    Number(q.suggested_preview_amount_ngn) >= MIN_REFUND_QUOTATION_REMAINING_NGN
                                      ? ` · preview ₦${q.suggested_preview_amount_ngn.toLocaleString('en-NG')} auto`
                                      : '';
                                  return (
                                    <button
                                      key={q.id}
                                      type="button"
                                      className="w-full px-3 py-2 text-left text-[11px] font-semibold text-[#134e4a] hover:bg-rose-50"
                                      onMouseDown={(ev) => ev.preventDefault()}
                                      onClick={() => handleQuoteChange(q.id)}
                                    >
                                      <span className="block truncate">
                                        {q.id} · {q.customer_name}
                                      </span>
                                      <span className="block text-[10px] font-medium text-slate-500 truncate">
                                        ₦{q.paid_ngn.toLocaleString()} paid
                                        {q.total_ngn > 0 ? ` / ₦${q.total_ngn.toLocaleString()} total` : ''}
                                        {` · ₦${remNgn.toLocaleString()} refundable`}
                                        {previewHint}
                                        {dateBit}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            ) : null}
                          </div>
                        )}
                      </div>
                      <div className="w-full shrink-0 sm:w-[11.5rem]">
                        <label className={label} htmlFor="refund-quotation-date-filter">
                          Quote date
                        </label>
                        <input
                          id="refund-quotation-date-filter"
                          type="date"
                          disabled={identityLocked}
                          value={quotationPickDate}
                          onChange={(e) => setQuotationPickDate(e.target.value)}
                          className={`${input} h-11`}
                        />
                      </div>
                    </div>
                    {mode === 'create' && !identityLocked ? (
                      <div className="mt-2 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                        <button
                          type="button"
                          disabled={loadingQuotes || manualQuotationVerifyBusy}
                          onClick={() => void verifyAndApplyQuotationId()}
                          className="shrink-0 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-teal-900 hover:bg-teal-100 disabled:opacity-50"
                        >
                          {manualQuotationVerifyBusy ? 'Verifying…' : 'Use quotation id'}
                        </button>
                        <p className="text-[9px] text-slate-500 leading-snug flex-1 min-w-0">
                          If the quotation id is valid but missing from the list (for example automatic preview below ₦
                          {MIN_REFUND_QUOTATION_REMAINING_NGN.toLocaleString('en-NG')}), verify
                          it here and complete lines manually. Press Enter when the suggestion list is closed.
                        </p>
                      </div>
                    ) : null}
                    {manualQuotationVerifyError ? (
                      <p className="mt-1 text-[10px] text-rose-700 font-medium leading-snug" role="alert">
                        {manualQuotationVerifyError}
                      </p>
                    ) : null}
                    {mode === 'create' ? (
                      <p className="text-[9px] text-slate-500 leading-snug mt-2">
                        Eligibility rules for this list are in the{' '}
                        <button
                          type="button"
                          className="font-semibold text-teal-700 underline-offset-2 hover:underline"
                          onClick={() => setRefundGuideOpen(true)}
                        >
                          info
                        </button>{' '}
                        panel (top right).
                      </p>
                    ) : null}
                    {!loadingQuotes && quotationPickList.length === 0 && mode === 'create' ? (
                      <div className="mt-2 space-y-2 rounded-lg border border-amber-200/80 bg-amber-50/50 p-3">
                        <p className="text-[10px] text-amber-900 font-medium leading-snug">
                          Refunds only list quotations that are <strong>fully paid</strong> (paid ≥ total when total is set), have{' '}
                          <strong>more than ₦{MIN_REFUND_QUOTATION_REMAINING_NGN.toLocaleString('en-NG')} refundable</strong>, production{' '}
                          <strong>completed or cancelled</strong> (or <strong>void with payment</strong>), where the refund{' '}
                          <strong>automatic preview total at least ₦{MIN_REFUND_QUOTATION_REMAINING_NGN.toLocaleString('en-NG')}</strong>, and{' '}
                          <strong>no blocking refund on file</strong>. {quotationPickDate ? 'Try clearing the quote date filter.' : ''}{' '}
                          If you already posted a receipt but the quote is missing here, the payment may have been
                          recorded under a different branch than the quotation — use sync to recalculate from the ledger.
                          If the sale is eligible but excluded because the automatic preview is below that amount, use{' '}
                          <strong>Use quotation id</strong> after entering the full quotation reference.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                          <input
                            type="text"
                            value={syncPaidId}
                            onChange={(e) => {
                              setSyncPaidId(e.target.value);
                              setSyncPaidError('');
                            }}
                            placeholder="Quotation id e.g. QT-KD-26-0001"
                            className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-mono outline-none focus:ring-2 focus:ring-rose-200"
                          />
                          <button
                            type="button"
                            disabled={syncPaidBusy}
                            onClick={() => void syncPaidFromLedger()}
                            className="shrink-0 rounded-lg bg-[#134e4a] text-white px-3 py-2 text-[10px] font-bold uppercase tracking-wide disabled:opacity-50"
                          >
                            {syncPaidBusy ? 'Syncing…' : 'Sync paid from receipts'}
                          </button>
                        </div>
                        {syncPaidError ? (
                          <p className="text-[10px] text-rose-700 font-medium">{syncPaidError}</p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Step 2: unified breakdown + pay to */}
              <div
                className={`p-5 rounded-2xl bg-white border border-slate-200/60 shadow-sm space-y-5 transition-opacity duration-300 ${!form.quotationRef ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-5 bg-rose-500 rounded-full" />
                    <div>
                      <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                        Refund breakdown
                      </h3>
                      <p className="text-[10px] text-slate-500 mt-0.5 max-w-xl leading-snug">
                        All suggested refund lines from the preview are listed below. Uncheck any line you do not want on
                        this request. Customer commission is{' '}
                        <span className="font-semibold text-slate-700">not</span> included until you add it.
                      </p>
                    </div>
                  </div>
                  {!readOnly && mode === 'create' ? (
                    <div className="flex flex-wrap gap-2 shrink-0">
                      {!includeCommissionInPreview ? (
                        <button
                          type="button"
                          onClick={() => {
                            setIncludeCommissionInPreview(true);
                            const r = String(form.quotationRef || '').trim();
                            if (r) void generatePreview(r, true);
                          }}
                          className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-1.5 text-[9px] font-bold uppercase tracking-wide text-teal-900 hover:bg-teal-100"
                        >
                          + Add commission to preview
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setIncludeCommissionInPreview(false);
                            const r = String(form.quotationRef || '').trim();
                            if (r) void generatePreview(r, false);
                          }}
                          className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-1.5 text-[9px] font-bold uppercase tracking-wide text-slate-700 hover:bg-slate-200"
                        >
                          Remove commission from preview
                        </button>
                      )}
                    </div>
                  ) : null}
                </div>

                <div>
                  <p className={label}>Reason categories (from included lines)</p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {derivedReasonCategories.length ? (
                      derivedReasonCategories.map((c) => (
                        <span
                          key={c}
                          className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-700"
                          title={REFUND_CATEGORY_HINTS[c] || ''}
                        >
                          {c}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </div>
                  {excludedRefundHints.length > 0 ? (
                    <p className="mt-2 text-[9px] leading-snug text-slate-500">
                      <span className="font-semibold text-slate-600">Unavailable for this quote:</span>{' '}
                      {excludedRefundHints
                        .map(({ cat, reason }) =>
                          reason === 'blocked'
                            ? `${cat} (e.g. delivered or blocked)`
                            : `${cat} (already refunded)`
                        )
                        .join(' · ')}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-4 border-t border-slate-100 pt-5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-1.5 rounded-full bg-rose-500/80" />
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Lines</h4>
                    </div>
                    {!readOnly ? (
                      <button
                        type="button"
                        onClick={addLine}
                        className="text-[10px] font-bold uppercase text-rose-600 hover:text-rose-700 underline-offset-4 hover:underline"
                      >
                        + Add manual line
                      </button>
                    ) : null}
                  </div>

                  <div
                    className={`space-y-3 transition-opacity duration-300 ${!form.quotationRef ? 'pointer-events-none opacity-40' : 'opacity-100'}`}
                  >
                    {form.calculationLines.length === 0 ? (
                      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-100 p-8 text-center">
                        <DollarSign size={32} className="mb-2 text-slate-200" />
                        <p className="text-xs font-bold text-slate-400">Link a quotation to load preview lines.</p>
                      </div>
                    ) : (
                      form.calculationLines.map((line, idx) => {
                        const isManual = String(line.lineKey || '').startsWith('m-');
                        return (
                          <div
                            key={line.lineKey || `line-${idx}`}
                            className="group flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 transition-all animate-in fade-in hover:border-rose-100 hover:bg-white"
                          >
                            {!readOnly ? (
                              <label className="flex items-center gap-2 shrink-0 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={line.include !== false}
                                  onChange={(e) => setLine(idx, { include: e.target.checked })}
                                  className="h-3.5 w-3.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                                />
                                <span className="text-[9px] font-bold uppercase text-slate-500">Include</span>
                              </label>
                            ) : null}
                            <div className="min-w-0 flex-1 space-y-1.5">
                              <textarea
                                rows={2}
                                disabled={readOnly}
                                value={line.label}
                                onChange={(e) => setLine(idx, { label: e.target.value })}
                                className="w-full min-h-[2.75rem] resize-y border-none bg-transparent p-0 text-xs font-bold text-slate-800 outline-none focus:ring-0 leading-snug whitespace-pre-wrap"
                                placeholder="Description (two lines OK for long substitution notes)…"
                              />
                              {substitutionPerMeterBreakdown.length > 0 &&
                              (String(line.category || '').trim() === 'Substitution Difference' ||
                                (substitutionBreakdownLineKeyRef.current &&
                                  line.lineKey === substitutionBreakdownLineKeyRef.current)) ? (
                                <div className="rounded-lg border border-sky-100 bg-sky-50/90 px-2.5 py-2 text-[10px] leading-snug text-slate-700 space-y-1.5">
                                  <p className="font-bold uppercase tracking-wide text-sky-800/90">
                                    How this amount is calculated
                                  </p>
                                  {substitutionPerMeterBreakdown.map((row) => {
                                    const qPpm = Number(row.quotedPricePerMeterNgn || 0);
                                    const coilPpm = Number(row.producedListPricePerMeterNgn || 0);
                                    const dPpm = Number(row.deltaPerMeterNgn || 0);
                                    const m = Number(row.meters || 0);
                                    const credit = Number(row.creditNgn || 0);
                                    const qg = row.quotedGaugeForComparison;
                                    const cg = row.coilGaugeFromAllocations;
                                    const gaugeNote =
                                      qg && cg ? (
                                        <span className="text-slate-600">
                                          {' '}
                                          (quoted <span className="font-semibold">{qg}</span> vs coil{' '}
                                          <span className="font-semibold">{cg}</span>)
                                        </span>
                                      ) : null;
                                    return (
                                      <div
                                        key={row.jobId || `${row.productName}-${m}`}
                                        className="border-t border-sky-100/80 pt-1.5 first:border-t-0 first:pt-0"
                                      >
                                        <p className="text-slate-800">
                                          <span className="font-semibold">{row.productName || row.jobId || 'Job'}</span>
                                          {gaugeNote}
                                        </p>
                                        <p className="font-mono text-[11px] text-slate-900 mt-0.5 tabular-nums">
                                          ₦{qPpm.toLocaleString('en-NG')}/m (quoted) − ₦
                                          {coilPpm.toLocaleString('en-NG')}/m (workbook, coil gauge)
                                          {' = '}
                                          ₦{dPpm.toLocaleString('en-NG')}/m × {m.toFixed(2)} m ={' '}
                                          <span className="font-bold">₦{credit.toLocaleString('en-NG')}</span>
                                        </p>
                                      </div>
                                    );
                                  })}
                                  <p className="text-[9px] text-slate-500 pt-0.5 border-t border-sky-100/80">
                                    Quoted ₦/m comes from the quotation roofing lines. Coil ₦/m comes from the material
                                    price workbook for the allocated roll gauge (and matching colour/design where
                                    possible).
                                  </p>
                                </div>
                              ) : null}
                              <div className="flex flex-wrap items-center gap-2">
                                {isManual && !readOnly ? (
                                  <select
                                    value={line.category || 'Other'}
                                    onChange={(e) => setLine(idx, { category: e.target.value })}
                                    className="rounded-md border border-slate-200 bg-white py-1 px-2 text-[9px] font-bold uppercase text-slate-700"
                                  >
                                    {REFUND_REASON_CATEGORIES.map((c) => (
                                      <option key={c} value={c}>
                                        {c}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <p
                                    className="text-[9px] font-bold uppercase text-slate-400"
                                    title={REFUND_CATEGORY_HINTS[line.category] || ''}
                                  >
                                    {line.category || '—'}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-xs font-bold text-slate-400">₦</span>
                              <input
                                type="number"
                                disabled={readOnly}
                                value={line.amountNgn}
                                onChange={(e) => setLine(idx, { amountNgn: e.target.value })}
                                className="w-28 rounded-lg border border-slate-200 bg-white py-1 px-2 text-right text-xs font-black text-slate-900 outline-none focus:ring-2 focus:ring-rose-500/10 tabular-nums"
                              />
                              {!readOnly && isManual ? (
                                <button
                                  type="button"
                                  onClick={() => removeLine(idx)}
                                  className="rounded-lg p-1 text-slate-300 transition-colors hover:text-rose-600"
                                  aria-label="Remove line"
                                >
                                  <X size={14} />
                                </button>
                              ) : null}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="space-y-4 border-t border-slate-100 pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Included lines total</p>
                        <p className="text-2xl font-black tabular-nums tracking-tighter text-slate-900">
                          ₦{lineSum.toLocaleString()}
                        </p>
                      </div>
                      {!readOnly ? (
                        <button
                          type="button"
                          onClick={() =>
                            setForm((f) => ({
                              ...f,
                              amountNgn: String(sumLines(f.calculationLines)),
                            }))
                          }
                          className="rounded-xl bg-slate-900 px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-white shadow-lg shadow-slate-200 transition-all hover:bg-slate-800 active:scale-95"
                        >
                          Apply total
                        </button>
                      ) : null}
                    </div>

                    <div className="rounded-2xl bg-rose-600 p-4 text-white shadow-xl shadow-rose-200">
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-white/60">
                        Requested refund amount
                      </p>
                      <div className="flex items-end gap-1">
                        <span className="mb-0.5 text-base font-black text-white/80">₦</span>
                        <input
                          required
                          type="number"
                          disabled={readOnly || identityLocked}
                          value={form.amountNgn}
                          onChange={(e) => setForm((f) => ({ ...f, amountNgn: e.target.value }))}
                          className="flex-1 border-none bg-transparent p-0 text-2xl font-black text-white outline-none focus:ring-0 tabular-nums"
                          placeholder="0"
                        />
                      </div>
                      {sumMismatch ? (
                        <p className="mt-2 text-xs font-semibold text-amber-200">
                          Line items total does not match the requested refund amount.
                        </p>
                      ) : null}
                      {previewRemainingNgn != null && mode === 'create' ? (
                        <p className="mt-2 text-[10px] font-semibold text-white/85">
                          Remaining refundable on quotation: ₦{previewRemainingNgn.toLocaleString('en-NG')}
                        </p>
                      ) : null}
                      {mode !== 'create' && recordOutstandingAmount > 0 ? (
                        <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-white/70">
                          Outstanding after approvals: ₦{recordOutstandingAmount.toLocaleString()}
                        </p>
                      ) : null}
                    </div>

                    <div>
                      <label className={label}>Situation context (reason notes)</label>
                      <textarea
                        rows={2}
                        disabled={readOnly}
                        value={form.reasonNotes}
                        onChange={(e) => setForm((f) => ({ ...f, reasonNotes: e.target.value }))}
                        placeholder="Provide specific details about the situation..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-rose-500/20 resize-none transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: transaction intelligence */}
            <div className="lg:col-span-5">
              <div className="p-5 rounded-2xl bg-slate-900 text-white shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Hash className="text-rose-400 shrink-0" size={18} aria-hidden />
                    <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                      Transaction intelligence
                    </h3>
                  </div>
                  {loadingIntelligence ? (
                    <div className="w-4 h-4 border-2 border-rose-500 border-t-transparent rounded-full animate-spin shrink-0" />
                  ) : null}
                </div>

                {!form.quotationRef ? (
                  <div className="py-10 flex flex-col items-center justify-center text-center px-4">
                    <Link2 size={32} className="text-slate-700 mb-2 opacity-20" aria-hidden />
                    <p className="text-[10px] font-bold text-slate-500 uppercase">
                      Select a quotation to load
                      <br />
                      customer and audit context
                    </p>
                  </div>
                ) : (
                  <div className="space-y-5 animate-in fade-in duration-500">
                    <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-3 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="min-w-0">
                          <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Customer</p>
                          <p className="text-sm font-bold text-white truncate">{form.customerName || '—'}</p>
                          <p className="text-[10px] font-medium text-slate-400 font-mono">{form.customerID || '—'}</p>
                        </div>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:justify-items-end sm:text-right">
                          <div>
                            <p className="text-[9px] font-bold text-slate-500 uppercase mb-0.5">Quote total</p>
                            <p className="text-sm font-black text-white tabular-nums">
                              ₦
                              {(selectedQuoteMoneyRow?.total_ngn || 0).toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold text-slate-500 uppercase mb-0.5">Receipts (cash view)</p>
                            <p className="text-sm font-black text-emerald-400 tabular-nums">
                              ₦{refundIntelReceiptsTotalNgn.toLocaleString()}
                            </p>
                            <p className="text-[8px] text-slate-600 mt-0.5 leading-tight">
                              {intelligence.receipts.length === 0
                                ? 'No receipts linked in workspace'
                                : `${intelligence.receipts.length} linked receipt${intelligence.receipts.length === 1 ? '' : 's'}`}
                            </p>
                          </div>
                        </div>
                      </div>
                      {selectedQuotationSnapshot ? (
                        <div className="border-t border-slate-700/50 pt-3 space-y-2">
                          <p className="text-[9px] font-bold text-slate-500 uppercase">Quotation details</p>
                          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1.5 text-[10px] text-slate-200">
                            <div className="flex justify-between gap-2 sm:col-span-2">
                              <dt className="text-slate-500 shrink-0">Quotation</dt>
                              <dd className="font-mono text-right truncate" title={selectedQuotationSnapshot.id}>
                                {selectedQuotationSnapshot.id}
                              </dd>
                            </div>
                            <div className="flex justify-between gap-2">
                              <dt className="text-slate-500 shrink-0">Quote date</dt>
                              <dd className="text-right tabular-nums">
                                {String(
                                  selectedQuotationSnapshot.dateISO ||
                                    selectedQuotationSnapshot.date_iso ||
                                    ''
                                ).slice(0, 10) || '—'}
                              </dd>
                            </div>
                            <div className="flex justify-between gap-2">
                              <dt className="text-slate-500 shrink-0">Status</dt>
                              <dd className="text-right">{selectedQuotationSnapshot.status || '—'}</dd>
                            </div>
                            <div className="flex justify-between gap-2 sm:col-span-2">
                              <dt className="text-slate-500 shrink-0">Project / site</dt>
                              <dd
                                className="text-right truncate max-w-[14rem] sm:max-w-[18rem]"
                                title={
                                  selectedQuotationSnapshot.projectName ||
                                  selectedQuotationSnapshot.project_name ||
                                  ''
                                }
                              >
                                {selectedQuotationSnapshot.projectName ||
                                  selectedQuotationSnapshot.project_name ||
                                  '—'}
                              </dd>
                            </div>
                            <div className="flex justify-between gap-2 sm:col-span-2">
                              <dt className="text-slate-500 shrink-0">Material type</dt>
                              <dd className="text-right">
                                {selectedQuotationSnapshot.materialTypeName ||
                                  selectedQuotationSnapshot.material_type_name ||
                                  selectedQuotationSnapshot.materialTypeId ||
                                  selectedQuotationSnapshot.material_type_id ||
                                  '—'}
                              </dd>
                            </div>
                            <div className="flex justify-between gap-2">
                              <dt className="text-slate-500 shrink-0">Gauge</dt>
                              <dd className="text-right tabular-nums">
                                <span className="text-white">{refundQuotationGaugeDisplay.value}</span>
                              </dd>
                            </div>
                            {refundQuotationGaugeDisplay.hint ? (
                              <div className="sm:col-span-2">
                                <p className="text-[8px] text-slate-500 leading-snug">{refundQuotationGaugeDisplay.hint}</p>
                              </div>
                            ) : null}
                            <div className="flex justify-between gap-2">
                              <dt className="text-slate-500 shrink-0">Colour</dt>
                              <dd className="text-right">
                                {selectedQuotationSnapshot.materialColor ||
                                  selectedQuotationSnapshot.material_color ||
                                  '—'}
                              </dd>
                            </div>
                            <div className="flex justify-between gap-2 sm:col-span-2">
                              <dt className="text-slate-500 shrink-0">Profile / design</dt>
                              <dd className="text-right truncate max-w-[14rem]" title={String(selectedQuotationSnapshot.materialDesign || selectedQuotationSnapshot.material_design || '')}>
                                {selectedQuotationSnapshot.materialDesign ||
                                  selectedQuotationSnapshot.material_design ||
                                  '—'}
                              </dd>
                            </div>
                          </dl>
                        </div>
                      ) : null}
                      {refundProductionConversionSummary ? (
                        <div className="border-t border-slate-700/50 pt-3 space-y-2">
                          <p className="text-[9px] font-bold text-slate-500 uppercase">
                            Conversion &amp; production status
                          </p>
                          {refundProductionConversionSummary.emptyMessage ? (
                            <p className="text-[10px] text-slate-400 leading-snug">
                              {refundProductionConversionSummary.emptyMessage}
                            </p>
                          ) : (
                            <ul className="space-y-2">
                              {refundProductionConversionSummary.jobs.map((j) => (
                                <li
                                  key={j.jobID}
                                  className="rounded-lg border border-slate-700/80 bg-slate-900/40 px-2.5 py-2 text-[10px] leading-snug"
                                >
                                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                                    <span className="font-mono text-slate-300">{j.jobID}</span>
                                    <span className="text-[9px] font-bold uppercase text-slate-500">{j.status}</span>
                                  </div>
                                  <p className="text-slate-400 mt-0.5 truncate" title={j.productName}>
                                    {j.productName}
                                  </p>
                                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[9px]">
                                    <span>
                                      <span className="text-slate-500">Conversion: </span>
                                      <span
                                        className={
                                          ['HIGH', 'LOW'].includes(String(j.conversionAlertState).toUpperCase())
                                            ? 'font-bold text-amber-300'
                                            : 'text-slate-200'
                                        }
                                      >
                                        {j.conversionAlertState}
                                      </span>
                                    </span>
                                    {j.managerReviewRequired ? (
                                      <span className="text-rose-300 font-semibold">Manager review</span>
                                    ) : null}
                                  </div>
                                  {Array.isArray(j.coilRows) && j.coilRows.length > 0 ? (
                                    <ul className="mt-1.5 space-y-1 border-t border-slate-700/40 pt-1.5 text-[9px] text-slate-400">
                                      {j.coilRows.map((c) => {
                                        const open = Number(c.openingWeightKg);
                                        const close = Number(c.closingWeightKg);
                                        const used = Number(c.consumedWeightKg);
                                        const m = Number(c.metersProduced);
                                        const conv = c.actualConversionKgPerM;
                                        const kgPair =
                                          Number.isFinite(open) && Number.isFinite(close)
                                            ? `${open.toFixed(1)}→${close.toFixed(1)} kg`
                                            : null;
                                        return (
                                          <li key={c.id || `${j.jobID}-${c.coilNo}`} className="leading-snug">
                                            <span className="font-mono text-slate-300">{c.coilNo || '—'}</span>
                                            {c.gaugeLabel ? (
                                              <span className="text-slate-500"> · {c.gaugeLabel}</span>
                                            ) : null}
                                            {kgPair ? <span className="text-slate-500"> · {kgPair}</span> : null}
                                            {Number.isFinite(used) && used > 0 ? (
                                              <span>
                                                {' '}
                                                · used <span className="text-slate-200">{used.toFixed(1)} kg</span>
                                              </span>
                                            ) : null}
                                            {Number.isFinite(m) && m > 0 ? (
                                              <span className="text-slate-500"> · {m.toFixed(2)} m</span>
                                            ) : null}
                                            {conv != null && Number(conv) > 0 ? (
                                              <span className="text-slate-500">
                                                {' '}
                                                · conv {Number(conv).toFixed(3)} kg/m
                                              </span>
                                            ) : null}
                                          </li>
                                        );
                                      })}
                                    </ul>
                                  ) : null}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ) : null}
                      {showRefundPaidBreakdown ? (
                        <div className="rounded-lg border border-slate-700/60 bg-slate-900/50 p-2.5 space-y-1.5">
                          <p className="text-[9px] font-bold text-slate-500 uppercase">How booked paid is built</p>
                          <p className="text-[10px] text-slate-300 leading-snug">
                            <span className="font-semibold text-slate-200">Booked paid</span> on the quotation is
                            receipt lines to this quote plus any customer deposit posted here — not only the receipt you
                            see in Sales.
                          </p>
                          <ul className="text-[10px] text-slate-300 space-y-0.5 tabular-nums">
                            {(Number(intelligence.summary?.receiptAllocatedSumNgn) || 0) > 0 ? (
                              <li>
                                Receipt lines allocated to this quote: ₦
                                {Number(intelligence.summary.receiptAllocatedSumNgn).toLocaleString('en-NG')}
                              </li>
                            ) : null}
                            {(Number(intelligence.summary?.advanceAppliedNgn) || 0) > 0 ? (
                              <li>
                                Customer deposit / advance applied (ledger): ₦
                                {Number(intelligence.summary.advanceAppliedNgn).toLocaleString('en-NG')}
                              </li>
                            ) : null}
                            <li className="text-slate-400">
                              Stored quotation paid (cap for refunds): ₦
                              {Number(intelligence.summary?.bookedOnQuotationNgn ?? 0).toLocaleString('en-NG')}
                            </li>
                          </ul>
                        </div>
                      ) : null}
                      {refundMoneyBreakdown.overpay > 0 ? (
                        <div className="pt-2 border-t border-slate-700/80 space-y-1">
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <p className="text-[9px] font-bold text-slate-500 uppercase">Customer advance (overage)</p>
                            <p className="text-sm font-black text-amber-300 tabular-nums">
                              ₦{refundMoneyBreakdown.overpay.toLocaleString()}
                            </p>
                          </div>
                          <p className="text-[9px] text-slate-400 leading-snug">
                            Total cash recorded ₦{refundMoneyBreakdown.cashIn.toLocaleString()} — overage is not on the
                            quote; refund via customer advance if needed.
                          </p>
                        </div>
                      ) : null}
                      {previewRemainingNgn != null && mode === 'create' ? (
                        <div className="pt-2 border-t border-slate-700/80">
                          <p className="text-[9px] font-bold text-slate-500 uppercase mb-0.5">
                            Remaining refundable (this quotation)
                          </p>
                          <p className="text-sm font-black text-amber-200 tabular-nums">
                            ₦{previewRemainingNgn.toLocaleString('en-NG')}
                          </p>
                          <p className="text-[8px] text-slate-500 leading-snug mt-0.5">
                            After existing blocking refund reservations. Your request cannot exceed this.
                          </p>
                        </div>
                      ) : null}
                      {(intelligence.dataQualityIssues || []).length > 0 ? (
                        <div className="pt-2 border-t border-amber-900/40 rounded-lg bg-amber-950/25 p-2.5 space-y-1.5">
                          <p className="text-[9px] font-bold text-amber-200 uppercase">Master data (substitution)</p>
                          <ul className="space-y-1">
                            {(intelligence.dataQualityIssues || []).map((issue, idx) => (
                              <li key={issue.jobId || issue.code || idx} className="text-[10px] text-amber-50/95 leading-snug">
                                • {typeof issue === 'string' ? issue : issue.message}
                              </li>
                            ))}
                          </ul>
                          {mode === 'create' && String(form.quotationRef || '').trim() ? (
                            <div className="pt-2 border-t border-amber-800/40 space-y-1.5">
                              <label className="block text-[9px] font-bold text-amber-100/90 uppercase tracking-wide">
                                Workbook ₦/m override (produced coil)
                              </label>
                              <p className="text-[8px] text-amber-100/70 leading-snug">
                                Use when list price is missing for the <strong className="text-amber-50">allocated coil</strong>{' '}
                                gauge + design. Leave blank to use only master data.
                              </p>
                              <div className="flex flex-wrap items-end gap-2">
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  autoComplete="off"
                                  placeholder="e.g. 5200"
                                  value={substitutionWorkbookPpmOverride}
                                  onChange={(e) => setSubstitutionWorkbookPpmOverride(e.target.value)}
                                  className="w-[7.5rem] rounded-md border border-amber-800/60 bg-amber-950/40 px-2 py-1.5 text-[11px] font-mono text-amber-50 placeholder:text-amber-200/40"
                                />
                                <button
                                  type="button"
                                  disabled={previewLoading}
                                  onClick={() =>
                                    void generatePreview(String(form.quotationRef).trim(), includeCommissionInPreview)
                                  }
                                  className="rounded-md bg-amber-200/90 px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wide text-amber-950 hover:bg-amber-100 disabled:opacity-50"
                                >
                                  Apply to preview
                                </button>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>

                    {mode === 'create' && form.quotationRef ? (
                      <div className="flex flex-col gap-2">
                        {!refundIntelExpanded ? (
                          <button
                            type="button"
                            className="w-full rounded-xl border border-slate-600 bg-slate-800/80 py-2.5 px-3 text-center text-[10px] font-bold uppercase tracking-wide text-slate-200 hover:bg-slate-800 hover:border-slate-500 transition-colors"
                            onClick={() => setRefundIntelExpanded(true)}
                          >
                            Show detailed lines, production &amp; substitution
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="w-full rounded-xl border border-transparent py-1.5 text-center text-[10px] font-bold uppercase tracking-wide text-slate-500 hover:text-slate-300 transition-colors"
                            onClick={() => setRefundIntelExpanded(false)}
                          >
                            Hide detailed analysis
                          </button>
                        )}
                      </div>
                    ) : null}

                    {(mode !== 'create' || refundIntelExpanded) && (
                    <>
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Quotation order lines
                      </p>
                      {refundIntelQuotationOrderRows.length === 0 ? (
                        <p className="text-[10px] text-slate-600 italic leading-snug">
                          No structured lines on this quotation (open the quote in Sales to add products, accessories, and
                          services).
                        </p>
                      ) : (
                        <div className="max-h-[min(260px,40vh)] overflow-auto custom-scrollbar rounded-xl border border-slate-700/80">
                          <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 z-[1] bg-slate-950/95 backdrop-blur border-b border-slate-700">
                              <tr>
                                <th className="py-2 pl-2.5 pr-1 text-[8px] font-bold text-slate-500 uppercase tracking-wide">
                                  Type
                                </th>
                                <th className="py-2 px-1 text-[8px] font-bold text-slate-500 uppercase tracking-wide">
                                  Item
                                </th>
                                <th className="py-2 px-1 text-[8px] font-bold text-slate-500 uppercase tracking-wide text-right">
                                  Qty
                                </th>
                                <th className="py-2 px-1 text-[8px] font-bold text-slate-500 uppercase tracking-wide text-right">
                                  Unit ₦
                                </th>
                                <th className="py-2 px-1 text-[8px] font-bold text-slate-500 uppercase tracking-wide text-right">
                                  Supplied
                                </th>
                                <th className="py-2 pr-2.5 pl-1 text-[8px] font-bold text-slate-500 uppercase tracking-wide text-right">
                                  Short
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {refundIntelQuotationOrderRows.map((row) => (
                                <tr key={row.key} className="border-t border-slate-800/90 align-top">
                                  <td className="py-1.5 pl-2.5 pr-1 text-[9px] text-slate-500 whitespace-nowrap">
                                    {row.categoryLabel}
                                  </td>
                                  <td
                                    className="py-1.5 px-1 text-[9px] font-semibold text-slate-200 max-w-[7.5rem] sm:max-w-[10rem] truncate"
                                    title={row.name}
                                  >
                                    {row.name}
                                  </td>
                                  <td className="py-1.5 px-1 text-[9px] text-right tabular-nums text-slate-300">
                                    {row.qtyLabel}
                                  </td>
                                  <td className="py-1.5 px-1 text-[9px] text-right tabular-nums text-slate-300">
                                    {row.unitPriceLabel}
                                  </td>
                                  <td className="py-1.5 px-1 text-[9px] text-right tabular-nums text-emerald-400/95">
                                    {row.isAccessoryTracked ? row.supplied?.toLocaleString() ?? '—' : '—'}
                                  </td>
                                  <td className="py-1.5 pr-2.5 pl-1 text-[9px] text-right tabular-nums">
                                    {row.isAccessoryTracked && row.shortfall != null && row.shortfall > 0 ? (
                                      <span className="font-bold text-rose-400">{row.shortfall.toLocaleString()}</span>
                                    ) : row.isAccessoryTracked && row.shortfall === 0 ? (
                                      <span className="text-slate-500">0</span>
                                    ) : (
                                      <span className="text-slate-600">—</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <p className="text-[8px] text-slate-600 px-2.5 py-2 border-t border-slate-800/80 leading-relaxed">
                            Supplied / Short come from completed production jobs for{' '}
                            <strong className="text-slate-500">accessories</strong> only (matched by line id or item
                            name). Products and services show in the quote for context; sheet metres are summarized under
                            Production &amp; delivery.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Production & delivery</p>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700">
                          <p className="text-[8px] font-bold text-slate-500 uppercase mb-0.5">Cutting lists</p>
                          <p className="text-xs font-black">{intelligence.cuttingLists.length}</p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700">
                          <p className="text-[8px] font-bold text-slate-500 uppercase mb-0.5">Produced metres</p>
                          <p className="text-xs font-black text-sky-400">
                            {intelligence.summary?.producedMeters?.toLocaleString() || 0} m
                          </p>
                        </div>
                      </div>
                    </div>

                    {warnings.length > 0 && (
                      <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-2">
                        <p className="text-[9px] font-bold text-rose-400 uppercase flex items-center gap-1.5">
                          <AlertTriangle size={12} aria-hidden /> System audit flags
                        </p>
                        <ul className="space-y-1">
                          {warnings.map((w, idx) => (
                            <li key={idx} className="text-[10px] text-white/80 leading-snug">
                              • {w}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {substitutionPerMeterBreakdown.length > 0 && (
                      <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/25 space-y-2">
                        <p className="text-[9px] font-bold text-sky-300 uppercase tracking-wide">
                          Substitution — per-metre delta
                        </p>
                        <ul className="space-y-2">
                          {substitutionPerMeterBreakdown.map((row) => (
                            <li key={row.jobId || row.productName} className="text-[10px] text-white/85 leading-snug">
                              <span className="font-semibold text-white">{row.productName || row.jobId}</span>
                              <span className="text-slate-400"> · </span>
                              {Number(row.meters || 0).toFixed(2)}m × ₦
                              {Number(row.deltaPerMeterNgn || 0).toLocaleString('en-NG')}/m
                              <span className="text-slate-400"> → </span>
                              <span className="font-mono text-sky-200">
                                ₦{Number(row.creditNgn || 0).toLocaleString('en-NG')}
                              </span>
                              <div className="text-[9px] text-slate-500 mt-0.5 pl-0">
                                Quoted blended ₦{Number(row.quotedPricePerMeterNgn || 0).toLocaleString('en-NG')}/m
                                {row.quotedListPricePerMeterNgn != null && row.quotedListPricePerMeterNgn > 0 ? (
                                  <>
                                    {' '}
                                    · list at quoted {row.quotedGaugeDesignLabel || 'gauge/design'} ₦
                                    {Number(row.quotedListPricePerMeterNgn).toLocaleString('en-NG')}/m
                                  </>
                                ) : null}
                                {' '}
                                vs workbook (coil) ₦{Number(row.producedListPricePerMeterNgn || 0).toLocaleString('en-NG')}
                                /m
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    </>
                    )}

                    <div className="rounded-xl border border-slate-600 bg-slate-800/40 p-4 space-y-3 pt-4 border-t border-slate-700/80 mt-2">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Pay to (for finance)</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="sm:col-span-2">
                          <label className={`${label} text-slate-500`} htmlFor="refund-payee-name">
                            Beneficiary name
                          </label>
                          <input
                            id="refund-payee-name"
                            type="text"
                            disabled={readOnly}
                            value={form.payeeName}
                            onChange={(e) => setForm((f) => ({ ...f, payeeName: e.target.value }))}
                            placeholder="Name on the account"
                            className={inputIntelDark}
                          />
                        </div>
                        <div>
                          <label className={`${label} text-slate-500`} htmlFor="refund-payee-bank">
                            Bank name
                          </label>
                          <input
                            id="refund-payee-bank"
                            type="text"
                            disabled={readOnly}
                            value={form.payeeBankName}
                            onChange={(e) => setForm((f) => ({ ...f, payeeBankName: e.target.value }))}
                            placeholder="e.g. Access Bank"
                            className={inputIntelDark}
                          />
                        </div>
                        <div>
                          <label className={`${label} text-slate-500`} htmlFor="refund-payee-acct">
                            Account number
                          </label>
                          <input
                            id="refund-payee-acct"
                            type="text"
                            disabled={readOnly}
                            value={form.payeeAccountNo}
                            onChange={(e) => setForm((f) => ({ ...f, payeeAccountNo: e.target.value }))}
                            placeholder="Nigerian bank account no."
                            className={`${inputIntelDark} font-mono`}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Status Section for Non-Create Modes */}
              {(mode === 'view' || mode === 'approve') && (
                <div className="p-5 rounded-2xl bg-white border border-slate-200/60 shadow-sm space-y-4">
                   <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-5 bg-rose-500 rounded-full" />
                    <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Audit & Controls</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-2">
                    <div className="space-y-1">
                      <p className="font-bold text-slate-400 uppercase text-[9px]">Requested By</p>
                      <p className="font-bold text-slate-900">{record?.requestedBy || 'System'}</p>
                    </div>
                    <div className="space-y-1 sm:text-right">
                      <p className="font-bold text-slate-400 uppercase text-[9px]">Date</p>
                      <p className="font-bold text-slate-900 text-[11px]">{record?.requestedAtISO ? new Date(record.requestedAtISO).toLocaleDateString() : '—'}</p>
                    </div>
                  </div>

                  {showApproval && (
                    <div className="pt-4 border-t border-slate-100 space-y-4">
                      <div
                        className="rounded-xl border border-amber-200/80 bg-amber-50/90 p-3 space-y-2"
                        role="region"
                        aria-label="Approver verification checklist"
                      >
                        <p className="text-[10px] font-bold text-amber-900 uppercase tracking-wide">Before you approve</p>
                        <ul className="text-[10px] text-amber-950/90 font-medium space-y-1.5 list-disc list-inside leading-snug">
                          <li>Quote total and paid amount (including customer advance) match the real money in.</li>
                          <li>Production metres, cutting lists, and delivery status fit the refund story.</li>
                          <li>You read system warnings; bundled transport/install may need a manual line split.</li>
                          <li>Line-item total matches the approved amount you are about to enter.</li>
                          <li>Required evidence (notes, photos, sign-off) is on file per branch policy.</li>
                        </ul>
                      </div>
                      <div>
                        <label className={label}>Decision</label>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <button
                            type="button"
                            onClick={() => setApprovalStatus('Approved')}
                            className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase transition-all ${approvalStatus === 'Approved' ? 'bg-teal-500 text-white shadow-xl shadow-teal-100' : 'bg-slate-100 text-slate-500'}`}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => setApprovalStatus('Rejected')}
                            className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase transition-all ${approvalStatus === 'Rejected' ? 'bg-rose-500 text-white shadow-xl shadow-rose-100' : 'bg-slate-100 text-slate-500'}`}
                          >
                            Reject
                          </button>
                        </div>
                      </div>

                      {approvalStatus === 'Approved' && (
                        <div className="animate-in zoom-in-95 duration-200">
                          <label className={label}>Approved Amount (₦)</label>
                          <input
                            type="number"
                            value={approvedAmountNgn}
                            onChange={(e) => setApprovedAmountNgn(e.target.value)}
                            className={`${input} font-black text-[#134e4a] text-sm h-11`}
                          />
                          {approvalMoneyContext ? (
                            <p className="mt-2 text-[10px] font-medium text-slate-600 leading-snug">
                              Requested: ₦{approvalMoneyContext.requested.toLocaleString('en-NG')} · Paid on quotation:
                              ₦{approvalMoneyContext.paidNgn.toLocaleString('en-NG')} · Other open refunds (reserved): ₦
                              {approvalMoneyContext.sumOthers.toLocaleString('en-NG')} · Approvable cap: ₦
                              {approvalMoneyContext.maxApprovable.toLocaleString('en-NG')}
                            </p>
                          ) : null}
                          {approvalWillScaleLines ? (
                            <p className="mt-2 text-[10px] font-semibold text-teal-800 leading-snug">
                              Breakdown still matches the original request total — line amounts will scale proportionally to
                              the approved amount when you submit.
                            </p>
                          ) : null}
                          {approvalSumMismatch ? (
                            <p className="mt-2 text-[10px] font-semibold text-rose-700 leading-snug" role="alert">
                              Included lines do not sum to the approved amount and no longer match the original request —
                              edit individual lines so their total equals the approved figure.
                            </p>
                          ) : null}
                        </div>
                      )}

                      <div>
                        <label className={label}>Manager Comments</label>
                        <textarea
                          rows={2}
                          value={managerComments}
                          onChange={(e) => setManagerComments(e.target.value)}
                          placeholder="Why was this decided?..."
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-rose-500/20 resize-none transition-all"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

          {/* Footer Warnings */}
          {warnings.length > 0 && (
            <div className="flex gap-4 p-4 rounded-xl bg-orange-50 border border-orange-100 shadow-sm animate-in shake">
              <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center text-white shrink-0 mt-0.5">
                <AlertTriangle size={18} />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-orange-900">Logic & Integrity Warnings</p>
                <ul className="list-disc list-inside text-xs font-medium text-orange-800/80">
                  {warnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            </div>
          )}
        </form>

        {/* Footer Actions */}
        <div className="px-6 py-5 border-t border-slate-200/60 bg-white rounded-b-2xl flex justify-end items-center shrink-0">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={saving}
              className="px-6 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wide text-slate-500 hover:bg-slate-100 transition-all active:scale-95"
            >
              Cancel
            </button>
            {!readOnly && (
              <button
                type="submit"
                disabled={saving || (mode === 'create' && !form.quotationRef)}
                onClick={handleFormSubmit}
                className="group bg-rose-600 text-white px-8 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-widest shadow-xl shadow-rose-200 hover:brightness-105 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:grayscale disabled:scale-100"
              >
                {saving ? (
                  <RotateCcw size={16} className="animate-spin" />
                ) : (
                  <Save size={16} className="group-hover:scale-110 transition-transform" />
                )}
                {showApproval ? 'Save Decision' : 'Submit Refund Request'}
              </button>
            )}
          </div>
        </div>
      </div>
    </ModalFrame>
  );
};

export default RefundModal;
