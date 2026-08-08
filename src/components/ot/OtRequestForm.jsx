import React, { useState } from 'react';
import { OT_WORK_TYPES } from '../../lib/otConstants';
import { OtStaffLinesEditor } from './OtStaffLinesEditor';
import { OtPaymentCalcFields } from './OtPaymentCalcFields';
import { OtQuotationPicker, OtPurchaseOrderPicker } from './OtLookups';

/**
 * Ops draft form — create/edit before submit (modal body).
 */
export function OtRequestForm({
  form,
  onChange,
  disabled = false,
  submitError = '',
  onSaveDraft,
  onSubmit,
  onCancel,
  saving = false,
  mode = 'create',
}) {
  const [localErr, setLocalErr] = useState('');
  const set = (partial) => onChange({ ...form, ...partial });

  const validate = (forSubmit) => {
    if (!form.dayIso) return 'Work date is required.';
    if (!form.workType) return 'Work type is required.';
    if (forSubmit && !String(form.reason || '').trim()) return 'Reason is required before submit.';
    const staff = (form.staffLines || []).filter((s) => String(s.staffUserId || '').trim());
    if (!staff.length) return 'Add at least one roster staff line.';
    if (forSubmit && form.workType === 'production' && !String(form.quotationRef || '').trim()) {
      return 'Pick a live quotation for production OT.';
    }
    if (forSubmit && form.workType === 'offload' && !String(form.poId || '').trim()) {
      return 'Pick a live purchase order for offload OT.';
    }
    const qty = Number(form.paymentLine?.quantity);
    const rate = Number(form.paymentLine?.rateRequested);
    if (forSubmit && (!(qty > 0) || !(rate > 0))) {
      return 'Payment quantity and rate requested must be positive.';
    }
    return '';
  };

  const handleSave = async () => {
    const e = validate(false);
    setLocalErr(e);
    if (e) return;
    await onSaveDraft?.();
  };

  const handleSubmit = async () => {
    const e = validate(true);
    setLocalErr(e);
    if (e) return;
    await onSubmit?.();
  };

  const err = localErr || submitError;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="min-w-0">
          <span className="z-field-label text-ui-xs font-bold uppercase text-slate-500">Work date</span>
          <input
            type="date"
            disabled={disabled}
            className="z-input mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm font-semibold"
            value={form.dayIso || ''}
            onChange={(e) => set({ dayIso: e.target.value })}
          />
        </label>
        <label className="min-w-0">
          <span className="z-field-label text-ui-xs font-bold uppercase text-slate-500">Work type</span>
          <select
            disabled={disabled}
            className="z-input mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm font-semibold"
            value={form.workType || 'production'}
            onChange={(e) =>
              set({
                workType: e.target.value,
                quotationRef: e.target.value === 'production' ? form.quotationRef : '',
                poId: e.target.value === 'offload' ? form.poId : '',
              })
            }
          >
            {OT_WORK_TYPES.map((w) => (
              <option key={w.id} value={w.id}>
                {w.label}
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-0 sm:col-span-2">
          <span className="z-field-label text-ui-xs font-bold uppercase text-slate-500">
            Reason / work done
          </span>
          <textarea
            disabled={disabled}
            rows={2}
            className="z-input mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm font-semibold"
            value={form.reason || ''}
            onChange={(e) => set({ reason: e.target.value })}
            placeholder="Why OT was needed and what was done"
          />
        </label>
        <label className="flex items-center gap-2 sm:col-span-2 text-sm font-semibold text-slate-700">
          <input
            type="checkbox"
            disabled={disabled}
            checked={Boolean(form.approvalBeforeStart)}
            onChange={(e) => set({ approvalBeforeStart: e.target.checked })}
            className="rounded border-slate-300 text-zarewa-teal focus:ring-zarewa-teal"
          />
          Pre-approved before work started
        </label>
      </div>

      {form.workType === 'production' ? (
        <OtQuotationPicker
          value={form.quotationRef || ''}
          displayValue={form.quotationRef || ''}
          disabled={disabled}
          onChange={(id) => set({ quotationRef: id })}
        />
      ) : null}
      {form.workType === 'offload' ? (
        <div className="space-y-3">
          <OtPurchaseOrderPicker
            value={form.poId || ''}
            displayValue={form.poId || ''}
            disabled={disabled}
            onChange={(id) => set({ poId: id })}
          />
          <label className="block min-w-0">
            <span className="z-field-label text-ui-xs font-bold uppercase text-slate-500">
              Coil lot (optional)
            </span>
            <input
              type="text"
              disabled={disabled}
              className="z-input mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm font-semibold"
              value={form.coilLotRef || ''}
              onChange={(e) => set({ coilLotRef: e.target.value })}
              placeholder="Coil number if known"
            />
          </label>
        </div>
      ) : null}

      <OtStaffLinesEditor
        staffLines={form.staffLines}
        disabled={disabled}
        onChange={(staffLines) => set({ staffLines })}
      />
      <OtPaymentCalcFields
        value={form.paymentLine}
        disabled={disabled}
        onChange={(paymentLine) => set({ paymentLine })}
        compact
      />

      {err ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-900">
          {err}
        </p>
      ) : null}

      {!disabled ? (
        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          {onCancel ? (
            <button
              type="button"
              disabled={saving}
              onClick={onCancel}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-ui-xs font-bold uppercase tracking-wide text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
          ) : null}
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-ui-xs font-bold uppercase tracking-wide text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {mode === 'edit' ? 'Save draft' : 'Save draft'}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSubmit()}
            className="ml-auto rounded-lg bg-zarewa-teal px-4 py-2 text-ui-xs font-bold uppercase tracking-wide text-white shadow-sm hover:bg-teal-800 disabled:opacity-50"
          >
            {saving ? 'Working…' : 'Submit for BM approval'}
          </button>
        </div>
      ) : null}
    </div>
  );
}
