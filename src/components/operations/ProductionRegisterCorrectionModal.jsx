import React from 'react';

const COPY = {
  coil: {
    title: 'Save coil correction',
    description:
      'Correct coil, opening/closing kg, or metres on this completed job. The reason is stored in the audit log.',
    placeholder: 'e.g. Closing kg was entered wrong on CL-12 — actual tail was 42 kg not 48 kg.',
    confirm: 'Save correction',
  },
  accessory: {
    title: 'Save accessory correction',
    description: 'Correct accessory quantities issued on this completed job. The reason is audited.',
    placeholder: 'e.g. Ridge caps short-shipped — actual issue was 18 not 22 pieces.',
    confirm: 'Save accessories',
  },
  stoneSf: {
    title: 'Save stone flatsheet correction',
    description: 'Correct stone flatsheet m² on this completed job. The reason is audited.',
    placeholder: 'e.g. Flatsheet m² under-recorded — remeasure showed 12.4 m² not 11.0 m².',
    confirm: 'Save stone flatsheet',
  },
};

/**
 * @param {{
 *   kind: 'coil' | 'accessory' | 'stoneSf';
 *   reason: string;
 *   saving?: boolean;
 *   onReasonChange: (value: string) => void;
 *   onCancel: () => void;
 *   onConfirm: () => void;
 * }} props
 */
export function ProductionRegisterCorrectionModal({
  kind,
  reason,
  saving = false,
  onReasonChange,
  onCancel,
  onConfirm,
}) {
  const copy = COPY[kind] || COPY.coil;
  const minLen = 12;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="prod-correction-title"
    >
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-amber-200 bg-white p-4 shadow-xl sm:p-5">
        <h4 id="prod-correction-title" className="text-base font-bold text-amber-950 sm:text-sm">
          {copy.title}
        </h4>
        <p className="mt-2 text-sm leading-snug text-slate-600 sm:text-xs">{copy.description}</p>
        <label className="mt-3 block text-xs font-bold uppercase tracking-wide text-slate-500 sm:text-ui-xs">
          Reason (≥{minLen} characters)
        </label>
        <textarea
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          rows={4}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-amber-200 sm:text-xs"
          placeholder={copy.placeholder}
          autoFocus
        />
        <div className="mt-3 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="min-h-11 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:min-h-0 sm:px-3 sm:py-1.5 sm:text-xs"
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving || reason.trim().length < minLen}
            onClick={onConfirm}
            className="min-h-11 rounded-md bg-amber-600 px-4 py-2 text-sm font-bold text-white hover:bg-amber-700 disabled:opacity-45 sm:min-h-0 sm:px-3 sm:py-1.5 sm:text-xs"
          >
            {saving ? 'Saving…' : copy.confirm}
          </button>
        </div>
      </div>
    </div>
  );
}
