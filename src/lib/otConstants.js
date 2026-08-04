/** Branch OT pay module constants (mirror server/otOps.js). */

export const OT_STATUS = {
  DRAFT: 'draft',
  PENDING_BM: 'pending_bm_approval',
  APPROVED: 'approved_by_bm',
  PAID: 'paid',
  REJECTED: 'rejected_by_bm',
};

export const OT_STATUS_LABELS = {
  [OT_STATUS.DRAFT]: 'Draft',
  [OT_STATUS.PENDING_BM]: 'Pending BM approval',
  [OT_STATUS.APPROVED]: 'Approved — await pay',
  [OT_STATUS.PAID]: 'Paid',
  [OT_STATUS.REJECTED]: 'Rejected',
};

export const OT_WORK_TYPES = [
  { id: 'production', label: 'Production' },
  { id: 'offload', label: 'Offload' },
  { id: 'other', label: 'Other' },
];

export const OT_PAYMENT_CATEGORIES = [
  { id: 'production_ot', label: 'Production OT' },
  { id: 'stone_coated_offload', label: 'Stone-coated offload' },
  { id: 'other', label: 'Other' },
];

export function otStatusChipClass(status) {
  switch (String(status || '')) {
    case OT_STATUS.DRAFT:
      return 'border-slate-200 bg-slate-50 text-slate-700';
    case OT_STATUS.PENDING_BM:
      return 'border-amber-200 bg-amber-50 text-amber-950';
    case OT_STATUS.APPROVED:
      return 'border-sky-200 bg-sky-50 text-sky-950';
    case OT_STATUS.PAID:
      return 'border-emerald-200 bg-emerald-50 text-emerald-950';
    case OT_STATUS.REJECTED:
      return 'border-rose-200 bg-rose-50 text-rose-950';
    default:
      return 'border-slate-200 bg-white text-slate-600';
  }
}

export function emptyOtFormState() {
  const d = new Date();
  const dayIso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return {
    dayIso,
    workType: 'production',
    reason: '',
    quotationRef: '',
    productionJobId: '',
    poId: '',
    coilLotRef: '',
    approvalBeforeStart: true,
    staffLines: [{ staffUserId: '', roleLabel: '', startTime: '18:00', endTime: '22:00' }],
    workDetails: {
      materialType: '',
      workDone: '',
      quantity: '',
      quantityUnit: 'm',
      machineArea: '',
      actualCompletionTime: '',
      factoryLockedBy: '',
    },
    paymentLine: {
      category: 'production_ot',
      quantity: '',
      rateRequested: '',
      remarks: '',
    },
  };
}

/** Build POST/PUT body from form state. */
export function buildOtRequestBody(form) {
  const staffLines = (form.staffLines || [])
    .filter((s) => String(s.staffUserId || '').trim())
    .map((s) => ({
      staffUserId: String(s.staffUserId).trim(),
      roleLabel: String(s.roleLabel || '').trim() || undefined,
      startTime: String(s.startTime || '').trim() || undefined,
      endTime: String(s.endTime || '').trim() || undefined,
    }));
  const paymentLine = {
    category: String(form.paymentLine?.category || 'other'),
    quantity: Number(form.paymentLine?.quantity) || 0,
    rateRequested: Math.round(Number(form.paymentLine?.rateRequested) || 0),
    remarks: String(form.paymentLine?.remarks || '').trim() || undefined,
  };
  const wd = form.workDetails || {};
  return {
    dayIso: form.dayIso,
    workType: form.workType,
    reason: String(form.reason || '').trim(),
    quotationRef: form.workType === 'production' ? String(form.quotationRef || '').trim() || null : null,
    productionJobId:
      form.workType === 'production' ? String(form.productionJobId || '').trim() || null : null,
    poId: form.workType === 'offload' ? String(form.poId || '').trim() || null : null,
    coilLotRef: form.workType === 'offload' ? String(form.coilLotRef || '').trim() || null : null,
    approvalBeforeStart: Boolean(form.approvalBeforeStart),
    staffLines,
    workDetails: {
      materialType: String(wd.materialType || '').trim() || null,
      workDone: String(wd.workDone || '').trim() || null,
      quantity: wd.quantity === '' || wd.quantity == null ? null : Number(wd.quantity),
      quantityUnit: String(wd.quantityUnit || '').trim() || null,
      machineArea: String(wd.machineArea || '').trim() || null,
      actualCompletionTime: String(wd.actualCompletionTime || '').trim() || null,
      factoryLockedBy: String(wd.factoryLockedBy || '').trim() || null,
    },
    paymentLine,
  };
}

/** Hydrate form from GET /api/ot/requests/:id payload. */
export function formStateFromOtDetail(detail) {
  const r = detail?.request || {};
  const empty = emptyOtFormState();
  return {
    ...empty,
    dayIso: r.dayIso || empty.dayIso,
    workType: r.workType || 'production',
    reason: r.reason || '',
    quotationRef: r.quotationRef || '',
    productionJobId: r.productionJobId || '',
    poId: r.poId || '',
    coilLotRef: r.coilLotRef || '',
    approvalBeforeStart: Boolean(r.approvalBeforeStart),
    staffLines:
      Array.isArray(detail?.staffLines) && detail.staffLines.length
        ? detail.staffLines.map((s) => ({
            staffUserId: s.staffUserId || '',
            roleLabel: s.roleLabel || '',
            startTime: s.startTime || '',
            endTime: s.endTime || '',
            displayName: s.displayName || s.username || '',
          }))
        : empty.staffLines,
    workDetails: {
      materialType: detail?.workDetails?.materialType || '',
      workDone: detail?.workDetails?.workDone || '',
      quantity: detail?.workDetails?.quantity ?? '',
      quantityUnit: detail?.workDetails?.quantityUnit || 'm',
      machineArea: detail?.workDetails?.machineArea || '',
      actualCompletionTime: detail?.workDetails?.actualCompletionTime || '',
      factoryLockedBy: detail?.workDetails?.factoryLockedBy || '',
    },
    paymentLine: {
      category: detail?.paymentLine?.category || 'production_ot',
      quantity: detail?.paymentLine?.quantity ?? '',
      rateRequested: detail?.paymentLine?.rateRequested ?? '',
      remarks: detail?.paymentLine?.remarks || '',
    },
  };
}
