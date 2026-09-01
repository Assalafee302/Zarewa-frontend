/* eslint-disable react-refresh/only-export-components -- refund path helper colocated with the modal */
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
  ChevronDown,
} from 'lucide-react';
import { ModalFrame } from '../layout/ModalFrame';
import { RefundPayoutRecipientPicker } from './RefundPayoutRecipientPicker';
import { RefundPayoutBankForm } from './RefundPayoutBankForm';
import { RefundApplyToQuotationPanel } from '../finance/RefundApplyToQuotationPanel.jsx';
import { useTrackedUnsavedForm } from '../../hooks/useTrackedUnsavedForm';
import { useToast } from '../../context/ToastContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { ZareApprovalHint } from '../ZareApprovalHint';
import { quotationRefundBlockedPendingMdPriceConfirm } from '../../lib/quotationPriceException';
import { apiFetch } from '../../lib/apiBase';
import { printRefundRecord } from '../../lib/refundRecordPrint';
import {
  refundApprovedAmount,
  refundDefaultApproveAmountNgn,
  refundOutstandingAmount,
  refundStatusIsWithdrawn,
  userMayApproveRefundRequests,
} from '../../lib/refundsStore';
import {
  REFUND_STAFF_ALLOCATION_DEDUCTION_RATE,
  applyRefundStaffAllocationDeduction,
  normalizeRefundStaffAllocationDeductionRate,
  sumRefundStaffCompanyDeductionNgn,
  sumRefundStaffNetPayoutNgn,
  sumRefundStaffUnclearedOffsetNgn,
} from '../../shared/lib/refundStaffAllocationDeduction.js';
import {
  isBranchManagerPreparedByLabel,
  preparedByRoleTitleAgreesWithPayee,
  roleKeysForPreparedByLabel,
} from '../../shared/lib/preparedByRoleAlias.js';
import { flattenQuotationLineItems } from '../../lib/managerDashboardCore';
import {
  quotationLinesJsonShapeForGauge,
  quotedGaugeLabelForSubstitutionComparison,
} from '../../lib/quotedGaugeForSubstitution';
import {
  REFUND_REASON_CATEGORY_VALUES as REFUND_REASON_CATEGORIES,
  REFUND_PREVIEW_VERSION,
  MIN_REFUND_QUOTATION_REMAINING_NGN,
  quotationMeetsRefundPickerFloor,
  refundCategoryDisplayLabel,
  refundAmountExceedsEconomicFloorCap,
  refundFloorGatedAmountNgn,
  refundRequestIsEconomicFloorExempt,
} from '../../shared/refundConstants.js';
import { userMayOverrideProductionAlignment, isExecutiveRoleKey } from '../../lib/workspaceGovernanceClient';
import { quotationRefundsBlocked } from '../../lib/refundEligibility';
import {
  normQuoteItemKey,
  productLineKey,
  resolveStoneFlatsheetLengthM,
} from '../../lib/stoneCoatedQuotationPolicy';
import { touchRefundPayeeAccount } from '../../lib/refundPayeeRecentAccounts';
import { isStaffLinkedCustomer } from '../../lib/customerPickerSearch';
import {
  auditRefundCalculationLineArithmetic,
  expectedAmountFromRefundLineLabel,
  scaleRefundCalculationLinesToApprovedAmount,
} from '../../lib/refundLineArithmetic';
import { refundWorkspaceSnapshotFingerprint } from '../../lib/refundWorkspaceSnapshot';
import { receiptCashReceivedNgn } from '../../lib/salesReceiptsList';
import { RefundManagerApprovalPreview } from '../management/RefundManagerApprovalPreview';
import { deliveryPaymentGateMode } from '../../lib/accountingPolicyFlags';
import {
  fetchEligibleRefundQuotationsCached,
  invalidateEligibleRefundQuotationsCache,
} from '../../lib/refundEligibleQuotationsCache';
import { RefundEligibilitySummary } from '../refund/RefundEligibilitySummary';
import { RefundGlImpactPreview } from '../refund/RefundGlImpactPreview';
import { RefundCreatePolicyWarnings } from '../refund/RefundCreatePolicyWarnings';

const REFUND_CATEGORY_HINTS = {
  'Unproduced meterage':
    'Quoted line metres exceed production metres (completed/cancelled jobs). Distinct from order cancellation (cancelled production only).',
  'Stone flatsheet shortfall':
    'Quoted stone flatsheet m² exceeds supplied + deduction recorded on completed/cancelled production jobs (same basis as the intelligence panel).',
  'Customer commission':
    'Not added automatically — use “Add commission to preview”. Capped by minimum selling ₦/m and refundable headroom.',
  'Substitution Difference':
    'When quoted gauge differs from the coil actually allocated, credit follows quoted ₦/m (from the quote) minus the material pricing workbook minimum ₦/m (floor) for that coil gauge/design when present, else the published list row (see breakdown under the line).',
};

function normalizeRefundAttentionText(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Collapse overlapping preview warnings + production-alignment issue copy into one list. */
function mergeRefundAttentionItems(warnings, productionAlignmentIssues) {
  const items = [];
  const seen = [];

  const isDup = (text) => {
    const n = normalizeRefundAttentionText(text);
    if (!n || n.length < 12) return false;
    return seen.some((prev) => prev.includes(n) || n.includes(prev));
  };
  const mark = (text) => {
    const n = normalizeRefundAttentionText(text);
    if (n) seen.push(n);
  };

  for (const issue of productionAlignmentIssues || []) {
    const title = String(issue?.title || '').trim();
    const message = String(issue?.message || '').trim();
    const combined = [title, message].filter(Boolean).join(' — ');
    if (!combined || isDup(combined) || isDup(message) || isDup(title)) continue;
    mark(combined);
    if (message) mark(message);
    items.push({
      key: `align-${issue.code || items.length}`,
      kind: 'alignment',
      issue,
      title: title || 'Check',
      message,
      submitAction: issue.submitAction,
    });
  }

  for (const w of warnings || []) {
    const text = String(w || '').trim();
    if (!text || isDup(text)) continue;
    mark(text);
    const cancelledCashPath = /cancelled production on this quotation/i.test(text);
    const overlapRisk = /double-count|overpayment.*order cancellation/i.test(text);
    items.push({
      key: `warn-${items.length}`,
      kind: 'warning',
      title: cancelledCashPath
        ? 'Cancelled job — full cash refund'
        : overlapRisk
          ? 'Do not stack Overpayment + cancellation'
          : '',
      message: text,
      submitAction: null,
      issue: null,
    });
  }

  return items;
}

function roundMoneyLocal(n) {
  return Math.round(Number(n) || 0);
}

function sumIncludedRefundLinesByCategoryMatch(lines, matchFn) {
  let total = 0;
  for (const l of lines || []) {
    if (l?.include === false) continue;
    const amt = roundMoneyLocal(l?.amountNgn);
    if (amt <= 0) continue;
    const cats = [];
    if (Array.isArray(l?.appliesToCategories) && l.appliesToCategories.length) {
      cats.push(...l.appliesToCategories.map((c) => String(c || '').trim()));
    } else if (l?.category) {
      cats.push(String(l.category).trim());
    }
    if (cats.some((c) => matchFn(c))) total += amt;
  }
  return total;
}

function quotationServiceAssignees(quotation) {
  const people = quotationTransactionPeople(quotation);
  const transporter = people.find((p) => p.role === 'driver');
  const installer = people.find((p) => p.role === 'installer');
  return {
    transporterId: transporter?.id || '',
    transporterName: transporter?.name || '',
    installerId: installer?.id || '',
    installerName: installer?.name || '',
  };
}

/** Parse products/services shape from snapshot or eligible-list `lines_json`. */
function parseQuotationLinesShape(source) {
  if (!source || typeof source !== 'object') return null;
  if (source.quotationLines && typeof source.quotationLines === 'object') return source.quotationLines;
  if (
    source.lines &&
    typeof source.lines === 'object' &&
    (Array.isArray(source.lines.services) || Array.isArray(source.lines.products))
  ) {
    return source.lines;
  }
  const raw = source.lines_json;
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const j = JSON.parse(raw);
      return j && typeof j === 'object' ? j : null;
    } catch {
      return null;
    }
  }
  if (raw && typeof raw === 'object') return raw;
  return null;
}

function quotationLinesHaveServiceAssignees(shape) {
  const services = Array.isArray(shape?.services) ? shape.services : [];
  return services.some(
    (line) =>
      String(line?.assigneeAssociatedStaffID || line?.assigneeCustomerID || '').trim() ||
      String(line?.assigneeName || '').trim()
  );
}

/**
 * Workspace snapshot + eligible-list row (keeps `lines_json` — normalize strips it).
 * Prefer the shape that still has transporter/installer assignees.
 */
function mergeQuotationForPayoutPeople(quoteSnap, eligibleRaw, normalizedPick) {
  const snapShape = parseQuotationLinesShape(quoteSnap);
  const eligibleShape = parseQuotationLinesShape(eligibleRaw);
  const linesShape =
    (quotationLinesHaveServiceAssignees(eligibleShape) && eligibleShape) ||
    (quotationLinesHaveServiceAssignees(snapShape) && snapShape) ||
    eligibleShape ||
    snapShape ||
    null;
  return {
    ...(quoteSnap || {}),
    ...(normalizedPick || {}),
    quotationLines: linesShape,
    lines_json: eligibleRaw?.lines_json || quoteSnap?.lines_json || null,
    handled_by:
      normalizedPick?.handled_by ||
      quoteSnap?.handled_by ||
      quoteSnap?.handledBy ||
      eligibleRaw?.handled_by ||
      '',
    handledBy: quoteSnap?.handledBy || normalizedPick?.handled_by || eligibleRaw?.handled_by || '',
    handledByUserId:
      quoteSnap?.handledByUserId ||
      normalizedPick?.handled_by_user_id ||
      eligibleRaw?.handled_by_user_id ||
      '',
    handled_by_user_id:
      normalizedPick?.handled_by_user_id ||
      eligibleRaw?.handled_by_user_id ||
      quoteSnap?.handled_by_user_id ||
      quoteSnap?.handledByUserId ||
      '',
    agentCustomerID:
      quoteSnap?.agentCustomerID ||
      normalizedPick?.agent_customer_id ||
      eligibleRaw?.agent_customer_id ||
      '',
    agent_customer_id:
      normalizedPick?.agent_customer_id ||
      eligibleRaw?.agent_customer_id ||
      quoteSnap?.agent_customer_id ||
      quoteSnap?.agentCustomerID ||
      '',
    agentCustomerName:
      quoteSnap?.agentCustomerName ||
      normalizedPick?.agent_customer_name ||
      eligibleRaw?.agent_customer_name ||
      '',
    agent_customer_name:
      normalizedPick?.agent_customer_name ||
      eligibleRaw?.agent_customer_name ||
      quoteSnap?.agent_customer_name ||
      quoteSnap?.agentCustomerName ||
      '',
  };
}

/**
 * Everyone named on the quotation for payout: service assignees + agent + preparer.
 * Assignees are associated-staff ids (QuotationModal stores them in assigneeAssociatedStaffID).
 */
function quotationTransactionPeople(quotation) {
  if (!quotation) return [];
  const shape = parseQuotationLinesShape(quotation) || {};
  const services = Array.isArray(shape?.services) ? shape.services : [];
  const people = [];
  const seen = new Set();
  const push = (entry) => {
    const id = String(entry?.id || '').trim();
    const name = String(entry?.name || '').trim();
    if (!id && !name) return;
    const key = id ? `id:${id}` : `name:${name.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    people.push({
      id,
      name,
      role: String(entry?.role || '').trim(),
      label: String(entry?.label || '').trim(),
    });
  };

  for (const line of services) {
    const serviceName = String(line?.name || '').trim();
    const lower = serviceName.toLowerCase();
    const id = String(line?.assigneeAssociatedStaffID || line?.assigneeCustomerID || '').trim();
    const name = String(line?.assigneeName || '').trim();
    if (!id && !name) continue;
    let role = String(line?.assigneeRole || '').trim().toLowerCase();
    if (!role) {
      if (lower.includes('transport')) role = 'driver';
      else if (lower.includes('install')) role = 'installer';
      else role = 'service';
    }
    push({
      id,
      name,
      role,
      label:
        role === 'driver'
          ? 'Quotation transporter'
          : role === 'installer'
            ? 'Quotation installer'
            : serviceName || 'Quotation assignee',
    });
  }

  const agentId = quotationAgentCustomerId(quotation);
  const agentName = quotationAgentCustomerName(quotation);
  if (agentId || agentName) {
    push({
      id: agentId,
      name: agentName,
      role: 'agent',
      label: 'Quotation agent',
    });
  }

  const preparedBy = quotationPreparedByLabel(quotation);
  const preparedByUserId = String(
    quotation?.handled_by_user_id ?? quotation?.handledByUserId ?? ''
  ).trim();
  if (preparedBy || preparedByUserId) {
    if (!people.some((p) => (preparedByUserId && p.id === preparedByUserId) || namesLikelySamePerson(p.name, preparedBy))) {
      push({
        id: preparedByUserId,
        name: preparedBy,
        role: 'preparer',
        label: 'Prepared by',
      });
    }
  }

  return people;
}

function associatedStaffHasBank(row) {
  return Boolean(String(row?.bankAccountNo || row?.bank_account_no || '').trim() && String(row?.bankName || row?.bank_name || '').trim());
}

function customerHasBank(row) {
  return Boolean(String(row?.bankAccountNo || '').trim() && String(row?.bankName || '').trim());
}

function payoutRowSelectValue(row) {
  const kind = String(row?.recipientKind || 'customer').trim().toLowerCase();
  if (kind === 'associated_staff') {
    const id = String(row?.recipientAssociatedStaffID || '').trim();
    return id ? `staff:${id}` : '';
  }
  const id = String(row?.recipientCustomerID || '').trim();
  if (id) return `customer:${id}`;
  const uid = String(row?.recipientUserId || '').trim();
  return uid ? `user:${uid}` : '';
}

function parsePayoutSelectValue(value) {
  const v = String(value || '').trim();
  if (!v) {
    return {
      recipientKind: 'customer',
      recipientAssociatedStaffID: '',
      recipientCustomerID: '',
      recipientUserId: '',
    };
  }
  if (v.startsWith('staff:')) {
    return {
      recipientKind: 'associated_staff',
      recipientAssociatedStaffID: v.slice(6),
      recipientCustomerID: '',
      recipientUserId: '',
    };
  }
  if (v.startsWith('user:')) {
    return {
      recipientKind: 'customer',
      recipientCustomerID: '',
      recipientAssociatedStaffID: '',
      recipientUserId: v.slice(5),
    };
  }
  if (v.startsWith('customer:')) {
    return {
      recipientKind: 'customer',
      recipientCustomerID: v.slice(9),
      recipientAssociatedStaffID: '',
      recipientUserId: '',
    };
  }
  return {
    recipientKind: 'customer',
    recipientCustomerID: v,
    recipientAssociatedStaffID: '',
    recipientUserId: '',
  };
}

function suggestedLineIsPositiveNonOverpayment(line) {
  if (roundMoneyLocal(line?.amountNgn) <= 0) return false;
  const cat = String(line?.category || '').trim();
  if (cat && cat !== 'Overpayment') return true;
  const multi = Array.isArray(line?.appliesToCategories) ? line.appliesToCategories : [];
  return multi.some((c) => {
    const token = String(c || '').trim();
    return Boolean(token) && token !== 'Overpayment';
  });
}

/** True when every included breakdown line is Overpayment (quick overpay path). */
export function refundFormIsOverpaymentOnly(calculationLines) {
  const lines = (Array.isArray(calculationLines) ? calculationLines : []).filter(
    (l) => l?.include !== false && roundMoneyLocal(l?.amountNgn) > 0
  );
  if (!lines.length) return false;
  return lines.every((l) => String(l.category || '').trim() === 'Overpayment');
}

/**
 * Still-refundable overpayment on this quote (after prior overpay refunds).
 * Prefer residual from preview — never invent an amount from gross excess alone when residual is 0.
 */
export function refundableOverpaymentNgn({
  overpaymentResidualNgn,
  overpaymentExcessNgn,
  suggestedLines,
} = {}) {
  if (overpaymentResidualNgn != null && Number.isFinite(Number(overpaymentResidualNgn))) {
    return Math.max(0, roundMoneyLocal(overpaymentResidualNgn));
  }
  const fromSuggested = (Array.isArray(suggestedLines) ? suggestedLines : [])
    .filter((l) => String(l.category || '').trim() === 'Overpayment')
    .reduce((sum, l) => sum + roundMoneyLocal(l.amountNgn), 0);
  if (fromSuggested > 0) return fromSuggested;
  return Math.max(0, roundMoneyLocal(overpaymentExcessNgn));
}

/**
 * Auto-select Quick overpay only when overpayment is the sole positive suggested reason.
 * Cancelled jobs and Order cancellation always use Full refund (whole-job cash path).
 */
export function refundCreatePathFromPreview({
  overpaymentExcessNgn,
  overpaymentResidualNgn,
  suggestedLines,
} = {}) {
  const lines = Array.isArray(suggestedLines) ? suggestedLines : [];
  const positiveCats = lines
    .filter((l) => roundMoneyLocal(l.amountNgn) > 0)
    .map((l) => String(l.category || '').trim())
    .filter(Boolean);
  if (positiveCats.includes('Order cancellation')) return 'full';
  const hasOverpayLine = positiveCats.includes('Overpayment');
  const hasOtherPositive = lines.some(suggestedLineIsPositiveNonOverpayment);
  const overpay = refundableOverpaymentNgn({
    overpaymentResidualNgn,
    overpaymentExcessNgn,
    suggestedLines,
  });
  if (hasOverpayLine && overpay > 0 && !hasOtherPositive) return 'quick';
  if (overpay > 0 && positiveCats.length === 0) return 'quick';
  return 'full';
}

/** Quick overpay path is invalid when preview uses cancellation or cancelled production. */
export function refundQuickOverpayAvailableFromPreview({
  overpaymentExcessNgn,
  overpaymentResidualNgn,
  suggestedLines,
  hasCancelledProductionJob,
} = {}) {
  const overpay = refundableOverpaymentNgn({
    overpaymentResidualNgn,
    overpaymentExcessNgn,
    suggestedLines,
  });
  if (overpay <= 0) return false;
  if (hasCancelledProductionJob) return false;
  const lines = Array.isArray(suggestedLines) ? suggestedLines : [];
  if (
    lines.some(
      (l) =>
        roundMoneyLocal(l.amountNgn) > 0 &&
        String(l.category || '').trim() === 'Order cancellation'
    )
  ) {
    return false;
  }
  return true;
}

function refundCustomerNameFromRecord(record) {
  const raw = String(record?.customerName || record?.customer_name || record?.customer || '').trim();
  return raw && raw !== '—' ? raw : '';
}

/**
 * Subtitle for an existing refund: id, status, and leftover after refund-fund use.
 * Leftover is approval work only while Pending; after Approve it is cash still to pay.
 */
export function refundRecordSubtitle(record) {
  if (!record?.refundID) return '';
  const base = `${record.refundID} · ${record.status}`;
  const creditApplied = Math.round(Number(record.creditAppliedNgn ?? record.credit_applied_ngn) || 0);
  const confirmed = String(record.creditConfirmationStatus ?? record.credit_confirmation_status ?? '').trim();
  if (!confirmed && creditApplied <= 0) return base;
  const dest = String(record.creditAppliedToQuotationRef ?? record.credit_applied_to_quotation_ref ?? '').trim();
  const leftover = Math.max(0, Math.round(Number(record.amountNgn) || 0) - creditApplied);
  const used = dest
    ? `₦${creditApplied.toLocaleString('en-NG')} applied to ${dest}`
    : `₦${creditApplied.toLocaleString('en-NG')} applied to a receipt`;
  if (leftover <= 0) return `${base} · ${used}`;
  const status = String(record.status || '').trim();
  if (status === 'Paid') return `${base} · ${used}`;
  if (status === 'Approved' || status === 'Partially paid') {
    return `${base} · ${used} · ₦${leftover.toLocaleString('en-NG')} awaits payout`;
  }
  return `${base} · ${used} · ₦${leftover.toLocaleString('en-NG')} awaits approval`;
}

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

function productionAlignmentFingerprint(quoteRef, categories) {
  const cats = (Array.isArray(categories) ? categories : [])
    .map((c) => String(c || '').trim())
    .filter(Boolean)
    .sort();
  return `${String(quoteRef || '').trim()}\0${cats.join('|')}`;
}

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

/** Match quotation product row to refund intel `stoneFlatsheetSummary.lines` (quote line id or name + length). */
function findStoneFlatsheetIntelRow(line, stoneLines) {
  if (!line || !Array.isArray(stoneLines) || stoneLines.length === 0) return null;
  if (productLineKey(line.name) !== 'stone flatsheet') return null;
  const lid = String(line.id || '').trim();
  if (lid) {
    const byId = stoneLines.find((r) => String(r.quoteLineId || '').trim() === lid);
    if (byId) return byId;
  }
  const len = resolveStoneFlatsheetLengthM({
    name: line.name,
    stoneFlatsheetLengthM: line.stoneFlatsheetLengthM,
    lengthM: line.lengthM,
  });
  const nm = normQuoteItemKey(line.name);
  return (
    stoneLines.find((r) => {
      if (normQuoteItemKey(r.name) !== nm) return false;
      if (len != null && r.lengthM != null && Math.abs(Number(r.lengthM) - len) > 1e-3) return false;
      return true;
    }) || null
  );
}

/** Align intelligence accessory summary to a flattened quotation line (by id or name). */
/** ISO date from pick row or full workspace quotation (for display / sorting). */
function quotationDateIsoForPickRow(q, quotationsArr) {
  const iso = String(q?.dateISO || '').trim();
  if (iso) return iso;
  const full = (quotationsArr || []).find((x) => String(x.id) === String(q?.id));
  return String(full?.dateISO || full?.date_iso || '').trim();
}

/** First 10 chars YYYY-MM-DD from pick row or full workspace quotation. */
function quotationYmdForPickRow(q, quotationsArr) {
  const iso = quotationDateIsoForPickRow(q, quotationsArr);
  return iso.length >= 10 ? iso.slice(0, 10) : '';
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
  refundSplits: [],
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
    customerName: refundCustomerNameFromRecord(record),
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
    refundSplits: Array.isArray(record.splitDistributions) ? record.splitDistributions : [],
  };
};

function sumLines(lines) {
  return (lines || []).reduce((s, l) => {
    if (l?.include === false) return s;
    const n = Number(String(l.amountNgn ?? '').replace(/,/g, ''));
    return s + (Number.isNaN(n) ? 0 : n);
  }, 0);
}

/** Sum included line amounts per category (expands bundled appliesToCategories). */
function sumLinesByCategory(lines) {
  /** @type {Record<string, number>} */
  const sums = {};
  for (const line of lines || []) {
    if (line?.include === false) continue;
    const amt = roundMoneyLocal(line.amountNgn);
    if (amt <= 0) continue;
    const multi = line.appliesToCategories;
    const cats =
      Array.isArray(multi) && multi.length
        ? multi.map((c) => String(c || '').trim()).filter(Boolean)
        : [String(line.category || '').trim()].filter(Boolean);
    for (const cat of cats) {
      sums[cat] = (sums[cat] || 0) + amt;
    }
  }
  return sums;
}

const AMOUNT_LINE_TOL = 1;

function quotationPreparedByLabel(q) {
  return String(q?.handled_by ?? q?.handledBy ?? '').trim();
}

function quotationAgentCustomerId(q) {
  return String(q?.agent_customer_id ?? q?.agentCustomerID ?? '').trim();
}

function quotationAgentCustomerName(q) {
  return String(q?.agent_customer_name ?? q?.agentCustomerName ?? '').trim();
}

function namesLikelySamePerson(a, b) {
  const left = String(a || '')
    .trim()
    .toLowerCase();
  const right = String(b || '')
    .trim()
    .toLowerCase();
  if (!left || !right) return false;
  if (left === right) return true;
  if (left.includes(right) || right.includes(left)) return true;
  const leftParts = left.split(/\s+/).filter((p) => p.length > 1);
  const rightParts = right.split(/\s+/).filter((p) => p.length > 1);
  if (!leftParts.length || !rightParts.length) return false;
  const shared = leftParts.filter((p) => rightParts.includes(p));
  return shared.length >= Math.min(2, leftParts.length, rightParts.length);
}

/** Looser match for quote labels vs directory (order swap, shared surname / first name). */
function namesLooselySamePerson(a, b) {
  if (namesLikelySamePerson(a, b)) return true;
  const left = String(a || '')
    .trim()
    .toLowerCase()
    .replace(/[.,]/g, ' ');
  const right = String(b || '')
    .trim()
    .toLowerCase()
    .replace(/[.,]/g, ' ');
  if (!left || !right) return false;
  const lp = left.split(/\s+/).filter((p) => p.length > 1);
  const rp = right.split(/\s+/).filter((p) => p.length > 1);
  if (!lp.length || !rp.length) return false;
  if (lp.length >= 2 && rp.length >= 2 && lp[lp.length - 1] === rp[rp.length - 1]) return true;
  if (lp[0] === rp[0] && lp[0].length >= 4) return true;
  const shared = lp.filter((p) => rp.includes(p));
  return shared.length >= 1 && Math.min(lp.length, rp.length) === 1;
}

function associatedStaffMatchesRole(row, role) {
  const t = String(row?.staffType || row?.staff_type || '')
    .trim()
    .toLowerCase();
  const r = String(role || '')
    .trim()
    .toLowerCase();
  if (r === 'driver') return t.includes('driver') || t.includes('transport');
  if (r === 'installer') return t.includes('install') || t.includes('roof');
  return true;
}

/**
 * Resolve a quotation person to associated-staff row: id first, then name (even if id was stale).
 */
function matchAssociatedStaffForPerson(person, staffRows) {
  const rows = Array.isArray(staffRows) ? staffRows : [];
  const id = String(person?.id || '').trim();
  const name = String(person?.name || '').trim();
  const role = String(person?.role || '').trim().toLowerCase();
  if (id) {
    const byId = rows.find((s) => String(s.id || s.staffID || '').trim() === id);
    if (byId) return byId;
  }
  if (!name) return null;
  const roleRows = rows.filter((s) => associatedStaffMatchesRole(s, role));
  const pool = roleRows.length ? roleRows : rows;
  return (
    pool.find((s) => namesLikelySamePerson(s.name, name)) ||
    pool.find((s) => namesLooselySamePerson(s.name, name)) ||
    rows.find((s) => namesLikelySamePerson(s.name, name)) ||
    rows.find((s) => namesLooselySamePerson(s.name, name)) ||
    null
  );
}

function matchClaimingStaffForPerson(person, claimRows, { branchId = '' } = {}) {
  const rows = Array.isArray(claimRows) ? claimRows : [];
  const id = String(person?.id || '').trim();
  const name = String(person?.name || '').trim();
  if (id) {
    const byCustomer = rows.find((c) => String(c.customerID || '').trim() === id);
    if (byCustomer) return byCustomer;
    const byUser = rows.find((c) => String(c.userId || '').trim() === id);
    if (byUser) return byUser;
  }
  if (!name) return null;

  const labelMatchesRow = (c, label) => {
    if (!label) return false;
    const target = label.toLowerCase();
    const candidates = [c?.name, c?.customerName, c?.username];
    return candidates.some((cand) => String(cand || '').trim().toLowerCase() === target);
  };

  const byExact =
    rows.find((c) => labelMatchesRow(c, name) && c.hasBank) ||
    rows.find((c) => labelMatchesRow(c, name));
  if (byExact) return byExact;

  // Legacy quotes: "Branch Manager" → unique sales_manager on that branch (not fuzzy name match).
  const roleKeys = roleKeysForPreparedByLabel(name);
  if (!roleKeys.length) return null;
  const byRole = rows.filter((c) => roleKeys.includes(String(c.roleKey || '').trim().toLowerCase()));
  if (!byRole.length) return null;
  const quoteBranch = String(branchId || '').trim();
  const sameBranch = quoteBranch
    ? byRole.filter((c) => String(c.branchId || '').trim() === quoteBranch)
    : [];
  if (sameBranch.length === 1) return sameBranch[0];
  if (sameBranch.length > 1) {
    const banked = sameBranch.filter((c) => c.hasBank);
    return banked.length === 1 ? banked[0] : null;
  }
  return byRole.length === 1 ? byRole[0] : null;
}

function matchCustomerForPerson(person, customers) {
  const rows = Array.isArray(customers) ? customers : [];
  const id = String(person?.id || '').trim();
  const name = String(person?.name || '').trim();
  if (id) {
    const byId = rows.find((c) => String(c.customerID || '').trim() === id);
    if (byId) return byId;
  }
  if (!name) return null;
  return (
    rows.find((c) => namesLikelySamePerson(c.name, name)) ||
    rows.find((c) => namesLooselySamePerson(c.name, name)) ||
    null
  );
}

function namesAgreeForHandledBy(a, b) {
  const left = String(a || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
  const right = String(b || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
  if (!left || !right) return false;
  if (left === right) return true;
  const lp = left.split(' ').filter(Boolean);
  const rp = right.split(' ').filter(Boolean);
  const [shorter, longer] = lp.length <= rp.length ? [lp, rp] : [rp, lp];
  if (shorter.length < 2) return false;
  return shorter.every((t) => longer.includes(t));
}

function handledByLabelAgreesWithPayee(label, payee) {
  if (!label || String(label).trim().toLowerCase() === 'sales') return true;
  if (namesAgreeForHandledBy(payee?.name, label)) return true;
  if (preparedByRoleTitleAgreesWithPayee(label, payee)) return true;
  return false;
}

/**
 * Prefer server default payee (handled_by_user_id → HR), then agent_customer_id, then exact userId in list.
 * Legacy "Branch Manager" labels agree with the BM-role login (e.g. Suleiman), not fuzzy name guessing.
 */
function resolveQuotationLinkedClaimingStaff(quotation, pickRow, claimingStaffOptions, defaultPayee) {
  const rows = Array.isArray(claimingStaffOptions) ? claimingStaffOptions : [];
  const sources = [quotation, pickRow].filter(Boolean);
  const preparedLabel =
    quotationPreparedByLabel(quotation) || quotationPreparedByLabel(pickRow) || '';
  const quoteBranchId = String(
    quotation?.branchId ||
      quotation?.branch_id ||
      pickRow?.branch_id ||
      pickRow?.branchId ||
      ''
  ).trim();

  if (defaultPayee?.customerID || defaultPayee?.userId) {
    const agrees = handledByLabelAgreesWithPayee(preparedLabel, defaultPayee);
    if (agrees && defaultPayee.customerID) return defaultPayee;
    if (agrees && defaultPayee.userId) {
      const byUser = rows.find((c) => String(c.userId || '').trim() === String(defaultPayee.userId).trim());
      if (byUser?.customerID) return byUser;
      if (defaultPayee.customerID) return defaultPayee;
    }
  }

  if (!rows.length) return null;

  const handledByUserId = sources
    .map((q) => String(q?.handled_by_user_id ?? q?.handledByUserId ?? '').trim())
    .find(Boolean);
  if (handledByUserId) {
    const byUser = rows.find((c) => String(c.userId || '').trim() === handledByUserId);
    if (byUser && handledByLabelAgreesWithPayee(preparedLabel, byUser)) return byUser;
  }

  if (preparedLabel) {
    const byName = matchClaimingStaffForPerson({ name: preparedLabel }, rows, {
      branchId: quoteBranchId,
    });
    if (byName) return byName;
  }

  const agentId = sources.map(quotationAgentCustomerId).find(Boolean) || '';
  if (agentId) {
    const byId = rows.find((c) => String(c.customerID || '').trim() === agentId) || null;
    if (byId && handledByLabelAgreesWithPayee(preparedLabel, byId)) return byId;
    if (
      byId &&
      isBranchManagerPreparedByLabel(preparedLabel) &&
      isBranchManagerPreparedByLabel(quotationAgentCustomerName(quotation) || quotationAgentCustomerName(pickRow))
    ) {
      return byId;
    }
  }
  return null;
}

/** API rows use snake_case; workspace snapshot uses camelCase — unify for the quotation dropdown. */
function normalizeQuoteForRefundSelect(q, { skipPickerFloor = false } = {}) {
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
  const cashIn = Math.round(Number(q.cash_in_ngn ?? q.cashInNgn ?? paid) || 0);
  const remainingFromApi = Math.round(Number(q.remaining_ngn ?? q.remainingNgn));
  const totalRefundedRounded = Number.isFinite(totalRefunded) ? Math.round(totalRefunded) : 0;
  const remaining_ngn =
    Number.isFinite(remainingFromApi) && remainingFromApi >= 0
      ? remainingFromApi
      : Math.max(0, cashIn - totalRefundedRounded);
  const normalized = {
    id: String(q.id),
    customer_name: q.customer_name ?? q.customer ?? '—',
    handled_by: quotationPreparedByLabel(q),
    handled_by_user_id: String(q.handled_by_user_id ?? q.handledByUserId ?? '').trim(),
    agent_customer_id: quotationAgentCustomerId(q),
    agent_customer_name: quotationAgentCustomerName(q),
    paid_ngn: paid,
    cash_in_ngn: cashIn,
    total_ngn: total,
    total_refunded_ngn: totalRefundedRounded,
    remaining_ngn,
    eligible_refund_categories: eligibleRefundCategories,
    suggested_preview_amount_ngn: suggestedPreviewNgn,
    dateISO: String(q.dateISO ?? q.date_iso ?? '').trim(),
    status: String(q.status ?? '').trim(),
  };
  if (!skipPickerFloor && !quotationMeetsRefundPickerFloor(normalized)) return null;
  return normalized;
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
  const ws = useWorkspace();
  const canApproveRefunds = userMayApproveRefundRequests(ws);
  const workspaceBranchId = String(
    ws?.session?.currentBranchId ||
      ws?.session?.branchId ||
      ws?.workspaceBranchId ||
      ws?.branchScope ||
      ''
  ).trim();
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
    String(refundDefaultApproveAmountNgn(record) || '')
  );
  const [managerComments, setManagerComments] = useState(() => record?.managerComments ?? '');
  const [saving, setSaving] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [warnings, setWarnings] = useState([]);
  const [substitutionPerMeterBreakdown, setSubstitutionPerMeterBreakdown] = useState([]);
  const [pricingAsAtIso, setPricingAsAtIso] = useState('');
  const [blockedRefundCategories, setBlockedRefundCategories] = useState([]);
  const [intelligence, setIntelligence] = useState({
    receipts: [],
    cuttingLists: [],
    summary: { producedMeters: 0, accessoriesSummary: { lines: [] }, stoneFlatsheetSummary: { totalSuppliedM2: 0, totalDeductionM2: 0, lines: [] } },
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
  const [refundIntelExpanded, setRefundIntelExpanded] = useState(() => mode === 'view');
  /** From refund preview: paid on quote vs overpay split (ledger RECEIPT + OVERPAY_ADVANCE). */
  const [moneyContext, setMoneyContext] = useState(null);
  const [categorySuggestedMaxNgn, setCategorySuggestedMaxNgn] = useState(null);
  const [productionAlignmentIssues, setProductionAlignmentIssues] = useState([]);
  const [productionAlignmentAck, setProductionAlignmentAck] = useState({});
  const [productionAlignmentOverrideNote, setProductionAlignmentOverrideNote] = useState('');
  const [alignmentCheckLoading, setAlignmentCheckLoading] = useState(false);
  const [refundGuideOpen, setRefundGuideOpen] = useState(false);
  /** Filter quotation dropdown by quote date (YYYY-MM-DD); empty = all dates. */
  /** Typeahead / paste quotation id (Step 1). */
  const [quotationSearchText, setQuotationSearchText] = useState('');
  const [quotationSuggestOpen, setQuotationSuggestOpen] = useState(false);
  /** Seeded create / edge cases: quotation ref allowed even if not yet in eligible pick list. */
  const [quotationServerVerifiedRef, setQuotationServerVerifiedRef] = useState('');
  const [manualQuotationVerifyBusy, setManualQuotationVerifyBusy] = useState(false);
  const [manualQuotationVerifyError, setManualQuotationVerifyError] = useState('');
  const [approvalEditMode, setApprovalEditMode] = useState(false);
  const [approvalAuditData, setApprovalAuditData] = useState(null);
  const [loadingApprovalAudit, setLoadingApprovalAudit] = useState(false);
  const [approvalRefundIntel, setApprovalRefundIntel] = useState(null);
  const [loadingApprovalIntel, setLoadingApprovalIntel] = useState(false);
  /** `quick` — overpayment-only path; `full` — standard breakdown wizard. */
  const [createPath, setCreatePath] = useState('full');
  const [quoteDetailsOpen, setQuoteDetailsOpen] = useState(false);
  const [pasteQuoteIdOpen, setPasteQuoteIdOpen] = useState(false);
  const [excludedCatsOpen, setExcludedCatsOpen] = useState(false);
  const [activityTimelineOpen, setActivityTimelineOpen] = useState(false);
  const [substLineCalcOpen, setSubstLineCalcOpen] = useState(false);
  const [advancedPricingOpen, setAdvancedPricingOpen] = useState(false);
  const [refundAttentionOpen, setRefundAttentionOpen] = useState(false);
  const [refundNotesOpen, setRefundNotesOpen] = useState(false);
  /** Non-terminal production still on quote — submit blocked until finished/cancelled. */
  const [openProductionJob, setOpenProductionJob] = useState(null);
  /** Fresh associated-staff directory for payout allocation (snapshot may lag). */
  const [payoutAssociatedStaff, setPayoutAssociatedStaff] = useState([]);
  const [payoutAssociatedStaffLoading, setPayoutAssociatedStaffLoading] = useState(false);
  const [payoutAssociatedStaffError, setPayoutAssociatedStaffError] = useState('');
  /** Branch staff with sales customer link — bank from HR (masked). */
  const [claimingStaffRows, setClaimingStaffRows] = useState([]);
  const [claimingStaffLoading, setClaimingStaffLoading] = useState(false);
  const [claimingStaffError, setClaimingStaffError] = useState('');
  /** Inline bank capture when recipient / quote customer has no account. */
  const [payoutBankDraft, setPayoutBankDraft] = useState(null);
  const [payoutBankSaving, setPayoutBankSaving] = useState(false);
  const [payoutBankError, setPayoutBankError] = useState('');
  /** Local bank patches after inline save (before sales snapshot refresh). */
  const [customerBankOverrides, setCustomerBankOverrides] = useState({});
  /** Full quotation (with service assignees) when snapshot/eligible list is thin. */
  const [payoutQuoteDetail, setPayoutQuoteDetail] = useState(null);
  /** Server-resolved quotation maker → HR bank (source of truth for default sales payee). */
  const [defaultRefundPayee, setDefaultRefundPayee] = useState(null);
  const [defaultRefundPayeeLoading, setDefaultRefundPayeeLoading] = useState(false);
  const [defaultRefundPayeeHint, setDefaultRefundPayeeHint] = useState('');

  const createPathUserTouchedRef = useRef(false);

  const productionFingerprintRef = useRef('');
  const previewLoadedForQuoteRef = useRef('');
  /** Skip a second production-alignment API call when preview already computed the same quote+categories. */
  const previewAlignmentKeyRef = useRef('');
  /** Monotonic counter so out-of-order `/api/refunds/preview` responses cannot overwrite newer results (e.g. after production accessory correction). */
  const refundsPreviewSeqRef = useRef(0);
  const createPathRef = useRef('full');
  /** Line key from last preview that carried substitution credit — breakdown stays visible if category is renamed. */
  const [substitutionBreakdownLineKey, setSubstitutionBreakdownLineKey] = useState('');

  useEffect(() => {
    createPathRef.current = createPath;
  }, [createPath]);

  useEffect(() => {
    if (!isOpen) {
      setRefundGuideOpen(false);
      setQuoteDetailsOpen(false);
      setPasteQuoteIdOpen(false);
      setExcludedCatsOpen(false);
      setActivityTimelineOpen(false);
      setSubstLineCalcOpen(false);
      setAdvancedPricingOpen(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setRefundIntelExpanded(mode === 'view');
  }, [isOpen, mode]);

  const fetchEligibleQuotes = useCallback(async (opts = {}) => {
    setLoadingQuotes(true);
    // Keep modal opening responsive. Exact older quotation IDs remain available through
    // "Use quotation id"; selecting any row still loads its complete refund preview.
    const rows = await fetchEligibleRefundQuotationsCached(apiFetch, { limit: 50, ...opts });
    setLoadingQuotes(false);
    setEligibleQuotes(rows);
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
    invalidateEligibleRefundQuotationsCache();
    void fetchEligibleQuotes({ force: true });
  }, [syncPaidId, fetchEligibleQuotes, showToast]);

  /* Sync form state when the modal opens or the record/mode changes (intentional reset). */
   
  useEffect(() => {
    if (!isOpen) return;
    refundsPreviewSeqRef.current += 1;
    const initialForm = initFormFromRecord(record);
    setForm(initialForm);
    setQuotationSearchText(String(initialForm.quotationRef || '').trim());
    setQuotationSuggestOpen(false);
    setQuotationServerVerifiedRef('');
    setApprovalStatus(record?.status === 'Rejected' ? 'Rejected' : 'Approved');
    setApprovalDate(record?.approvalDate ?? '');
    setApprovedAmountNgn(String(refundDefaultApproveAmountNgn(record) || ''));
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
    setIntelligence({
      receipts: [],
      cuttingLists: [],
      summary: {
        producedMeters: 0,
        accessoriesSummary: { lines: [] },
        stoneFlatsheetSummary: { totalSuppliedM2: 0, totalDeductionM2: 0, lines: [] },
      },
      dataQualityIssues: [],
    });
    setLastPreviewSnapshot(null);
    setPreviewRemainingNgn(null);
    setEligibleRefundCategoriesFromPreview(null);
    setIncludeCommissionInPreview(false);
    setSubstitutionWorkbookPpmOverride('');
    setManualQuotationVerifyBusy(false);
    setManualQuotationVerifyError('');
    setProductionAlignmentIssues([]);
    setProductionAlignmentAck({});
    setProductionAlignmentOverrideNote('');
    setApprovalEditMode(false);
    setCreatePath('full');
    createPathRef.current = 'full';
    createPathUserTouchedRef.current = false;
    setQuoteDetailsOpen(false);
    setPasteQuoteIdOpen(false);
    setExcludedCatsOpen(false);
    setActivityTimelineOpen(false);
    setSubstLineCalcOpen(false);
    setAdvancedPricingOpen(false);

    if (mode === 'create') {
      void fetchEligibleQuotes({ force: true });
    }
  }, [isOpen, record, mode, fetchEligibleQuotes]);

  const allCustomers = useMemo(() => {
    const base = Array.isArray(ws?.snapshot?.customers) ? ws.snapshot.customers : [];
    if (!Object.keys(customerBankOverrides).length) return base;
    return base.map((c) => {
      const id = String(c.customerID || '').trim();
      const ov = customerBankOverrides[id];
      return ov ? { ...c, ...ov } : c;
    });
  }, [ws?.snapshot?.customers, customerBankOverrides]);
  const partnerWalletPolicyEnabled = Boolean(ws?.snapshot?.partnerWalletPolicy?.enabled);
  const snapshotAssociatedStaff = useMemo(
    () => (Array.isArray(ws?.snapshot?.associatedStaff) ? ws.snapshot.associatedStaff : []),
    [ws?.snapshot?.associatedStaff]
  );
  const associatedStaffRows = useMemo(() => {
    const byId = new Map();
    for (const row of [...snapshotAssociatedStaff, ...payoutAssociatedStaff]) {
      const id = String(row?.id || row?.staffID || '').trim();
      if (!id) continue;
      byId.set(id, row);
    }
    return Array.from(byId.values());
  }, [snapshotAssociatedStaff, payoutAssociatedStaff]);
  const selectedRefundCustomer = useMemo(
    () => allCustomers.find((c) => String(c.customerID || '').trim() === String(form.customerID || '').trim()) || null,
    [allCustomers, form.customerID]
  );
  const overpaymentOnlyRefund = useMemo(
    () => refundFormIsOverpaymentOnly(form.calculationLines),
    [form.calculationLines]
  );
  const selectedCustomerHrPayout = useMemo(() => {
    // Overpayment returns to the quote customer's bank — not HR payroll / staff cut path.
    if (overpaymentOnlyRefund) return null;
    const cid = String(form.customerID || '').trim();
    if (!cid) return null;
    return claimingStaffRows.find((r) => String(r.customerID || '').trim() === cid && r.hasBank) || null;
  }, [claimingStaffRows, form.customerID, overpaymentOnlyRefund]);
  const payoutAccountReady = Boolean(
    (String(form.payeeName || '').trim() &&
      String(form.payeeAccountNo || '').trim() &&
      String(form.payeeBankName || '').trim()) ||
      selectedCustomerHrPayout
  );
  const companyStaffClaimOptions = useMemo(
    () =>
      [...claimingStaffRows].sort((a, b) => {
        const aBank = a.hasBank ? 0 : 1;
        const bBank = b.hasBank ? 0 : 1;
        if (aBank !== bBank) return aBank - bBank;
        return String(a.name || '').localeCompare(String(b.name || ''));
      }),
    [claimingStaffRows]
  );
  const staffAllocationDeductionRate = useMemo(
    () =>
      normalizeRefundStaffAllocationDeductionRate(
        ws?.snapshot?.orgGovernanceLimits?.refundStaffAllocationDeductionPct ??
          REFUND_STAFF_ALLOCATION_DEDUCTION_RATE
      ),
    [ws?.snapshot?.orgGovernanceLimits?.refundStaffAllocationDeductionPct]
  );
  const mayWaiveStaffAllocationCut = useMemo(() => {
    const rk = String(ws?.user?.roleKey ?? ws?.session?.user?.roleKey ?? '')
      .trim()
      .toLowerCase();
    return rk === 'admin' || isExecutiveRoleKey(rk) || Boolean(ws?.hasPermission?.('*'));
  }, [ws?.user?.roleKey, ws?.session?.user?.roleKey, ws?.hasPermission]);
  const unclearedFloatByClaimingCustomerId = useMemo(() => {
    const m = new Map();
    for (const s of claimingStaffRows) {
      const cid = String(s.customerID || '').trim();
      if (!cid) continue;
      m.set(cid, Math.round(Number(s.unclearedReceiptFloatNgn) || 0));
    }
    return m;
  }, [claimingStaffRows]);
  const customersWithBankOptions = useMemo(
    () =>
      allCustomers
        .filter((c) => customerHasBank(c) && !isStaffLinkedCustomer(c))
        .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''))),
    [allCustomers]
  );
  const staffLinkedCustomers = useMemo(
    () =>
      allCustomers
        .filter((c) => isStaffLinkedCustomer(c))
        .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''))),
    [allCustomers]
  );
  const activeAssociatedStaff = useMemo(
    () =>
      associatedStaffRows
        .filter((s) => String(s?.status || 'Active').toLowerCase() === 'active')
        .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''))),
    [associatedStaffRows]
  );
  const associatedStaffWithBank = useMemo(
    () => activeAssociatedStaff.filter((s) => associatedStaffHasBank(s)),
    [activeAssociatedStaff]
  );
  const quotationAssigneeIds = useMemo(() => {
    const ref = String(form.quotationRef || '').trim();
    const quoteSnap =
      (ref && payoutQuoteDetail && String(payoutQuoteDetail.id || '').trim() === ref
        ? payoutQuoteDetail
        : null) || (ref ? quotations.find((x) => String(x.id) === ref) ?? null : null);
    const eligibleRaw = ref
      ? eligibleQuotes.find((x) => String(x.id).trim() === ref) || null
      : null;
    const { transporterId, installerId } = quotationServiceAssignees(
      mergeQuotationForPayoutPeople(quoteSnap, eligibleRaw, null)
    );
    return {
      transporterId: String(transporterId || '').trim(),
      installerId: String(installerId || '').trim(),
    };
  }, [form.quotationRef, quotations, eligibleQuotes, payoutQuoteDetail]);

  const quotationLinkedPayees = useMemo(() => {
    const ref = String(form.quotationRef || '').trim();
    const quoteSnap =
      (ref && payoutQuoteDetail && String(payoutQuoteDetail.id || '').trim() === ref
        ? payoutQuoteDetail
        : null) || (ref ? quotations.find((x) => String(x.id) === ref) ?? null : null);
    const eligibleRaw = ref
      ? eligibleQuotes.find((x) => String(x.id).trim() === ref) || null
      : null;
    const pickRow = normalizeQuoteForRefundSelect(eligibleRaw || quoteSnap, {
      skipPickerFloor: true,
    });
    return quotationTransactionPeople(
      mergeQuotationForPayoutPeople(quoteSnap, eligibleRaw, pickRow)
    );
  }, [form.quotationRef, quotations, eligibleQuotes, payoutQuoteDetail]);

  /** Resolve quote-linked people into picker options (associated staff and/or claiming customers). */
  const quotationLinkedPayoutOptions = useMemo(() => {
    const opts = [];
    const seen = new Set();
    const quoteBranchId = String(
      payoutQuoteDetail?.branchId ||
        payoutQuoteDetail?.branch_id ||
        quotations.find((x) => String(x.id) === String(form.quotationRef || '').trim())?.branchId ||
        quotations.find((x) => String(x.id) === String(form.quotationRef || '').trim())?.branch_id ||
        eligibleQuotes.find((x) => String(x.id).trim() === String(form.quotationRef || '').trim())
          ?.branch_id ||
        ''
    ).trim();
    // Include inactive in matching — quote may still name them; prefer Active when tying.
    const staffPool = [...associatedStaffRows].sort((a, b) => {
      const aActive = String(a?.status || 'Active').toLowerCase() === 'active' ? 0 : 1;
      const bActive = String(b?.status || 'Active').toLowerCase() === 'active' ? 0 : 1;
      return aActive - bActive;
    });

    const pushAssociated = (asRow, roleHint) => {
      const sid = String(asRow.id || asRow.staffID || '').trim();
      if (!sid) return false;
      const key = `staff:${sid}`;
      if (seen.has(key)) return true;
      seen.add(key);
      const hasBank = associatedStaffHasBank(asRow);
      opts.push({
        key,
        label: `${asRow.name}${asRow.staffType || asRow.staff_type ? ` · ${asRow.staffType || asRow.staff_type}` : ''} · ${roleHint}${
          hasBank
            ? ` · ${asRow.bankName || asRow.bank_name} ${asRow.bankAccountNo || asRow.bank_account_no}`
            : ' · no bank on file'
        }`,
        group: 'On this quotation',
        searchText: `${asRow.name} ${roleHint} ${asRow.staffType || ''} ${sid}`,
        needsBank: !hasBank,
        hint: hasBank ? roleHint : `${roleHint} — select to add bank`,
        meta: {
          kind: 'associated_staff',
          id: sid,
          name: asRow.name,
          bankAccountName: asRow.bankAccountName || asRow.bank_account_name || asRow.name || '',
          bankName: asRow.bankName || asRow.bank_name || '',
          bankAccountNo: asRow.bankAccountNo || asRow.bank_account_no || '',
        },
      });
      return true;
    };

    const pushCustomerLike = (row, roleHint, { fromClaim = false, quoteLabel = '' } = {}) => {
      const cid = String(row.customerID || '').trim();
      if (!cid) return false;
      const key = `customer:${cid}`;
      if (seen.has(key)) return true;
      seen.add(key);
      const hasBank = fromClaim ? Boolean(row.hasBank) : customerHasBank(row);
      const bankBit = fromClaim
        ? hasBank
          ? `${row.bankName} ${row.bankAccountNoMasked || ''}`
          : 'no HR bank on file'
        : hasBank
          ? `${row.bankName} ${row.bankAccountNo}`
          : 'no bank on file';
      const renamed =
        quoteLabel &&
        row.name &&
        !namesLikelySamePerson(row.name, quoteLabel) &&
        !namesLooselySamePerson(row.name, quoteLabel);
      const renamedBit = renamed ? ` · was “${quoteLabel}” on quote` : '';
      opts.push({
        key,
        label: `${row.name}${row.employeeNo ? ` · ${row.employeeNo}` : ''} · ${roleHint}${renamedBit} · ${bankBit}`,
        group: 'On this quotation',
        searchText: `${row.name} ${row.customerName || ''} ${row.username || ''} ${quoteLabel} ${roleHint} ${row.employeeNo || ''} ${cid}`,
        needsBank: !hasBank,
        hint: renamed
          ? `${roleHint} — same person as “${quoteLabel}” on the quotation`
          : hasBank
            ? roleHint
            : `${roleHint} — select to add bank`,
        meta: {
          kind: 'customer',
          id: cid,
          name: row.name,
          bankAccountName: row.bankAccountName || row.name || '',
          bankName: row.bankName || '',
          bankAccountNo: fromClaim ? '' : row.bankAccountNo || '',
        },
      });
      return true;
    };

    for (const person of quotationLinkedPayees) {
      const id = String(person.id || '').trim();
      const name = String(person.name || '').trim();
      const role = String(person.role || '').trim().toLowerCase();
      const roleHint = person.label || person.role || 'On quotation';
      const preferCustomerDirectory = role === 'agent' || role === 'preparer';

      if (!preferCustomerDirectory) {
        const asRow = matchAssociatedStaffForPerson(person, staffPool);
        if (asRow && pushAssociated(asRow, roleHint)) continue;
      }

      const claimRow = matchClaimingStaffForPerson(person, companyStaffClaimOptions, {
        branchId: quoteBranchId,
      });
      if (claimRow && pushCustomerLike(claimRow, roleHint, { fromClaim: true, quoteLabel: name }))
        continue;

      const cust = matchCustomerForPerson(person, allCustomers);
      if (cust && pushCustomerLike(cust, roleHint, { quoteLabel: name })) continue;

      if (preferCustomerDirectory) {
        const asFallback = matchAssociatedStaffForPerson(person, staffPool);
        if (asFallback && pushAssociated(asFallback, roleHint)) continue;
      }

      // Id on quote but directory not loaded / stale — still selectable (add bank or resolve later).
      if (id) {
        const asStaff = role === 'driver' || role === 'installer' || role === 'service';
        const key = asStaff ? `staff:${id}` : `customer:${id}`;
        if (!seen.has(key)) {
          seen.add(key);
          opts.push({
            key,
            label: `${name || id} · ${roleHint} · add bank`,
            group: 'On this quotation',
            searchText: `${name} ${roleHint} ${id}`,
            needsBank: true,
            hint: `${roleHint} — select to add bank`,
            meta: {
              kind: asStaff ? 'associated_staff' : 'customer',
              id,
              name: name || id,
              bankAccountName: name || '',
              bankName: '',
              bankAccountNo: '',
            },
          });
        }
        continue;
      }

      // Name only: offer associated staff whose name matches this quote person.
      if (name && (role === 'driver' || role === 'installer' || role === 'service')) {
        const roleMatches = staffPool.filter((s) => associatedStaffMatchesRole(s, role));
        const likely = roleMatches.filter((s) => namesLikelySamePerson(s.name, name));
        const loose = roleMatches.filter((s) => namesLooselySamePerson(s.name, name));
        const toOffer = (likely.length ? likely : loose).slice(0, 8);
        if (toOffer.length) {
          for (const s of toOffer) {
            pushAssociated(s, `${roleHint} · match for ${name}`);
          }
          continue;
        }
      }

      if (name) {
        const key = `unresolved:${role || 'person'}:${name.toLowerCase()}`;
        if (!seen.has(key)) {
          seen.add(key);
          opts.push({
            key,
            label: `${name} · ${roleHint} · pick from list below`,
            group: 'On this quotation',
            searchText: `${name} ${roleHint}`,
            disabled: true,
            hint:
              role === 'agent' || role === 'preparer'
                ? 'Sales staff on this quote — ensure their HR profile is linked (Handled by / Prepared by)'
                : 'Name is on the quotation — assign transporter/installer on the quotation, then reopen refund',
          });
        }
      }
    }
    return opts;
  }, [
    quotationLinkedPayees,
    associatedStaffRows,
    companyStaffClaimOptions,
    allCustomers,
    form.quotationRef,
    payoutQuoteDetail,
    quotations,
    eligibleQuotes,
  ]);

  /** Drivers/installers assigned on this quotation only — not the full associated-staff directory. */
  const associatedStaffPayoutOptions = useMemo(() => {
    const seen = new Set(quotationLinkedPayoutOptions.map((o) => o.key));
    const assigneeIds = new Set(
      [quotationAssigneeIds.transporterId, quotationAssigneeIds.installerId].filter(Boolean)
    );
    return activeAssociatedStaff
      .map((s) => {
        const id = String(s.id || s.staffID || '').trim();
        if (!id || !assigneeIds.has(id)) return null;
        const key = `staff:${id}`;
        if (seen.has(key)) return null;
        seen.add(key);
        const hasBank = associatedStaffHasBank(s);
        const roleBit =
          id === quotationAssigneeIds.transporterId
            ? ' · Quotation transporter'
            : id === quotationAssigneeIds.installerId
              ? ' · Quotation installer'
              : '';
        const bankBit = hasBank
          ? `${s.bankName || s.bank_name} ${s.bankAccountNo || s.bank_account_no}`
          : 'no bank on file';
        return {
          key,
          label: `${s.name}${s.staffType || s.staff_type ? ` · ${s.staffType || s.staff_type}` : ''}${roleBit} · ${bankBit}`,
          group: 'On this quotation',
          searchText: `${s.name} ${s.staffType || s.staff_type || ''} ${s.bankName || ''} ${s.bankAccountNo || ''} ${id}`,
          needsBank: !hasBank,
          hint: hasBank ? 'Assigned on quotation' : 'Select to add account number now',
          meta: {
            kind: 'associated_staff',
            id,
            name: s.name,
            bankAccountName: s.bankAccountName || s.bank_account_name || s.name || '',
            bankName: s.bankName || s.bank_name || '',
            bankAccountNo: s.bankAccountNo || s.bank_account_no || '',
          },
        };
      })
      .filter(Boolean);
  }, [activeAssociatedStaff, quotationAssigneeIds, quotationLinkedPayoutOptions]);

  /** Quotation handled-by + quote customer only — not every branch HR login. */
  const claimingPayoutOptions = useMemo(() => {
    const opts = [];
    const seen = new Set();
    const quoteCustomerId = String(form.customerID || '').trim();

    const pushCompanyStaff = (s, { pinned = false } = {}) => {
      const cid = String(s.customerID || '').trim();
      const uid = String(s.userId || '').trim();
      const key = cid ? `customer:${cid}` : uid ? `user:${uid}` : '';
      if (!key) return;
      if (cid && seen.has(`customer:${cid}`)) return;
      if (!cid && uid && seen.has(`user:${uid}`)) return;
      if (cid && uid && seen.has(`user:${uid}`)) {
        const priorIdx = opts.findIndex((o) => o.key === `user:${uid}`);
        if (priorIdx >= 0) opts.splice(priorIdx, 1);
        seen.delete(`user:${uid}`);
      }
      if (cid) seen.add(`customer:${cid}`);
      if (uid) seen.add(`user:${uid}`);
      seen.add(key);
      const bankBit = s.hasBank
        ? `${s.bankName} ${s.bankAccountNoMasked || ''}`.trim()
        : 'no HR bank on file';
      const emp = s.employeeNo ? ` · ${s.employeeNo}` : '';
      const uncleared = Math.round(Number(s.unclearedReceiptFloatNgn) || 0);
      const unclearedBit =
        uncleared > 0
          ? ` · ₦${uncleared.toLocaleString('en-NG')} uncleared receipts`
          : '';
      const needsLink = Boolean(s.needsSalesCustomer) || !cid;
      opts.push({
        key,
        label: `${s.name}${emp} · ${bankBit}${unclearedBit}`,
        group: pinned ? 'Default · quotation handled by' : 'On this quotation',
        searchText: `${s.name} ${s.customerName || ''} ${s.username || ''} ${s.employeeNo || ''} ${s.bankName || ''} ${cid} ${uid}`,
        needsBank: !s.hasBank,
        hint: pinned
          ? 'Quotation Prepared by / Handled by — HR payroll bank'
          : needsLink
            ? 'Select to link HR sales customer for payout'
            : uncleared > 0
              ? `Has ₦${uncleared.toLocaleString('en-NG')} uncleared receipts — payout held until cleared`
              : s.hasBank
                ? 'Uses HR payroll bank'
                : 'Select to add bank on the staff HR profile',
        meta: {
          kind: 'customer',
          id: cid,
          userId: uid,
          name: s.name,
          bankAccountName: s.name || '',
          bankName: s.bankName || '',
          bankAccountNo: '',
          unclearedReceiptFloatNgn: uncleared,
          needsSalesCustomer: needsLink,
        },
      });
    };

    if (defaultRefundPayee?.customerID || defaultRefundPayee?.userId) {
      pushCompanyStaff(defaultRefundPayee, { pinned: true });
    }

    if (quoteCustomerId && selectedRefundCustomer && !seen.has(`customer:${quoteCustomerId}`)) {
      const c = selectedRefundCustomer;
      const hasBank = customerHasBank(c);
      opts.push({
        key: `customer:${quoteCustomerId}`,
        label: hasBank
          ? `${c.name} · ${c.bankName} ${c.bankAccountNo}`
          : `${c.name} · quote customer · no bank`,
        group: 'Quote customer',
        searchText: `${c.name} ${c.bankName || ''} ${c.bankAccountNo || ''} ${quoteCustomerId}`,
        needsBank: !hasBank,
        hint: hasBank ? 'Customer on this quotation' : 'Select to add this customer’s bank now',
        meta: {
          kind: 'customer',
          id: quoteCustomerId,
          name: c.name,
          bankAccountName: c.bankAccountName || c.name || '',
          bankName: c.bankName || '',
          bankAccountNo: c.bankAccountNo || '',
        },
      });
    }

    return opts;
  }, [defaultRefundPayee, form.customerID, selectedRefundCustomer]);

  /**
   * Payee picker = people already on this quotation only:
   * handled-by, transporter/installer, other quote-linked names, quote customer.
   */
  const payoutRecipientOptions = useMemo(() => {
    const opts = [];
    const seen = new Set();
    const push = (o) => {
      const key = String(o?.key || '').trim();
      if (!key || seen.has(key) || o?.disabled) return;
      seen.add(key);
      opts.push(o);
    };
    for (const o of claimingPayoutOptions.filter((x) => x.group?.startsWith('Default'))) push(o);
    for (const o of quotationLinkedPayoutOptions) push(o);
    for (const o of associatedStaffPayoutOptions) push(o);
    for (const o of claimingPayoutOptions.filter((x) => x.group === 'Quote customer')) push(o);
    return opts;
  }, [claimingPayoutOptions, quotationLinkedPayoutOptions, associatedStaffPayoutOptions]);

  const payoutRecipientsAvailable =
    payoutRecipientOptions.length > 0 ||
    Boolean(defaultRefundPayee?.customerID || defaultRefundPayee?.userId) ||
    Boolean(selectedRefundCustomer);
  const payoutDirectoryLoading =
    (payoutAssociatedStaffLoading || claimingStaffLoading || defaultRefundPayeeLoading) &&
    payoutRecipientOptions.length === 0;

  const openPayoutBankDraft = useCallback((draft) => {
    const id = String(draft?.id || '').trim();
    if (!draft?.kind || !id) {
      showToast('Select a quotation with a customer first, then add bank details.', { variant: 'error' });
      return;
    }
    setPayoutBankError('');
    setPayoutBankDraft({
      kind: draft.kind,
      id,
      name: draft.name || '',
      bankAccountName: draft.bankAccountName || draft.name || '',
      bankName: draft.bankName || '',
      bankAccountNo: draft.bankAccountNo || '',
      splitIdx: draft.splitIdx ?? null,
      forQuoteCustomer: Boolean(draft.forQuoteCustomer),
    });
  }, [showToast]);

  const applySavedPayoutBankLocally = useCallback(
    (saved) => {
      if (!saved?.ok) return;
      if (saved.kind === 'associated_staff') {
        setPayoutAssociatedStaff((rows) => {
          const id = String(saved.id);
          const next = Array.isArray(rows) ? [...rows] : [];
          const idx = next.findIndex((r) => String(r.id || r.staffID || '') === id);
          const patch = {
            id,
            name: saved.name,
            bankAccountName: saved.bankAccountName,
            bankName: saved.bankName,
            bankAccountNo: saved.bankAccountNo,
            status: 'Active',
          };
          if (idx >= 0) next[idx] = { ...next[idx], ...patch };
          else next.push(patch);
          return next;
        });
      } else if (saved.kind === 'customer') {
        setCustomerBankOverrides((m) => ({
          ...m,
          [String(saved.id)]: {
            bankAccountName: saved.bankAccountName,
            bankName: saved.bankName,
            bankAccountNo: saved.bankAccountNo,
          },
        }));
        setClaimingStaffRows((rows) =>
          rows.map((r) =>
            String(r.customerID) === String(saved.id)
              ? {
                  ...r,
                  hasBank: true,
                  bankName: saved.bankName,
                  bankAccountNoMasked: `****${String(saved.bankAccountNo || '').slice(-4)}`,
                }
              : r
          )
        );
        void ws.ensureDomainLoaded?.('sales', { force: true });
      }
    },
    [ws]
  );

  const savePayoutBankDraft = useCallback(
    async (bank) => {
      if (!payoutBankDraft) return;
      setPayoutBankSaving(true);
      setPayoutBankError('');
      const { ok, data } = await apiFetch('/api/refunds/payout-bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: payoutBankDraft.kind,
          id: payoutBankDraft.id,
          bankAccountName: bank.bankAccountName,
          bankName: bank.bankName,
          bankAccountNo: bank.bankAccountNo,
        }),
      });
      setPayoutBankSaving(false);
      if (!ok || !data?.ok) {
        setPayoutBankError(String(data?.error || 'Could not save bank details.'));
        return;
      }
      applySavedPayoutBankLocally(data);
      if (payoutBankDraft.forQuoteCustomer || String(payoutBankDraft.id) === String(form.customerID)) {
        setForm((f) => ({
          ...f,
          payeeName: data.bankAccountName || f.payeeName,
          payeeBankName: data.bankName,
          payeeAccountNo: data.bankAccountNo,
        }));
      }
      if (payoutBankDraft.splitIdx != null) {
        const idx = payoutBankDraft.splitIdx;
        const staff = payoutBankDraft.kind === 'associated_staff';
        setForm((f) => ({
          ...f,
          refundSplits: (Array.isArray(f.refundSplits) ? f.refundSplits : []).map((x, i) =>
            i === idx
              ? {
                  ...x,
                  _manual: '1',
                  recipientKind: staff ? 'associated_staff' : 'customer',
                  recipientAssociatedStaffID: staff ? payoutBankDraft.id : '',
                  recipientCustomerID: staff ? '' : payoutBankDraft.id,
                }
              : x
          ),
        }));
      }
      setPayoutBankDraft(null);
      showToast(`Bank saved for ${data.name || 'recipient'}.`, { variant: 'success' });
    },
    [payoutBankDraft, applySavedPayoutBankLocally, form.customerID, showToast]
  );

  // Snapshot first (instant); refresh APIs in background without blocking the picker.
  useEffect(() => {
    if (!isOpen || mode !== 'create') return;
    let cancelled = false;
    const needStaffApi = snapshotAssociatedStaff.length === 0;
    setPayoutAssociatedStaffLoading(true);
    setClaimingStaffLoading(true);
    setPayoutAssociatedStaffError('');
    setClaimingStaffError('');
    void (async () => {
      try {
        const tasks = [];
        tasks.push(
          apiFetch('/api/associated-staff').then((staffRes) => {
            if (cancelled) return;
            if (!staffRes.ok) {
              if (needStaffApi) {
                setPayoutAssociatedStaffError(
                  String(staffRes.data?.error || 'Could not load associated staff for payout.')
                );
              }
              return;
            }
            setPayoutAssociatedStaff(
              Array.isArray(staffRes.data?.associatedStaff) ? staffRes.data.associatedStaff : []
            );
          })
        );
        const claimQs = workspaceBranchId
          ? `?branchId=${encodeURIComponent(workspaceBranchId)}`
          : '';
        tasks.push(
          apiFetch(`/api/refunds/claiming-staff${claimQs}`).then((claimRes) => {
            if (cancelled) return;
            if (!claimRes.ok) {
              setClaimingStaffError(
                String(claimRes.data?.error || 'Could not load branch staff for claiming.')
              );
              return;
            }
            setClaimingStaffRows(
              Array.isArray(claimRes.data?.claimingStaff) ? claimRes.data.claimingStaff : []
            );
          })
        );
        await Promise.all(tasks);
      } catch (e) {
        if (!cancelled) {
          setPayoutAssociatedStaffError(String(e?.message || e || 'Could not load payout recipients.'));
          setClaimingStaffError(String(e?.message || e || 'Could not load claiming staff.'));
        }
      } finally {
        if (!cancelled) {
          setPayoutAssociatedStaffLoading(false);
          setClaimingStaffLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, mode, workspaceBranchId, snapshotAssociatedStaff.length]);

  // Load full quotation lines so transporter/installer/agent all appear in the payee picker.
  useEffect(() => {
    if (!isOpen || mode !== 'create') {
      setPayoutQuoteDetail(null);
      return undefined;
    }
    const ref = String(form.quotationRef || '').trim();
    if (!ref) {
      setPayoutQuoteDetail(null);
      return undefined;
    }
    let cancelled = false;
    void (async () => {
      const { ok, data } = await apiFetch(`/api/quotations/${encodeURIComponent(ref)}`);
      if (cancelled) return;
      if (ok && data?.ok && data?.quotation) {
        setPayoutQuoteDetail(data.quotation);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, mode, form.quotationRef]);

  // Default sales payee = quotation handled-by → HR bank (server ensures sales-customer link).
  useEffect(() => {
    if (!isOpen || mode !== 'create') {
      setDefaultRefundPayee(null);
      setDefaultRefundPayeeHint('');
      return undefined;
    }
    const ref = String(form.quotationRef || '').trim();
    if (!ref) {
      setDefaultRefundPayee(null);
      setDefaultRefundPayeeHint('');
      return undefined;
    }
    let cancelled = false;
    setDefaultRefundPayeeLoading(true);
    void (async () => {
      const { ok, data } = await apiFetch(
        `/api/refunds/default-payee?quotationRef=${encodeURIComponent(ref)}`
      );
      if (cancelled) return;
      setDefaultRefundPayeeLoading(false);
      if (ok && data?.ok && data.payee?.customerID) {
        setDefaultRefundPayee(data.payee);
        setDefaultRefundPayeeHint(String(data.hint || ''));
        // Ensure the prepared-by person appears in Branch staff even if the list was loaded before ensure.
        setClaimingStaffRows((rows) => {
          const cid = String(data.payee.customerID).trim();
          if (!cid) return rows;
          if ((rows || []).some((r) => String(r.customerID || '').trim() === cid)) return rows;
          return [data.payee, ...(Array.isArray(rows) ? rows : [])];
        });
      } else {
        setDefaultRefundPayee(null);
        setDefaultRefundPayeeHint(String(data?.hint || data?.error || ''));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, mode, form.quotationRef]);

  useEffect(() => {
    if (!isOpen || mode !== 'create') return;
    if (!selectedRefundCustomer) return;
    if (selectedCustomerHrPayout) {
      setForm((f) => ({
        ...f,
        payeeName: '',
        payeeBankName: '',
        payeeAccountNo: '',
      }));
      return;
    }
    const payeeName = String(selectedRefundCustomer.bankAccountName || selectedRefundCustomer.name || '').trim();
    const payeeBankName = String(selectedRefundCustomer.bankName || '').trim();
    const payeeAccountNo = String(selectedRefundCustomer.bankAccountNo || '').trim();
    setForm((f) => ({ ...f, payeeName, payeeBankName, payeeAccountNo }));
  }, [isOpen, mode, selectedRefundCustomer, selectedCustomerHrPayout]);

  /** Server-eligible quotes; keep a manually verified quote visible when not in the API list. */
  const quotationPickMerged = useMemo(() => {
    const byId = new Map();
    for (const q of eligibleQuotes) {
      const n = normalizeQuoteForRefundSelect(q);
      if (n) byId.set(n.id, n);
    }
    const activeRef = String(form.quotationRef || '').trim();
    if (activeRef && !byId.has(activeRef)) {
      const forced = normalizeQuoteForRefundSelect(
        quotations.find((x) => String(x.id).trim() === activeRef),
        { skipPickerFloor: true }
      );
      if (forced) byId.set(forced.id, forced);
    }
    return Array.from(byId.values()).sort((a, b) => {
      const dateCmp = quotationDateIsoForPickRow(b, quotations).localeCompare(
        quotationDateIsoForPickRow(a, quotations)
      );
      if (dateCmp !== 0) return dateCmp;
      return String(b.id || '').localeCompare(String(a.id || ''));
    });
  }, [eligibleQuotes, quotations, form.quotationRef]);

  const quotationPickList = quotationPickMerged;

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
      const preparedBy = String(row.handled_by || '').toLowerCase();
      return id.includes(q) || name.includes(q) || preparedBy.includes(q);
    });
  }, [quotationPickList, quotationSearchText]);

  const quotationSearchLooksLikeId = /qt[-_]/i.test(String(quotationSearchText || '').trim());

  const refundMoneyBreakdown = useMemo(() => {
    const ref = form.quotationRef;
    if (!ref) return { booked: 0, overpay: 0, cashIn: 0, quoteTotal: 0 };
    const pick =
      quotationPickMerged.find((q) => q.id === ref) ||
      normalizeQuoteForRefundSelect(quotations.find((x) => String(x.id) === ref));
    const quoteTotal = moneyContext
      ? Number(moneyContext.quoteTotalNgn) || 0
      : Number(pick?.total_ngn ?? pick?.totalNgn) || 0;
    const cashIn = moneyContext
      ? Number(moneyContext.quotationCashInNgn) || 0
      : Number(intelligence.summary?.quotationCashInNgn) ||
        Number(pick?.paid_ngn ?? 0) + (Number(intelligence.summary?.overpayAdvanceNgn) || 0);
    const booked = moneyContext ? moneyContext.paidOnQuoteNgn : pick?.paid_ngn ?? 0;
    const overpay =
      moneyContext?.overpaymentExcessNgn != null
        ? Number(moneyContext.overpaymentExcessNgn) || 0
        : Math.max(0, cashIn - quoteTotal);
    return { booked, overpay, cashIn, quoteTotal };
  }, [form.quotationRef, quotationPickMerged, quotations, moneyContext, intelligence.summary]);

  /** Cancelled-job cash path: overpay context only — not a second refund line. */
  const overpayIncludedInOrderCancellation = useMemo(() => {
    if (refundMoneyBreakdown.overpay <= 0) return false;
    const active = (form.calculationLines || []).filter(
      (l) => l.include !== false && roundMoneyLocal(l.amountNgn) > 0
    );
    const hasCancel = active.some((l) => String(l.category || '').trim() === 'Order cancellation');
    const hasOverpayLine = active.some((l) => String(l.category || '').trim() === 'Overpayment');
    if (hasCancel && !hasOverpayLine) return true;
    return Boolean(lastPreviewSnapshot?.hasCancelledProductionJob) && !hasOverpayLine;
  }, [form.calculationLines, refundMoneyBreakdown.overpay, lastPreviewSnapshot?.hasCancelledProductionJob]);

  /** Sum of cash from sales receipts linked to this quotation (intelligence payload). */
  const refundIntelReceiptsTotalNgn = useMemo(
    () => (intelligence.receipts || []).reduce((s, r) => s + receiptCashReceivedNgn(r), 0),
    [intelligence.receipts]
  );

  const refundIntelLedgerCashInNgn = roundMoneyLocal(
    moneyContext?.quotationCashInNgn ??
      intelligence.summary?.quotationCashInNgn ??
      refundMoneyBreakdown.cashIn
  );

  const selectedQuotationSnapshot = useMemo(() => {
    const ref = String(form.quotationRef || '').trim();
    if (!ref) return null;
    return quotations.find((x) => String(x.id) === ref) ?? null;
  }, [form.quotationRef, quotations]);

  const selectedQuotationForPayoutPeople = useMemo(() => {
    const ref = String(form.quotationRef || '').trim();
    if (!ref) return null;
    const detail =
      payoutQuoteDetail && String(payoutQuoteDetail.id || '').trim() === ref
        ? payoutQuoteDetail
        : null;
    const eligibleRaw = eligibleQuotes.find((x) => String(x.id).trim() === ref) || null;
    return mergeQuotationForPayoutPeople(detail || selectedQuotationSnapshot, eligibleRaw, null);
  }, [form.quotationRef, selectedQuotationSnapshot, eligibleQuotes, payoutQuoteDetail]);

  // No customer bank → transport/install to assignees; overpayment → quote customer;
  // other remainder → quotation handled-by (HR), never the person filing this refund.
  useEffect(() => {
    if (!isOpen || mode !== 'create') return;
    const amountNgn = roundMoneyLocal(form.amountNgn);
    if (amountNgn <= 0) return;
    const quoteCustomerId = String(form.customerID || '').trim();

    if (refundFormIsOverpaymentOnly(form.calculationLines) && quoteCustomerId && !payoutAccountReady) {
      const next = [
        {
          recipientKind: 'customer',
          recipientAssociatedStaffID: '',
          recipientCustomerID: quoteCustomerId,
          amountNgn: String(amountNgn),
          note: 'Overpayment · quote customer',
        },
      ];
      setForm((f) => {
        const existing = Array.isArray(f.refundSplits) ? f.refundSplits : [];
        if (existing.some((row) => String(row?._manual || '') === '1')) return f;
        const sig = (rows) =>
          rows
            .map(
              (r) =>
                `${r.recipientKind}:${r.recipientAssociatedStaffID || r.recipientCustomerID}:${roundMoneyLocal(r.amountNgn)}:${r.note}`
            )
            .join('|');
        if (sig(existing) === sig(next)) return f;
        return { ...f, refundSplits: next };
      });
      return;
    }

    // Customer bank on file: payout splits are optional (default is full payee until user adds lines).
    if (payoutAccountReady) return;

    const transportAmt = sumIncludedRefundLinesByCategoryMatch(form.calculationLines, (c) =>
      String(c).toLowerCase().includes('transport')
    );
    const installAmt = sumIncludedRefundLinesByCategoryMatch(form.calculationLines, (c) =>
      String(c).toLowerCase().includes('install')
    );
    const overpayAmt = sumIncludedRefundLinesByCategoryMatch(
      form.calculationLines,
      (c) => String(c).trim() === 'Overpayment'
    );
    const assignees = quotationServiceAssignees(selectedQuotationForPayoutPeople);
    const { transporterId, installerId, transporterName, installerName } = assignees;
    const claimCustomerDefault = resolveQuotationLinkedClaimingStaff(
      selectedQuotationForPayoutPeople,
      selectedQuoteMoneyRow,
      companyStaffClaimOptions,
      defaultRefundPayee
    );

    const next = [];
    if (transportAmt > 0) {
      const staff =
        (transporterId
          ? associatedStaffRows.find(
              (s) => String(s.id || s.staffID || '').trim() === transporterId
            )
          : null) ||
        matchAssociatedStaffForPerson(
          { id: transporterId, name: transporterName, role: 'driver' },
          associatedStaffRows
        ) ||
        null;
      next.push({
        recipientKind: 'associated_staff',
        recipientAssociatedStaffID: staff
          ? String(staff.id || staff.staffID)
          : transporterId || '',
        recipientCustomerID: '',
        amountNgn: String(transportAmt),
        note: 'Transport',
      });
    }
    if (installAmt > 0) {
      const staff =
        (installerId
          ? associatedStaffRows.find(
              (s) => String(s.id || s.staffID || '').trim() === installerId
            )
          : null) ||
        matchAssociatedStaffForPerson(
          { id: installerId, name: installerName, role: 'installer' },
          associatedStaffRows
        ) ||
        null;
      next.push({
        recipientKind: 'associated_staff',
        recipientAssociatedStaffID: staff
          ? String(staff.id || staff.staffID)
          : installerId || '',
        recipientCustomerID: '',
        amountNgn: String(installAmt),
        note: 'Installation',
      });
    }
    const allocated = next.reduce((s, r) => s + roundMoneyLocal(r.amountNgn), 0);
    let remainder = Math.max(0, amountNgn - allocated);

    // Overpayment is the customer's money — route to quote customer (no staff cut / uncleared hold).
    const overpayToCustomer = Math.min(remainder, overpayAmt);
    if (overpayToCustomer > 0 && quoteCustomerId) {
      next.push({
        recipientKind: 'customer',
        recipientAssociatedStaffID: '',
        recipientCustomerID: quoteCustomerId,
        amountNgn: String(overpayToCustomer),
        note: 'Overpayment · quote customer',
      });
      remainder = Math.max(0, remainder - overpayToCustomer);
    }

    if (remainder > 0) {
      if (claimCustomerDefault?.customerID) {
        next.push({
          recipientKind: 'customer',
          recipientAssociatedStaffID: '',
          recipientCustomerID: String(claimCustomerDefault.customerID),
          amountNgn: String(remainder),
          note: claimCustomerDefault.name
            ? `Quotation sales staff · ${claimCustomerDefault.name}`
            : 'Quotation sales staff',
        });
      } else {
        const preparedLabel =
          quotationPreparedByLabel(selectedQuoteMoneyRow) ||
          quotationPreparedByLabel(selectedQuotationForPayoutPeople) ||
          '';
        next.push({
          recipientKind: 'customer',
          recipientAssociatedStaffID: '',
          recipientCustomerID: '',
          amountNgn: String(remainder),
          note: preparedLabel
            ? `Quotation sales staff · pick ${preparedLabel}`
            : 'Quotation sales staff',
        });
      }
    }

    setForm((f) => {
      const existing = Array.isArray(f.refundSplits) ? f.refundSplits : [];
      // Don't clobber manual edits once the user has touched allocation.
      if (existing.some((row) => String(row?._manual || '') === '1')) return f;
      const sig = (rows) =>
        rows
          .map(
            (r) =>
              `${r.recipientKind}:${r.recipientAssociatedStaffID || r.recipientCustomerID}:${roundMoneyLocal(r.amountNgn)}:${r.note}`
          )
          .join('|');
      if (sig(existing) === sig(next)) return f;
      return { ...f, refundSplits: next };
    });
  }, [
    isOpen,
    mode,
    payoutAccountReady,
    form.amountNgn,
    form.customerID,
    form.calculationLines,
    selectedQuotationForPayoutPeople,
    selectedQuoteMoneyRow,
    associatedStaffRows,
    companyStaffClaimOptions,
    defaultRefundPayee,
  ]);

  const selectedQuotationRefundsBlocked = useMemo(() => {
    const ref = String(form.quotationRef || '').trim();
    if (!ref) return { blocked: false, reason: '', byName: '', atISO: '' };
    const q = selectedQuotationSnapshot;
    return {
      blocked: quotationRefundsBlocked(q),
      reason: String(q?.refundsBlockedReason ?? q?.refunds_blocked_reason ?? '').trim(),
      byName: String(q?.refundsBlockedByName ?? q?.refunds_blocked_by_name ?? '').trim(),
      atISO: String(q?.refundsBlockedAtISO ?? q?.refunds_blocked_at_iso ?? '').trim(),
    };
  }, [form.quotationRef, selectedQuotationSnapshot]);

  const selectedQuotationPreparedBy = useMemo(() => {
    const fromPick = quotationPreparedByLabel(selectedQuoteMoneyRow);
    if (fromPick) return fromPick;
    return quotationPreparedByLabel(selectedQuotationSnapshot);
  }, [selectedQuoteMoneyRow, selectedQuotationSnapshot]);

  const quoteSummaryCustomerName = useMemo(() => {
    const candidates = [
      form.customerName,
      selectedRefundCustomer?.name,
      selectedRefundCustomer?.customerName,
      selectedQuoteMoneyRow?.customer_name,
      selectedQuotationSnapshot?.customer,
      selectedQuotationSnapshot?.customerName,
      selectedQuotationSnapshot?.customer_name,
    ];
    for (const c of candidates) {
      const s = String(c || '').trim();
      if (s && s !== '—') return s;
    }
    return '—';
  }, [
    form.customerName,
    selectedRefundCustomer,
    selectedQuoteMoneyRow?.customer_name,
    selectedQuotationSnapshot,
  ]);

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
    const stoneLines = intelligence.summary?.stoneFlatsheetSummary?.lines || [];
    return flat.map((line, idx) => {
      const acc = findAccessoryFulfillmentRow(line, accLines);
      const sf = findStoneFlatsheetIntelRow(line, stoneLines);
      const ordered = acc != null ? Number(acc.ordered) || 0 : parseQuoteQtyNumeric(line.qty);
      let supplied = acc != null ? Number(acc.supplied) || 0 : null;
      let shortfall = acc != null ? Math.max(0, Number(acc.shortfall) || 0) : null;
      if (sf) {
        supplied = Number(sf.suppliedM2) || 0;
        const ordM2 = Number(sf.orderedM2) || 0;
        const ded = Number(sf.deductionM2) || 0;
        shortfall = Math.max(0, ordM2 - supplied - ded);
      }
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
        isAccessoryTracked: Boolean(acc) || Boolean(sf),
        isStoneFlatsheetM2: Boolean(sf),
      };
    });
  }, [
    selectedQuotationSnapshot,
    intelligence.summary?.accessoriesSummary?.lines,
    intelligence.summary?.stoneFlatsheetSummary?.lines,
  ]);

  const fetchIntelligence = useCallback(async (quoteRef, previewSeq) => {
    if (!quoteRef) return;
    setLoadingIntelligence(true);
    const { ok, data } = await apiFetch(`/api/refunds/intelligence?quotationRef=${encodeURIComponent(quoteRef)}`);
    setLoadingIntelligence(false);
    if (previewSeq != null && previewSeq !== refundsPreviewSeqRef.current) return;
    if (ok && data?.ok) {
      const dq = Array.isArray(data.dataQualityIssues) ? data.dataQualityIssues : [];
      setIntelligence({
        receipts: data.receipts || [],
        cuttingLists: data.cuttingLists || [],
        summary: data.summary || {
          producedMeters: 0,
          accessoriesSummary: { lines: [] },
          stoneFlatsheetSummary: { totalSuppliedM2: 0, totalDeductionM2: 0, lines: [] },
        },
        dataQualityIssues: dq,
      });
      if (mode === 'create') {
        const blockers = dq
          .filter((i) => String(i.severity || '').toLowerCase() === 'error')
          .map((i) => ({
            ...i,
            submitAction: 'block',
            title: i.title || 'Data quality',
            message: i.message || 'Resolve data quality issues before submitting.',
          }));
        if (blockers.length) {
          setProductionAlignmentIssues((prev) => {
            const seen = new Set();
            return [...prev, ...blockers].filter((issue) => {
              const key = `${issue.code}|${issue.message}`;
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            });
          });
        }
      }
    }
  }, [mode]);

  /** View/approve must load quote cash the same way create does — otherwise receipts show ₦0. */
  useEffect(() => {
    if (!isOpen || mode === 'create') return;
    const ref = String(record?.quotationRef || record?.quotation_ref || '').trim();
    if (!ref) return;
    void fetchIntelligence(ref, refundsPreviewSeqRef.current);
  }, [isOpen, mode, record?.quotationRef, record?.quotation_ref, record?.refundID, fetchIntelligence]);

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
      setSubstitutionBreakdownLineKey('');
      void fetchIntelligence(quoteRef, seq);
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
        setCategorySuggestedMaxNgn(null);
        setPreviewRemainingNgn(null);
        setLastPreviewSnapshot(null);
        setEligibleRefundCategoriesFromPreview(null);
        setPreviewError(data?.error || 'Could not generate refund preview.');
        setSubstitutionBreakdownLineKey('');
        setOpenProductionJob(null);
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
        coilProducedMeters: preview.coilProducedMeters,
        producedMetersForUnproduced: preview.producedMetersForUnproduced,
        productionFulfillment: preview.productionFulfillment,
        economicFloor: preview.economicFloor,
        pricePerMeterNgn: preview.pricePerMeterNgn,
        quoteTotalNgn: preview.quoteTotalNgn,
        quotationCashInNgn: preview.quotationCashInNgn,
        overpaymentExcessNgn: Number(preview.overpaymentExcessNgn) || 0,
        overpaymentResidualNgn:
          preview.overpaymentResidualNgn != null
            ? Math.max(0, Math.round(Number(preview.overpaymentResidualNgn) || 0))
            : null,
        creditAppliedOutNgn: Math.max(0, Math.round(Number(preview.creditAppliedOutNgn) || 0)),
        hasCancelledProductionJob: Boolean(preview.hasCancelledProductionJob),
        openProductionJob: preview.openProductionJob || null,
      });
      setOpenProductionJob(preview.openProductionJob || null);
      setMoneyContext({
        paidOnQuoteNgn: Number(preview.paidOnQuoteNgn) || 0,
        overpayAdvanceNgn: Number(preview.overpayAdvanceNgn) || 0,
        quotationCashInNgn: Number(preview.quotationCashInNgn) || 0,
        quoteTotalNgn: Number(preview.quoteTotalNgn) || 0,
        overpaymentExcessNgn: Number(preview.overpaymentExcessNgn) || 0,
        overpaymentResidualNgn:
          preview.overpaymentResidualNgn != null
            ? Math.max(0, Math.round(Number(preview.overpaymentResidualNgn) || 0))
            : null,
        creditAppliedOutNgn: Math.max(0, Math.round(Number(preview.creditAppliedOutNgn) || 0)),
        refundHardCapNgn:
          preview.refundHardCapNgn != null
            ? Math.round(Number(preview.refundHardCapNgn))
            : Math.round(Number(preview.quotationCashInNgn) || 0),
        paidRefundsOnQuotationNgn: Math.round(Number(preview.paidRefundsOnQuotationNgn) || 0),
        priorRefundsOnQuotationNgn: Math.round(Number(preview.priorRefundsOnQuotationNgn) || 0),
      });
      setCategorySuggestedMaxNgn(
        preview.categorySuggestedMaxNgn && typeof preview.categorySuggestedMaxNgn === 'object'
          ? preview.categorySuggestedMaxNgn
          : null
      );

      setWarnings(preview.warnings || []);
      if (
        (Array.isArray(preview.warnings) && preview.warnings.length > 0) ||
        (Array.isArray(preview.productionAlignmentIssues) && preview.productionAlignmentIssues.length > 0)
      ) {
        setRefundAttentionOpen(true);
      }
      if (Array.isArray(preview.productionAlignmentIssues)) {
        setProductionAlignmentIssues(preview.productionAlignmentIssues);
      }
      setSubstitutionPerMeterBreakdown(
        Array.isArray(preview.substitutionPerMeterBreakdown) ? preview.substitutionPerMeterBreakdown : []
      );
      setPricingAsAtIso(String(preview.pricingAsAtIso || '').trim());
      const blocked = Array.isArray(preview.blockedRefundCategories) ? preview.blockedRefundCategories : [];
      setBlockedRefundCategories(blocked);

      const positiveSuggested = (preview.suggestedLines || []).filter((s) => roundMoneyLocal(s.amountNgn) > 0);
      let breakdownRows = positiveSuggested.map((s, idx) => ({
        lineKey: `p-${idx}-${String(s.category || 'line')}`,
        include: true,
        label: s.label ?? '',
        amountNgn: String(s.amountNgn ?? ''),
        category: s.category ?? '',
        appliesToCategories: s.appliesToCategories,
      }));

      const overpayAmtForPath = refundableOverpaymentNgn({
        overpaymentResidualNgn: preview.overpaymentResidualNgn,
        overpaymentExcessNgn: preview.overpaymentExcessNgn,
        suggestedLines: preview.suggestedLines,
      });
      if (!createPathUserTouchedRef.current) {
        const nextPath = refundCreatePathFromPreview({
          overpaymentExcessNgn: preview.overpaymentExcessNgn,
          overpaymentResidualNgn: preview.overpaymentResidualNgn,
          suggestedLines: preview.suggestedLines,
        });
        createPathRef.current = nextPath;
        setCreatePath(nextPath);
      }

      const quickOverpayAllowed = refundQuickOverpayAvailableFromPreview({
        overpaymentExcessNgn: preview.overpaymentExcessNgn,
        overpaymentResidualNgn: preview.overpaymentResidualNgn,
        suggestedLines: preview.suggestedLines,
        hasCancelledProductionJob: preview.hasCancelledProductionJob,
      });
      if (createPathRef.current === 'quick' && !quickOverpayAllowed) {
        createPathRef.current = 'full';
        setCreatePath('full');
      }
      if (createPathRef.current === 'quick' && quickOverpayAllowed) {
        const overpayRows = breakdownRows.filter((r) => String(r.category || '').trim() === 'Overpayment');
        if (overpayRows.length > 0) {
          breakdownRows = overpayRows;
        } else if (overpayAmtForPath > 0) {
          breakdownRows = [
            {
              lineKey: `p-quick-overpay-${Date.now()}`,
              include: true,
              label: 'Overpayment — cash received above quote total on this quotation',
              amountNgn: String(overpayAmtForPath),
              category: 'Overpayment',
            },
          ];
        } else {
          breakdownRows = [];
        }
      }

      let substitutionAnchorLineKey = '';
      for (let i = 0; i < positiveSuggested.length; i++) {
        if (String(positiveSuggested[i]?.category || '').trim() === 'Substitution Difference') {
          substitutionAnchorLineKey = `p-${i}-${String(positiveSuggested[i].category || 'line')}`;
          break;
        }
      }
      setSubstitutionBreakdownLineKey(substitutionAnchorLineKey);

      const includedSum = breakdownRows.reduce(
        (s, row) => s + (row.include === false ? 0 : roundMoneyLocal(row.amountNgn)),
        0
      );
      const initialAmount = includedSum > 0 ? includedSum : 0;

      setForm((f) => ({
        ...f,
        customerID: preview.customerID,
        customerName: preview.customerName,
        alreadyRefundedCategories: preview.alreadyRefundedCategories || [],
        calculationLines: breakdownRows.length > 0 ? breakdownRows : [emptyLine()],
        reasonCategory: deriveReasonCategoriesFromLines(breakdownRows),
        amountNgn: initialAmount > 0 ? String(initialAmount) : f.amountNgn,
      }));
      previewAlignmentKeyRef.current = productionAlignmentFingerprint(
        quoteRef,
        deriveReasonCategoriesFromLines(breakdownRows)
      );
    },
    [includeCommissionInPreview, substitutionWorkbookPpmOverride]
  );

  const resetPreviewStateForQuoteChange = useCallback(() => {
    productionFingerprintRef.current = '';
    previewLoadedForQuoteRef.current = '';
    previewAlignmentKeyRef.current = '';
    createPathUserTouchedRef.current = false;
    setMoneyContext(null);
    setCategorySuggestedMaxNgn(null);
    setPreviewRemainingNgn(null);
    setLastPreviewSnapshot(null);
    setEligibleRefundCategoriesFromPreview(null);
    setIncludeCommissionInPreview(false);
    setSubstitutionWorkbookPpmOverride('');
    setSubstitutionBreakdownLineKey('');
    setOpenProductionJob(null);
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
    const allowed = data.wouldAppearInRefundQuotationDropdown === true;
    if (!allowed) {
      const reasons = Array.isArray(data.blockingReasons) ? data.blockingReasons.filter(Boolean).join(' ') : '';
      setManualQuotationVerifyError(
        reasons ||
          `This quotation cannot be used for a refund (minimum automatic claim ₦${MIN_REFUND_QUOTATION_REMAINING_NGN.toLocaleString('en-NG')}).`
      );
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
  const showApprovalReview = showApproval && !approvalEditMode;

  useEffect(() => {
    if (!isOpen || !showApproval) {
      setApprovalAuditData(null);
      setApprovalRefundIntel(null);
      setLoadingApprovalAudit(false);
      setLoadingApprovalIntel(false);
      return undefined;
    }
    const qref = String(record?.quotationRef || record?.quotation_ref || '').trim();
    if (!qref) return undefined;
    let cancelled = false;
    (async () => {
      setLoadingApprovalAudit(true);
      setLoadingApprovalIntel(true);
      const [auditRes, intelRes] = await Promise.all([
        apiFetch(`/api/management/quotation-audit?quotationRef=${encodeURIComponent(qref)}`),
        apiFetch(`/api/refunds/intelligence?quotationRef=${encodeURIComponent(qref)}`),
      ]);
      if (cancelled) return;
      setLoadingApprovalAudit(false);
      setLoadingApprovalIntel(false);
      if (auditRes.ok && auditRes.data) setApprovalAuditData(auditRes.data);
      else {
        setApprovalAuditData({
          ok: false,
          error: auditRes.data?.error || 'Could not load quotation audit.',
        });
      }
      if (intelRes.ok && intelRes.data && intelRes.data.ok !== false) setApprovalRefundIntel(intelRes.data);
      else setApprovalRefundIntel(null);
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, showApproval, record?.quotationRef, record?.quotation_ref, record?.refundID]);

  const refreshApprovalContext = useCallback(async () => {
    const qref = String(record?.quotationRef || record?.quotation_ref || '').trim();
    if (!qref) return null;
    setLoadingApprovalAudit(true);
    setLoadingApprovalIntel(true);
    const [auditRes, intelRes] = await Promise.all([
      apiFetch(`/api/management/quotation-audit?quotationRef=${encodeURIComponent(qref)}`),
      apiFetch(`/api/refunds/intelligence?quotationRef=${encodeURIComponent(qref)}`),
    ]);
    setLoadingApprovalAudit(false);
    setLoadingApprovalIntel(false);
    if (auditRes.ok && auditRes.data) setApprovalAuditData(auditRes.data);
    else {
      setApprovalAuditData({
        ok: false,
        error: auditRes.data?.error || 'Could not load quotation audit.',
      });
    }
    if (intelRes.ok && intelRes.data && intelRes.data.ok !== false) setApprovalRefundIntel(intelRes.data);
    else setApprovalRefundIntel(null);
    return intelRes.data ?? null;
  }, [record?.quotationRef, record?.quotation_ref]);

  const approvalQuoteRef = String(record?.quotationRef || record?.quotation_ref || '').trim();
  const approvalQuoteRow = useMemo(() => {
    if (!approvalQuoteRef) return null;
    return (quotations || []).find((x) => String(x.id) === approvalQuoteRef) || null;
  }, [approvalQuoteRef, quotations]);
  const refundBlockedByMdPricing =
    Boolean(approvalQuoteRow) && quotationRefundBlockedPendingMdPriceConfirm(approvalQuoteRow);
  const createBlockedByMdPricing =
    mode === 'create' &&
    Boolean(selectedQuotationSnapshot) &&
    quotationRefundBlockedPendingMdPriceConfirm(selectedQuotationSnapshot);
  const refundExecutiveThresholdNgn =
    Number(ws?.snapshot?.orgGovernanceLimits?.refundExecutiveThresholdNgn) || 1_000_000;
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
    blockTracking: readOnly || showApprovalReview,
    hydrateKey: refundHydrateKey,
  });
  const handleClose = wrapClose(() => onClose());

  /** Keep requested amount aligned with included line totals in create mode. */
  useEffect(() => {
    if (mode !== 'create' || readOnly) return;
    const sum = sumLines(form.calculationLines);
    if (sum <= 0) return;
    setForm((f) => (String(f.amountNgn) === String(sum) ? f : { ...f, amountNgn: String(sum) }));
  }, [form.calculationLines, mode, readOnly]);

  /** Stale floor/CL errors must not stick after the user switches to overpayment-only lines. */
  useEffect(() => {
    if (mode !== 'create') return;
    setPreviewError('');
  }, [form.calculationLines, mode]);

  const refundHasCompletedProduction = useMemo(() => {
    const ref = String(form.quotationRef || '').trim();
    if (!ref) return false;
    return (productionJobs || []).some(
      (j) => String(j.quotationRef || '').trim() === ref && String(j.status || '').trim() === 'Completed'
    );
  }, [form.quotationRef, productionJobs]);

  const approvalMoneyContext = useMemo(() => {
    if (!showApproval) return null;
    const ref = String(record?.quotationRef || '').trim();
    if (!ref) return null;
    const q =
      (quotations || []).find((x) => String(x.id) === ref) ||
      quotationPickMerged.find((x) => x.id === ref);
    const paidNgn = Math.round(Number(q?.paid_ngn ?? q?.paidNgn ?? 0)) || 0;
    let sumOthers = 0;
    let paidRefundsNgn = 0;
    for (const r of refunds || []) {
      if (String(r.quotationRef || '').trim() !== ref) continue;
      if (String(r.refundID || '') === String(record?.refundID || '')) continue;
      if (refundStatusIsWithdrawn(r.status)) continue;
      const amt = Math.round(Number(r.amountNgn) || 0);
      sumOthers += amt;
      const st = String(r.status || '').trim().toLowerCase();
      const paidAmt = Math.round(Number(r.paidAmountNgn ?? r.paid_amount_ngn) || 0);
      if (st === 'paid' || paidAmt > 0) {
        paidRefundsNgn += paidAmt > 0 ? paidAmt : amt;
      }
    }
    const maxApprovable = Math.max(0, paidNgn - sumOthers);
    const requested = Math.round(Number(record?.amountNgn) || 0);
    return { paidNgn, sumOthers, paidRefundsNgn, maxApprovable, requested };
  }, [showApproval, record, quotations, quotationPickMerged, refunds]);

  const recordApprovedAmount = refundApprovedAmount(record) || Number(record?.approved_amount_ngn) || 0;
  const recordOutstandingAmount = refundOutstandingAmount(record);

  const derivedReasonCategories = useMemo(
    () => deriveReasonCategoriesFromLines(form.calculationLines),
    [form.calculationLines]
  );

  const canOverrideProductionAlignment = useMemo(
    () => userMayOverrideProductionAlignment(ws?.session?.user?.roleKey),
    [ws?.session?.user?.roleKey]
  );

  useEffect(() => {
    const qref =
      mode === 'create'
        ? String(form.quotationRef || '').trim()
        : String(record?.quotationRef || record?.quotation_ref || form.quotationRef || '').trim();
    const categories =
      mode === 'create'
        ? derivedReasonCategories
        : derivedReasonCategories.length > 0
          ? derivedReasonCategories
          : refundCategoryTokens(record?.reasonCategory ?? record?.reason_category);
    if ((mode !== 'create' && !showApproval) || !qref) {
      setProductionAlignmentIssues([]);
      setAlignmentCheckLoading(false);
      return undefined;
    }
    if (categories.length === 0) {
      setAlignmentCheckLoading(false);
      return undefined;
    }
    const alignmentKey = productionAlignmentFingerprint(qref, categories);
    if (previewAlignmentKeyRef.current === alignmentKey) {
      setAlignmentCheckLoading(false);
      return undefined;
    }
    setAlignmentCheckLoading(true);
    const timer = setTimeout(async () => {
      const ackCodes = Object.entries(productionAlignmentAck)
        .filter(([, v]) => v)
        .map(([k]) => k);
      const { ok, data } = await apiFetch('/api/refunds/production-alignment-check', {
        method: 'POST',
        body: JSON.stringify({
          quotationRef: qref,
          reasonCategory: categories,
          productionAlignmentAcknowledgedCodes: ackCodes,
          productionAlignmentOverrideNote: productionAlignmentOverrideNote.trim(),
        }),
      });
      setAlignmentCheckLoading(false);
      if (!ok || !data?.ok) {
        setProductionAlignmentIssues([
          {
            code: 'production_alignment_check_failed',
            submitAction: 'block',
            title: 'Production alignment check failed',
            message: data?.error || 'Could not verify production alignment. Retry before submitting.',
          },
        ]);
        return;
      }
      setProductionAlignmentIssues(Array.isArray(data.issues) ? data.issues : []);
    }, 350);
    return () => clearTimeout(timer);
  }, [
    mode,
    showApproval,
    form.quotationRef,
    record?.quotationRef,
    record?.quotation_ref,
    record?.reasonCategory,
    record?.reason_category,
    derivedReasonCategories,
    productionAlignmentAck,
    productionAlignmentOverrideNote,
  ]);

  /** Quick overpay is cash vs quote — hide stale production-metre noise from the first preview load. */
  useEffect(() => {
    if (!refundFormIsOverpaymentOnly(form.calculationLines)) return;
    setProductionAlignmentIssues((prev) =>
      prev.filter(
        (i) =>
          ![
            'produced_exceeds_quotation',
            'produced_exceeds_cutting_list',
            'cutting_list_exceeds_produced',
            'unproduced_with_full_production',
          ].includes(String(i?.code || ''))
      )
    );
    setWarnings((prev) =>
      prev.filter(
        (w) =>
          !/produced output.*exceeds|exceeds cutting list|fully produced|offcut\/accessories in addition|economic floor check/i.test(
            String(w || '')
          )
      )
    );
  }, [form.calculationLines]);

  const alignmentBlocksAction = useMemo(() => {
    if (mode !== 'create' && !showApproval) return false;
    if (alignmentCheckLoading) return true;
    if (productionAlignmentIssues.length === 0) return false;
    const hasBlock = productionAlignmentIssues.some((i) => i.submitAction === 'block');
    if (hasBlock && !(canOverrideProductionAlignment && productionAlignmentOverrideNote.trim().length >= 10)) {
      return true;
    }
    const needAck = productionAlignmentIssues.filter((i) => i.submitAction === 'acknowledge');
    return needAck.some((i) => !productionAlignmentAck[i.code]);
  }, [
    mode,
    showApproval,
    alignmentCheckLoading,
    productionAlignmentIssues,
    canOverrideProductionAlignment,
    productionAlignmentOverrideNote,
    productionAlignmentAck,
  ]);

  const refundAttentionItems = useMemo(
    () => mergeRefundAttentionItems(warnings, productionAlignmentIssues),
    [warnings, productionAlignmentIssues]
  );

  const refundAttentionNeedsAction = useMemo(() => {
    if (alignmentBlocksAction) return true;
    if (productionAlignmentIssues.some((i) => i.submitAction === 'acknowledge')) return true;
    const needsFloorOverride =
      refundAmountExceedsEconomicFloorCap({
        amountNgn: Math.round(Number(form.amountNgn) || 0),
        calculationLines: form.calculationLines,
        categories: deriveReasonCategoriesFromLines(form.calculationLines),
        maxDefensibleRefundNgn: lastPreviewSnapshot?.economicFloor?.maxDefensibleRefundNgn,
        overpaymentExcessNgn: moneyContext?.overpaymentExcessNgn,
        toleranceNgn: AMOUNT_LINE_TOL,
      }) &&
      (String(ws?.session?.user?.roleKey || '')
        .trim()
        .toLowerCase() === 'admin' ||
        isExecutiveRoleKey(ws?.session?.user?.roleKey));
    return needsFloorOverride;
  }, [
    alignmentBlocksAction,
    productionAlignmentIssues,
    form.amountNgn,
    form.calculationLines,
    lastPreviewSnapshot?.economicFloor?.maxDefensibleRefundNgn,
    moneyContext?.overpaymentExcessNgn,
    ws?.session?.user?.roleKey,
  ]);

  useEffect(() => {
    if (refundAttentionNeedsAction) {
      setRefundAttentionOpen(true);
      return;
    }
    setRefundAttentionOpen(false);
  }, [refundAttentionNeedsAction, form.quotationRef]);

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

  const priorRefundsOnQuote = useMemo(() => {
    const qref = String(form.quotationRef || '').trim();
    if (!qref) return [];
    return (refunds || []).filter((r) => {
      if (String(r.quotationRef || '').trim() !== qref) return false;
      return !refundStatusIsWithdrawn(r.status);
    });
  }, [form.quotationRef, refunds]);

  const quotationRefundsPaidAlreadyNgn = useMemo(() => {
    if (moneyContext?.paidRefundsOnQuotationNgn != null && Number(moneyContext.paidRefundsOnQuotationNgn) >= 0) {
      return Math.round(Number(moneyContext.paidRefundsOnQuotationNgn) || 0);
    }
    return priorRefundsOnQuote.reduce((sum, r) => {
      const st = String(r.status || '').trim().toLowerCase();
      const paidAmt = Math.round(Number(r.paidAmountNgn ?? r.paid_amount_ngn) || 0);
      if (st !== 'paid' && paidAmt <= 0) return sum;
      const amt = paidAmt > 0 ? paidAmt : Math.round(Number(r.amountNgn) || 0);
      return sum + amt;
    }, 0);
  }, [moneyContext?.paidRefundsOnQuotationNgn, priorRefundsOnQuote]);

  const multiCategoryOverlapContext = useMemo(() => {
    const currentLabels = derivedReasonCategories;
    const currentNorm = new Set(currentLabels.map((c) => String(c).trim().toLowerCase()));
    const priorLabels = [
      ...new Set(
        priorRefundsOnQuote.flatMap((r) => {
          const raw = r.reasonCategory ?? r.reason_category;
          if (Array.isArray(raw)) return raw.map((x) => String(x).trim()).filter(Boolean);
          const s = String(raw ?? '').trim();
          if (!s) return [];
          if (s.startsWith('[')) {
            try {
              const parsed = JSON.parse(s);
              return Array.isArray(parsed) ? parsed.map((x) => String(x).trim()).filter(Boolean) : [s];
            } catch {
              return [s];
            }
          }
          return [s];
        })
      ),
    ];
    const priorNorm = new Set(priorLabels.map((c) => String(c).trim().toLowerCase()));

    const currentHasOverpay = [...currentNorm].some((c) => c.includes('overpay'));
    const currentHasCancel = [...currentNorm].some((c) => c.includes('order cancellation'));
    const priorHasOverpay = [...priorNorm].some((c) => c.includes('overpay'));
    const priorHasCancel = [...priorNorm].some((c) => c.includes('order cancellation'));

    const sameRequestOverpayAndCancel = currentHasOverpay && currentHasCancel;
    const crossRefundOverlap =
      (priorHasOverpay && currentHasCancel) || (priorHasCancel && currentHasOverpay);

    if (!sameRequestOverpayAndCancel && !crossRefundOverlap) return null;

    return {
      priorLabels,
      currentLabels,
      sameRequestOverpayAndCancel,
      crossRefundOverlap,
    };
  }, [derivedReasonCategories, priorRefundsOnQuote]);

  const label = 'text-xs font-semibold text-slate-500 uppercase tracking-wide ml-0.5 mb-1 block';
  const input =
    'w-full bg-white border border-slate-200 rounded-lg py-2.5 px-3 text-sm font-semibold text-zarewa-teal outline-none focus:ring-2 focus:ring-red-500/15 disabled:opacity-60';

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
    if (selectedQuotationRefundsBlocked.blocked) {
      setPreviewError('Refunds are permanently blocked on this quotation.');
      return;
    }
    const amountNgn = Number(form.amountNgn);
    if (Number.isNaN(amountNgn) || amountNgn <= 0) return;
    if (amountNgn < MIN_REFUND_QUOTATION_REMAINING_NGN) {
      setPreviewError(
        `Refund amount must be at least ₦${MIN_REFUND_QUOTATION_REMAINING_NGN.toLocaleString('en-NG')} (got ₦${amountNgn.toLocaleString('en-NG')}).`
      );
      return;
    }
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
    let refundSplits = (Array.isArray(form.refundSplits) ? form.refundSplits : [])
      .map((row) => {
        const kind = String(row?.recipientKind || 'customer').trim().toLowerCase();
        const staffId = String(row?.recipientAssociatedStaffID || '').trim();
        const customerId = String(row?.recipientCustomerID || '').trim();
        const amountNgn = Math.round(Number(row?.amountNgn) || 0);
        const note = String(row?.note || '').trim();
        const companyCutWaived =
          mayWaiveStaffAllocationCut &&
          Boolean(row?.companyCutWaived === true || row?.waiveCompanyCut === true);
        const companyCutWaiverNote = companyCutWaived
          ? String(row?.companyCutWaiverNote || '').trim()
          : '';
        if (kind === 'associated_staff' || (staffId && !customerId)) {
          return {
            recipientKind: 'associated_staff',
            recipientAssociatedStaffID: staffId,
            recipientCustomerID: '',
            amountNgn,
            note,
            companyCutWaived,
            companyCutWaiverNote,
          };
        }
        return {
          recipientKind: 'customer',
          recipientCustomerID: customerId,
          recipientAssociatedStaffID: '',
          amountNgn,
          note,
          companyCutWaived,
          companyCutWaiverNote,
        };
      })
      .filter(
        (row) =>
          row.amountNgn > 0 &&
          (row.recipientCustomerID || row.recipientAssociatedStaffID)
      );
    if (mayWaiveStaffAllocationCut) {
      for (const row of refundSplits) {
        if (!row.companyCutWaived) continue;
        if (String(row.companyCutWaiverNote || '').trim().length < 8) {
          setPreviewError(
            'Each waived company-cut line needs a short reason (at least 8 characters).'
          );
          return;
        }
      }
    }
    const splitTotal = refundSplits.reduce((s, row) => s + row.amountNgn, 0);
    const hasCustomerBank = Boolean(
      (payeeName && payeeAccountNo && payeeBankName) || selectedCustomerHrPayout
    );

    if (!hasCustomerBank) {
      if (refundSplits.length === 0) {
        setPreviewError(
          'Customer has no bank on file. Allocate transport/installation to associated staff and any remainder to claiming staff.'
        );
        return;
      }
      if (Math.abs(splitTotal - amountNgn) > AMOUNT_LINE_TOL) {
        setPreviewError(
          `Payout allocation (₦${splitTotal.toLocaleString('en-NG')}) must equal refund amount (₦${amountNgn.toLocaleString('en-NG')}).`
        );
        return;
      }
      for (const row of refundSplits) {
        if (row.recipientKind === 'associated_staff' && !row.recipientAssociatedStaffID) {
          setPreviewError('Select associated staff or a payout recipient with bank for each allocation.');
          return;
        }
        if (row.recipientKind === 'customer' && !row.recipientCustomerID) {
          setPreviewError(
            'Select a payout recipient (staff customer or associated staff with bank) for each allocation.'
          );
          return;
        }
      }
    } else if (refundSplits.length > 0) {
      if (Math.abs(splitTotal - amountNgn) > AMOUNT_LINE_TOL) {
        setPreviewError(
          `Split total (₦${splitTotal.toLocaleString('en-NG')}) must equal refund amount (₦${amountNgn.toLocaleString('en-NG')}).`
        );
        return;
      }
      for (const row of refundSplits) {
        if (row.recipientKind === 'associated_staff' && !row.recipientAssociatedStaffID) {
          setPreviewError('Select associated staff or a payout recipient with bank for each allocation.');
          return;
        }
        if (row.recipientKind === 'customer' && !row.recipientCustomerID) {
          setPreviewError(
            'Select a payout recipient (quote customer, staff customer, or associated staff with bank) for each allocation.'
          );
          return;
        }
      }
    }

    if (openProductionJob?.jobId) {
      setPreviewError(
        `Finish or cancel production job ${openProductionJob.jobId}${openProductionJob.status ? ` (${openProductionJob.status})` : ''} before submitting a refund.`
      );
      return;
    }

    const hardCap =
      moneyContext?.refundHardCapNgn != null
        ? Math.round(Number(moneyContext.refundHardCapNgn))
        : previewRemainingNgn;
    if (hardCap != null && hardCap > 0 && amountNgn > hardCap + AMOUNT_LINE_TOL) {
      setPreviewError(
        `Refund cannot exceed cash received on this quotation after prior refunds (max ₦${hardCap.toLocaleString('en-NG')}).`
      );
      return;
    }

    const economicFloor = lastPreviewSnapshot?.economicFloor;
    const maxDefensible =
      economicFloor?.maxDefensibleRefundNgn != null
        ? Math.round(Number(economicFloor.maxDefensibleRefundNgn))
        : null;
    const mayMdBypassEconomicFloor =
      String(ws?.session?.user?.roleKey || '')
        .trim()
        .toLowerCase() === 'admin' || isExecutiveRoleKey(ws?.session?.user?.roleKey);
    const floorOverrideNoteOk = productionAlignmentOverrideNote.trim().length >= 10;
    const floorExemptSubmit = refundRequestIsEconomicFloorExempt({
      categories: reasonCategory,
      calculationLines: form.calculationLines,
    });
    const exceedsFloorCap = refundAmountExceedsEconomicFloorCap({
      amountNgn,
      calculationLines: form.calculationLines,
      categories: reasonCategory,
      maxDefensibleRefundNgn: maxDefensible,
      overpaymentExcessNgn: moneyContext?.overpaymentExcessNgn,
      toleranceNgn: AMOUNT_LINE_TOL,
    });
    if (exceedsFloorCap && !(mayMdBypassEconomicFloor && floorOverrideNoteOk)) {
      const gatedAmt = refundFloorGatedAmountNgn(form.calculationLines);
      const msg = `Production-related refund amount (₦${gatedAmt.toLocaleString(
        'en-NG'
      )}) exceeds the economic floor cap (₦${maxDefensible.toLocaleString(
        'en-NG'
      )}) after produced metres at workbook minimum ₦/m. Overpayment and quoted services are not counted against this cap.${
        mayMdBypassEconomicFloor
          ? ' Enter an MD/admin override note (min 10 characters) to proceed — it will carry through approval and payout.'
          : ''
      }`;
      showToast(msg, { variant: 'error' });
      setPreviewError(msg);
      return;
    }
    if (
      !floorExemptSubmit &&
      economicFloor?.incompleteFloorPricing &&
      Number(economicFloor.producedOutputMeters || 0) > 0.001
    ) {
      if (!(mayMdBypassEconomicFloor && floorOverrideNoteOk)) {
        const msg = mayMdBypassEconomicFloor
          ? 'Workbook floor ₦/m could not be resolved for produced jobs. Enter an MD/admin override note (min 10 characters) to create this refund.'
          : 'Workbook floor ₦/m could not be resolved for all produced jobs. Resolve material workbook pricing or escalate to MD/CEO before creating this refund.';
        showToast(msg, { variant: 'error' });
        setPreviewError(msg);
        return;
      }
    }

    const overpayMax = refundableOverpaymentNgn({
      overpaymentResidualNgn: moneyContext?.overpaymentResidualNgn,
      overpaymentExcessNgn: moneyContext?.overpaymentExcessNgn,
      suggestedLines: lastPreviewSnapshot?.suggestedLines,
    });
    const overpayLine = (form.calculationLines || []).find(
      (l) => l.include !== false && String(l.category || '').trim() === 'Overpayment'
    );
    if (overpayLine && Number(overpayLine.amountNgn) > overpayMax + AMOUNT_LINE_TOL) {
      setPreviewError(
        `Overpayment refund cannot exceed ₦${overpayMax.toLocaleString('en-NG')} (payment minus quote total on this quotation).`
      );
      return;
    }

    const lineSumsByCategory = sumLinesByCategory(form.calculationLines);
    if (categorySuggestedMaxNgn && typeof categorySuggestedMaxNgn === 'object') {
      const quantityNettedCats = new Set(['Accessory shortfall', 'Stone flatsheet shortfall']);
      for (const [cat, sum] of Object.entries(lineSumsByCategory)) {
        const cap = Math.round(Number(categorySuggestedMaxNgn[cat]) || 0);
        if (cap > 0 && sum > cap + AMOUNT_LINE_TOL) {
          setPreviewError(
            `${refundCategoryDisplayLabel(cat)} refund (₦${sum.toLocaleString('en-NG')}) cannot exceed the system-calculated amount (₦${cap.toLocaleString('en-NG')}). Manual adjustment may reduce, not increase, the preview figure.`
          );
          return;
        }
        if (quantityNettedCats.has(cat) && cap <= 0 && sum > AMOUNT_LINE_TOL) {
          setPreviewError(
            `${refundCategoryDisplayLabel(cat)} has already been refunded for the current shortfall on this quotation (or there is no unpaid shortfall left). Only the unpaid accessory/stone delta can be requested.`
          );
          return;
        }
      }
    }

    const currentHasOverpay = (lineSumsByCategory.Overpayment || 0) > 0;
    const currentHasCancel = (lineSumsByCategory['Order cancellation'] || 0) > 0;
    const currentHasUnproduced = (lineSumsByCategory['Unproduced meterage'] || 0) > 0;
    if (currentHasOverpay && currentHasCancel) {
      setPreviewError(
        'Overpayment and Order cancellation cannot appear on the same refund request — they double-count cash received. Use one category or separate requests.'
      );
      return;
    }
    if (currentHasCancel && currentHasUnproduced) {
      setPreviewError(
        'Order cancellation and Unproduced meterage cannot appear together — cancellation already covers unpaid product. Remove one category.'
      );
      return;
    }
    if (
      currentHasCancel &&
      ((lineSumsByCategory['Transport issue'] || 0) > 0 ||
        (lineSumsByCategory['Installation issue'] || 0) > 0 ||
        (lineSumsByCategory['Additional services'] || 0) > 0)
    ) {
      setPreviewError(
        'Order cancellation already covers the job. Uncheck transport/installation/additional services, or remove Order cancellation to claim those lines only.'
      );
      return;
    }

    const arithmeticIssues = auditRefundCalculationLineArithmetic(form.calculationLines);
    if (arithmeticIssues.length > 0) {
      const first = arithmeticIssues[0];
      setPreviewError(
        first.formulaText
          ? `Line amount does not match its description: "${first.label}" implies ₦${first.expectedAmountNgn.toLocaleString('en-NG')} (${first.formulaText}).`
          : `Line amount does not match its description: "${first.label}" implies ₦${first.expectedAmountNgn.toLocaleString('en-NG')}.`
      );
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
    const ackCodes = Object.entries(productionAlignmentAck)
      .filter(([, v]) => v)
      .map(([k]) => k);
    const result = await onPersist?.({
      refundID: record?.refundID ?? `RF-2026-${String(Date.now()).slice(-4)}`,
      customerID: form.customerID,
      customer: form.customerName,
      quotationRef: form.quotationRef,
      reasonCategory,
      reason: form.reasonNotes.trim() || reasonCategory.join(', '),
      amountNgn,
      calculationLines,
      suggestedLines: lastPreviewSnapshot?.suggestedLines || [],
      calculationNotes: form.calculationNotes.trim(),
      status: 'Pending',
      previewSnapshot: lastPreviewSnapshot,
      payeeName: selectedCustomerHrPayout ? '' : payeeName,
      payeeAccountNo: selectedCustomerHrPayout ? '' : payeeAccountNo,
      payeeBankName: selectedCustomerHrPayout ? '' : payeeBankName,
      refundSplits,
      productionAlignmentAcknowledgedCodes: ackCodes,
      productionAlignmentOverrideNote: productionAlignmentOverrideNote.trim(),
    });
    setSaving(false);
    if (result?.ok === false) {
      if (result?.error) setPreviewError(String(result.error));
      return;
    }
      if (result?.ok !== false) {
      if (hasCustomerBank && !selectedCustomerHrPayout) {
        touchRefundPayeeAccount({
          payeeName,
          payeeAccountNo,
          payeeBankName,
          customerID: String(form.customerID || '').trim(),
        });
      }
      abandonUnsavedAndRun(() => onClose());
    }
  };

  const submitApprovalDecision = async ({
    status: statusOverride,
    approvedAmount: approvedAmountOverride,
    calculationLines: linesOverride,
    managerComments: commentsOverride,
    alignmentAckCodes,
    alignmentOverrideNote,
  } = {}) => {
    if (!record?.refundID) return;
    const decisionStatus = statusOverride ?? approvalStatus;
    const decisionNote = String(commentsOverride ?? managerComments).trim();
    if (decisionStatus === 'Rejected' && decisionNote.length < 3) {
      setPreviewError('Enter a rejection reason (at least 3 characters).');
      return;
    }
    const nextApprovedAmountNgn =
      decisionStatus === 'Approved'
        ? Math.round(
            Number(approvedAmountOverride ?? approvedAmountNgn) ||
              recordApprovedAmount ||
              Number(record?.amountNgn) ||
              0
          )
        : 0;

    if (decisionStatus === 'Approved' && nextApprovedAmountNgn <= 0) {
      setPreviewError('Approved amount must be positive.');
      return;
    }

    const requestedTotal = Math.round(Number(record?.amountNgn) || 0);
    let linesForDecision = linesOverride ?? form.calculationLines;

    if (decisionStatus === 'Approved' && !linesOverride) {
      const lineSum = sumLines(form.calculationLines);
      if (Math.abs(lineSum - nextApprovedAmountNgn) <= AMOUNT_LINE_TOL) {
        linesForDecision = form.calculationLines;
      } else if (
        Math.abs(lineSum - requestedTotal) <= AMOUNT_LINE_TOL &&
        nextApprovedAmountNgn <= requestedTotal + AMOUNT_LINE_TOL
      ) {
        linesForDecision = scaleRefundCalculationLinesToApprovedAmount(
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

    if (decisionStatus === 'Approved') {
      const approvalArithmeticIssues = auditRefundCalculationLineArithmetic(linesForDecision);
      if (approvalArithmeticIssues.length > 0) {
        const first = approvalArithmeticIssues[0];
        setPreviewError(
          first.formulaText
            ? `Cannot approve: "${first.label}" implies ₦${first.expectedAmountNgn.toLocaleString('en-NG')} (${first.formulaText}) but line amount is ₦${first.amountNgn.toLocaleString('en-NG')}.`
            : `Cannot approve: line description and amount do not match.`
        );
        return;
      }
    }

    setPreviewError('');
    setSaving(true);
    const ackCodes =
      alignmentAckCodes ??
      Object.entries(productionAlignmentAck)
        .filter(([, v]) => v)
        .map(([k]) => k);
    const result = await onPersist?.({
      ...record,
      status: decisionStatus,
      approvalDate: approvalDate.trim() || new Date().toISOString().slice(0, 10),
      managerComments: decisionNote,
      approvedAmountNgn: nextApprovedAmountNgn,
      calculationLines: linesForDecision.map((l) => ({ ...l, amountNgn: Number(l.amountNgn) })),
      calculationNotes: form.calculationNotes.trim(),
      productionAlignmentAcknowledgedCodes: ackCodes,
      productionAlignmentOverrideNote: String(
        alignmentOverrideNote ?? productionAlignmentOverrideNote
      ).trim(),
    });
    setSaving(false);
    if (result?.ok !== false) abandonUnsavedAndRun(() => onClose());
  };

  const submitApproval = async () => submitApprovalDecision();

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
  const refundHardCapNgn =
    moneyContext?.refundHardCapNgn != null
      ? Math.round(Number(moneyContext.refundHardCapNgn))
      : null;
  const effectiveRefundCapNgn = useMemo(() => {
    if (refundHardCapNgn != null && refundHardCapNgn > 0) return refundHardCapNgn;
    const cash = Math.round(Number(moneyContext?.quotationCashInNgn) || 0);
    return cash > 0 ? cash : null;
  }, [refundHardCapNgn, moneyContext?.quotationCashInNgn]);
  const overpayMaxNgn = refundableOverpaymentNgn({
    overpaymentResidualNgn: moneyContext?.overpaymentResidualNgn,
    overpaymentExcessNgn: moneyContext?.overpaymentExcessNgn,
    suggestedLines: lastPreviewSnapshot?.suggestedLines,
  });
  const overpayLineAmountNgn = (form.calculationLines || []).reduce((sum, row) => {
    if (row.include === false) return sum;
    if (String(row.category || '').trim() !== 'Overpayment') return sum;
    return sum + roundMoneyLocal(row.amountNgn);
  }, 0);
  const lineSumsByCategory = useMemo(
    () => sumLinesByCategory(form.calculationLines),
    [form.calculationLines]
  );
  const categoryCapViolation = useMemo(() => {
    if (!categorySuggestedMaxNgn || typeof categorySuggestedMaxNgn !== 'object') return null;
    for (const [cat, sum] of Object.entries(lineSumsByCategory)) {
      const cap = Math.round(Number(categorySuggestedMaxNgn[cat]) || 0);
      if (cap > 0 && sum > cap + AMOUNT_LINE_TOL) {
        return { cat, sum, cap };
      }
    }
    return null;
  }, [categorySuggestedMaxNgn, lineSumsByCategory]);
  const lineArithmeticIssues = useMemo(
    () => auditRefundCalculationLineArithmetic(form.calculationLines),
    [form.calculationLines]
  );
  const exceedsOverpayLine = overpayLineAmountNgn > overpayMaxNgn + AMOUNT_LINE_TOL;
  const exceedsHardCap =
    effectiveRefundCapNgn != null &&
    effectiveRefundCapNgn > 0 &&
    (lineSum > effectiveRefundCapNgn + AMOUNT_LINE_TOL ||
      (Number(form.amountNgn) > 0 && Number(form.amountNgn) > effectiveRefundCapNgn + AMOUNT_LINE_TOL));
  const exceedsRefundableHeadroom =
    mode === 'create' &&
    (exceedsHardCap || exceedsOverpayLine || categoryCapViolation != null || lineArithmeticIssues.length > 0);
  const sumMismatch =
    mode === 'create' &&
    createPath === 'full' &&
    lineSum > 0 &&
    Number(form.amountNgn) > 0 &&
    Math.round(lineSum) !== Math.round(Number(form.amountNgn));
  const quickOverpayAvailable =
    mode === 'create' &&
    refundQuickOverpayAvailableFromPreview({
      overpaymentExcessNgn: moneyContext?.overpaymentExcessNgn ?? refundMoneyBreakdown.overpay,
      overpaymentResidualNgn: moneyContext?.overpaymentResidualNgn,
      suggestedLines: lastPreviewSnapshot?.suggestedLines,
      hasCancelledProductionJob: lastPreviewSnapshot?.hasCancelledProductionJob,
    });
  const otherCalculatedReasonsAvailable = useMemo(
    () =>
      createPath === 'quick' &&
      (lastPreviewSnapshot?.suggestedLines || []).some(suggestedLineIsPositiveNonOverpayment),
    [createPath, lastPreviewSnapshot]
  );
  const createAmountDerivedFromLines = mode === 'create' && lineSum > 0;

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
    <>
    <ModalFrame isOpen={isOpen} onClose={handleClose} edgeToEdgeMobile surface="plain" title="Refund" showCloseButton={false}>
      <div className="z-modal-panel flex w-full max-w-[min(100%,72rem)] min-w-0 max-h-[min(94dvh,920px)] flex-col mx-auto bg-slate-50 rounded-none shadow-2xl transition-all duration-300 sm:rounded-2xl">
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
                <span className={`px-2 py-0.5 rounded-full text-ui-xs font-bold uppercase tracking-wider ${modeBadge}`}>
                  {modeLabel}
                </span>
              </div>
              <p className="text-xs font-medium text-slate-500">
                {record?.refundID ? refundRecordSubtitle(record) : form.quotationRef || 'Select a quotation'}
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
          {mode === 'view' && record?.refundID && recordOutstandingAmount > 0 ? (
            <div
              className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-950"
              role="status"
              aria-label={`Outstanding for payout: ₦${recordOutstandingAmount.toLocaleString('en-NG')}`}
            >
              <span className="font-semibold">Outstanding for payout:</span>{' '}
              <span className="font-black tabular-nums">
                ₦{recordOutstandingAmount.toLocaleString('en-NG')}
              </span>
              {String(record.status || '').toLowerCase() === 'approved' ? (
                <span className="block text-xs text-teal-800 mt-1">
                  Approved amount awaiting cashier release from treasury or partner wallet.
                </span>
              ) : null}
            </div>
          ) : null}
          {(mode === 'view' || mode === 'approve') && record?.refundID ? (
            <RefundApplyToQuotationPanel refund={record} />
          ) : null}
          {refundGuideOpen && !showApprovalReview ? (
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
                <ul className="text-xs leading-relaxed text-teal-900/90 font-medium space-y-1.5 list-disc pl-4">
                  <li>Pick a quotation — preview fills suggested lines; uncheck any you do not want.</li>
                  <li>
                    Confirm payout: customer bank when on file, otherwise allocate transport/install to staff and
                    remainder to claiming staff.
                  </li>
                  <li>
                    {partnerWalletPolicyEnabled
                      ? 'Submit → BM approves → cashier releases from partner wallets.'
                      : 'Submit for approval; finance records payout after approval.'}
                  </li>
                </ul>
                <div className="border-t border-teal-200/60 pt-3 space-y-1.5">
                  <RefundEligibilitySummary />
                </div>
              </div>
            </div>
          ) : null}

          {mode === 'create' && !showApprovalReview && form.quotationRef ? (
            <div className="space-y-3">
              <div
                className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
                role="group"
                aria-label="Refund type"
              >
                <p className="text-xs font-bold text-slate-700">Refund type</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!quickOverpayAvailable) return;
                      createPathUserTouchedRef.current = true;
                      createPathRef.current = 'quick';
                      setCreatePath('quick');
                      const r = String(form.quotationRef || '').trim();
                      if (r) void generatePreview(r, false);
                    }}
                    disabled={!quickOverpayAvailable}
                    title={
                      quickOverpayAvailable
                        ? 'Cash received above quote total only'
                        : lastPreviewSnapshot?.hasCancelledProductionJob
                          ? 'Cancelled job — use Full refund (Order cancellation includes any overpayment)'
                          : moneyContext?.overpaymentResidualNgn === 0 &&
                              Number(moneyContext?.overpaymentExcessNgn) > 0
                            ? 'Overpayment already refunded on this quotation'
                            : form.quotationRef
                              ? 'No refundable overpayment on this quotation'
                              : 'Select a quotation with overpayment first'
                    }
                    className={`rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wide transition-all ${
                      createPath === 'quick'
                        ? 'bg-rose-600 text-white shadow-md shadow-rose-200'
                        : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed'
                    }`}
                  >
                    Quick overpay
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      createPathUserTouchedRef.current = true;
                      createPathRef.current = 'full';
                      setCreatePath('full');
                      const r = String(form.quotationRef || '').trim();
                      if (r) void generatePreview(r, includeCommissionInPreview);
                    }}
                    className={`rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wide transition-all ${
                      createPath === 'full'
                        ? 'bg-zarewa-teal text-white shadow-md shadow-teal-200'
                        : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    Full refund
                  </button>
                </div>
              </div>
              {createPath === 'quick' && form.quotationRef && !quickOverpayAvailable ? (
                <p className="text-xs font-medium text-amber-800 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2" role="status">
                  {lastPreviewSnapshot?.hasCancelledProductionJob
                    ? 'Cancelled production job — use Full refund. Order cancellation covers the full refundable cash, including any amount above the quote.'
                    : moneyContext?.overpaymentResidualNgn === 0 &&
                        Number(moneyContext?.overpaymentExcessNgn) > 0
                      ? 'Overpayment on this quotation is already fully refunded. Quick overpay is not available.'
                      : 'No refundable overpayment — switch to Full refund.'}
                </p>
              ) : null}
              {mode === 'create' &&
              form.quotationRef &&
              moneyContext?.overpaymentResidualNgn === 0 &&
              Number(moneyContext?.overpaymentExcessNgn) > 0 &&
              (previewRemainingNgn == null || previewRemainingNgn <= 0) ? (
                <p
                  className="text-xs font-medium text-amber-900 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2"
                  role="status"
                >
                  Prior refunds already covered the ₦
                  {Number(moneyContext.overpaymentExcessNgn).toLocaleString('en-NG')} overpayment. Do not
                  create another overpay refund for this quotation.
                </p>
              ) : null}
              {createPath === 'quick' && otherCalculatedReasonsAvailable ? (
                <p className="text-xs font-medium text-teal-900 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2" role="status">
                  Other calculated refund reasons are available — switch to Full refund to include them.
                </p>
              ) : null}
              {openProductionJob?.jobId ? (
                <div
                  className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 space-y-1"
                  role="alert"
                >
                  <p className="text-ui-xs font-bold uppercase tracking-wide text-amber-950">
                    Production still open
                  </p>
                  <p className="text-xs text-amber-950 leading-snug">
                    Finish or cancel job{' '}
                    <span className="font-mono font-semibold">{openProductionJob.jobId}</span>
                    {openProductionJob.status ? ` (${openProductionJob.status})` : ''} on Operations before
                    submitting this refund.
                  </p>
                </div>
              ) : null}
              {lastPreviewSnapshot?.hasCancelledProductionJob && !openProductionJob?.jobId ? (
                <div
                  className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2.5 space-y-1"
                  role="status"
                >
                  <p className="text-ui-xs font-bold uppercase tracking-wide text-teal-950">
                    Cancelled production job
                  </p>
                  <p className="text-xs text-teal-950 leading-snug">
                    Use <span className="font-semibold">Full refund</span> with{' '}
                    <span className="font-semibold">Order cancellation</span>. Cash above the quote total is
                    included in that line — not a separate Overpayment refund.
                  </p>
                  {refundMoneyBreakdown.overpay > 0 ? (
                    <p className="text-xs text-teal-800">
                      Overpayment context: ₦{Math.round(refundMoneyBreakdown.overpay).toLocaleString('en-NG')}{' '}
                      (reference only; included in the cancellation amount).
                    </p>
                  ) : null}
                </div>
              ) : null}
              <RefundCreatePolicyWarnings
                amountNgn={form.amountNgn}
                executiveThresholdNgn={refundExecutiveThresholdNgn}
                mdPricingBlocked={createBlockedByMdPricing}
                quotationRef={form.quotationRef}
              />
            </div>
          ) : null}

          {record?.refundID && !showApprovalReview ? (
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2 shadow-sm">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 text-left"
                aria-expanded={activityTimelineOpen}
                onClick={() => setActivityTimelineOpen((o) => !o)}
              >
                <p className="text-ui-xs font-bold uppercase tracking-wide text-slate-500">Activity timeline</p>
                <span className="text-ui-xs font-semibold text-slate-400">
                  {activityTimelineOpen ? 'Hide' : 'Show'}
                </span>
              </button>
              {activityTimelineOpen ? (
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
                      <span className="block text-xs font-mono text-slate-600">
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
                        <li key={p.id} className="text-xs">
                          {(p.postedAtISO || '').slice(0, 16)} · ₦{Number(p.amountNgn || 0).toLocaleString('en-NG')}
                          {p.reference ? ` · ${p.reference}` : ''}
                          {p.accountName ? ` · ${p.accountName}` : ''}
                        </li>
                      ))}
                    </ul>
                  </li>
                ) : null}
              </ul>
              ) : null}
            </div>
          ) : null}

          {previewLoading && !showApprovalReview ? (
            <p className="text-xs font-semibold text-slate-500" role="status">
              Updating refund preview…
            </p>
          ) : null}

          {previewError ? (
            <div
              className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-900"
              role="alert"
            >
              {previewError}
            </div>
          ) : null}

          {showApprovalReview ? (
            <>
              {!canApproveRefunds || ws?.canMutate === false || refundBlockedByMdPricing ? (
                <ZareApprovalHint
                  context={{
                    referenceNo: record?.refundID,
                    documentType: 'refund_request',
                    status: record?.status,
                    canApprove: canApproveRefunds && ws?.canMutate !== false && !refundBlockedByMdPricing,
                    canMutate: ws?.canMutate !== false,
                    missingPermission: !canApproveRefunds
                      ? 'Refund approval requires refunds.approve or finance.approve.'
                      : refundBlockedByMdPricing
                        ? 'Managing Director must confirm below-floor pricing after production before this refund can be approved.'
                        : undefined,
                    zareQuery: `Why can't I approve refund ${record?.refundID || ''}?`,
                  }}
                />
              ) : null}
              <RefundManagerApprovalPreview
                refundId={record?.refundID}
                refundRecord={record}
                auditData={approvalAuditData}
                loadingAudit={loadingApprovalAudit}
                refundIntel={approvalRefundIntel}
                loadingIntel={loadingApprovalIntel}
                formatNgn={formatNgnPrint}
                decisionBusy={saving}
                deliveryPaymentGate={deliveryPaymentGateMode()}
                refundExecutiveThresholdNgn={
                  Number(ws?.snapshot?.orgGovernanceLimits?.refundExecutiveThresholdNgn) || 1_000_000
                }
                onRefreshApprovalContext={refreshApprovalContext}
                onApprove={(decisionExtras) =>
                  void submitApprovalDecision({
                    status: 'Approved',
                    approvedAmount: decisionExtras.approvedAmountNgn,
                    calculationLines: decisionExtras.calculationLines,
                    alignmentAckCodes: decisionExtras.productionAlignmentAcknowledgedCodes,
                    alignmentOverrideNote: decisionExtras.productionAlignmentOverrideNote,
                    managerComments: decisionExtras.managerComments,
                  })
                }
                onReject={(decisionExtras) =>
                  void submitApprovalDecision({
                    status: 'Rejected',
                    managerComments: decisionExtras.managerComments,
                  })
                }
                onEditDetails={() => setApprovalEditMode(true)}
                editDetailsLabel="Edit breakdown & payee"
              />
            </>
          ) : (
            <>
          {showApproval && approvalEditMode ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3">
              <p className="text-xs font-semibold text-amber-950">
                Editing request details — adjust lines or payee, then save your decision.
              </p>
              <button
                type="button"
                onClick={() => setApprovalEditMode(false)}
                className="shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-ui-xs font-bold uppercase tracking-wide text-amber-900 hover:bg-amber-50"
              >
                Back to review
              </button>
            </div>
          ) : null}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7 space-y-6">
              {/* Step 1: Quotation Selection */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200/60 shadow-sm space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-5 bg-rose-500 rounded-full" />
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Quotation</h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="relative min-w-0">
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
                                loadingQuotes
                                  ? 'Loading quotations…'
                                  : 'Type quotation id, customer, or prepared by'
                              }
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
                                if (identityLocked || manualQuotationVerifyBusy) return;
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
                                  const remNgn = Math.max(0, Math.round(q.remaining_ngn ?? 0));
                                  const preparedBy = quotationPreparedByLabel(q) || '—';
                                  const previewHint =
                                    Number(q.suggested_preview_amount_ngn) >= MIN_REFUND_QUOTATION_REMAINING_NGN
                                      ? ` · preview ₦${q.suggested_preview_amount_ngn.toLocaleString('en-NG')}`
                                      : '';
                                  return (
                                    <button
                                      key={q.id}
                                      type="button"
                                      className="w-full px-3 py-2 text-left text-xs font-semibold text-zarewa-teal hover:bg-rose-50"
                                      onMouseDown={(ev) => ev.preventDefault()}
                                      onClick={() => handleQuoteChange(q.id)}
                                    >
                                      <span className="block truncate">
                                        {q.id} · {q.customer_name}
                                      </span>
                                      <span className="block text-ui-xs font-bold text-slate-700 truncate">
                                        Prepared by {preparedBy}
                                      </span>
                                      <span className="block text-ui-xs font-medium text-slate-500 truncate">
                                        ₦{remNgn.toLocaleString()} refundable
                                        {previewHint}
                                        {dateBit}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            ) : quotationSuggestOpen &&
                              quotationSearchLooksLikeId &&
                              !loadingQuotes &&
                              String(quotationSearchText || '').trim() ? (
                              <div className="absolute z-20 mt-1 w-full rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                                <button
                                  type="button"
                                  className="w-full px-3 py-2 text-left text-xs font-semibold text-zarewa-teal hover:bg-rose-50"
                                  onMouseDown={(ev) => ev.preventDefault()}
                                  onClick={() => void verifyAndApplyQuotationId()}
                                >
                                  Look up {String(quotationSearchText || '').trim()}
                                  <span className="block text-ui-xs font-medium text-slate-500">
                                    Not in the loaded list — verify this quotation id
                                  </span>
                                </button>
                              </div>
                            ) : null}
                          </div>
                        )}
                    </div>
                    {mode === 'create' && !identityLocked ? (
                      <div className="mt-2">
                        {!pasteQuoteIdOpen ? (
                          <button
                            type="button"
                            onClick={() => setPasteQuoteIdOpen(true)}
                            className="text-ui-xs font-bold uppercase tracking-wide text-teal-800 hover:text-teal-950 underline-offset-2 hover:underline"
                          >
                            Paste quotation id…
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={loadingQuotes || manualQuotationVerifyBusy}
                            onClick={() => void verifyAndApplyQuotationId()}
                            className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-ui-xs font-bold uppercase tracking-wide text-teal-900 hover:bg-teal-100 disabled:opacity-50"
                          >
                            {manualQuotationVerifyBusy ? 'Verifying…' : 'Use quotation id'}
                          </button>
                        )}
                      </div>
                    ) : null}
                    {manualQuotationVerifyError ? (
                      <p className="mt-1 text-ui-xs text-rose-700 font-medium leading-snug" role="alert">
                        {manualQuotationVerifyError}
                      </p>
                    ) : null}
                    {form.quotationRef && selectedQuotationRefundsBlocked.blocked ? (
                      <div
                        className="mt-3 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2.5 space-y-1"
                        role="alert"
                      >
                        <p className="text-ui-xs font-bold uppercase tracking-wide text-rose-900">
                          Refunds permanently blocked
                        </p>
                        <p className="text-xs text-rose-900 leading-snug">
                          {selectedQuotationRefundsBlocked.reason || 'No refund requests may be submitted on this quotation.'}
                        </p>
                        {selectedQuotationRefundsBlocked.byName || selectedQuotationRefundsBlocked.atISO ? (
                          <p className="text-ui-xs text-rose-800/80">
                            {selectedQuotationRefundsBlocked.byName ? `By ${selectedQuotationRefundsBlocked.byName}` : ''}
                            {selectedQuotationRefundsBlocked.atISO
                              ? `${selectedQuotationRefundsBlocked.byName ? ' · ' : ''}${selectedQuotationRefundsBlocked.atISO.slice(0, 16).replace('T', ' ')}`
                              : ''}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                    {!loadingQuotes && quotationPickList.length === 0 && mode === 'create' ? (
                      <div className="mt-2 space-y-2 rounded-lg border border-amber-200/80 bg-amber-50/50 p-3">
                        <p className="text-xs text-amber-900 font-medium leading-snug">
                          No eligible quotations yet for this branch. If a receipt is already posted, sync paid below —
                          or open{' '}
                          <button
                            type="button"
                            className="font-bold underline underline-offset-2 hover:text-amber-950"
                            onClick={() => setRefundGuideOpen(true)}
                          >
                            how refunds work
                          </button>{' '}
                          for listing rules.
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
                            className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-mono outline-none focus:ring-2 focus:ring-rose-200"
                          />
                          <button
                            type="button"
                            disabled={syncPaidBusy}
                            onClick={() => void syncPaidFromLedger()}
                            className="shrink-0 rounded-lg bg-zarewa-teal text-white px-3 py-2 text-ui-xs font-bold uppercase tracking-wide disabled:opacity-50"
                          >
                            {syncPaidBusy ? 'Syncing…' : 'Sync paid from receipts'}
                          </button>
                        </div>
                        {syncPaidError ? (
                          <p className="text-ui-xs text-rose-700 font-medium">{syncPaidError}</p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Step 2: compact breakdown */}
              <div
                className={`rounded-2xl border border-slate-200/60 bg-white p-4 shadow-sm space-y-3 transition-opacity duration-300 ${!form.quotationRef ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-1.5 h-4 rounded-full bg-rose-500 shrink-0" />
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                      Breakdown
                    </h3>
                    {derivedReasonCategories.length === 1 ? (
                      <span className="truncate rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600">
                        {refundCategoryDisplayLabel(derivedReasonCategories[0])}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {!readOnly && mode === 'create' && createPath === 'full' ? (
                      !includeCommissionInPreview ? (
                        <button
                          type="button"
                          onClick={() => {
                            setIncludeCommissionInPreview(true);
                            const r = String(form.quotationRef || '').trim();
                            if (r) void generatePreview(r, true);
                          }}
                          className="text-[10px] font-bold uppercase tracking-wide text-teal-800 hover:text-teal-950"
                        >
                          + Commission
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setIncludeCommissionInPreview(false);
                            const r = String(form.quotationRef || '').trim();
                            if (r) void generatePreview(r, false);
                          }}
                          className="text-[10px] font-bold uppercase tracking-wide text-slate-500 hover:text-slate-700"
                        >
                          − Commission
                        </button>
                      )
                    ) : null}
                    {!readOnly && createPath === 'full' ? (
                      <button
                        type="button"
                        onClick={addLine}
                        className="text-[10px] font-bold uppercase tracking-wide text-rose-600 hover:text-rose-800"
                      >
                        + Line
                      </button>
                    ) : null}
                  </div>
                </div>

                {derivedReasonCategories.length > 1 ? (
                  <div className="flex flex-wrap gap-1">
                    {derivedReasonCategories.map((c) => (
                      <span
                        key={c}
                        className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-600"
                        title={REFUND_CATEGORY_HINTS[c] || ''}
                      >
                        {refundCategoryDisplayLabel(c)}
                      </span>
                    ))}
                  </div>
                ) : null}
                {excludedRefundHints.length > 0 ? (
                  <div>
                    {!excludedCatsOpen ? (
                      <button
                        type="button"
                        onClick={() => setExcludedCatsOpen(true)}
                        className="text-[10px] font-semibold text-slate-400 hover:text-slate-600"
                      >
                        Unavailable categories…
                      </button>
                    ) : (
                      <p className="text-[10px] leading-snug text-slate-500">
                        {excludedRefundHints
                          .map(({ cat, reason }) =>
                            reason === 'blocked'
                              ? `${refundCategoryDisplayLabel(cat)} (blocked)`
                              : `${refundCategoryDisplayLabel(cat)} (done)`
                          )
                          .join(' · ')}
                      </p>
                    )}
                  </div>
                ) : null}

                <div
                  className={`space-y-1.5 ${!form.quotationRef ? 'pointer-events-none opacity-40' : ''}`}
                >
                  {form.calculationLines.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-slate-200 px-3 py-6 text-center text-xs font-medium text-slate-400">
                      Link a quotation to load preview lines.
                    </p>
                  ) : (
                    form.calculationLines.map((line, idx) => {
                      const isManual = String(line.lineKey || '').startsWith('m-');
                      const expectedFromLabel = expectedAmountFromRefundLineLabel(line.label, line.category);
                      const lineAmount = roundMoneyLocal(line.amountNgn);
                      const labelAmountMismatch =
                        expectedFromLabel != null &&
                        line.include !== false &&
                        lineAmount > 0 &&
                        lineAmount > expectedFromLabel + AMOUNT_LINE_TOL;
                      const included = line.include !== false;
                      return (
                        <div
                          key={line.lineKey || `line-${idx}`}
                          className={`rounded-lg border px-2 py-1.5 ${
                            included
                              ? 'border-slate-200 bg-slate-50/80 hover:bg-white'
                              : 'border-slate-100 bg-slate-50/40 opacity-55'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            {!readOnly ? (
                              <label className="mt-1.5 shrink-0 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={included}
                                  onChange={(e) => setLine(idx, { include: e.target.checked })}
                                  className="h-3.5 w-3.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                                  aria-label="Include line"
                                />
                              </label>
                            ) : null}
                            <div className="min-w-0 flex-1">
                              {isManual && !readOnly ? (
                                <textarea
                                  rows={2}
                                  value={line.label}
                                  onChange={(e) => setLine(idx, { label: e.target.value })}
                                  className="w-full resize-y border-none bg-transparent p-0 text-xs font-semibold text-slate-800 outline-none leading-snug"
                                  placeholder="Description…"
                                />
                              ) : (
                                <p
                                  className="text-xs font-semibold text-slate-800 leading-snug line-clamp-2"
                                  title={line.label}
                                >
                                  {line.label || '—'}
                                </p>
                              )}
                              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                                {isManual && !readOnly ? (
                                  <select
                                    value={line.category || 'Other'}
                                    onChange={(e) => setLine(idx, { category: e.target.value })}
                                    className="rounded border border-slate-200 bg-white py-0.5 px-1.5 text-[10px] font-bold uppercase text-slate-600"
                                  >
                                    {REFUND_REASON_CATEGORIES.map((c) => (
                                      <option key={c} value={c}>
                                        {refundCategoryDisplayLabel(c)}
                                      </option>
                                    ))}
                                  </select>
                                ) : derivedReasonCategories.length > 1 ? (
                                  <span
                                    className="text-[10px] font-bold uppercase text-slate-400"
                                    title={REFUND_CATEGORY_HINTS[line.category] || ''}
                                  >
                                    {refundCategoryDisplayLabel(line.category) || '—'}
                                  </span>
                                ) : null}
                                {labelAmountMismatch ? (
                                  <span className="text-[10px] font-semibold text-rose-700">
                                    Label implies ₦{expectedFromLabel.toLocaleString('en-NG')}
                                  </span>
                                ) : null}
                              </div>
                              {substitutionPerMeterBreakdown.length > 0 &&
                              (String(line.category || '').trim() === 'Substitution Difference' ||
                                (substitutionBreakdownLineKey &&
                                  line.lineKey === substitutionBreakdownLineKey)) ? (
                                <div className="mt-1">
                                  <button
                                    type="button"
                                    className="text-[10px] font-bold uppercase text-sky-800 hover:text-sky-950"
                                    onClick={() => setSubstLineCalcOpen((o) => !o)}
                                    aria-expanded={substLineCalcOpen}
                                  >
                                    {substLineCalcOpen ? 'Hide calc' : 'Show calc'}
                                  </button>
                                  {substLineCalcOpen ? (
                                    <div className="mt-1 space-y-1 rounded border border-sky-100 bg-sky-50/90 px-2 py-1.5 text-[10px] text-slate-700">
                                      {substitutionPerMeterBreakdown.map((row, subIdx) => {
                                        const qPpm = Number(row.quotedPricePerMeterNgn || 0);
                                        const coilPpm = Number(row.producedListPricePerMeterNgn || 0);
                                        const dPpm = Number(row.deltaPerMeterNgn || 0);
                                        const m = Number(row.meters || 0);
                                        const credit = Number(row.creditNgn || 0);
                                        return (
                                          <p
                                            key={`${row.jobId || row.productName || 'job'}-${m}-${subIdx}`}
                                            className="font-mono tabular-nums"
                                          >
                                            <span className="font-sans font-semibold text-slate-800">
                                              {row.productName || row.jobId || 'Job'}
                                            </span>
                                            {' · '}
                                            ₦{qPpm.toLocaleString('en-NG')}/m − ₦{coilPpm.toLocaleString('en-NG')}
                                            /m = ₦{dPpm.toLocaleString('en-NG')}/m × {m.toFixed(2)} m ={' '}
                                            <span className="font-bold">₦{credit.toLocaleString('en-NG')}</span>
                                          </p>
                                        );
                                      })}
                                    </div>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
                            <div className="flex items-center gap-1 shrink-0 pt-0.5">
                              <span className="text-[10px] font-bold text-slate-400">₦</span>
                              <input
                                type="number"
                                disabled={readOnly}
                                value={line.amountNgn}
                                onChange={(e) => setLine(idx, { amountNgn: e.target.value })}
                                className="w-[5.5rem] rounded-md border border-slate-200 bg-white py-1 px-1.5 text-right text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-rose-500/10 tabular-nums"
                              />
                              {!readOnly && isManual ? (
                                <button
                                  type="button"
                                  onClick={() => removeLine(idx)}
                                  className="rounded p-1 text-slate-300 hover:text-rose-600"
                                  aria-label="Remove line"
                                >
                                  <X size={14} />
                                </button>
                              ) : null}
                            </div>
                          </div>
                        </div>
                        );
                      })
                    )}
                  </div>

                  <div className="flex flex-wrap items-end justify-between gap-2 border-t border-slate-100 pt-3">
                    <div className="min-w-0">
                      {mode === 'create' && createAmountDerivedFromLines ? (
                        <>
                          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                            Refund total
                          </p>
                          <p
                            className={`text-xl font-black tabular-nums tracking-tight ${
                              exceedsRefundableHeadroom ? 'text-rose-700' : 'text-slate-900'
                            }`}
                          >
                            ₦{lineSum.toLocaleString('en-NG')}
                          </p>
                          {exceedsRefundableHeadroom ? (
                            <p className="text-[10px] font-semibold text-rose-700 mt-0.5 leading-snug max-w-sm">
                              {categoryCapViolation
                                ? `${refundCategoryDisplayLabel(categoryCapViolation.cat)} exceeds ₦${categoryCapViolation.cap.toLocaleString('en-NG')}.`
                                : lineArithmeticIssues[0]
                                  ? `Line description does not match amount.`
                                  : exceedsOverpayLine
                                    ? `Overpayment max ₦${overpayMaxNgn.toLocaleString('en-NG')}.`
                                    : `Exceeds refundable cash (max ₦${(effectiveRefundCapNgn ?? 0).toLocaleString('en-NG')}).`}
                            </p>
                          ) : null}
                          <input type="hidden" name="amountNgn" value={form.amountNgn} readOnly />
                        </>
                      ) : (
                        <div className="space-y-2">
                          <div>
                            <p className="text-[10px] font-bold uppercase text-slate-400">Lines total</p>
                            <p
                              className={`text-lg font-black tabular-nums ${
                                exceedsRefundableHeadroom ? 'text-rose-700' : 'text-slate-900'
                              }`}
                            >
                              ₦{lineSum.toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <label
                              className="text-[10px] font-bold uppercase text-rose-800/80"
                              htmlFor="refund-requested-amount"
                            >
                              Requested amount
                            </label>
                            <div className="mt-0.5 flex items-center gap-1">
                              <span className="text-xs font-bold text-rose-900">₦</span>
                              <input
                                id="refund-requested-amount"
                                required
                                type="number"
                                disabled={readOnly || identityLocked}
                                value={form.amountNgn}
                                onChange={(e) => setForm((f) => ({ ...f, amountNgn: e.target.value }))}
                                className="w-36 rounded-lg border border-rose-200/80 bg-white py-1.5 px-2 text-sm font-black text-rose-950 outline-none focus:ring-2 focus:ring-rose-500/15 tabular-nums"
                                placeholder="0"
                              />
                            </div>
                            {sumMismatch ? (
                              <p className="mt-1 text-[10px] font-semibold text-amber-800">
                                Lines total ≠ requested amount.
                              </p>
                            ) : null}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <button
                        type="button"
                        onClick={() => setRefundNotesOpen((o) => !o)}
                        className="text-[10px] font-bold uppercase tracking-wide text-slate-500 hover:text-slate-800"
                        aria-expanded={refundNotesOpen}
                      >
                        {refundNotesOpen
                          ? 'Hide notes'
                          : form.reasonNotes?.trim()
                            ? 'Edit notes'
                            : 'Add note'}
                      </button>
                      {mode === 'create' && form.quotationRef && lineSum > 0 ? (
                        <div className="w-full min-w-[12rem] max-w-xs">
                          <RefundGlImpactPreview
                            calculationLines={form.calculationLines}
                            hasCompletedProduction={refundHasCompletedProduction}
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {refundNotesOpen || (readOnly && form.reasonNotes?.trim()) ? (
                    <textarea
                      rows={2}
                      disabled={readOnly}
                      value={form.reasonNotes}
                      onChange={(e) => setForm((f) => ({ ...f, reasonNotes: e.target.value }))}
                      placeholder="Optional note for finance / BM…"
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-rose-500/20 resize-none"
                    />
                  ) : null}
              </div>
            </div>

            {/* Right: transaction intelligence */}
            <div className="lg:col-span-5">
              <div className="p-5 rounded-2xl bg-slate-900 text-white shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Hash className="text-rose-400 shrink-0" size={18} aria-hidden />
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">
                      Quote summary
                    </h3>
                  </div>
                  {loadingIntelligence ? (
                    <div className="w-4 h-4 border-2 border-rose-500 border-t-transparent rounded-full animate-spin shrink-0" />
                  ) : null}
                </div>

                {!form.quotationRef ? (
                  <div className="py-10 flex flex-col items-center justify-center text-center px-4">
                    <Link2 size={32} className="text-slate-700 mb-2 opacity-20" aria-hidden />
                    <p className="text-ui-xs font-bold text-slate-500 uppercase">
                      Select a quotation
                    </p>
                  </div>
                ) : (
                  <div className="space-y-5 animate-in fade-in duration-500">
                    <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-3 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="min-w-0">
                          <p className="text-ui-xs font-bold text-slate-500 uppercase mb-1">Customer</p>
                          <p className="text-sm font-bold text-white truncate">{quoteSummaryCustomerName}</p>
                          <p className="text-ui-xs font-medium text-slate-400 font-mono">{form.customerID || '—'}</p>
                          {selectedQuotationPreparedBy ? (
                            <p className="text-ui-xs font-medium text-slate-400 mt-1 truncate">
                              Prepared by <span className="text-slate-200">{selectedQuotationPreparedBy}</span>
                            </p>
                          ) : null}
                        </div>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:justify-items-end sm:text-right">
                          <div>
                            <p className="text-ui-xs font-bold text-slate-500 uppercase mb-0.5">Quote total</p>
                            <p className="text-sm font-black text-white tabular-nums">
                              ₦
                              {(selectedQuoteMoneyRow?.total_ngn || 0).toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-ui-xs font-bold text-slate-500 uppercase mb-0.5">Receipts (cash view)</p>
                            <p className="text-sm font-black text-emerald-400 tabular-nums">
                              ₦{refundIntelReceiptsTotalNgn.toLocaleString()}
                            </p>
                            <p className="text-ui-xs text-slate-600 mt-0.5 leading-tight">
                              {intelligence.receipts.length === 0
                                ? refundIntelLedgerCashInNgn > 0
                                  ? `No sales receipts linked — ledger cash-in ₦${refundIntelLedgerCashInNgn.toLocaleString('en-NG')}`
                                  : 'No receipts linked in workspace'
                                : `${intelligence.receipts.length} linked receipt${intelligence.receipts.length === 1 ? '' : 's'}`}
                            </p>
                          </div>
                        </div>
                      </div>
                      {selectedQuotationSnapshot ? (
                        <div className="border-t border-slate-700/50 pt-3 space-y-2">
                          <button
                            type="button"
                            className="text-ui-xs font-bold text-slate-500 uppercase hover:text-slate-300"
                            aria-expanded={quoteDetailsOpen}
                            onClick={() => setQuoteDetailsOpen((o) => !o)}
                          >
                            {quoteDetailsOpen ? 'Hide quote details' : 'More quote details'}
                          </button>
                          {quoteDetailsOpen ? (
                          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1.5 text-ui-xs text-slate-200">
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
                              <dt className="text-slate-500 shrink-0">Prepared by</dt>
                              <dd
                                className="text-right truncate max-w-[14rem] sm:max-w-[18rem]"
                                title={selectedQuotationPreparedBy}
                              >
                                {selectedQuotationPreparedBy || '—'}
                              </dd>
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
                                <p className="text-ui-xs text-slate-500 leading-snug">{refundQuotationGaugeDisplay.hint}</p>
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
                          ) : null}
                        </div>
                      ) : null}
                      {refundProductionConversionSummary ? (
                        <div className="border-t border-slate-700/50 pt-3 space-y-2">
                          <p className="text-ui-xs font-bold text-slate-500 uppercase">
                            Conversion &amp; production status
                          </p>
                          {refundProductionConversionSummary.emptyMessage ? (
                            <p className="text-ui-xs text-slate-400 leading-snug">
                              {refundProductionConversionSummary.emptyMessage}
                            </p>
                          ) : (
                            <ul className="space-y-1.5">
                              {refundProductionConversionSummary.jobs.map((j) => (
                                <li
                                  key={j.jobID}
                                  className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 text-ui-xs leading-snug"
                                >
                                  <span className="font-mono text-slate-300">{j.jobID}</span>
                                  <span className="text-slate-500 uppercase">{j.status}</span>
                                  <span
                                    className={
                                      ['HIGH', 'LOW'].includes(String(j.conversionAlertState).toUpperCase())
                                        ? 'font-bold text-amber-300'
                                        : 'text-slate-400'
                                    }
                                  >
                                    {j.conversionAlertState}
                                    {j.managerReviewRequired ? ' · review' : ''}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ) : null}
                      {refundMoneyBreakdown.overpay > 0 ? (
                        <div className="pt-2 border-t border-slate-700/80">
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <p className="text-ui-xs font-bold text-slate-500 uppercase">
                              {moneyContext?.overpaymentResidualNgn === 0
                                ? 'Original overpayment'
                                : 'Overpayment'}
                            </p>
                            <p className="text-sm font-black text-amber-300 tabular-nums">
                              ₦{refundMoneyBreakdown.overpay.toLocaleString()}
                            </p>
                          </div>
                          {moneyContext?.creditAppliedOutNgn > 0 ? (
                            <p className="mt-1 text-[10px] leading-snug text-amber-200/90">
                              ₦{Number(moneyContext.creditAppliedOutNgn).toLocaleString('en-NG')} already
                              used on another quotation — not refundable again.
                            </p>
                          ) : null}
                          {moneyContext?.overpaymentResidualNgn === 0 ? (
                            <p className="mt-1 text-[10px] leading-snug text-emerald-300/90">
                              {moneyContext?.creditAppliedOutNgn > 0
                                ? 'Already used on other quotations — residual ₦0.'
                                : 'Already settled by prior refunds — residual ₦0.'}
                            </p>
                          ) : moneyContext?.overpaymentResidualNgn != null &&
                            moneyContext.overpaymentResidualNgn < refundMoneyBreakdown.overpay ? (
                            <p className="mt-1 text-[10px] leading-snug text-slate-400">
                              Still refundable as overpay: ₦
                              {Number(moneyContext.overpaymentResidualNgn).toLocaleString('en-NG')}
                            </p>
                          ) : null}
                          {overpayIncludedInOrderCancellation ? (
                            <p className="mt-1 text-[10px] leading-snug text-slate-400">
                              Cash above quote — included in the Order cancellation refund line, not added
                              separately.
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                      {previewRemainingNgn != null && mode === 'create' ? (
                        <div className="pt-2 border-t border-slate-700/80">
                          <p className="text-ui-xs font-bold text-slate-500 uppercase mb-0.5">
                            Remaining refundable
                          </p>
                          <p className="text-sm font-black text-amber-200 tabular-nums">
                            ₦{previewRemainingNgn.toLocaleString('en-NG')}
                          </p>
                        </div>
                      ) : null}
                      {form.quotationRef && (quotationRefundsPaidAlreadyNgn > 0 || priorRefundsOnQuote.length > 0) ? (
                        <div className="pt-2 border-t border-slate-700/80 space-y-1">
                          <p className="text-ui-xs font-bold text-slate-500 uppercase mb-0.5">
                            Prior refunds
                          </p>
                          {quotationRefundsPaidAlreadyNgn > 0 ? (
                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                              <p className="text-ui-xs text-slate-400">Already paid</p>
                              <p className="text-sm font-black text-emerald-300 tabular-nums">
                                ₦{quotationRefundsPaidAlreadyNgn.toLocaleString('en-NG')}
                              </p>
                            </div>
                          ) : null}
                          {priorRefundsOnQuote.length > 0 ? (
                            <ul className="space-y-1 mt-1">
                              {priorRefundsOnQuote.map((r) => {
                                const st = String(r.status || '').trim();
                                const amt = Math.round(
                                  Number(r.paidAmountNgn ?? r.paid_amount_ngn) > 0
                                    ? Number(r.paidAmountNgn ?? r.paid_amount_ngn)
                                    : Number(r.amountNgn) || 0
                                );
                                return (
                                  <li
                                    key={r.refundID || r.refund_id}
                                    className="flex flex-wrap items-baseline justify-between gap-2 text-ui-xs"
                                  >
                                    <span className="font-mono text-slate-400">
                                      {r.refundID || r.refund_id}
                                      <span className="ml-1.5 text-slate-500 normal-case font-sans">{st}</span>
                                    </span>
                                    <span className="tabular-nums text-slate-200">
                                      ₦{amt.toLocaleString('en-NG')}
                                    </span>
                                  </li>
                                );
                              })}
                            </ul>
                          ) : null}
                        </div>
                      ) : null}
                      {(intelligence.dataQualityIssues || []).length > 0 ? (
                        <div className="pt-2 border-t border-amber-900/40 rounded-lg bg-amber-950/25 p-2.5 space-y-1.5">
                          <p className="text-ui-xs font-bold text-amber-200 uppercase">System alerts</p>
                          <ul className="space-y-1">
                            {(intelligence.dataQualityIssues || []).map((issue, idx) => (
                              <li
                                key={issue.jobId || issue.code || idx}
                                className={`text-ui-xs leading-snug ${
                                  issue.severity === 'critical' ? 'text-rose-100' : 'text-amber-50/95'
                                }`}
                              >
                                • {typeof issue === 'string' ? issue : issue.message}
                              </li>
                            ))}
                          </ul>
                          {mode === 'create' && String(form.quotationRef || '').trim() ? (
                            <div className="pt-2 border-t border-amber-800/40 space-y-1.5">
                              {!advancedPricingOpen ? (
                                <button
                                  type="button"
                                  onClick={() => setAdvancedPricingOpen(true)}
                                  className="text-ui-xs font-bold uppercase tracking-wide text-amber-100/90 hover:text-amber-50 underline-offset-2 hover:underline"
                                >
                                  Workbook override…
                                </button>
                              ) : (
                                <>
                              <label className="block text-ui-xs font-bold text-amber-100/90 uppercase tracking-wide">
                                Workbook ₦/m override
                              </label>
                              <div className="flex flex-wrap items-end gap-2">
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  autoComplete="off"
                                  placeholder="₦/m"
                                  value={substitutionWorkbookPpmOverride}
                                  onChange={(e) => setSubstitutionWorkbookPpmOverride(e.target.value)}
                                  className="w-[7.5rem] rounded-md border border-amber-800/60 bg-amber-950/40 px-2 py-1.5 text-xs font-mono text-amber-50 placeholder:text-amber-200/40"
                                />
                                <button
                                  type="button"
                                  disabled={previewLoading}
                                  onClick={() =>
                                    void generatePreview(String(form.quotationRef).trim(), includeCommissionInPreview)
                                  }
                                  className="rounded-md bg-amber-200/90 px-2.5 py-1.5 text-ui-xs font-bold uppercase tracking-wide text-amber-950 hover:bg-amber-100 disabled:opacity-50"
                                >
                                  Apply to preview
                                </button>
                              </div>
                                </>
                              )}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>

                    {mode === 'create' && form.quotationRef && createPath === 'full' ? (
                      <div className="flex flex-col gap-2">
                        {!refundIntelExpanded ? (
                          <button
                            type="button"
                            className="w-full rounded-xl border border-slate-600 bg-slate-800/80 py-2.5 px-3 text-center text-ui-xs font-bold uppercase tracking-wide text-slate-200 hover:bg-slate-800 hover:border-slate-500 transition-colors"
                            onClick={() => setRefundIntelExpanded(true)}
                          >
                            Show details
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="w-full rounded-xl border border-transparent py-1.5 text-center text-ui-xs font-bold uppercase tracking-wide text-slate-500 hover:text-slate-300 transition-colors"
                            onClick={() => setRefundIntelExpanded(false)}
                          >
                            Hide details
                          </button>
                        )}
                      </div>
                    ) : null}

                    {(mode !== 'create' || refundIntelExpanded) && (
                    <>
                    <div className="space-y-2">
                      <p className="text-ui-xs font-bold text-slate-500 uppercase tracking-wider">
                        Quotation order lines
                      </p>
                      {refundIntelQuotationOrderRows.length === 0 ? (
                        <p className="text-ui-xs text-slate-600 italic leading-snug">
                          No structured lines on this quotation (open the quote in Sales to add products, accessories, and
                          services).
                        </p>
                      ) : (
                        <div className="max-h-[min(260px,40vh)] overflow-auto custom-scrollbar rounded-xl border border-slate-700/80">
                          <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 z-[1] bg-slate-950/95 backdrop-blur border-b border-slate-700">
                              <tr>
                                <th className="py-2 pl-2.5 pr-1 text-ui-xs font-bold text-slate-500 uppercase tracking-wide">
                                  Type
                                </th>
                                <th className="py-2 px-1 text-ui-xs font-bold text-slate-500 uppercase tracking-wide">
                                  Item
                                </th>
                                <th className="py-2 px-1 text-ui-xs font-bold text-slate-500 uppercase tracking-wide text-right">
                                  Qty
                                </th>
                                <th className="py-2 px-1 text-ui-xs font-bold text-slate-500 uppercase tracking-wide text-right">
                                  Unit ₦
                                </th>
                                <th className="py-2 px-1 text-ui-xs font-bold text-slate-500 uppercase tracking-wide text-right">
                                  Supplied
                                </th>
                                <th className="py-2 pr-2.5 pl-1 text-ui-xs font-bold text-slate-500 uppercase tracking-wide text-right">
                                  Short
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {refundIntelQuotationOrderRows.map((row) => (
                                <tr key={row.key} className="border-t border-slate-800/90 align-top">
                                  <td className="py-1.5 pl-2.5 pr-1 text-ui-xs text-slate-500 whitespace-nowrap">
                                    {row.categoryLabel}
                                  </td>
                                  <td
                                    className="py-1.5 px-1 text-ui-xs font-semibold text-slate-200 max-w-[7.5rem] sm:max-w-[10rem] truncate"
                                    title={row.name}
                                  >
                                    {row.name}
                                  </td>
                                  <td className="py-1.5 px-1 text-ui-xs text-right tabular-nums text-slate-300">
                                    {row.qtyLabel}
                                  </td>
                                  <td className="py-1.5 px-1 text-ui-xs text-right tabular-nums text-slate-300">
                                    {row.unitPriceLabel}
                                  </td>
                                  <td className="py-1.5 px-1 text-ui-xs text-right tabular-nums text-emerald-400/95">
                                    {row.isAccessoryTracked
                                      ? row.isStoneFlatsheetM2
                                        ? `${(Number(row.supplied) || 0).toLocaleString('en-NG', { maximumFractionDigits: 3 })} m²`
                                        : row.supplied?.toLocaleString() ?? '—'
                                      : '—'}
                                  </td>
                                  <td className="py-1.5 pr-2.5 pl-1 text-ui-xs text-right tabular-nums">
                                    {row.isAccessoryTracked && row.shortfall != null && row.shortfall > 0 ? (
                                      <span className="font-bold text-rose-400">
                                        {row.isStoneFlatsheetM2
                                          ? `${row.shortfall.toLocaleString('en-NG', { maximumFractionDigits: 3 })} m²`
                                          : row.shortfall.toLocaleString()}
                                      </span>
                                    ) : row.isAccessoryTracked && row.shortfall === 0 ? (
                                      <span className="text-slate-500">{row.isStoneFlatsheetM2 ? '0 m²' : '0'}</span>
                                    ) : (
                                      <span className="text-slate-600">—</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <p className="text-ui-xs font-bold text-slate-500 uppercase tracking-wider">Production & delivery</p>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700">
                          <p className="text-ui-xs font-bold text-slate-500 uppercase mb-0.5">Cutting lists</p>
                          <p className="text-xs font-black">{intelligence.cuttingLists.length}</p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700">
                          <p className="text-ui-xs font-bold text-slate-500 uppercase mb-0.5">Produced metres</p>
                          <p className="text-xs font-black text-sky-400">
                            {(lastPreviewSnapshot?.coilProducedMeters != null
                              ? Number(lastPreviewSnapshot.coilProducedMeters)
                              : intelligence.summary?.producedMeters
                            )?.toLocaleString() || 0}{' '}
                            m
                          </p>
                        </div>
                        {lastPreviewSnapshot?.economicFloor &&
                        (Number(lastPreviewSnapshot.economicFloor.producedOutputMeters) > 0 ||
                          Number(lastPreviewSnapshot.economicFloor.floorDeliveredValueNgn) > 0) ? (
                          <div className="p-2.5 rounded-xl bg-slate-800/80 border border-amber-700/50 sm:col-span-2">
                            <p className="text-ui-xs font-bold text-amber-400/90 uppercase mb-0.5">
                              Economic floor check
                            </p>
                            <p className="text-ui-xs text-slate-300 leading-snug">
                              {Number(lastPreviewSnapshot.economicFloor.producedOutputMeters || 0).toLocaleString()} m
                              produced × workbook floor ≈{' '}
                              {formatNgnPrint(lastPreviewSnapshot.economicFloor.floorDeliveredValueNgn)} delivered value.
                              Max defensible for production-related reasons after prior payouts:{' '}
                              <strong className="text-amber-200">
                                {formatNgnPrint(lastPreviewSnapshot.economicFloor.maxDefensibleRefundNgn)}
                              </strong>
                              . Overpayment and quoted services are not counted against this cap.
                            </p>
                            {lastPreviewSnapshot.economicFloor.incompleteFloorPricing ? (
                              <p className="text-ui-xs text-amber-400/90 mt-1">
                                Floor ₦/m could not be resolved for all jobs — production-related refunds need workbook
                                pricing or an MD/admin override. Overpayment-only refunds are not blocked.
                              </p>
                            ) : null}
                            {lastPreviewSnapshot.economicFloor.usedPriceListFallback ? (
                              <p className="text-ui-xs text-slate-400 mt-1">
                                Some rates from published list (workbook floor missing).
                              </p>
                            ) : null}
                          </div>
                        ) : null}
                        {(Number(intelligence.summary?.stoneFlatsheetSummary?.totalSuppliedM2) > 0 ||
                          (intelligence.summary?.stoneFlatsheetSummary?.lines || []).length > 0) ? (
                          <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 sm:col-span-2">
                            <p className="text-ui-xs font-bold text-slate-500 uppercase mb-0.5">Stone flatsheet (m²)</p>
                            <p className="text-xs font-black text-emerald-300/95">
                              {(Number(intelligence.summary?.stoneFlatsheetSummary?.totalSuppliedM2) || 0).toLocaleString(
                                'en-NG',
                                { maximumFractionDigits: 3 }
                              )}{' '}
                              m² supplied
                              {(Number(intelligence.summary?.stoneFlatsheetSummary?.totalDeductionM2) || 0) > 0 ? (
                                <span className="text-slate-400 font-semibold">
                                  {' '}
                                  ·{' '}
                                  {(Number(intelligence.summary?.stoneFlatsheetSummary?.totalDeductionM2) || 0).toLocaleString(
                                    'en-NG',
                                    { maximumFractionDigits: 3 }
                                  )}{' '}
                                  m² deduction
                                </span>
                              ) : null}
                            </p>
                            {(intelligence.summary?.stoneFlatsheetSummary?.lines || []).length > 0 ? (
                              <ul className="mt-2 space-y-1 text-ui-xs text-slate-300">
                                {intelligence.summary.stoneFlatsheetSummary.lines.map((ln) => (
                                  <li key={`${ln.quoteLineId}-${ln.name}-${ln.lengthM}`} className="flex flex-wrap gap-x-2 justify-between gap-y-0.5">
                                    <span className="truncate font-medium text-slate-200" title={ln.name}>
                                      {ln.name}
                                      {ln.lengthM ? ` · ${ln.lengthM} m` : ''}
                                    </span>
                                    <span className="tabular-nums text-slate-400 shrink-0">
                                      ord {(Number(ln.orderedM2) || 0).toLocaleString('en-NG', { maximumFractionDigits: 3 })}{' '}
                                      → sup {(Number(ln.suppliedM2) || 0).toLocaleString('en-NG', { maximumFractionDigits: 3 })}{' '}
                                      m²
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {warnings.length > 0 && (
                      <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-2">
                        <p className="text-ui-xs font-bold text-rose-400 uppercase flex items-center gap-1.5">
                          <AlertTriangle size={12} aria-hidden /> System audit flags
                        </p>
                        <ul className="space-y-1">
                          {warnings.map((w, idx) => (
                            <li key={idx} className="text-ui-xs text-white/80 leading-snug">
                              • {w}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {substitutionPerMeterBreakdown.length > 0 && (
                      <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/25 space-y-2">
                        <p className="text-ui-xs font-bold text-sky-300 uppercase tracking-wide">
                          Substitution — per-metre delta
                          {pricingAsAtIso ? (
                            <span className="normal-case font-semibold text-sky-200/80">
                              {' '}
                              (workbook/list as at quote {pricingAsAtIso})
                            </span>
                          ) : null}
                        </p>
                        <ul className="space-y-2">
                          {substitutionPerMeterBreakdown.map((row, subIdx) => (
                            <li
                              key={`${row.jobId || row.productName || 'job'}-${row.coilGaugeFromAllocations || 'g'}-${Number(row.meters) || 0}-${subIdx}`}
                              className="text-ui-xs text-white/85 leading-snug"
                            >
                              <span className="font-semibold text-white">{row.productName || row.jobId}</span>
                              {row.coilGaugeFromAllocations ? (
                                <span className="text-slate-400">
                                  {' '}
                                  ({row.coilGaugeFromAllocations})
                                </span>
                              ) : null}
                              <span className="text-slate-400"> · </span>
                              {Number(row.meters || 0).toFixed(2)}m × ₦
                              {Number(row.deltaPerMeterNgn || 0).toLocaleString('en-NG')}/m
                              <span className="text-slate-400"> → </span>
                              <span className="font-mono text-sky-200">
                                ₦{Number(row.creditNgn || 0).toLocaleString('en-NG')}
                              </span>
                              <div className="text-ui-xs text-slate-500 mt-0.5 pl-0">
                                Quoted blended ₦{Number(row.quotedPricePerMeterNgn || 0).toLocaleString('en-NG')}/m
                                {row.quotedListPricePerMeterNgn != null && row.quotedListPricePerMeterNgn > 0 ? (
                                  <>
                                    {' '}
                                    · list at quoted {row.quotedGaugeDesignLabel || 'gauge/design'} ₦
                                    {Number(row.quotedListPricePerMeterNgn).toLocaleString('en-NG')}/m
                                  </>
                                ) : null}
                                {' '}
                                vs workbook floor (coil) ₦{Number(row.producedListPricePerMeterNgn || 0).toLocaleString('en-NG')}
                                /m
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    </>
                    )}

                    <div className="rounded-xl border border-slate-600 bg-slate-800/50 p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-ui-xs font-bold uppercase tracking-wide text-slate-400">
                          Payout
                        </p>
                        {payoutAccountReady ? (
                          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-300">
                            {selectedCustomerHrPayout ? 'HR bank' : 'Customer bank'}
                          </span>
                        ) : null}
                        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-300">
                          Split payout
                        </span>
                      </div>

                      {payoutAccountReady ? (
                        <>
                          <div className="rounded-lg border border-slate-600/80 bg-slate-950/40 px-3 py-3 space-y-1">
                            {selectedCustomerHrPayout ? (
                              <>
                                <p className="text-sm font-semibold text-white leading-snug">
                                  {selectedCustomerHrPayout.name}
                                  {selectedCustomerHrPayout.employeeNo
                                    ? ` · ${selectedCustomerHrPayout.employeeNo}`
                                    : ''}
                                </p>
                                <p className="text-xs text-slate-300">
                                  {[
                                    selectedCustomerHrPayout.bankName,
                                    selectedCustomerHrPayout.bankAccountNoMasked,
                                  ]
                                    .filter(Boolean)
                                    .join(' · ')}
                                </p>
                                <p className="text-ui-xs text-emerald-300/90 pt-1">
                                  Uses HR payroll bank (update in HR / My Profile)
                                </p>
                              </>
                            ) : (
                              <>
                                <p className="text-sm font-semibold text-white leading-snug">{form.payeeName}</p>
                                <p className="text-xs text-slate-300">
                                  {[form.payeeBankName, form.payeeAccountNo].filter(Boolean).join(' · ')}
                                </p>
                                {form.customerName ? (
                                  <p className="text-ui-xs text-slate-500 pt-1">
                                    Customer · {form.customerName}
                                  </p>
                                ) : null}
                              </>
                            )}
                          </div>
                          <p className="text-ui-xs text-slate-400 leading-snug">
                            With no split lines below, the full refund goes to this account after approval. Add
                            lines to pay associated staff or quotation sales staff instead — totals must equal the
                            refund amount.
                          </p>
                        </>
                      ) : (
                        <>
                          {overpaymentOnlyRefund ? (
                            <p className="text-ui-xs text-emerald-200/90 leading-snug">
                              Overpayment is the customer&apos;s cash above the quote — route it to{' '}
                              <span className="font-semibold text-white">{form.customerName || 'the quote customer'}</span>{' '}
                              (add bank below). Company cut does not apply to customer overpay; only staff /
                              associated-staff lines use the 20% cut.
                            </p>
                          ) : (
                            <p className="text-ui-xs text-amber-100/90 leading-snug">
                              No customer bank on file. Remainder defaults to the quotation{' '}
                              <span className="font-semibold text-white">Handled by</span> staff (HR bank)
                              {defaultRefundPayee?.name ? (
                                <>
                                  {' '}
                                  — <span className="font-semibold text-white">{defaultRefundPayee.name}</span>
                                </>
                              ) : null}
                              . Transporter/installer from the quote can be selected separately. Not the person
                              filing this refund.
                            </p>
                          )}
                          {defaultRefundPayeeHint && !(defaultRefundPayee?.customerID || defaultRefundPayee?.userId) ? (
                            <p className="text-ui-xs text-rose-200/90 leading-snug">{defaultRefundPayeeHint}</p>
                          ) : null}
                          {!readOnly &&
                          String(form.customerID || '').trim() &&
                          !(selectedRefundCustomer && customerHasBank(selectedRefundCustomer)) ? (
                            <button
                              type="button"
                              onClick={() =>
                                openPayoutBankDraft({
                                  kind: 'customer',
                                  id: String(
                                    selectedRefundCustomer?.customerID || form.customerID || ''
                                  ).trim(),
                                  name:
                                    selectedRefundCustomer?.name ||
                                    form.customerName ||
                                    '',
                                  bankAccountName:
                                    selectedRefundCustomer?.bankAccountName ||
                                    selectedRefundCustomer?.name ||
                                    form.customerName ||
                                    '',
                                  bankName: selectedRefundCustomer?.bankName || '',
                                  bankAccountNo: selectedRefundCustomer?.bankAccountNo || '',
                                  forQuoteCustomer: true,
                                })
                              }
                              className="w-full rounded-lg border border-sky-500/40 bg-sky-500/10 px-3 py-2 text-left text-xs font-semibold text-sky-100 hover:bg-sky-500/20"
                            >
                              Add bank for quote customer ({form.customerName || 'customer'})
                            </button>
                          ) : null}
                        </>
                      )}

                      <div className="space-y-3">
                          {(Array.isArray(form.refundSplits) ? form.refundSplits : []).map((row, idx) => {
                            const isStaff = String(row.recipientKind || '') === 'associated_staff';
                            const selectedKey = payoutRowSelectValue(row);
                            const selectedOpt = payoutRecipientOptions.find(
                              (o) => o.key === selectedKey
                            );
                            return (
                              <div
                                key={`alloc-${idx}`}
                                className="rounded-lg border border-slate-600/80 bg-slate-950/40 p-3 space-y-2"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                    {row.note || (isStaff ? 'Associated staff' : 'Quotation sales staff')}
                                  </p>
                                  <button
                                    type="button"
                                    disabled={readOnly}
                                    onClick={() =>
                                      setForm((f) => ({
                                        ...f,
                                        refundSplits: (Array.isArray(f.refundSplits) ? f.refundSplits : [])
                                          .filter((_, i) => i !== idx)
                                          .map((r) => ({ ...r, _manual: '1' })),
                                      }))
                                    }
                                    className="text-[10px] font-semibold text-rose-300 hover:text-rose-200 disabled:opacity-50"
                                  >
                                    Remove
                                  </button>
                                </div>
                                <RefundPayoutRecipientPicker
                                  disabled={readOnly}
                                  loading={payoutDirectoryLoading}
                                  value={selectedKey}
                                  options={payoutRecipientOptions}
                                  placeholder="Search quotation staff, driver, installer, or customer…"
                                  emptyHint={
                                    payoutAssociatedStaffError
                                      ? payoutAssociatedStaffError
                                      : payoutRecipientOptions.length === 0
                                        ? 'No payout recipients loaded yet. Associated staff and branch staff appear when directories load.'
                                        : 'No payout recipients match that search.'
                                  }
                                  onChange={(key, opt) => {
                                    if (!key) {
                                      setForm((f) => ({
                                        ...f,
                                        refundSplits: (Array.isArray(f.refundSplits) ? f.refundSplits : []).map(
                                          (x, i) =>
                                            i === idx
                                              ? {
                                                  ...x,
                                                  _manual: '1',
                                                  recipientAssociatedStaffID: '',
                                                  recipientCustomerID: '',
                                                  recipientUserId: '',
                                                }
                                              : x
                                        ),
                                      }));
                                      return;
                                    }
                                    const parsed = parsePayoutSelectValue(key);
                                    const needsBank = Boolean(opt?.needsBank);
                                    const needsLink =
                                      Boolean(opt?.meta?.needsSalesCustomer) ||
                                      Boolean(parsed.recipientUserId);
                                    const applySplit = (patch) => {
                                      setForm((f) => ({
                                        ...f,
                                        refundSplits: (Array.isArray(f.refundSplits) ? f.refundSplits : []).map(
                                          (x, i) =>
                                            i === idx
                                              ? {
                                                  ...x,
                                                  _manual: '1',
                                                  recipientKind: parsed.recipientKind || 'customer',
                                                  recipientAssociatedStaffID: parsed.recipientAssociatedStaffID,
                                                  recipientCustomerID: parsed.recipientCustomerID,
                                                  recipientUserId: parsed.recipientUserId || '',
                                                  ...patch,
                                                }
                                              : x
                                        ),
                                      }));
                                    };
                                    applySplit({});
                                    if (needsLink && opt?.meta?.userId) {
                                      void (async () => {
                                        const { ok, data } = await apiFetch(
                                          '/api/refunds/claiming-staff/ensure',
                                          {
                                            method: 'POST',
                                            body: JSON.stringify({ userId: opt.meta.userId }),
                                          }
                                        );
                                        if (!ok || !data?.payee?.customerID) {
                                          showToast(
                                            String(
                                              data?.error ||
                                                'Could not link this staff login for payout.'
                                            ),
                                            { variant: 'error' }
                                          );
                                          return;
                                        }
                                        const payee = data.payee;
                                        setClaimingStaffRows((rows) => {
                                          const uid = String(payee.userId || opt.meta.userId).trim();
                                          const next = Array.isArray(rows) ? [...rows] : [];
                                          const i = next.findIndex(
                                            (r) =>
                                              String(r.userId || '').trim() === uid ||
                                              String(r.customerID || '').trim() ===
                                                String(payee.customerID).trim()
                                          );
                                          if (i >= 0) next[i] = { ...next[i], ...payee, needsSalesCustomer: false };
                                          else next.push({ ...payee, needsSalesCustomer: false });
                                          return next;
                                        });
                                        if (defaultRefundPayee?.userId === opt.meta.userId) {
                                          setDefaultRefundPayee(payee);
                                        }
                                        applySplit({
                                          recipientCustomerID: String(payee.customerID),
                                          recipientUserId: '',
                                        });
                                        if (!payee.hasBank) {
                                          openPayoutBankDraft({
                                            kind: 'customer',
                                            id: payee.customerID,
                                            name: payee.name,
                                            bankAccountName: payee.name || '',
                                            bankName: payee.bankName || '',
                                            bankAccountNo: '',
                                            splitIdx: idx,
                                          });
                                        }
                                      })();
                                      return;
                                    }
                                    if (needsBank && opt?.meta) {
                                      openPayoutBankDraft({
                                        ...opt.meta,
                                        splitIdx: idx,
                                      });
                                    }
                                  }}
                                />
                                {!readOnly && selectedOpt?.needsBank ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openPayoutBankDraft({
                                        ...(selectedOpt.meta || {}),
                                        splitIdx: idx,
                                      })
                                    }
                                    className="text-[10px] font-semibold text-amber-200 hover:text-amber-100"
                                  >
                                    Add account number for this recipient
                                  </button>
                                ) : null}
                                <input
                                  type="number"
                                  disabled={readOnly}
                                  value={row.amountNgn ?? ''}
                                  onChange={(e) =>
                                    setForm((f) => ({
                                      ...f,
                                      refundSplits: (Array.isArray(f.refundSplits) ? f.refundSplits : []).map(
                                        (x, i) =>
                                          i === idx
                                            ? { ...x, _manual: '1', amountNgn: e.target.value }
                                            : x
                                      ),
                                    }))
                                  }
                                  placeholder="Amount ₦"
                                  className="w-full bg-slate-800 border border-slate-600 rounded-lg py-2 px-2 text-xs text-white tabular-nums"
                                />
                                {mayWaiveStaffAllocationCut && mode === 'create' && !readOnly ? (
                                  <div className="space-y-1.5 rounded-lg border border-violet-500/30 bg-violet-950/30 px-2 py-1.5">
                                    <label className="flex items-start gap-2 text-[10px] text-violet-100 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        className="mt-0.5 accent-violet-500"
                                        checked={Boolean(row.companyCutWaived)}
                                        onChange={(e) =>
                                          setForm((f) => ({
                                            ...f,
                                            refundSplits: (Array.isArray(f.refundSplits)
                                              ? f.refundSplits
                                              : []
                                            ).map((x, i) =>
                                              i === idx
                                                ? {
                                                    ...x,
                                                    _manual: '1',
                                                    companyCutWaived: e.target.checked,
                                                    companyCutWaiverNote: e.target.checked
                                                      ? x.companyCutWaiverNote || ''
                                                      : '',
                                                  }
                                                : x
                                            ),
                                          }))
                                        }
                                      />
                                      <span>
                                        Waive company cut for this {isStaff ? 'transporter/installer' : 'claiming staff'}{' '}
                                        (Admin/MD only)
                                      </span>
                                    </label>
                                    {row.companyCutWaived ? (
                                      <input
                                        type="text"
                                        value={row.companyCutWaiverNote || ''}
                                        onChange={(e) =>
                                          setForm((f) => ({
                                            ...f,
                                            refundSplits: (Array.isArray(f.refundSplits)
                                              ? f.refundSplits
                                              : []
                                            ).map((x, i) =>
                                              i === idx
                                                ? {
                                                    ...x,
                                                    _manual: '1',
                                                    companyCutWaiverNote: e.target.value,
                                                  }
                                                : x
                                            ),
                                          }))
                                        }
                                        placeholder="Waiver reason (required, min 8 characters)"
                                        className="w-full bg-slate-900 border border-violet-500/40 rounded-md py-1.5 px-2 text-[10px] text-white"
                                      />
                                    ) : null}
                                  </div>
                                ) : null}
                                {(() => {
                                  const isQuoteCustomerRow =
                                    !isStaff &&
                                    String(row.recipientCustomerID || '').trim() ===
                                      String(form.customerID || '').trim();
                                  const ded = applyRefundStaffAllocationDeduction(
                                    {
                                      ...row,
                                      amountNgn: roundMoneyLocal(row.amountNgn),
                                    },
                                    form.customerID,
                                    {
                                      deductionRate: staffAllocationDeductionRate,
                                      unclearedReceiptHoldNgn: unclearedFloatByClaimingCustomerId.get(
                                        String(row.recipientCustomerID || '').trim()
                                      ),
                                      overpaymentOnly: overpaymentOnlyRefund,
                                    }
                                  );
                                  if (isQuoteCustomerRow) {
                                    return (
                                      <p className="text-[10px] leading-snug text-emerald-200/90">
                                        Customer overpayment — full ₦
                                        {(Number(ded.grossNgn) || 0).toLocaleString('en-NG')} to quote customer (no
                                        company cut).
                                      </p>
                                    );
                                  }
                                  if (
                                    !(ded.companyDeductionNgn > 0) &&
                                    !(ded.unclearedReceiptHoldNgn > 0) &&
                                    !ded.companyCutWaived
                                  ) {
                                    return null;
                                  }
                                  const cutPct = Math.round((ded.deductionRate || 0) * 100);
                                  return (
                                    <p className="text-[10px] leading-snug text-amber-200/90">
                                      Gross ₦{(Number(ded.grossNgn) || 0).toLocaleString('en-NG')}
                                      {ded.companyCutWaived
                                        ? ' · Company cut waived (Admin/MD)'
                                        : ded.companyDeductionNgn > 0
                                          ? ` · Company ${cutPct}% −₦${(Number(ded.companyDeductionNgn) || 0).toLocaleString('en-NG')}`
                                          : ''}
                                      {ded.unclearedReceiptHoldNgn > 0
                                        ? ` · ₦${(Number(ded.unclearedReceiptHoldNgn) || 0).toLocaleString('en-NG')} uncleared receipts pending`
                                        : ''}
                                      {ded.payoutHeldForUnclearedReceipts
                                        ? overpaymentOnlyRefund
                                          ? ' · Till payout held — fund available for cashier referral/confirmation (even before production)'
                                          : ' · Payout held until receipts cleared or manually applied'
                                        : ` · Pay staff ₦${(Number(ded.netPayoutNgn) || 0).toLocaleString('en-NG')}`}
                                    </p>
                                  );
                                })()}
                              </div>
                            );
                          })}
                          {(() => {
                            const splitRows = Array.isArray(form.refundSplits) ? form.refundSplits : [];
                            if (!splitRows.length) return null;
                            const enriched = splitRows.map((r) =>
                              applyRefundStaffAllocationDeduction(
                                { ...r, amountNgn: roundMoneyLocal(r.amountNgn) },
                                form.customerID,
                                {
                                  deductionRate: staffAllocationDeductionRate,
                                  unclearedReceiptHoldNgn: unclearedFloatByClaimingCustomerId.get(
                                    String(r.recipientCustomerID || '').trim()
                                  ),
                                  overpaymentOnly: overpaymentOnlyRefund,
                                }
                              )
                            );
                            const companyCut = sumRefundStaffCompanyDeductionNgn(enriched);
                            const unclearedHold = enriched.reduce(
                              (sum, row) => sum + (Number(row.unclearedReceiptHoldNgn) || 0),
                              0
                            );
                            const netPay = sumRefundStaffNetPayoutNgn(enriched);
                            const cutPct = Math.round(staffAllocationDeductionRate * 100);
                            if (companyCut <= 0 && unclearedHold <= 0) return null;
                            return (
                              <p className="text-[10px] text-amber-100/90 rounded-lg border border-amber-500/30 bg-amber-950/40 px-2.5 py-1.5">
                                {companyCut > 0
                                  ? `Company cut ${cutPct}%: −₦${companyCut.toLocaleString('en-NG')}. `
                                  : ''}
                                {unclearedHold > 0
                                  ? overpaymentOnlyRefund
                                    ? `Uncleared receipts ₦${unclearedHold.toLocaleString('en-NG')} on file — till payout held; fund available for cashier referral/confirmation (even before production). `
                                    : `Uncleared receipts ₦${unclearedHold.toLocaleString('en-NG')} pending — till payout held until cleared. `
                                  : ''}
                                Finance pays net ₦{netPay.toLocaleString('en-NG')} via Staff / partner refund
                                payouts after approval.
                              </p>
                            );
                          })()}
                          {!readOnly ? (
                            <div className="flex flex-wrap gap-2">
                              {String(form.customerID || '').trim() ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setForm((f) => ({
                                      ...f,
                                      refundSplits: [
                                        ...(Array.isArray(f.refundSplits) ? f.refundSplits : []),
                                        {
                                          _manual: '1',
                                          recipientKind: 'customer',
                                          recipientAssociatedStaffID: '',
                                          recipientCustomerID: String(f.customerID || '').trim(),
                                          amountNgn: '',
                                          note: 'Overpayment · quote customer',
                                        },
                                      ],
                                    }))
                                  }
                                  className="text-ui-xs font-semibold text-violet-300 hover:text-violet-200"
                                >
                                  + Quote customer
                                </button>
                              ) : null}
                              <button
                                type="button"
                                onClick={() =>
                                  setForm((f) => ({
                                    ...f,
                                    refundSplits: [
                                      ...(Array.isArray(f.refundSplits) ? f.refundSplits : []),
                                      {
                                        _manual: '1',
                                        recipientKind: 'associated_staff',
                                        recipientAssociatedStaffID: '',
                                        recipientCustomerID: '',
                                        amountNgn: '',
                                        note: 'Associated staff',
                                      },
                                    ],
                                  }))
                                }
                                className="text-ui-xs font-semibold text-emerald-300 hover:text-emerald-200"
                              >
                                + Associated staff
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setForm((f) => ({
                                    ...f,
                                    refundSplits: [
                                      ...(Array.isArray(f.refundSplits) ? f.refundSplits : []),
                                      {
                                        _manual: '1',
                                        recipientKind: 'customer',
                                        recipientAssociatedStaffID: '',
                                        recipientCustomerID: '',
                                        amountNgn: '',
                                        note: 'Quotation sales staff',
                                      },
                                    ],
                                  }))
                                }
                                className="text-ui-xs font-semibold text-sky-300 hover:text-sky-200"
                              >
                                + Quotation sales staff
                              </button>
                            </div>
                          ) : null}
                          {!payoutRecipientsAvailable ? (
                            <p className="text-ui-xs text-amber-200/80 leading-snug">
                              {payoutDirectoryLoading
                                ? 'Loading payout recipients…'
                                : 'No recipients linked on this quotation yet. Handled-by staff, transporter/installer assignees, and the quote customer appear here when the quotation is selected.'}
                            </p>
                          ) : (
                            <p className="text-ui-xs text-slate-400 leading-snug">
                              {defaultRefundPayee?.name
                                ? `Default: ${defaultRefundPayee.name} (quotation handled by)`
                                : 'Default: quotation handled-by staff when linked in HR'}
                              {` · ${payoutRecipientOptions.length} payee${
                                payoutRecipientOptions.length === 1 ? '' : 's'
                              } from this quotation only.`}
                            </p>
                          )}
                          {payoutAssociatedStaffError ? (
                            <p className="text-ui-xs text-rose-300/90 leading-snug">{payoutAssociatedStaffError}</p>
                          ) : null}
                          {claimingStaffError ? (
                            <p className="text-ui-xs text-rose-300/90 leading-snug">{claimingStaffError}</p>
                          ) : null}
                          {partnerWalletPolicyEnabled ? (
                            <p className="text-ui-xs text-slate-400 leading-snug">
                              After BM approval each allocation credits that partner’s wallet for cashier
                              release.
                            </p>
                          ) : null}
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
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Audit & Controls</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-2">
                    <div className="space-y-1">
                      <p className="font-bold text-slate-400 uppercase text-ui-xs">Requested By</p>
                      <p className="font-bold text-slate-900">{record?.requestedBy || 'System'}</p>
                    </div>
                    <div className="space-y-1 sm:text-right">
                      <p className="font-bold text-slate-400 uppercase text-ui-xs">Date</p>
                      <p className="font-bold text-slate-900 text-xs">{record?.requestedAtISO ? new Date(record.requestedAtISO).toLocaleDateString() : '—'}</p>
                    </div>
                  </div>

                  {showApproval && (
                    <div className="pt-4 border-t border-slate-100 space-y-4">
                      {!canApproveRefunds || ws?.canMutate === false || refundBlockedByMdPricing ? (
                        <ZareApprovalHint
                          context={{
                            referenceNo: record?.refundID,
                            documentType: 'refund_request',
                            status: record?.status,
                            canApprove: canApproveRefunds && ws?.canMutate !== false && !refundBlockedByMdPricing,
                            canMutate: ws?.canMutate !== false,
                            missingPermission: !canApproveRefunds
                              ? 'Refund approval requires refunds.approve or finance.approve.'
                              : refundBlockedByMdPricing
                                ? 'Managing Director must confirm below-floor pricing after production before this refund can be approved.'
                                : undefined,
                            zareQuery: `Why can't I approve refund ${record?.refundID || ''}?`,
                          }}
                        />
                      ) : null}
                      <div
                        className="rounded-xl border border-amber-200/80 bg-amber-50/90 p-3 space-y-2"
                        role="region"
                        aria-label="Approver verification checklist"
                      >
                        <p className="text-ui-xs font-bold text-amber-900 uppercase tracking-wide">Before you approve</p>
                        <ul className="text-ui-xs text-amber-950/90 font-medium space-y-1.5 list-disc list-inside leading-snug">
                          <li>Quote total and paid amount match money in.</li>
                          <li>Production and delivery fit the refund story.</li>
                          <li>Line total matches the approved amount.</li>
                        </ul>
                      </div>
                      <div>
                        <label className={label}>Decision</label>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <button
                            type="button"
                            onClick={() => setApprovalStatus('Approved')}
                            className={`px-4 py-2 rounded-xl text-ui-xs font-bold uppercase transition-all ${approvalStatus === 'Approved' ? 'bg-teal-500 text-white shadow-xl shadow-teal-100' : 'bg-slate-100 text-slate-500'}`}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => setApprovalStatus('Rejected')}
                            className={`px-4 py-2 rounded-xl text-ui-xs font-bold uppercase transition-all ${approvalStatus === 'Rejected' ? 'bg-rose-500 text-white shadow-xl shadow-rose-100' : 'bg-slate-100 text-slate-500'}`}
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
                            className={`${input} font-black text-zarewa-teal text-sm h-11`}
                          />
                          {approvalMoneyContext ? (
                            <p className="mt-2 text-ui-xs font-medium text-slate-600 leading-snug">
                              Requested: ₦{approvalMoneyContext.requested.toLocaleString('en-NG')} · Paid on quotation:
                              ₦{approvalMoneyContext.paidNgn.toLocaleString('en-NG')}
                              {Math.round(Number(record?.creditAppliedNgn) || 0) > 0
                                ? ` · Refund fund used: ₦${Math.round(Number(record.creditAppliedNgn)).toLocaleString('en-NG')}${
                                    record.creditAppliedToQuotationRef
                                      ? ` on ${record.creditAppliedToQuotationRef}`
                                      : ''
                                  } · Leftover to approve: ₦${Math.max(
                                    0,
                                    Math.round(Number(record.amountNgn) || 0) -
                                      Math.round(Number(record.creditAppliedNgn) || 0)
                                  ).toLocaleString('en-NG')}`
                                : ''}
                              {approvalMoneyContext.paidRefundsNgn > 0
                                ? ` · Refunds already paid: ₦${approvalMoneyContext.paidRefundsNgn.toLocaleString('en-NG')}`
                                : ''}{' '}
                              · Other open refunds (reserved): ₦
                              {approvalMoneyContext.sumOthers.toLocaleString('en-NG')} · Approvable cap: ₦
                              {approvalMoneyContext.maxApprovable.toLocaleString('en-NG')}
                            </p>
                          ) : null}
                          {approvalWillScaleLines ? (
                            <p className="mt-2 text-ui-xs font-semibold text-teal-800 leading-snug">
                              Breakdown still matches the original request total — line amounts will scale proportionally to
                              the approved amount when you submit.
                            </p>
                          ) : null}
                          {approvalSumMismatch ? (
                            <p className="mt-2 text-ui-xs font-semibold text-rose-700 leading-snug" role="alert">
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

          {mode === 'create' && multiCategoryOverlapContext ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 space-y-1">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-700 shrink-0" />
                <p className="text-xs font-black text-amber-950">Multi-category overlap on quotation</p>
              </div>
              <p className="text-xs text-amber-950 leading-snug">
                {multiCategoryOverlapContext.sameRequestOverpayAndCancel
                  ? 'This request combines Overpayment with Order cancellation — these double-count cash received. Remove one category before submitting.'
                  : multiCategoryOverlapContext.priorLabels.length
                    ? `Prior refund(s) on this quote: ${multiCategoryOverlapContext.priorLabels.map(refundCategoryDisplayLabel).join(', ')}. `
                    : ''}
                {!multiCategoryOverlapContext.sameRequestOverpayAndCancel
                  ? `This request: ${multiCategoryOverlapContext.currentLabels.map(refundCategoryDisplayLabel).join(', ') || '—'}. Overpayment must not be double-counted with Order cancellation on the same quotation — resolve or reject the prior refund first.`
                  : null}
              </p>
            </div>
          ) : null}

          {/* Merged attention: production alignment + preview warnings (deduped, collapsed unless action needed) */}
          {(mode === 'create' || showApproval) && refundAttentionItems.length > 0 ? (
            <div
              className={`rounded-xl border p-3 ${
                alignmentBlocksAction
                  ? 'border-rose-200 bg-rose-50/70'
                  : 'border-amber-200/80 bg-amber-50/60'
              }`}
            >
              <button
                type="button"
                className="flex w-full items-center gap-2 text-left"
                aria-expanded={refundAttentionOpen}
                onClick={() => setRefundAttentionOpen((o) => !o)}
              >
                <AlertTriangle
                  size={16}
                  className={`shrink-0 ${alignmentBlocksAction ? 'text-rose-700' : 'text-amber-700'}`}
                  aria-hidden
                />
                <span
                  className={`text-xs font-bold flex-1 ${
                    alignmentBlocksAction ? 'text-rose-950' : 'text-amber-950'
                  }`}
                >
                  Attention
                  <span className="font-semibold text-slate-600">
                    {' '}
                    · {refundAttentionItems.length} note
                    {refundAttentionItems.length === 1 ? '' : 's'}
                    {alignmentCheckLoading ? ' · checking…' : ''}
                    {alignmentBlocksAction ? ' · action required' : ''}
                  </span>
                </span>
                <ChevronDown
                  size={16}
                  className={`shrink-0 text-slate-400 transition-transform ${
                    refundAttentionOpen ? 'rotate-180' : ''
                  }`}
                  aria-hidden
                />
              </button>

              {refundAttentionOpen ? (
                <div className="mt-3 space-y-2.5 border-t border-amber-200/60 pt-3">
                  <ul className="space-y-2">
                    {refundAttentionItems.map((item) => (
                      <li key={item.key} className="text-xs text-amber-950 leading-snug">
                        {item.title ? (
                          <>
                            <span className="font-bold">{item.title}</span>
                            {item.message ? ` — ${item.message}` : null}
                          </>
                        ) : (
                          item.message
                        )}
                        {item.submitAction === 'acknowledge' && item.issue?.code ? (
                          <label className="mt-1 flex items-start gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(productionAlignmentAck[item.issue.code])}
                              onChange={(e) =>
                                setProductionAlignmentAck((prev) => ({
                                  ...prev,
                                  [item.issue.code]: e.target.checked,
                                }))
                              }
                              className="mt-0.5"
                            />
                            <span className="text-ui-xs font-semibold">I acknowledge this</span>
                          </label>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                  {((refundAmountExceedsEconomicFloorCap({
                    amountNgn: Math.round(Number(form.amountNgn) || 0),
                    calculationLines: form.calculationLines,
                    categories: deriveReasonCategoriesFromLines(form.calculationLines),
                    maxDefensibleRefundNgn: lastPreviewSnapshot?.economicFloor?.maxDefensibleRefundNgn,
                    overpaymentExcessNgn: moneyContext?.overpaymentExcessNgn,
                    toleranceNgn: AMOUNT_LINE_TOL,
                  }) &&
                    (String(ws?.session?.user?.roleKey || '')
                      .trim()
                      .toLowerCase() === 'admin' ||
                      isExecutiveRoleKey(ws?.session?.user?.roleKey))) ||
                    (productionAlignmentIssues.some((i) => i.submitAction === 'block') &&
                      canOverrideProductionAlignment)) ? (
                    <label className="block">
                      <span className="text-ui-xs font-bold uppercase text-amber-900">
                        Override note (min 10 characters)
                      </span>
                      <textarea
                        rows={2}
                        value={productionAlignmentOverrideNote}
                        onChange={(e) => setProductionAlignmentOverrideNote(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs text-slate-800 resize-none"
                        placeholder="Why this amount is correct…"
                      />
                    </label>
                  ) : null}
                  {alignmentBlocksAction ? (
                    <p className="text-ui-xs font-semibold text-rose-800" role="alert">
                      Resolve the items above before {showApproval ? 'approving' : 'submitting'}.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
            </>
          )}
        </form>

        {/* Footer Actions */}
        <div className="px-6 py-5 border-t border-slate-200/60 bg-white rounded-b-2xl flex justify-end items-center shrink-0">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={saving}
              className="px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide text-slate-500 hover:bg-slate-100 transition-all active:scale-95"
            >
              Cancel
            </button>
            {!readOnly && (mode === 'create' || (showApproval && approvalEditMode)) && (
              <button
                type="submit"
                disabled={
                  saving ||
                  alignmentBlocksAction ||
                  (mode === 'create' && !form.quotationRef) ||
                  (mode === 'create' && exceedsRefundableHeadroom) ||
                  (mode === 'create' && selectedQuotationRefundsBlocked.blocked) ||
                  (mode === 'create' && Boolean(openProductionJob?.jobId)) ||
                  (mode === 'create' && createPath === 'quick' && lineSum <= 0 && Boolean(form.quotationRef))
                }
                onClick={handleFormSubmit}
                className="group bg-rose-600 text-white px-8 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest shadow-xl shadow-rose-200 hover:brightness-105 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:grayscale disabled:scale-100"
              >
                {saving ? (
                  <RotateCcw size={16} className="animate-spin" />
                ) : (
                  <Save size={16} className="group-hover:scale-110 transition-transform" />
                )}
                {showApproval ? 'Save Decision' : 'Submit refund'}
              </button>
            )}
          </div>
        </div>
      </div>
    </ModalFrame>
    <RefundPayoutBankForm
      open={Boolean(payoutBankDraft)}
      title={
        payoutBankDraft?.kind === 'associated_staff'
          ? 'Add associated staff bank'
          : payoutBankDraft?.forQuoteCustomer
            ? 'Add customer bank'
            : 'Add payout bank'
      }
      subtitle={
        payoutBankDraft?.name
          ? `Save account details for ${payoutBankDraft.name}. They will be used for this refund payout.`
          : 'Save account details for this recipient.'
      }
      initial={{
        bankAccountName: payoutBankDraft?.bankAccountName || '',
        bankName: payoutBankDraft?.bankName || '',
        bankAccountNo: payoutBankDraft?.bankAccountNo || '',
      }}
      saving={payoutBankSaving}
      error={payoutBankError}
      onClose={() => {
        if (payoutBankSaving) return;
        setPayoutBankDraft(null);
        setPayoutBankError('');
      }}
      onSave={savePayoutBankDraft}
    />
  </>
  );
};

export default RefundModal;
