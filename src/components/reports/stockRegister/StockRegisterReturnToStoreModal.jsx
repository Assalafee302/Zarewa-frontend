import React, { useState } from 'react';
import { AlertCircle, Loader2, RotateCcw, X } from 'lucide-react';
import { ModalFrame } from '../../layout';

/**
 * Dialog for returning the monthly stock register back to store for physical re-count.
 */
export function StockRegisterReturnToStoreModal({
  open,
  onClose,
  branchLabel,
  periodLabel,
  onConfirm,
  submitting = false,
}) {
  const [reason, setReason] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm?.(reason.trim());
  };

  return (
    <ModalFrame
      isOpen={open}
      onClose={onClose}
      surface="plain"
      title="Return Register to Store"
      showCloseButton={false}
    >
      <div className="z-modal-panel flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-rose-200 bg-white shadow-2xl">
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-rose-100 bg-rose-50/60 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
              <RotateCcw size={20} />
            </div>
            <div>
              <p className="text-ui-xs font-black uppercase tracking-wider text-rose-800">
                Floor Re-Count Request
              </p>
              <h2 className="text-base font-bold text-slate-900">
                Return Stock Register to Store
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                {branchLabel} · {periodLabel}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="z-btn-secondary p-2 text-slate-400 hover:text-slate-700"
            aria-label="Close"
            disabled={submitting}
          >
            <X size={18} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto px-5 py-5 space-y-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 flex items-start gap-3">
            <AlertCircle size={18} className="text-amber-700 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-950 leading-relaxed">
              Returning the register to store will reset its stage to <strong>Counting</strong>. The storekeeper
              must verify physical floor counts and submit confirmation again before you can complete BM clearance.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-800">
              Instructions for Storekeeper <span className="text-slate-500 font-normal">(Optional)</span>
            </label>
            <textarea
              className="z-input w-full min-h-[5rem] text-xs leading-relaxed"
              placeholder="e.g. Please re-weigh coils in Bay 2 with the floor crane scale — 0.45mm Aluminium weights do not match system dispatch records."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={submitting}
            />
            <p className="text-[11px] text-slate-500">
              Specify which coils, racks, or accessories require physical re-inspection.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              className="z-btn-secondary text-xs"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-rose-600 hover:bg-rose-700 px-4 py-2 text-xs font-bold text-white shadow-xs inline-flex items-center gap-2 transition disabled:opacity-50"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Returning…
                </>
              ) : (
                <>
                  <RotateCcw size={14} />
                  Return for Re-Count
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </ModalFrame>
  );
}
