import React, { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw, CheckCircle2, RotateCcw, AlertTriangle } from 'lucide-react';
import { flattenQuotationLineItems, formatRefundReasonCategory, ledgerTypeStyle } from '../../lib/managerDashboardCore';
import { formatActorAttribution } from '../../lib/actorAttribution';
import { formatPersonName } from '../../lib/formatPersonName';
import { normalizeRefund } from '../../lib/refundsStore';
import { apiFetch } from '../../lib/apiBase';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useToast } from '../../context/ToastContext';
import { userMayOverrideProductionAlignment, isExecutiveRoleKey } from '../../lib/workspaceGovernanceClient';
import {
  auditRefundCalculationLineArithmetic,
  expectedAmountFromRefundLineLabel,
  scaleRefundCalculationLinesToApprovedAmount,
  sumRefundCalculationLines,
} from '../../lib/refundLineArithmetic';
import { refundWorkspaceSnapshotFingerprint } from '../../lib/refundWorkspaceSnapshot';
import { isStoneFlatsheetQuotationLine } from '../../lib/stoneCoatedQuotationPolicy';

function refundCategoryTokens(value) {
  if (Array.isArray(value)) return value.map((x) => String(x ?? '').trim()).filter(Boolean);
  const s = String(value ?? '').trim();
  if (!s) return [];
  if (s.startsWith('[')) {
    try {
      const parsed = JSON.parse(s);
      return Array.isArray(parsed) ? parsed.map((x) => String(x ?? '').trim()).filter(Boolean) : [s];
    } catch {
      return [s];
    }
  }
  return s.split(/[,;|]/).map((x) => x.trim()).filter(Boolean);
}

function AlertBanner({ tone, title, children }) {
  const styles =
    tone === 'rose'
      ? 'border-rose-200 bg-rose-50 text-rose-950'
      : tone === 'amber'
        ? 'border-amber-200 bg-amber-50 text-amber-950'
        : 'border-violet-200 bg-violet-50 text-violet-950';
  return (
    <div className={`rounded-md border px-2 py-1.5 ${styles}`}>
      <p className="text-ui-xs font-black uppercase tracking-wide">{title}</p>
      {children ? <div className="mt-0.5 text-ui-xs leading-snug">{children}</div> : null}
    </div>
  );
}

function Panel({ title, hint, children, className = '' }) {
  return (
    <section
      className={`flex flex-col overflow-hidden rounded-lg border border-slate-200/90 bg-white shadow-sm ${className}`}
    >
      <header className="shrink-0 border-b border-slate-100 bg-slate-50/80 px-2.5 py-1.5">
        <h4 className="text-ui-xs font-black uppercase tracking-widest text-zarewa-teal">{title}</h4>
        {hint ? <p className="mt-0.5 text-ui-xs leading-snug text-slate-500">{hint}</p> : null}
      </header>
      <div className="custom-scrollbar max-h-[min(28vh,240px)] overflow-y-auto px-2.5 py-2 text-xs text-slate-800">
        {children}
      </div>
    </section>
  );
}

function Stat({ label, value, accent, warn }) {
  return (
    <div
      className={`rounded-md border px-2 py-1.5 ${
        warn
          ? 'border-rose-200 bg-rose-50/80'
          : accent
            ? 'border-emerald-200 bg-emerald-50/70'
            : 'border-slate-200 bg-slate-50/80'
      }`}
    >
      <p className="text-ui-xs font-bold uppercase text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm font-bold tabular-nums text-slate-900">{value}</p>
    </div>
  );
}

function sumCalcLines(lines) {
  return sumRefundCalculationLines(lines);
}

function quoteLineFloorPpm(item) {
  const n = Number(
    item?.floorPricePerMeter ??
      item?.floor_price_per_meter ??
      item?.minAllowedPerMeter ??
      item?.min_allowed_per_meter ??
      0
  );
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

function formatKgPerM(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n.toFixed(2) : '—';
}

function accessorySupplyLabel(issued, quoted) {
  const i = Number(issued);
  const q = Number(quoted);
  if (!Number.isFinite(q) || q <= 0) return { text: '—', tone: 'slate' };
  if (Number.isFinite(i) && i >= q) return { text: 'Supplied', tone: 'emerald' };
  if (Number.isFinite(i) && i > 0) return { text: 'Partial', tone: 'amber' };
  return { text: 'Not issued', tone: 'rose' };
}

function ConversionRefGrid({ check }) {
  const cells = [
    ['Act', check.actual_conversion_kg_per_m ?? check.actualConversionKgPerM],
    ['Std', check.standard_conversion_kg_per_m ?? check.standardConversionKgPerM],
    ['Sup', check.supplier_conversion_kg_per_m ?? check.supplierConversionKgPerM],
    ['G', check.gauge_history_avg_kg_per_m ?? check.gaugeHistoryAvgKgPerM],
    ['C', check.coil_history_avg_kg_per_m ?? check.coilHistoryAvgKgPerM],
  ];
  return (
    <div className="grid grid-cols-5 gap-0.5">
      {cells.map(([label, val]) => (
        <div key={label} className="rounded border border-slate-200/90 bg-white px-0.5 py-0.5 text-center">
          <p className="text-ui-xs font-bold uppercase text-slate-400">{label}</p>
          <p className="text-ui-xs font-bold tabular-nums text-slate-800">{formatKgPerM(val)}</p>
        </div>
      ))}
    </div>
  );
}

function quoteProductRows(quotation) {
  const ql = quotation?.quotationLines;
  if (!ql || typeof ql !== 'object') return [];
  return (Array.isArray(ql.products) ? ql.products : []).filter((item) => item && typeof item === 'object');
}

function quoteLineQtyNumber(raw) {
  return Number(String(raw?.qty ?? raw?.quantity ?? '').replace(/,/g, '')) || 0;
}

function quoteLineUnitPriceNumber(raw) {
  const n = Number(raw?.unitPrice ?? raw?.unit_price ?? raw?.unit_price_ngn ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function quoteLineQtyDisplay(raw) {
  const qty = quoteLineQtyNumber(raw);
  if (qty <= 0) return '—';
  const name = String(raw?.name ?? raw?.label ?? '');
  if (isStoneFlatsheetQuotationLine(name)) return `${qty.toLocaleString()} m²`;
  return `${qty.toLocaleString()} m`;
}

/**
 * Four-quadrant refund approval intel for Management ? Action inbox ? Refunds.
 */
export function RefundManagerApprovalPreview({
  refundId,
  inboxRow,
  refundRecord,
  auditData,
  loadingAudit,
  refundIntel,
  loadingIntel,
  formatNgn,
  decisionBusy,
  deliveryPaymentGate = 'off',
  refundExecutiveThresholdNgn = 1_000_000,
  onApprove,
  onReject,
  onOpenSales,
  onEditDetails,
  editDetailsLabel = 'Edit breakdown & payee',
  officialRecord = null,
  onRefreshApprovalContext,
}) {
  const ws = useWorkspace();
  const { show: showToast } = useToast();
  const [productionAlignmentIssues, setProductionAlignmentIssues] = useState([]);
  const [productionAlignmentAck, setProductionAlignmentAck] = useState({});
  const [productionAlignmentOverrideNote, setProductionAlignmentOverrideNote] = useState('');
  const [alignmentCheckLoading, setAlignmentCheckLoading] = useState(false);
  const [approvedAmountNgn, setApprovedAmountNgn] = useState('');
  const [approvalAmountError, setApprovalAmountError] = useState('');
  const [managerComments, setManagerComments] = useState('');
  const [rejectNoteError, setRejectNoteError] = useState('');
  const [integrityBusy, setIntegrityBusy] = useState(false);
  const [integrityResult, setIntegrityResult] = useState(null);
  const [localIntelPatch, setLocalIntelPatch] = useState(null);

  const REJECT_NOTE_MIN = 3;

  const canOverrideProductionAlignment = useMemo(
    () => userMayOverrideProductionAlignment(ws?.user?.roleKey ?? ws?.session?.user?.roleKey),
    [ws?.user?.roleKey, ws?.session?.user?.roleKey]
  );
  const canBypassIncompleteFloor = useMemo(() => {
    const rk = String(ws?.user?.roleKey ?? ws?.session?.user?.roleKey ?? '').toLowerCase();
    return Boolean(ws?.hasPermission?.('*') || rk === 'admin' || isExecutiveRoleKey(rk));
  }, [ws]);
  const canRecalculateIntegrity = useMemo(
    () =>
      Boolean(
        ws?.hasPermission?.('finance.approve') ||
          ws?.hasPermission?.('refunds.approve') ||
          ws?.hasPermission?.('quotations.manage')
      ),
    [ws]
  );

  const effectiveRefundIntel = localIntelPatch || refundIntel;

  useEffect(() => {
    setLocalIntelPatch(null);
  }, [refundIntel]);

  useEffect(() => {
    setIntegrityResult(null);
    setLocalIntelPatch(null);
  }, [refundId]);

  const productionFingerprintRef = useRef('');
  const approvalQuoteRef = String(
    refundRecord?.quotationRef ||
      refundRecord?.quotation_ref ||
      inboxRow?.quotationRef ||
      inboxRow?.quotation_ref ||
      ''
  ).trim();

  useEffect(() => {
    productionFingerprintRef.current = '';
  }, [refundId, approvalQuoteRef]);

  useEffect(() => {
    if (!approvalQuoteRef || typeof onRefreshApprovalContext !== 'function') return;
    const fp = refundWorkspaceSnapshotFingerprint(
      ws?.snapshot?.productionJobs,
      ws?.snapshot?.productionJobAccessoryUsage,
      approvalQuoteRef
    );
    const prev = productionFingerprintRef.current;
    if (fp === prev) return;
    productionFingerprintRef.current = fp;
    if (prev === '') return;
    void onRefreshApprovalContext();
  }, [
    approvalQuoteRef,
    onRefreshApprovalContext,
    ws?.snapshot?.productionJobs,
    ws?.snapshot?.productionJobAccessoryUsage,
  ]);

  useEffect(() => {
    if (!approvalQuoteRef || typeof onRefreshApprovalContext !== 'function') return;
    const id = window.setInterval(() => {
      void onRefreshApprovalContext();
    }, 60_000);
    return () => window.clearInterval(id);
  }, [approvalQuoteRef, onRefreshApprovalContext]);

  const loading = loadingAudit || (loadingIntel && !effectiveRefundIntel);
  const refund = useMemo(() => {
    if (refundRecord) return normalizeRefund(refundRecord);
    if (!inboxRow) return null;
    return normalizeRefund({
      refundID: inboxRow.refund_id,
      customer: inboxRow.customer_name,
      quotationRef: inboxRow.quotation_ref,
      amountNgn: inboxRow.amount_ngn,
      reasonCategory: inboxRow.reason_category,
      status: 'Pending',
      requestedAtISO: inboxRow.requested_at_iso,
    });
  }, [refundRecord, inboxRow]);

  const sum = auditData?.summary;
  const lines = flattenQuotationLineItems(auditData?.quotation);
  const ledger = Array.isArray(auditData?.ledgerEntries) ? auditData.ledgerEntries : [];
  const otherRefunds = (Array.isArray(auditData?.refunds) ? auditData.refunds : []).filter(
    (r) => String(r.refund_id) !== String(refundId)
  );
  const totals = auditData?.totals || {};
  const cuttingLists = Array.isArray(auditData?.cuttingLists) ? auditData.cuttingLists : [];
  const productionLogs = useMemo(
    () => (Array.isArray(auditData?.productionLogs) ? auditData.productionLogs : []),
    [auditData?.productionLogs]
  );
  const checks = useMemo(
    () => (Array.isArray(auditData?.conversionChecks) ? auditData.conversionChecks : []),
    [auditData?.conversionChecks]
  );
  const salesReceipts = Array.isArray(auditData?.salesReceipts) ? auditData.salesReceipts : [];
  const intelSum = effectiveRefundIntel?.summary;
  const dataQuality = useMemo(
    () => (Array.isArray(effectiveRefundIntel?.dataQualityIssues) ? effectiveRefundIntel.dataQualityIssues : []),
    [effectiveRefundIntel?.dataQualityIssues]
  );
  const productionSuggested = useMemo(
    () =>
      Array.isArray(effectiveRefundIntel?.productionSuggestedCategories)
        ? effectiveRefundIntel.productionSuggestedCategories
        : [],
    [effectiveRefundIntel?.productionSuggestedCategories]
  );
  const productionFulfillment = useMemo(() => {
    const fromIntel = effectiveRefundIntel?.productionFulfillment;
    if (fromIntel && typeof fromIntel === 'object') return fromIntel;
    const snap = refund?.previewSnapshot;
    if (snap?.productionFulfillment && typeof snap.productionFulfillment === 'object') {
      return snap.productionFulfillment;
    }
    return null;
  }, [effectiveRefundIntel?.productionFulfillment, refund?.previewSnapshot]);
  const economicFloor = useMemo(() => {
    const fromIntel = effectiveRefundIntel?.economicFloor;
    if (fromIntel && typeof fromIntel === 'object') return fromIntel;
    const snap = refund?.previewSnapshot?.economicFloor;
    if (snap && typeof snap === 'object') return snap;
    return integrityResult?.economicFloor ?? null;
  }, [effectiveRefundIntel?.economicFloor, refund?.previewSnapshot, integrityResult?.economicFloor]);
  const staleRefundWarnings = useMemo(() => {
    const fromIntel = Array.isArray(effectiveRefundIntel?.staleRefundWarnings)
      ? effectiveRefundIntel.staleRefundWarnings
      : [];
    const fromRecalc = Array.isArray(integrityResult?.staleRefundWarnings)
      ? integrityResult.staleRefundWarnings
      : [];
    return fromRecalc.length ? fromRecalc : fromIntel;
  }, [effectiveRefundIntel?.staleRefundWarnings, integrityResult?.staleRefundWarnings]);

  const refundAmountNgn = useMemo(
    () => Math.round(Number(refund?.amountNgn ?? refund?.amount_ngn ?? 0) || 0),
    [refund?.amountNgn, refund?.amount_ngn]
  );

  const exceedsEconomicFloorCap = useMemo(() => {
    const cap = Number(economicFloor?.maxDefensibleRefundNgn);
    if (!Number.isFinite(cap)) return false;
    return refundAmountNgn > cap + 1;
  }, [economicFloor?.maxDefensibleRefundNgn, refundAmountNgn]);

  const incompleteFloorBlocksApprove = useMemo(() => {
    if (!economicFloor?.incompleteFloorPricing) return false;
    if (Number(economicFloor.producedOutputMeters || 0) <= 0) return false;
    return !canBypassIncompleteFloor;
  }, [economicFloor, canBypassIncompleteFloor]);

  const financialBlocksApprove = useMemo(
    () => staleRefundWarnings.length > 0 || exceedsEconomicFloorCap || incompleteFloorBlocksApprove,
    [staleRefundWarnings.length, exceedsEconomicFloorCap, incompleteFloorBlocksApprove]
  );

  const runRecalculateIntegrity = useCallback(async () => {
    const qref = String(refund?.quotationRef || refund?.quotation_ref || '').trim();
    if (!qref || integrityBusy || !canRecalculateIntegrity) return;
    setIntegrityBusy(true);
    try {
      const { ok, data } = await apiFetch(
        `/api/quotations/${encodeURIComponent(qref)}/recalculate-integrity`,
        { method: 'POST', body: JSON.stringify({}) }
      );
      if (!ok || !data?.ok) {
        showToast(data?.error || 'Could not recalculate quotation integrity.', { variant: 'error' });
        return;
      }
      setIntegrityResult(data);
      if (typeof onRefreshApprovalContext === 'function') {
        await onRefreshApprovalContext(data);
      } else {
        const intelRes = await apiFetch(
          `/api/refunds/intelligence?quotationRef=${encodeURIComponent(qref)}`
        );
        if (intelRes.ok && intelRes.data?.ok !== false) {
          setLocalIntelPatch(intelRes.data);
        }
      }
      const paidChanged = Boolean(data.receiptReconcile?.paidNgnChanged);
      const staleCount = Array.isArray(data.staleRefundWarnings) ? data.staleRefundWarnings.length : 0;
      showToast(
        paidChanged
          ? `Integrity recalculated — paid balance updated to ${formatNgn(data.receiptReconcile?.paidNgn)}.${staleCount ? ` ${staleCount} open refund(s) exceed the economic floor.` : ''}`
          : staleCount
            ? `Integrity recalculated. ${staleCount} open refund(s) exceed the economic floor cap.`
            : 'Quotation integrity recalculated.',
        { variant: staleCount ? 'info' : 'success' }
      );
    } finally {
      setIntegrityBusy(false);
    }
  }, [
    refund?.quotationRef,
    refund?.quotation_ref,
    integrityBusy,
    canRecalculateIntegrity,
    onRefreshApprovalContext,
    showToast,
    formatNgn,
  ]);
  const calcLines = useMemo(() => refund?.calculationLines || [], [refund?.calculationLines]);
  const lineArithmeticIssues = useMemo(
    () => auditRefundCalculationLineArithmetic(calcLines),
    [calcLines]
  );
  const lineArithmeticBlocksApprove = lineArithmeticIssues.length > 0;

  const accLines = intelSum?.accessoriesSummary?.lines || [];
  const stone = intelSum?.stoneFlatsheetSummary;
  const productRows = useMemo(() => quoteProductRows(auditData?.quotation), [auditData?.quotation]);
  const relevantLedger = useMemo(
    () =>
      ledger
        .filter((e) => {
          const t = String(e.type || '').toUpperCase();
          return (
            t === 'RECEIPT' ||
            t === 'ADVANCE_IN' ||
            t === 'OVERPAY_ADVANCE' ||
            t.includes('REFUND') ||
            t.includes('APPLIED')
          );
        })
        .slice(0, 10),
    [ledger]
  );

  const requestedAmountNgn = Number(refund?.amountNgn ?? inboxRow?.amount_ngn) || 0;
  const paidOnQuoteNgn = Number(sum?.paidNgn ?? intelSum?.bookedOnQuotationNgn) || 0;
  const reservedOtherRefundsNgn = otherRefunds.reduce(
    (s, r) => s + (Number(r.amount_ngn ?? r.amountNgn) || 0),
    0
  );
  const maxApprovableNgn = Math.max(0, paidOnQuoteNgn - reservedOtherRefundsNgn);
  const requiresMdApproval = requestedAmountNgn > Number(refundExecutiveThresholdNgn) || 0;
  const orderTotalNgn = Number(sum?.orderTotalNgn) || 0;
  const paymentPct =
    orderTotalNgn > 0 ? Math.round((paidOnQuoteNgn / orderTotalNgn) * 1000) / 10 : null;
  const deliveryGateActive = deliveryPaymentGate === 'enforce' || deliveryPaymentGate === 'warn';
  const deliveryGateBreached =
    deliveryPaymentGate === 'enforce' && paymentPct != null && paymentPct < 70;

  const currentCategories = useMemo(
    () => refundCategoryTokens(refund?.reasonCategory ?? inboxRow?.reason_category),
    [refund?.reasonCategory, inboxRow?.reason_category]
  );

  useEffect(() => {
    setApprovedAmountNgn(String(requestedAmountNgn || ''));
    setApprovalAmountError('');
    setManagerComments('');
    setRejectNoteError('');
  }, [refundId, requestedAmountNgn]);

  const runAlignmentCheck = useCallback(async () => {
    const qref = String(refund?.quotationRef ?? inboxRow?.quotation_ref ?? '').trim();
    if (!qref || currentCategories.length === 0) {
      setProductionAlignmentIssues([]);
      return;
    }
    setAlignmentCheckLoading(true);
    const ackCodes = Object.entries(productionAlignmentAck)
      .filter(([, v]) => v)
      .map(([k]) => k);
    const { data } = await apiFetch('/api/refunds/production-alignment-check', {
      method: 'POST',
      body: JSON.stringify({
        quotationRef: qref,
        reasonCategory: currentCategories,
        productionAlignmentAcknowledgedCodes: ackCodes,
        productionAlignmentOverrideNote: productionAlignmentOverrideNote.trim(),
      }),
    });
    setAlignmentCheckLoading(false);
    if (data) {
      setProductionAlignmentIssues(Array.isArray(data.issues) ? data.issues : []);
    }
  }, [
    refund?.quotationRef,
    inboxRow?.quotation_ref,
    currentCategories,
    productionAlignmentAck,
    productionAlignmentOverrideNote,
  ]);

  useEffect(() => {
    const t = setTimeout(() => {
      void runAlignmentCheck();
    }, 300);
    return () => clearTimeout(t);
  }, [runAlignmentCheck]);

  const alignmentBlocksApprove = useMemo(() => {
    if (alignmentCheckLoading) return true;
    if (financialBlocksApprove) return true;
    if (productionAlignmentIssues.length === 0) return false;
    const hasBlock = productionAlignmentIssues.some((i) => i.submitAction === 'block');
    if (hasBlock && !(canOverrideProductionAlignment && productionAlignmentOverrideNote.trim().length >= 10)) {
      return true;
    }
    const needAck = productionAlignmentIssues.filter((i) => i.submitAction === 'acknowledge');
    return needAck.some((i) => !productionAlignmentAck[i.code]);
  }, [
    alignmentCheckLoading,
    financialBlocksApprove,
    productionAlignmentIssues,
    canOverrideProductionAlignment,
    productionAlignmentOverrideNote,
    productionAlignmentAck,
  ]);

  const handleApproveClick = () => {
    if (alignmentBlocksApprove || lineArithmeticBlocksApprove) return;
    const approved = Math.round(Number(approvedAmountNgn) || 0);
    if (approved <= 0) {
      setApprovalAmountError('Approved amount must be positive.');
      return;
    }
    if (approved > requestedAmountNgn) {
      setApprovalAmountError(
        `Approved amount cannot exceed the requested ?${requestedAmountNgn.toLocaleString('en-NG')}.`
      );
      return;
    }
    if (maxApprovableNgn > 0 && approved > maxApprovableNgn + 1) {
      setApprovalAmountError(
        `Approved amount exceeds quotation headroom (max ?${maxApprovableNgn.toLocaleString('en-NG')} after other open refunds).`
      );
      return;
    }

    const lineSum = sumCalcLines(calcLines);
    let linesForDecision = calcLines;
    if (calcLines.length > 0 && Math.abs(lineSum - approved) > 1) {
      if (Math.abs(lineSum - requestedAmountNgn) <= 1 && approved <= requestedAmountNgn + 1) {
        linesForDecision = scaleRefundCalculationLinesToApprovedAmount(calcLines, approved);
        const scaledSum = sumCalcLines(linesForDecision);
        if (Math.abs(scaledSum - approved) > 1) {
          setApprovalAmountError('Could not align breakdown lines to the approved amount. Open Sales to edit lines.');
          return;
        }
        const scaledArithmetic = auditRefundCalculationLineArithmetic(linesForDecision);
        if (scaledArithmetic.length > 0) {
          setApprovalAmountError(
            'Partial approval would break line arithmetic. Open Sales to adjust individual lines.'
          );
          return;
        }
      } else {
        setApprovalAmountError(
          `Breakdown total is ?${Math.round(lineSum).toLocaleString('en-NG')} — edit lines in Sales or approve the full requested amount.`
        );
        return;
      }
    }

    setApprovalAmountError('');
    const ackCodes = Object.entries(productionAlignmentAck)
      .filter(([, v]) => v)
      .map(([k]) => k);
    onApprove?.({
      approvedAmountNgn: approved,
      calculationLines:
        linesForDecision.length > 0
          ? linesForDecision
              .filter((l) => l?.include !== false)
              .map((l) => ({
                label: String(l.label || l.description || '').trim(),
                amountNgn: Math.round(Number(l.amountNgn ?? l.amount_ngn) || 0),
                category: l.category,
              }))
              .filter((l) => l.label && l.amountNgn > 0)
          : undefined,
      productionAlignmentAcknowledgedCodes: ackCodes,
      productionAlignmentOverrideNote: productionAlignmentOverrideNote.trim(),
      managerComments: managerComments.trim(),
      inlineManagerNote: true,
    });
  };

  const handleRejectClick = () => {
    const note = managerComments.trim();
    if (note.length < REJECT_NOTE_MIN) {
      setRejectNoteError(`Enter a rejection reason (at least ${REJECT_NOTE_MIN} characters).`);
      return;
    }
    setRejectNoteError('');
    onReject?.({
      managerComments: note,
      inlineManagerNote: true,
    });
  };
  const priorRefundCategories = useMemo(() => {
    const labels = [];
    for (const r of otherRefunds) {
      for (const c of refundCategoryTokens(r.reason_category)) {
        const label = String(c || '').trim();
        if (label && !labels.includes(label)) labels.push(label);
      }
    }
    return labels;
  }, [otherRefunds]);

  const currentNorm = useMemo(
    () => new Set(currentCategories.map((c) => String(c).trim().toLowerCase())),
    [currentCategories]
  );
  const priorNorm = useMemo(
    () => new Set(priorRefundCategories.map((c) => String(c).trim().toLowerCase())),
    [priorRefundCategories]
  );

  const currentHasOverpay = [...currentNorm].some((c) => c.includes('overpay'));
  const currentHasCancel = [...currentNorm].some((c) => c.includes('order cancellation'));
  const currentHasUnproduced = [...currentNorm].some((c) => c.includes('unproduced'));
  const priorHasOverpay = [...priorNorm].some((c) => c.includes('overpay'));
  const priorHasCancel = [...priorNorm].some((c) => c.includes('order cancellation'));
  const priorHasUnproduced = [...priorNorm].some((c) => c.includes('unproduced'));

  const sameRequestOverpayAndCancel = currentHasOverpay && currentHasCancel;
  const crossRefundOverlap =
    (priorHasOverpay && (currentHasCancel || currentHasUnproduced)) ||
    ((priorHasCancel || priorHasUnproduced) && currentHasOverpay);
  const multiCategoryOverlap = sameRequestOverpayAndCancel || crossRefundOverlap;

  const partialProductionJobs = useMemo(
    () =>
      productionLogs.filter((job) => {
        const st = String(job.status || '').trim().toLowerCase();
        if (st !== 'completed') return false;
        const planned = Number(job.planned_meters) || 0;
        const actual = Number(job.actual_meters) || 0;
        return planned > 0 && actual > 0 && actual < planned * 0.98;
      }),
    [productionLogs]
  );
  const cancellationWithProduction =
    currentCategories.some((c) => /order cancellation/i.test(c)) &&
    productionLogs.some(
      (job) =>
        String(job.status || '').trim().toLowerCase() === 'completed' &&
        (Number(job.actual_meters) || 0) > 0
    );

  const contextAlerts = useMemo(() => {
    const alerts = [];
    if (requiresMdApproval) {
      alerts.push({
        tone: 'violet',
        title: `MD approval required — above ?${Number(refundExecutiveThresholdNgn).toLocaleString('en-NG')}`,
        body: `Requested ${formatNgn(requestedAmountNgn)} exceeds the executive refund threshold. Only MD/CEO (or administrator) may approve this amount.`,
      });
    }
    if (lineArithmeticIssues.length > 0) {
      alerts.push({
        tone: 'rose',
        title: 'Breakdown arithmetic mismatch',
        body: lineArithmeticIssues
          .map((issue) =>
            issue.formulaText
              ? `"${issue.label}" implies ${formatNgn(issue.expectedAmountNgn)} (${issue.formulaText}) but the line amount is ${formatNgn(issue.amountNgn)}.`
              : `"${issue.label}" implies ${formatNgn(issue.expectedAmountNgn)} but the line amount is ${formatNgn(issue.amountNgn)}.`
          )
          .join(' '),
      });
    }
    if (multiCategoryOverlap) {
      alerts.push({
        tone: sameRequestOverpayAndCancel ? 'rose' : 'amber',
        title: 'Multi-category overlap on quotation',
        body: sameRequestOverpayAndCancel
          ? 'This request combines Overpayment with Order cancellation — these double-count cash received. Reject or send back until one category is removed.'
          : priorRefundCategories.length
            ? `Prior refund(s): ${priorRefundCategories.join(', ')}. Current: ${currentCategories.join(', ') || '—'}. Verify Overpayment is not double-counted with cancellation/unproduced meterage on this quote.`
            : 'This quote has Overpayment combined with Order cancellation and/or Unproduced meterage across refund requests. Verify categories are not double-counting the same economic loss.',
      });
    }
    if (partialProductionJobs.length > 0 || cancellationWithProduction) {
      alerts.push({
        tone: 'amber',
        title: 'Partial production detected',
        body:
          partialProductionJobs.length > 0
            ? `${partialProductionJobs.length} completed job(s) produced less than planned — consider Unproduced meterage instead of full cancellation.`
            : 'Order cancellation requested but production jobs show completed output on this quote.',
      });
    }
    for (const issue of dataQuality) {
      alerts.push({
        tone: 'amber',
        title: issue.title || issue.code || 'Data quality',
        body: issue.message || issue.detail || '',
      });
    }
    if (productionSuggested.length) {
      alerts.push({
        tone: 'amber',
        title: 'Production-aligned categories',
        body: `Based on job state, consider: ${productionSuggested.join(', ')}.`,
      });
    }
    if (
      productionFulfillment?.fullyProducedRoofing &&
      currentHasUnproduced
    ) {
      alerts.push({
        tone: 'rose',
        title: 'Unproduced refund not supported',
        body: `Quoted ${Number(productionFulfillment.quotedMeters || 0).toLocaleString()} m roofing is fully produced (${Number(productionFulfillment.producedMetersForUnproduced || 0).toLocaleString()} m output${Number(productionFulfillment.offcutFgMeters || 0) > 0 ? `, including ${Number(productionFulfillment.offcutFgMeters).toLocaleString()} m from offcut/accessories` : ''}). Reject or send back unless another category applies.`,
      });
    }
    return alerts.filter((a) => a.body);
  }, [
    requiresMdApproval,
    refundExecutiveThresholdNgn,
    requestedAmountNgn,
    formatNgn,
    multiCategoryOverlap,
    sameRequestOverpayAndCancel,
    priorRefundCategories,
    currentCategories,
    lineArithmeticIssues,
    partialProductionJobs.length,
    cancellationWithProduction,
    dataQuality,
    productionSuggested,
    productionFulfillment,
    currentHasUnproduced,
  ]);

  return (
    <div className="animate-in fade-in space-y-2 duration-200">
      <div className="rounded-lg border border-slate-200/90 bg-white px-3 py-2.5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="text-ui-xs font-bold uppercase tracking-widest text-zarewa-teal">Refund approval</span>
              {officialRecord?.referenceNo || officialRecord?.id ? (
                <span className="text-ui-xs font-mono text-slate-500">
                  · Record {officialRecord.referenceNo || officialRecord.id}
                </span>
              ) : null}
            </div>
            <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-0">
              <h2 className="font-mono text-base font-black text-slate-900">{refundId}</h2>
              <span className="text-ui-xs text-slate-400">·</span>
              <span className="text-sm font-semibold text-slate-800">
                {formatPersonName(refund?.customer || inboxRow?.customer_name || '—')}
              </span>
            </div>
            <p className="mt-0.5 text-ui-xs text-slate-600">
              {refund?.quotationRef || inboxRow?.quotation_ref ? (
                <span className="font-mono font-semibold">{refund?.quotationRef || inboxRow?.quotation_ref}</span>
              ) : (
                '—'
              )}
              <span className="text-slate-400"> · </span>
              {formatRefundReasonCategory(refund?.reasonCategory ?? inboxRow?.reason_category)}
              <span className="text-slate-400"> · </span>
              {formatActorAttribution(refund?.requestedBy, refund?.requestedAtISO || inboxRow?.requested_at_iso) ||
                (inboxRow?.requested_at_iso || '').slice(0, 16).replace('T', ' ')}
            </p>
            {officialRecord?.keyDecisionSummary ? (
              <p className="mt-1 text-ui-xs leading-snug text-slate-500 line-clamp-2">
                {officialRecord.keyDecisionSummary}
              </p>
            ) : null}
          </div>
          <div className="shrink-0 text-right">
            <p className="text-ui-xs font-bold uppercase text-slate-400">Requested</p>
            <p className="text-lg font-black tabular-nums text-rose-700">
              {formatNgn(refund?.amountNgn ?? inboxRow?.amount_ngn)}
            </p>
          </div>
        </div>
      </div>

      {contextAlerts.length > 0 ? (
        <div className="flex flex-col gap-1">
          {contextAlerts.map((alert) => (
            <AlertBanner key={alert.title} tone={alert.tone} title={alert.title}>
              <p>{alert.body}</p>
            </AlertBanner>
          ))}
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-10">
          <RefreshCw className="animate-spin text-zarewa-teal" size={22} />
          <span className="text-ui-xs font-semibold text-slate-500">Loading context…</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
          {/* Quotation — product spec & price comparison */}
          <Panel title="Quotation" hint="Metres/m², unit price, line amount, and floor ?/m.">
            {!auditData || auditData.ok === false ? (
              <p className="text-ui-xs text-rose-600">{auditData?.error || 'Quotation audit unavailable.'}</p>
            ) : (
              <Fragment>
                {auditData.quotation?.projectName ? (
                  <p className="mb-1.5 text-ui-xs text-slate-600">
                    <span className="font-semibold text-slate-800">{auditData.quotation.projectName}</span>
                  </p>
                ) : null}
                {(sum?.materialTypeName || sum?.materialGauge) && (
                  <p className="mb-1.5 text-ui-xs text-slate-500">
                    {[
                      sum.materialTypeName,
                      sum.materialGauge,
                      sum.materialColor,
                      sum.materialDesign,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                )}
                {productRows.length === 0 && lines.filter((l) => l.category === 'products').length === 0 ? (
                  <p className="text-ui-xs text-slate-500">No product lines on file.</p>
                ) : (
                  <div className="overflow-hidden rounded-md border border-slate-200">
                    <table className="w-full border-collapse text-left">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/90 text-ui-xs font-bold uppercase text-slate-500">
                          <th className="px-1.5 py-1">Product</th>
                          <th className="px-1 py-1 text-right">Qty</th>
                          <th className="px-1 py-1 text-right">Unit ?</th>
                          <th className="px-1 py-1 text-right">Amount</th>
                          <th className="px-1.5 py-1 text-right">Floor ?/m</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(productRows.length
                          ? productRows
                          : lines.filter((l) => l.category === 'products')
                        ).map((raw, idx) => {
                          const name = raw.name || raw.label || '—';
                          const qty = quoteLineQtyNumber(raw);
                          const unit = quoteLineUnitPriceNumber(raw);
                          const lineTotal = qty > 0 && unit > 0 ? Math.round(qty * unit) : 0;
                          const floor = quoteLineFloorPpm(raw);
                          const belowFloor = floor != null && unit > 0 && unit < floor;
                          return (
                            <tr key={idx} className="border-b border-slate-50 last:border-0">
                              <td
                                className="max-w-[7rem] truncate px-1.5 py-1 font-medium text-slate-900"
                                title={name}
                              >
                                {name}
                              </td>
                              <td className="px-1 py-1 text-right tabular-nums text-slate-700">
                                {quoteLineQtyDisplay(raw)}
                              </td>
                              <td
                                className={`px-1 py-1 text-right tabular-nums font-semibold ${belowFloor ? 'text-rose-700' : 'text-slate-800'}`}
                              >
                                {unit > 0 ? formatNgn(unit) : '—'}
                              </td>
                              <td className="px-1 py-1 text-right tabular-nums font-bold text-slate-900">
                                {lineTotal > 0 ? formatNgn(lineTotal) : '—'}
                              </td>
                              <td className="px-1.5 py-1 text-right tabular-nums text-slate-600">
                                {floor != null ? formatNgn(floor) : '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                {lines.filter((l) => l.category !== 'products').length > 0 ? (
                  <div className="mt-1.5 space-y-0.5">
                    <p className="text-ui-xs font-bold uppercase text-slate-400">Other lines</p>
                    {lines
                      .filter((l) => l.category !== 'products')
                      .slice(0, 6)
                      .map((ln, idx) => (
                        <div key={idx} className="flex justify-between gap-2 text-ui-xs">
                          <span className="truncate text-slate-700">{ln.name}</span>
                          <span className="shrink-0 tabular-nums text-slate-600">
                            {ln.lineTotal !== '' && ln.lineTotal != null ? formatNgn(ln.lineTotal) : '—'}
                          </span>
                        </div>
                      ))}
                  </div>
                ) : null}
              </Fragment>
            )}
          </Panel>

          {/* Payments */}
          <Panel title="Payments" hint="Order balance, receipts, and cash movements.">
            {sum ? (
              <div className="mb-2 grid grid-cols-2 gap-1 sm:grid-cols-4">
                <Stat label="Order total" value={formatNgn(sum.orderTotalNgn)} />
                <Stat label="Paid in" value={formatNgn(sum.paidNgn)} accent />
                <Stat label="Outstanding" value={formatNgn(sum.outstandingNgn)} />
                <Stat
                  label="Paid %"
                  value={paymentPct != null ? `${paymentPct}%` : '—'}
                  warn={deliveryGateBreached}
                  accent={paymentPct != null && paymentPct >= 70 && !deliveryGateBreached}
                />
              </div>
            ) : null}
            {deliveryGateActive && paymentPct != null ? (
              <p
                className={`mb-2 rounded-md px-2 py-1 text-ui-xs font-medium leading-snug ${
                  deliveryGateBreached ? 'bg-rose-50 text-rose-900' : 'bg-amber-50 text-amber-950'
                }`}
              >
                Delivery gate ({deliveryPaymentGate}): {deliveryGateBreached ? 'below 70% threshold' : 'satisfied'} ·
                cap {formatNgn(maxApprovableNgn)} after other refunds
              </p>
            ) : (
              <p className="mb-2 text-ui-xs text-slate-500">
                Approvable cap {formatNgn(maxApprovableNgn)}
                {reservedOtherRefundsNgn > 0 ? ` · ${formatNgn(reservedOtherRefundsNgn)} reserved` : ''}
              </p>
            )}
            {economicFloor && (economicFloor.producedOutputMeters > 0 || economicFloor.floorDeliveredValueNgn > 0) ? (
              <div
                className={`mb-2 rounded-md border px-2 py-1.5 text-ui-xs leading-snug ${
                  Number(refund?.amountNgn ?? refund?.amount_ngn ?? 0) >
                  Number(economicFloor.maxDefensibleRefundNgn || 0) + 1
                    ? 'border-amber-300 bg-amber-50 text-amber-950'
                    : 'border-slate-200 bg-slate-50/80 text-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-bold uppercase tracking-wide text-ui-xs text-slate-500">
                    Economic floor (produced × workbook minimum)
                  </p>
                  {canRecalculateIntegrity ? (
                    <button
                      type="button"
                      disabled={integrityBusy || decisionBusy}
                      onClick={() => void runRecalculateIntegrity()}
                      className="inline-flex shrink-0 items-center gap-0.5 rounded border border-slate-300 bg-white px-1.5 py-0.5 text-ui-xs font-bold uppercase text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      <RefreshCw size={10} className={integrityBusy ? 'animate-spin' : ''} />
                      Recalc
                    </button>
                  ) : null}
                </div>
                <p className="mt-0.5">
                  {Number(economicFloor.producedOutputMeters || 0).toLocaleString()} m produced · floor value{' '}
                  {formatNgn(economicFloor.floorDeliveredValueNgn)} · max defensible refund{' '}
                  <span className="font-bold">{formatNgn(economicFloor.maxDefensibleRefundNgn)}</span>
                </p>
                {economicFloor.incompleteFloorPricing ? (
                  <p className="mt-0.5 font-semibold text-amber-800">
                    Floor ?/m missing for some jobs — verify workbook pricing manually.
                  </p>
                ) : null}
              </div>
            ) : canRecalculateIntegrity ? (
              <div className="mb-2 flex justify-end">
                <button
                  type="button"
                  disabled={integrityBusy || decisionBusy}
                  onClick={() => void runRecalculateIntegrity()}
                  className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2 py-1 text-ui-xs font-bold uppercase text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  <RefreshCw size={10} className={integrityBusy ? 'animate-spin' : ''} />
                  Recalculate integrity
                </button>
              </div>
            ) : null}
            {staleRefundWarnings.length > 0 ? (
              <div className="mb-2">
                <AlertBanner tone="rose" title="Approval blocked — refund exceeds current economic floor">
                <ul className="list-disc pl-3">
                  {staleRefundWarnings.map((w) => (
                    <li key={w.refundId}>
                      <span className="font-mono">{w.refundId}</span> · {w.status} · requested{' '}
                      {formatNgn(w.amountNgn)} · cap {formatNgn(w.maxDefensibleRefundNgn)}
                      {w.reasonCategory ? ` · ${w.reasonCategory}` : ''}
                    </li>
                  ))}
                </ul>
                <p className="mt-1 font-semibold">
                  Recalculate integrity, reject, or reduce the approved amount before proceeding.
                </p>
              </AlertBanner>
              </div>
            ) : null}
            {incompleteFloorBlocksApprove ? (
              <div className="mb-2">
                <AlertBanner tone="rose" title="Approval blocked — workbook floor pricing incomplete">
                  <p>
                    {Number(economicFloor?.producedOutputMeters || 0).toLocaleString()} m produced but floor ?/m
                    could not be resolved. Resolve workbook pricing or escalate to MD/CEO.
                  </p>
                </AlertBanner>
              </div>
            ) : null}
            {exceedsEconomicFloorCap && staleRefundWarnings.length === 0 ? (
              <div className="mb-2">
                <AlertBanner tone="rose" title="Approval blocked — amount above economic floor">
                  <p>
                    Requested {formatNgn(refundAmountNgn)} exceeds max defensible{' '}
                    {formatNgn(economicFloor?.maxDefensibleRefundNgn)}. Recalculate integrity or reduce the amount.
                  </p>
                </AlertBanner>
              </div>
            ) : null}
            {intelSum && (intelSum.overpayAdvanceNgn > 0 || intelSum.overpayAppliedNgn > 0) ? (
              <p className="mb-2 text-ui-xs text-slate-600">
                Overpay ledger {formatNgn(intelSum.overpayAdvanceNgn)}
                {intelSum.overpayAppliedNgn > 0 ? ` · applied ${formatNgn(intelSum.overpayAppliedNgn)}` : ''}
              </p>
            ) : null}
            {salesReceipts.length > 0 ? (
              <div className="mb-2 divide-y divide-slate-100 rounded-md border border-slate-200">
                {salesReceipts.slice(0, 5).map((rc) => (
                  <div key={rc.id} className="flex items-center justify-between gap-2 px-1.5 py-1">
                    <span className="font-mono text-ui-xs text-slate-700">{rc.id}</span>
                    <span className="text-ui-xs font-bold tabular-nums">{formatNgn(rc.amount_ngn)}</span>
                  </div>
                ))}
              </div>
            ) : null}
            {relevantLedger.length > 0 ? (
              <div className="divide-y divide-slate-100 rounded-md border border-slate-200">
                {relevantLedger.map((e, idx) => (
                  <div key={e.id || idx} className="flex items-center justify-between gap-1 px-1.5 py-1">
                    <span
                      className={`rounded px-1 py-0.5 text-ui-xs font-black uppercase ${ledgerTypeStyle(e.type, 'light')}`}
                    >
                      {(e.type || '').slice(0, 10)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-ui-xs text-slate-500">
                      {e.at_iso?.slice(0, 10) || ''}
                    </span>
                    <span className="text-ui-xs font-bold tabular-nums">{formatNgn(e.amount_ngn)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-ui-xs text-slate-500">No payment ledger rows.</p>
            )}
          </Panel>

          {/* Conversion & supply */}
          <Panel title="Conversion & supply" hint="Output, accessories, and four-reference conversion checks.">
            <div className="mb-2 grid grid-cols-2 gap-1 sm:grid-cols-4">
              <Stat label="Sheet pool" value={`${Number(totals.quotedSheetPoolM || 0).toLocaleString()} m`} />
              {Number(totals.quotedTrimBlankM || 0) > 0 ? (
                <Stat label="Trim blank" value={`${Number(totals.quotedTrimBlankM).toLocaleString()} m`} />
              ) : null}
              <Stat
                label="Expected CL"
                value={`${Number((totals.expectedCoilConsumptionM ?? totals.cuttingListMetersSum) || 0).toLocaleString()} m`}
              />
              <Stat
                label="Cut lists"
                value={`${Number(totals.cuttingListMetersSum || 0).toLocaleString()} m`}
                warn={dataQuality.some((d) => d.code === 'cutting_list_quotation_metre_mismatch')}
              />
              <Stat
                label="Produced"
                value={`${Number(totals.completedProductionMetersSum || 0).toLocaleString()} m`}
                accent
              />
              {Number(totals.trimBlankGapM || 0) > 0.1 ? (
                <Stat
                  label="Trim gap"
                  value={`${Number(totals.trimBlankGapM).toFixed(2)} m`}
                  warn
                />
              ) : null}
            </div>
            {accLines.length > 0 ? (
              <div className="mb-2">
                <p className="mb-0.5 text-ui-xs font-bold uppercase text-slate-400">Accessories supply</p>
                <ul className="space-y-0.5 rounded-md border border-slate-200 bg-slate-50/50 p-1.5">
                  {accLines.map((a, i) => {
                    const st = accessorySupplyLabel(a.issuedQty, a.quotedQty);
                    const toneCls =
                      st.tone === 'emerald'
                        ? 'text-emerald-700 bg-emerald-50'
                        : st.tone === 'amber'
                          ? 'text-amber-800 bg-amber-50'
                          : st.tone === 'rose'
                            ? 'text-rose-700 bg-rose-50'
                            : 'text-slate-500 bg-slate-100';
                    return (
                      <li key={i} className="flex items-center justify-between gap-2 text-ui-xs">
                        <span className="min-w-0 truncate font-medium text-slate-800">{a.label || a.name}</span>
                        <span className={`shrink-0 rounded px-1 py-0.5 text-ui-xs font-bold uppercase ${toneCls}`}>
                          {st.text}
                        </span>
                        <span className="shrink-0 tabular-nums text-slate-600">
                          {a.issuedQty ?? 0}/{a.quotedQty ?? '—'}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
            {stone && (stone.totalSuppliedM2 > 0 || (stone.lines || []).length > 0) ? (
              <p className="mb-2 text-ui-xs text-slate-600">
                Stone {Number(stone.totalSuppliedM2 || 0).toLocaleString()} m² supplied
                {stone.totalDeductionM2 ? ` · ${Number(stone.totalDeductionM2).toLocaleString()} m² ded.` : ''}
              </p>
            ) : null}
            {cuttingLists.length > 0 ? (
              <p className="mb-2 text-ui-xs text-slate-600">
                {cuttingLists.length} cutting list(s) ·{' '}
                {cuttingLists.map((cl) => `${cl.id} ${Number(cl.total_meters || 0).toLocaleString()}m`).join(', ')}
              </p>
            ) : null}
            {checks.length > 0 ? (
              <div className="space-y-1.5">
                <p className="text-ui-xs font-bold uppercase text-slate-400">Conversion (four-reference)</p>
                {checks.map((ch, i) => (
                  <div
                    key={`${ch.job_id}-${ch.coil_no}-${i}`}
                    className={`rounded-md border p-1.5 ${
                      String(ch.alert_state || '').toUpperCase() === 'OK'
                        ? 'border-emerald-200/80 bg-emerald-50/40'
                        : 'border-amber-200/80 bg-amber-50/50'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <span className="font-mono text-ui-xs font-bold text-slate-900">
                        {ch.job_id} · {ch.coil_no}
                      </span>
                      <span className="rounded bg-white/90 px-1.5 py-0.5 text-ui-xs font-black uppercase">
                        {ch.alert_state || '—'}
                      </span>
                    </div>
                    <p className="mt-0.5 text-ui-xs text-slate-600">
                      {[ch.gauge_label, ch.material_type_name].filter(Boolean).join(' · ') || '—'}
                    </p>
                    <ConversionRefGrid check={ch} />
                  </div>
                ))}
              </div>
            ) : productionLogs.length > 0 ? (
              <div className="space-y-1">
                {productionFulfillment ? (
                  <div className="mb-2 rounded-md border border-slate-200 bg-white px-2 py-1.5">
                    <p className="text-ui-xs font-bold uppercase tracking-wide text-slate-500">
                      Roofing fulfilment
                    </p>
                    <p className="text-ui-xs text-slate-700 leading-snug">
                      Quoted {Number(productionFulfillment.quotedMeters || 0).toLocaleString()} m · Eligible
                      produced {Number(productionFulfillment.producedMetersForUnproduced || 0).toLocaleString()} m
                      {Number(productionFulfillment.coilProducedMeters || 0) > 0
                        ? ` (${Number(productionFulfillment.coilProducedMeters).toLocaleString()} m coil`
                        : ''}
                      {Number(productionFulfillment.offcutFgMeters || 0) > 0
                        ? `${Number(productionFulfillment.coilProducedMeters || 0) > 0 ? ',' : ' ('}${Number(productionFulfillment.offcutFgMeters).toLocaleString()} m offcut/accessories`
                        : ''}
                      {Number(productionFulfillment.coilProducedMeters || 0) > 0 ||
                      Number(productionFulfillment.offcutFgMeters || 0) > 0
                        ? ')'
                        : ''}
                      · Unproduced {Number(productionFulfillment.unproducedMetres || 0).toLocaleString()} m
                    </p>
                    {productionFulfillment.fullyProducedRoofing ? (
                      <p className="mt-0.5 text-ui-xs font-semibold text-emerald-700">
                        Fully produced — unproduced meterage refund should not apply.
                      </p>
                    ) : null}
                  </div>
                ) : null}
                {productionLogs.slice(0, 4).map((job) => (
                  <div key={job.job_id} className="rounded-md border border-slate-200 bg-slate-50/60 px-1.5 py-1">
                    <div className="flex justify-between gap-1">
                      <span className="font-mono text-ui-xs font-bold">{job.job_id}</span>
                      <span className="text-ui-xs uppercase text-slate-500">{job.status}</span>
                    </div>
                    <p className="text-ui-xs text-slate-600">
                      {Number(job.actual_meters || 0).toLocaleString()}/
                      {Number(job.planned_meters || 0).toLocaleString()} m · {job.conversion_alert_state || '—'}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-ui-xs text-slate-500">No production or conversion data.</p>
            )}
          </Panel>

          {/* Refund request — unique detail only */}
          <Panel title="This refund" hint="Breakdown, payee, and other refunds on the quote.">
            {refund?.reason ? (
              <p className="mb-2 text-ui-xs leading-snug text-slate-700">{refund.reason}</p>
            ) : null}
            {calcLines.length > 0 ? (
              <Fragment>
                <div className="mb-2 divide-y divide-slate-100 overflow-hidden rounded-md border border-slate-200">
                  {calcLines.map((ln, idx) => {
                    const amt = Number(ln.amountNgn ?? ln.amount_ngn) || 0;
                    const expected = expectedAmountFromRefundLineLabel(ln.label, ln.category);
                    const mismatch = expected != null && Math.abs(amt - expected) > 1;
                    return (
                      <div key={idx} className={`flex justify-between gap-2 px-1.5 py-1 ${mismatch ? 'bg-rose-50/80' : ''}`}>
                        <span className="min-w-0 text-ui-xs text-slate-800">
                          {ln.label || ln.category || `Line ${idx + 1}`}
                        </span>
                        <span className={`shrink-0 font-bold tabular-nums ${mismatch ? 'text-rose-800' : ''}`}>
                          {formatNgn(amt)}
                        </span>
                      </div>
                    );
                  })}
                  <div className="flex justify-between gap-2 bg-slate-50 px-1.5 py-1 font-bold">
                    <span className="text-ui-xs">Total</span>
                    <span className="tabular-nums text-rose-800">{formatNgn(sumCalcLines(calcLines))}</span>
                  </div>
                </div>
                {lineArithmeticBlocksApprove ? (
                  <p className="mb-2 text-ui-xs font-semibold text-rose-800" role="alert">
                    Line arithmetic mismatch — correct before approving.
                  </p>
                ) : null}
              </Fragment>
            ) : null}
            {refund?.calculationNotes ? (
              <p className="mb-2 text-ui-xs italic text-slate-600">{refund.calculationNotes}</p>
            ) : null}
            {(refund?.payeeName || refund?.payeeAccountNo) && (
              <div className="mb-2 rounded-md border border-teal-200/80 bg-teal-50/40 px-2 py-1.5">
                <p className="text-ui-xs font-bold uppercase text-teal-800">Pay to</p>
                <p className="text-ui-xs font-semibold text-slate-900">
                  {[formatPersonName(refund.payeeName), refund.payeeBankName].filter(Boolean).join(' · ')}
                </p>
                {refund.payeeAccountNo ? (
                  <p className="font-mono text-ui-xs text-slate-600">{refund.payeeAccountNo}</p>
                ) : null}
              </div>
            )}
            {otherRefunds.length > 0 ? (
              <div className="space-y-1">
                <p className="text-ui-xs font-bold uppercase text-slate-400">Other on quote ({otherRefunds.length})</p>
                {otherRefunds.map((r) => (
                  <div
                    key={r.refund_id}
                    className="flex items-center justify-between gap-2 rounded border border-amber-200/60 bg-amber-50/50 px-1.5 py-1"
                  >
                    <span className="font-mono text-ui-xs font-bold text-amber-950">{r.refund_id}</span>
                    <span className="text-ui-xs text-slate-600">{r.status}</span>
                    <span className="text-ui-xs font-bold tabular-nums">{formatNgn(r.amount_ngn)}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </Panel>
        </div>
      )}

      <div className="sticky bottom-0 z-10 -mx-1 mt-2 rounded-lg border border-slate-200/90 bg-white px-3 py-2.5 shadow-[0_-8px_24px_-12px_rgba(15,23,42,0.18)]">
        {productionAlignmentIssues.length > 0 ? (
          <div className="mb-2 rounded-md border border-amber-200/80 bg-amber-50/70 px-2 py-1.5 space-y-1">
            <p className="text-ui-xs font-black uppercase text-amber-950 flex items-center gap-1">
              <AlertTriangle size={11} /> Production alignment
              {alignmentCheckLoading ? <span className="font-normal">· checking…</span> : null}
            </p>
            <ul className="space-y-1">
              {productionAlignmentIssues.map((issue) => (
                <li key={issue.code} className="text-ui-xs text-amber-950 leading-snug">
                  <span className="font-semibold">{issue.title}</span>
                  {issue.message ? ` — ${issue.message}` : ''}
                  {issue.submitAction === 'acknowledge' ? (
                    <label className="mt-0.5 flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(productionAlignmentAck[issue.code])}
                        onChange={(e) =>
                          setProductionAlignmentAck((prev) => ({ ...prev, [issue.code]: e.target.checked }))
                        }
                        className="h-3 w-3"
                      />
                      <span className="text-ui-xs">Acknowledge</span>
                    </label>
                  ) : null}
                </li>
              ))}
            </ul>
            {productionAlignmentIssues.some((i) => i.submitAction === 'block') && canOverrideProductionAlignment ? (
              <input
                type="text"
                value={productionAlignmentOverrideNote}
                onChange={(e) => setProductionAlignmentOverrideNote(e.target.value)}
                placeholder="Override note (min 10 chars)"
                className="mt-1 w-full rounded border border-amber-200 bg-white px-2 py-1 text-ui-xs"
              />
            ) : null}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-2 lg:grid-cols-[minmax(7rem,9rem)_1fr_auto_auto] lg:items-end">
          <div>
            <label className="text-ui-xs font-bold uppercase text-slate-500" htmlFor="inbox-approved-amount">
              Approved ?
            </label>
            <input
              id="inbox-approved-amount"
              type="number"
              min={1}
              max={requestedAmountNgn || undefined}
              value={approvedAmountNgn}
              onChange={(e) => {
                setApprovedAmountNgn(e.target.value);
                setApprovalAmountError('');
              }}
              disabled={decisionBusy || loading}
              className="mt-0.5 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm font-bold tabular-nums text-zarewa-teal outline-none focus:ring-1 focus:ring-emerald-500/30 disabled:opacity-50"
            />
          </div>
          <div>
            <label className="text-ui-xs font-bold uppercase text-slate-500" htmlFor="refund-decision-note">
              Note
            </label>
            <input
              id="refund-decision-note"
              type="text"
              value={managerComments}
              onChange={(e) => {
                setManagerComments(e.target.value);
                if (rejectNoteError) setRejectNoteError('');
              }}
              disabled={decisionBusy || loading}
              placeholder="Required to reject"
              className="mt-0.5 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 outline-none focus:ring-1 focus:ring-zarewa-teal/20 disabled:opacity-50"
            />
          </div>
          <button
            type="button"
            disabled={decisionBusy || loading || alignmentBlocksApprove || lineArithmeticBlocksApprove}
            onClick={handleApproveClick}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-emerald-600 px-4 text-ui-xs font-black uppercase tracking-wide text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            <CheckCircle2 size={14} />
            Approve
          </button>
          <button
            type="button"
            disabled={decisionBusy || loading}
            onClick={handleRejectClick}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-rose-600 px-4 text-ui-xs font-black uppercase tracking-wide text-white hover:bg-rose-500 disabled:opacity-50"
          >
            <RotateCcw size={14} />
            Reject
          </button>
        </div>

        {(approvalAmountError || rejectNoteError) && (
          <p className="mt-1.5 text-ui-xs font-semibold text-rose-800" role="alert">
            {approvalAmountError || rejectNoteError}
          </p>
        )}
        {approvedAmountNgn &&
        requestedAmountNgn > 0 &&
        Math.round(Number(approvedAmountNgn) || 0) < requestedAmountNgn &&
        Math.abs(sumCalcLines(calcLines) - requestedAmountNgn) <= 1 ? (
          <p className="mt-1 text-ui-xs text-teal-800">Lines scale proportionally on partial approval.</p>
        ) : null}

        {onEditDetails ? (
          <button
            type="button"
            disabled={decisionBusy}
            onClick={onEditDetails}
            className="mt-2 text-ui-xs font-bold uppercase tracking-wide text-slate-400 hover:text-slate-600"
          >
            {editDetailsLabel}
          </button>
        ) : onOpenSales ? (
          <button
            type="button"
            disabled={decisionBusy}
            onClick={onOpenSales}
            className="mt-2 text-ui-xs font-bold uppercase tracking-wide text-slate-400 hover:text-slate-600"
          >
            Open full refund flow in Sales
          </button>
        ) : null}
      </div>
    </div>
  );
}
