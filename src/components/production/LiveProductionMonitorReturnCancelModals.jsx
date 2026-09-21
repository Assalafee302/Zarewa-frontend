import React from 'react';

/**
 * @param {{
 *   open: boolean;
 *   reason: string;
 *   saving: boolean;
 *   onReasonChange: (v: string) => void;
 *   onClose: () => void;
 *   onConfirm: () => void | Promise<void>;
 *   intent?: 'default' | 'recall';
 * }} props
 */
export function LiveProductionMonitorReturnModal({
  open,
  reason,
  saving,
  onReasonChange,
  onClose,
  onConfirm,
  intent = 'default',
}) {
  if (!open) return null;

  const isRecall = intent === 'recall';

  return (
    <div
      className="fixed inset-0 z-[var(--z-layer-modal)] flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="return-to-plan-title"
    >
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-amber-200 bg-white p-4 shadow-xl">
        <h4 id="return-to-plan-title" className="text-sm font-bold text-amber-950">
          {isRecall ? 'Recall run & re-enter?' : 'Return job to plan?'}
        </h4>
        <p className="mt-2 text-xs leading-snug text-slate-600">
          {isRecall ? (
            <>
              This undoes <strong className="font-semibold">Start</strong> and returns the job to{' '}
              <strong className="font-semibold">Planned</strong> so you can fix coils / opening kg and start again.
              Coil reservations stay as saved. Enter a clear reason for the audit log.
            </>
          ) : (
            <>
              This undoes <strong className="font-semibold">Start</strong> only. Coil reservations stay as saved; you can
              then change allocation and save again. Use a clear reason — it is stored in the audit log.
            </>
          )}
        </p>
        <label className="mt-3 block text-ui-xs font-bold uppercase tracking-wide text-slate-500">
          Reason (≥8 characters)
        </label>
        <textarea
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-amber-200"
          placeholder={
            isRecall
              ? 'e.g. Wrong coil / metres entered after start — recalling to re-enter correctly.'
              : 'e.g. Wrong coil selected — need to swap CL-12 for CL-15 before run.'
          }
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
            {saving ? 'Applying…' : isRecall ? 'Confirm recall to plan' : 'Confirm return to plan'}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * @param {{
 *   open: boolean;
 *   reason: string;
 *   saving: boolean;
 *   onReasonChange: (v: string) => void;
 *   onClose: () => void;
 *   onConfirm: () => void | Promise<void>;
 *   intent?: 'default' | 'recall';
 * }} props
 */
export function LiveProductionMonitorCancelModal({
  open,
  reason,
  saving,
  onReasonChange,
  onClose,
  onConfirm,
  intent = 'default',
}) {
  if (!open) return null;

  const isRecall = intent === 'recall';

  return (
    <div
      className="fixed inset-0 z-[var(--z-layer-modal)] flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-job-title"
    >
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-rose-200 bg-white p-4 shadow-xl">
        <h4 id="cancel-job-title" className="text-sm font-bold text-rose-950">
          {isRecall ? 'Recall from queue & re-enter?' : 'Cancel production job?'}
        </h4>
        <p className="mt-2 text-xs leading-snug text-slate-600">
          {isRecall ? (
            <>
              This pulls the job off the production queue:{' '}
              <strong className="font-semibold">coil reservations are released</strong>, the job is marked{' '}
              <strong className="font-semibold">Cancelled</strong>, and the cutting list returns to{' '}
              <strong className="font-semibold">Waiting</strong> so Sales can fix lengths if needed, then register again.
              If only coils were wrong (cutting list is fine), close this and edit coils on the Planned job instead.
            </>
          ) : (
            <>
              This ends the run without posting output:{' '}
              <strong className="font-semibold">coil reservations are released</strong>, allocations are cleared, the job is
              marked <strong className="font-semibold">Cancelled</strong>, and the cutting list returns to{' '}
              <strong className="font-semibold">Waiting</strong>. Use for order cancellations (refunds may reference this
              record).
            </>
          )}
        </p>
        <label className="mt-3 block text-ui-xs font-bold uppercase tracking-wide text-slate-500">
          Reason (≥8 characters)
        </label>
        <textarea
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-rose-200"
          placeholder={
            isRecall
              ? 'e.g. Wrong cutting list / production entry — recalling so we can re-enter correctly.'
              : 'e.g. Customer cancelled order — no production to run.'
          }
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
            {saving ? 'Cancelling…' : isRecall ? 'Confirm recall' : 'Confirm cancel'}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Admin-only: reverse completed/open supply, delete the production job and its cutting list
 * (duplicate stone-coated / wrong-entry cleanup).
 *
 * @param {{
 *   open: boolean;
 *   reason: string;
 *   saving: boolean;
 *   jobId?: string;
 *   cuttingListId?: string;
 *   onReasonChange: (v: string) => void;
 *   onClose: () => void;
 *   onConfirm: () => void | Promise<void>;
 * }} props
 */
export function LiveProductionMonitorForceRecallModal({
  open,
  reason,
  saving,
  jobId = '',
  cuttingListId = '',
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
      aria-labelledby="admin-force-recall-title"
    >
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-rose-300 bg-white p-4 shadow-xl">
        <h4 id="admin-force-recall-title" className="text-sm font-bold text-rose-950">
          Remove this job & cutting list?
        </h4>
        <p className="mt-2 text-xs leading-snug text-slate-600">
          Admin cleanup for a <strong className="font-semibold">duplicate or wrong</strong> production
          entry. This restores stone/coil/accessory stock when the job was completed, then{' '}
          <strong className="font-semibold">deletes the production job</strong> and its{' '}
          <strong className="font-semibold">cutting list</strong>. Keep the correct registration —
          only remove the extra one.
        </p>
        {(jobId || cuttingListId) ? (
          <p className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 font-mono text-ui-xs text-slate-700">
            {jobId ? <span>Job {jobId}</span> : null}
            {jobId && cuttingListId ? <span> · </span> : null}
            {cuttingListId ? <span>List {cuttingListId}</span> : null}
          </p>
        ) : null}
        <label className="mt-3 block text-ui-xs font-bold uppercase tracking-wide text-slate-500">
          Reason (≥12 characters)
        </label>
        <textarea
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-rose-200"
          placeholder="e.g. Duplicate stone-coated production registered twice — remove wrong job and cutting list."
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
            disabled={saving || reason.trim().length < 12}
            onClick={() => void onConfirm()}
            className="rounded-md bg-rose-800 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-900 disabled:opacity-45"
          >
            {saving ? 'Removing…' : 'Remove job & cutting list'}
          </button>
        </div>
      </div>
    </div>
  );
}
