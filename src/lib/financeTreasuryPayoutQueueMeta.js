import { formatNgn } from '../Data/mockData';
import { refundApprovedAmount, refundOutstandingAmount } from './refundsStore';
import { registerSettlementOutstandingNgn } from './registerSettlementPay';
import { effectiveOutstandingNgn } from './paymentOutstandingTolerance.js';

/** @param {object} req */
export function paymentRequestOutstandingNgn(req) {
  const paid = Number(req?.paidAmountNgn) || 0;
  return effectiveOutstandingNgn(Number(req?.amountRequestedNgn) || 0, paid);
}

/** @param {object} r @param {Record<string, string>} [branchNameById] */
export function refundPayoutMetaLine(r, branchNameById = {}) {
  const branchId = String(r?.branchId || '').trim();
  return [
    r?.quotationRef ? `Quote ${r.quotationRef}` : 'No quote ref',
    r?.approvedBy ? `Approved by ${r.approvedBy}` : null,
    `Aprv ${formatNgn(refundApprovedAmount(r))} · Paid ${formatNgn(Number(r?.paidAmountNgn) || 0)}`,
    branchId ? branchNameById[branchId] || branchId : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

/** @param {object} req @param {Record<string, string>} [branchNameById] */
export function paymentRequestPayoutMetaLine(req, branchNameById = {}) {
  const paidAmountNgn = Number(req?.paidAmountNgn) || 0;
  const branchId = String(req?.branchId || '').trim();
  return [
    req?.expenseID ? `Linked ${req.expenseID}` : null,
    req?.expenseCategory || null,
    req?.requestReference ? `Ref ${req.requestReference}` : null,
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
