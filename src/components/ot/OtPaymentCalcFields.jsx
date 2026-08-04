import React, { useMemo } from 'react';
import { formatNgn } from '../../Data/mockData';
import { OT_PAYMENT_CATEGORIES } from '../../lib/otConstants';

/**
 * Requested payment calc only (ops). Approved rate / payable set by BM — cashier never sees editable rates.
 */
export function OtPaymentCalcFields({ value = {}, onChange, disabled = false, mode = 'request' }) {
  const v = value || {};
  const set = (key, raw) => onChange({ ...v, [key]: raw });

  const estimated = useMemo(() => {
    const q = Number(v.quantity) || 0;
    const rate = Math.round(Number(v.rateRequested) || 0);
    return Math.round(q * rate);
  }, [v.quantity, v.rateRequested]);

  if (mode === 'readonly') {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 space-y-1">
        <h4 className="text-ui-xs font-bold uppercase tracking-widest text-slate-500">Payment (locked)</h4>
        <p className="text-sm font-semibold text-slate-800">
          {OT_PAYMENT_CATEGORIES.find((c) => c.id === v.category)?.label || v.category || '—'}
        </p>
        <p className="text-xs text-slate-600 tabular-nums">
          Qty {v.quantity ?? '—'} × ₦{Number(v.rateApproved ?? v.rateRequested || 0).toLocaleString()}
        </p>
        {v.amountNgn != null ? (
          <p className="text-base font-black text-zarewa-teal tabular-nums">{formatNgn(v.amountNgn)}</p>
        ) : null}
        {v.varianceReason ? (
          <p className="text-ui-xs text-amber-900">Variance: {v.varianceReason}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="text-ui-xs font-bold uppercase tracking-widest text-zarewa-teal">Payment calculation</h4>
      <p className="text-ui-xs text-slate-500">
        Requested rate only — branch manager may change rate at approval; cashier marks paid on locked total.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="min-w-0 sm:col-span-3">
          <span className="z-field-label text-ui-xs font-bold uppercase text-slate-500">Category</span>
          <select
            disabled={disabled}
            className="z-input mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm font-semibold"
            value={v.category || 'production_ot'}
            onChange={(e) => set('category', e.target.value)}
          >
            {OT_PAYMENT_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-0">
          <span className="z-field-label text-ui-xs font-bold uppercase text-slate-500">Quantity (units)</span>
          <input
            type="number"
            min="0"
            step="any"
            disabled={disabled}
            className="z-input mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm font-semibold tabular-nums"
            value={v.quantity ?? ''}
            onChange={(e) => set('quantity', e.target.value)}
          />
        </label>
        <label className="min-w-0">
          <span className="z-field-label text-ui-xs font-bold uppercase text-slate-500">Rate requested (₦)</span>
          <input
            type="number"
            min="0"
            step="1"
            disabled={disabled}
            className="z-input mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm font-semibold tabular-nums"
            value={v.rateRequested ?? ''}
            onChange={(e) => set('rateRequested', e.target.value)}
          />
        </label>
        <div className="min-w-0 rounded-lg border border-teal-100 bg-teal-50/50 px-2.5 py-2">
          <p className="text-ui-xs font-bold uppercase text-teal-900/70">Est. payable</p>
          <p className="text-lg font-black tabular-nums text-zarewa-teal">{formatNgn(estimated)}</p>
        </div>
        <label className="min-w-0 sm:col-span-3">
          <span className="z-field-label text-ui-xs font-bold uppercase text-slate-500">Remarks</span>
          <input
            type="text"
            disabled={disabled}
            className="z-input mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm font-semibold"
            value={v.remarks || ''}
            onChange={(e) => set('remarks', e.target.value)}
            placeholder="Units explanation (e.g. 4 staff-hours)"
          />
        </label>
      </div>
    </div>
  );
}
