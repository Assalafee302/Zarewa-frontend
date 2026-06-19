import React from 'react';

/**
 * Mobile-friendly confirm dialog (replaces window.confirm for production register).
 * @param {{
 *   title: string;
 *   message: string;
 *   confirmLabel?: string;
 *   cancelLabel?: string;
 *   tone?: 'amber' | 'rose' | 'sky';
 *   saving?: boolean;
 *   onCancel: () => void;
 *   onConfirm: () => void;
 * }} props
 */
export function ProductionRegisterConfirmModal({
  title,
  message,
  confirmLabel = 'Continue',
  cancelLabel = 'Cancel',
  tone = 'amber',
  saving = false,
  onCancel,
  onConfirm,
}) {
  const border =
    tone === 'rose' ? 'border-rose-200' : tone === 'sky' ? 'border-sky-200' : 'border-amber-200';
  const btn =
    tone === 'rose'
      ? 'bg-rose-700 hover:bg-rose-800'
      : tone === 'sky'
        ? 'bg-sky-700 hover:bg-sky-800'
        : 'bg-amber-600 hover:bg-amber-700';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="prod-confirm-title"
    >
      <div className={`max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border ${border} bg-white p-4 shadow-xl sm:p-5`}>
        <h4 id="prod-confirm-title" className="text-base font-bold text-slate-900 sm:text-sm">
          {title}
        </h4>
        <p className="mt-2 whitespace-pre-line text-sm leading-snug text-slate-600 sm:text-xs">{message}</p>
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="min-h-11 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:min-h-0 sm:px-3 sm:py-1.5 sm:text-xs"
            onClick={onCancel}
            disabled={saving}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={onConfirm}
            className={`min-h-11 rounded-md px-4 py-2 text-sm font-bold text-white disabled:opacity-45 sm:min-h-0 sm:px-3 sm:py-1.5 sm:text-xs ${btn}`}
          >
            {saving ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
