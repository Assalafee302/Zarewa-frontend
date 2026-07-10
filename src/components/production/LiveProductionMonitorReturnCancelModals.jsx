import React from 'react';

export function LiveProductionMonitorReturnModal({
  open,
  reason,
  saving,
  onReasonChange,
  onClose,
  onConfirm,
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[var(--z-layer-modal)] flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="return-to-plan-title"
    >
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-amber-200 bg-white p-4 shadow-xl">
        <h4 id="return-to-plan-title" className="text-sm font-bold text-amber-950">
          Return job to plan?
        </h4>
        <p className="mt-2 text-xs leading-snug text-slate-600">
          This undoes <strong className="font-semibold">Start</strong> only. Coil reservations stay as saved; you can
          then change allocation and save again. Use a clear reason — it is stored in the audit log.
        </p>
        <label className="mt-3 block text-ui-xs font-bold uppercase tracking-wide text-slate-500">
          Reason (≥8 characters)
        </label>
        <textarea
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-amber-200"
          placeholder="e.g. Wrong coil selected — need to swap CL-12 for CL-15 before run."
        />
        <div className="mt-3 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving || reason.trim().length < 8}
            onClick={() => void onConfirm()}
            className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-45"
          >
            {saving ? 'Applying…' : 'Confirm return to plan'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function LiveProductionMonitorCancelModal({
  open,
  reason,
  saving,
  onReasonChange,
  onClose,
  onConfirm,
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[var(--z-layer-modal)] flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-job-title"
    >
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-rose-200 bg-white p-4 shadow-xl">
        <h4 id="cancel-job-title" className="text-sm font-bold text-rose-950">
          Cancel production job?
        </h4>
        <p className="mt-2 text-xs leading-snug text-slate-600">
          This ends the run without posting output:{' '}
          <strong className="font-semibold">coil reservations are released</strong>, allocations are cleared, the job is
          marked <strong className="font-semibold">Cancelled</strong>, and the cutting list returns to{' '}
          <strong className="font-semibold">Waiting</strong>. Use for order cancellations (refunds may reference this
          record).
        </p>
        <label className="mt-3 block text-ui-xs font-bold uppercase tracking-wide text-slate-500">
          Reason (≥8 characters)
        </label>
        <textarea
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-rose-200"
          placeholder="e.g. Customer cancelled order — no production to run."
        />
        <div className="mt-3 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            onClick={onClose}
            disabled={saving}
          >
            Back
          </button>
          <button
            type="button"
            disabled={saving || reason.trim().length < 8}
            onClick={() => void onConfirm()}
            className="rounded-md bg-rose-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-800 disabled:opacity-45"
          >
            {saving ? 'Cancelling…' : 'Confirm cancel'}
          </button>
        </div>
      </div>
    </div>
  );
}
