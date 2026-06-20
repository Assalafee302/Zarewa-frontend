import {
  isEffectivelyFullyPaid,
  outstandingToleranceNgn,
  rawOutstandingNgn,
} from './paymentOutstandingTolerance.js';

function strictReceivableOutstandingNgn(totalNgn, paidNgn, priorWaivedNgn = 0) {
  const raw = rawOutstandingNgn(totalNgn, paidNgn);
  if (raw <= 0) return 0;
  const waived = Math.min(raw, Math.round(Number(priorWaivedNgn) || 0));
  return Math.max(0, raw - waived);
}

export const MAX_ROUND_OFF_WAIVE_NGN = 5_000;
export const MIN_PAID_FRACTION_FOR_SETTLEMENT_WRITEOFF = 0.95;
export const RECEIVABLE_WRITEOFF_NOTE_MIN_LEN = 20;
export const RECEIVABLE_WRITEOFF_CATEGORIES = ['round_off', 'settlement', 'bad_debt'];

export function roundOffToleranceNgn(totalNgn) {
  return Math.min(outstandingToleranceNgn(totalNgn), MAX_ROUND_OFF_WAIVE_NGN);
}

export function maxRoundOffWaiveNgn(totalNgn, paidNgn, priorWaivedNgn = 0) {
  const receivable = strictReceivableOutstandingNgn(totalNgn, paidNgn, priorWaivedNgn);
  if (receivable <= 0) return 0;
  if (Math.round(Number(paidNgn) || 0) <= 0) return 0;
  if (!isEffectivelyFullyPaid(paidNgn, totalNgn)) return 0;
  return Math.min(receivable, roundOffToleranceNgn(totalNgn));
}

export function registerReceivableOutstandingNgn(totalNgn, paidNgn, priorWaivedNgn = 0) {
  const strict = strictReceivableOutstandingNgn(totalNgn, paidNgn, priorWaivedNgn);
  if (strict <= 0) return 0;
  const paid = Math.round(Number(paidNgn) || 0);
  if (paid > 0 && isEffectivelyFullyPaid(paidNgn, totalNgn) && strict <= roundOffToleranceNgn(totalNgn)) {
    return 0;
  }
  return strict;
}

export function evaluateReceivableWriteOff(totalNgn, paidNgn, priorWaivedNgn = 0) {
  const total = Math.round(Number(totalNgn) || 0);
  const paid = Math.round(Number(paidNgn) || 0);
  const receivable = strictReceivableOutstandingNgn(total, paid, priorWaivedNgn);
  const paidFraction = total > 0 ? paid / total : paid > 0 ? 1 : 0;

  if (receivable <= 0) {
    return { kind: 'none', receivableNgn: 0, waivableNgn: 0, paidFraction, requiresMd: false };
  }

  const roundOffCap = maxRoundOffWaiveNgn(total, paid, priorWaivedNgn);
  if (roundOffCap >= receivable) {
    return {
      kind: 'round_off',
      receivableNgn: receivable,
      waivableNgn: receivable,
      paidFraction,
      requiresMd: false,
      message: 'Small round-off within the 99.5% payment tolerance — Branch Manager may waive.',
    };
  }

  if (paid <= 0) {
    return {
      kind: 'bad_debt_unpaid',
      receivableNgn: receivable,
      waivableNgn: receivable,
      paidFraction: 0,
      requiresMd: true,
      blockReason:
        'No payment on this quotation. Round-off is not allowed — MD must approve a documented bad-debt write-off.',
    };
  }

  if (paidFraction >= MIN_PAID_FRACTION_FOR_SETTLEMENT_WRITEOFF) {
    return {
      kind: 'settlement',
      receivableNgn: receivable,
      waivableNgn: receivable,
      paidFraction,
      requiresMd: true,
      message: 'Negotiated settlement — remaining balance requires MD write-off with reason.',
    };
  }

  return {
    kind: 'bad_debt',
    receivableNgn: receivable,
    waivableNgn: receivable,
    paidFraction,
    requiresMd: true,
    blockReason: `Customer paid ${Math.round(paidFraction * 100)}% — round-off blocked. Collect payment or MD may write off as bad debt with audit reason.`,
  };
}

export function evaluateQuotationReceivableWriteOff(q) {
  const total = Math.round(Number(q?.totalNgn ?? q?.total_ngn) || 0);
  const paid = Math.round(Number(q?.paidNgn ?? q?.paid_ngn) || 0);
  const priorWaived = Math.round(Number(q?.paymentBalanceWaivedNgn ?? q?.payment_balance_waived_ngn) || 0);
  return evaluateReceivableWriteOff(total, paid, priorWaived);
}
