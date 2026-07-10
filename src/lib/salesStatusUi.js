/** Shared sales status chip styling — used by Sales desk and customer views. */

export const SALES_STATUS_CHIP =
  'inline-flex items-center text-ui-xs font-semibold uppercase tracking-wide px-2 py-1 rounded-md border shrink-0';

export function quotePayChipClass(ps) {
  if (ps === 'Paid') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  if (ps === 'Partial') return 'border-amber-200 bg-amber-50 text-amber-800';
  return 'border-slate-200 bg-slate-50 text-slate-600';
}

export function quoteApprovalChipClass(st) {
  if (st === 'Approved') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  if (st === 'Expired') return 'border-slate-300 bg-slate-100 text-slate-700';
  if (st === 'Void') return 'border-rose-200 bg-rose-50 text-rose-800';
  return 'border-amber-200 bg-amber-50 text-amber-800';
}

/** Quotation lifecycle stage for pipeline UI */
export function quotationPipelineStage(status, payStatus) {
  const st = String(status || '').trim();
  if (st === 'Void' || st === 'Expired') return { stage: st, tone: 'muted' };
  if (st !== 'Approved') return { stage: 'Pending approval', tone: 'warn' };
  if (payStatus === 'Paid') return { stage: 'Paid', tone: 'success' };
  if (payStatus === 'Partial') return { stage: 'Partially paid', tone: 'warn' };
  return { stage: 'Approved · awaiting payment', tone: 'info' };
}

export function receiptSourceChipClass(src) {
  if (src === 'ledger') return 'border-emerald-200 bg-emerald-50 text-emerald-900';
  return 'border-slate-200 bg-slate-50 text-slate-600';
}

export function receiptCuttingListChipClass(kind) {
  if (kind === 'linked') return 'border-teal-200 bg-teal-50 text-teal-900';
  if (kind === 'none') return 'border-amber-200 bg-amber-50 text-amber-900';
  return 'border-slate-200 bg-slate-50 text-slate-500';
}

export function refundStatusChipClass(st) {
  if (st === 'Paid') return 'border-sky-200 bg-sky-50 text-sky-900';
  if (st === 'Approved') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  if (st === 'Rejected') return 'border-rose-200 bg-rose-50 text-rose-800';
  if (st === 'Cancelled') return 'border-slate-300 bg-slate-100 text-slate-700';
  return 'border-amber-200 bg-amber-50 text-amber-800';
}
