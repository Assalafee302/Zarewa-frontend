import React, { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { conversionAlertCopy } from '../../lib/conversionReviewUi.js';
import { DecisionActionTile, DecisionStickyActions } from './DecisionSurface';

const MIN_REMARK = 3;

/**
 * Confirmation footer for Floor conversion check — remark + explicit review, no KPI code.
 */
export function ConversionReviewConfirmBar({
  remark = '',
  onRemarkChange,
  busy = false,
  onConfirm,
  jobId = '',
  alertState = '',
  asSticky = true,
  confirmLabel = 'Confirm production check',
  hint = 'This records your branch manager sign-off and clears the item from Floor.',
}) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [showNeedAck, setShowNeedAck] = useState(false);
  const alertHeadline = conversionAlertCopy(alertState).headline;
  const trimmed = String(remark || '').trim();
  const remarkOk = trimmed.length >= MIN_REMARK;
  const remaining = Math.max(0, MIN_REMARK - trimmed.length);

  useEffect(() => {
    setAcknowledged(false);
    setShowNeedAck(false);
  }, [jobId]);

  const handleConfirm = () => {
    if (!remarkOk) return;
    if (!acknowledged) {
      setShowNeedAck(true);
      return;
    }
    void onConfirm?.();
  };

  const body = (
    <>
      <p className="text-xs leading-relaxed text-slate-600">
        {hint}
        {alertHeadline ? (
          <>
            {' '}
            You are confirming <span className="font-semibold text-slate-800">{alertHeadline.toLowerCase()}</span> on{' '}
            <span className="font-mono font-bold text-slate-800">{jobId || 'this job'}</span>.
          </>
        ) : null}
      </p>
      <label className="block">
        <span className="text-ui-xs font-black uppercase tracking-widest text-slate-500">Sign-off remark</span>
        <textarea
          value={remark}
          onChange={(e) => onRemarkChange?.(e.target.value)}
          rows={2}
          placeholder="e.g. Variance reviewed — coil and metres match the shop floor."
          className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs leading-relaxed text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-teal-300/60"
        />
        <span className="mt-1 block text-ui-xs text-slate-400">
          {remarkOk ? 'Ready to confirm.' : `At least ${remaining} more character${remaining === 1 ? '' : 's'}.`}
        </span>
      </label>
      <label
        className={`flex cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2.5 text-xs leading-snug ${
          showNeedAck && !acknowledged
            ? 'border-amber-400 bg-amber-50 text-amber-950'
            : 'border-slate-200 bg-slate-50 text-slate-700'
        }`}
      >
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-zarewa-teal focus:ring-zarewa-teal"
          checked={acknowledged}
          onChange={(e) => {
            setAcknowledged(e.target.checked);
            if (e.target.checked) setShowNeedAck(false);
          }}
        />
        <span>
          I have reviewed this conversion (coil kg, metres, and the High/Low band) and accept closing the production
          check.
        </span>
      </label>
      {showNeedAck && !acknowledged ? (
        <p className="text-ui-xs font-semibold text-amber-800">Tick the review box before confirming.</p>
      ) : null}
      <DecisionActionTile
        variant="brand"
        icon={CheckCircle2}
        label={busy ? 'Recording…' : confirmLabel}
        disabled={busy || !remarkOk}
        onClick={handleConfirm}
      />
    </>
  );

  if (!asSticky) {
    return (
      <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
        {body}
      </div>
    );
  }

  return <DecisionStickyActions>{body}</DecisionStickyActions>;
}
