import React, { useEffect, useState } from 'react';
import { CheckCircle2, Flag } from 'lucide-react';
import { DecisionActionTile, DecisionStickyActions } from './DecisionSurface';

/**
 * Shared approve / reject footer for BM and executive approval popups.
 */
export function ApproveRejectConfirmBar({
  hint,
  restatement = '',
  acknowledgeLabel = '',
  note = '',
  onNoteChange,
  notePlaceholder = 'Approval or rejection note (required for rejection)',
  busy = false,
  canApprove = true,
  canReject = true,
  approveLabel = 'Approve',
  rejectLabel = 'Reject',
  onApprove,
  onReject,
  asSticky = true,
  resetKey = '',
  children,
}) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [showNeedAck, setShowNeedAck] = useState(false);
  const needsAck = Boolean(acknowledgeLabel);

  useEffect(() => {
    setAcknowledged(false);
    setShowNeedAck(false);
  }, [resetKey]);

  const handleApprove = () => {
    if (needsAck && !acknowledged) {
      setShowNeedAck(true);
      return;
    }
    void onApprove?.();
  };

  const body = (
    <>
      {hint ? <p className="text-xs leading-relaxed text-slate-600">{hint}</p> : null}
      {restatement ? (
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold tabular-nums text-slate-800">
          {restatement}
        </p>
      ) : null}
      {needsAck ? (
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
          <span>{acknowledgeLabel}</span>
        </label>
      ) : null}
      {showNeedAck && !acknowledged ? (
        <p className="text-ui-xs font-semibold text-amber-800">Tick the review box before approving.</p>
      ) : null}
      {typeof onNoteChange === 'function' ? (
        <textarea
          value={note}
          onChange={(e) => onNoteChange(e.target.value)}
          rows={2}
          placeholder={notePlaceholder}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-teal-300/50"
        />
      ) : null}
      {children}
      <div className={`grid grid-cols-1 gap-2 ${canReject ? 'sm:grid-cols-2' : ''}`}>
        {canReject ? (
          <DecisionActionTile
            variant="reject"
            icon={Flag}
            label={rejectLabel}
            disabled={busy || !canReject}
            onClick={() => void onReject?.()}
          />
        ) : null}
        <DecisionActionTile
          variant="approve"
          icon={CheckCircle2}
          label={busy ? 'Recording…' : approveLabel}
          disabled={busy || !canApprove}
          onClick={handleApprove}
        />
      </div>
    </>
  );

  if (!asSticky) {
    return <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">{body}</div>;
  }
  return <DecisionStickyActions>{body}</DecisionStickyActions>;
}
