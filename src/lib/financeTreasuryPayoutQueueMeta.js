import { formatNgn } from '../Data/mockData';
import { refundApprovedAmount, refundOutstandingAmount } from './refundsStore';
import { registerSettlementOutstandingNgn } from './registerSettlementPay';
import { effectiveOutstandingNgn } from './paymentOutstandingTolerance.js';
import {
  looksLikeMaintenanceWorkOrderRef,
  maintenanceCostKindLabel,
} from '../shared/lib/maintenanceCostEnvelope.js';

/** @param {unknown} value @returns {string} */
export function formatPayoutQueueDate(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const day = raw.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}/.test(day) ? day : raw;
}

/** @param {object} req */
export function paymentRequestOutstandingNgn(req) {
  const paid = Number(req?.paidAmountNgn) || 0;
  return effectiveOutstandingNgn(Number(req?.amountRequestedNgn) || 0, paid);
}

/** @param {object} r @param {Record<string, string>} [branchNameById] */
export function refundPayoutMetaLine(r, branchNameById = {}) {
  const branchId = String(r?.branchId || '').trim();
  const requested = formatPayoutQueueDate(r?.requestedAtISO || r?.requested_at_iso);
  const approved = formatPayoutQueueDate(r?.approvalDate || r?.approvedAtISO);
  const applied = Math.round(Number(r?.creditAppliedNgn) || 0);
  const dest = String(r?.creditAppliedToQuotationRef || '').trim();
  return [
    r?.quotationRef ? `Quote ${r.quotationRef}` : 'No quote ref',
    requested ? `Requested ${requested}` : null,
    approved ? `Approved ${approved}` : null,
    r?.approvedBy ? `Approved by ${r.approvedBy}` : null,
    `Aprv ${formatNgn(refundApprovedAmount(r))} · Paid ${formatNgn(Number(r?.paidAmountNgn) || 0)}`,
    applied > 0
      ? dest
        ? `Applied ${formatNgn(applied)} to ${dest}`
        : `Applied ${formatNgn(applied)} to a receipt`
      : null,
    branchId ? branchNameById[branchId] || branchId : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

/** @param {object} req @param {Record<string, string>} [branchNameById] */
export function paymentRequestPayoutMetaLine(req, branchNameById = {}) {
  const paidAmountNgn = Number(req?.paidAmountNgn) || 0;
  const branchId = String(req?.branchId || '').trim();
  const requested = formatPayoutQueueDate(req?.requestDate);
  const approved = formatPayoutQueueDate(req?.approvedAtISO);
  const woId = String(req?.maintenanceWorkOrderId || '').trim();
  const ref = String(req?.requestReference || '').trim();
  const workOrderTag = woId || (looksLikeMaintenanceWorkOrderRef(ref) ? ref : '');
  const costKind = String(req?.maintenanceCostKind || '').trim();
  return [
    workOrderTag ? `Work order ${workOrderTag}` : null,
    req?.maintenanceMachineId && !workOrderTag ? `Plant ${req.maintenanceMachineId}` : null,
    costKind ? maintenanceCostKindLabel(costKind) : null,
    requested ? `Requested ${requested}` : null,
    approved ? `Approved ${approved}` : null,
    req?.expenseID ? `Linked ${req.expenseID}` : null,
    req?.expenseCategory || null,
    !workOrderTag && ref ? `Ref ${ref}` : null,
    branchId ? branchNameById[branchId] || branchId : null,
    paidAmountNgn > 0 ? `Paid ${formatNgn(paidAmountNgn)}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

/** @param {object} s @param {Record<string, string>} [branchNameById] */
export function registerSettlementPayoutMetaLine(s, branchNameById = {}) {
  const branchId = String(s?.branchId || '').trim();
  return [s?.partyName || 'Party', s?.reason || null, branchId ? branchNameById[branchId] || branchId : null]
    .filter(Boolean)
    .join(' · ');
}

/** @param {object} row @param {Record<string, string>} [branchNameById] */
export function poTransportPayoutMetaLine(row, branchNameById = {}) {
  const branchId = String(row?.branchId || '').trim();
  return [
    row?.supplierName ? `Supplier ${row.supplierName}` : null,
    row?.transportReference ? `Ref ${row.transportReference}` : null,
    branchId ? branchNameById[branchId] || branchId : null,
    row?.transportPaidNgn > 0
      ? `Paid ${formatNgn(row.transportPaidNgn)} of ${formatNgn(row.transportAmountNgn)}`
      : row?.transportAmountNgn != null
        ? `Quoted ${formatNgn(row.transportAmountNgn)}`
        : null,
    row?.status || null,
  ]
    .filter(Boolean)
    .join(' · ');
}

export { refundOutstandingAmount, registerSettlementOutstandingNgn };
