import React from 'react';
import { AlertTriangle, Building2 } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import {
  branchScopedCreateBlockedMessage,
  isBranchScopedCreateBlocked,
  workspaceActiveBranchLabel,
} from '../../lib/workspaceBranchCreate';

/**
 * Branch scope notice + checkbox before saving a new purchase order.
 * @param {{ confirmed: boolean; onConfirmedChange: (next: boolean) => void; compact?: boolean }} props
 */
export function PurchaseOrderBranchConfirm({ confirmed, onConfirmedChange, compact = false }) {
  const ws = useWorkspace();
  const blocked = isBranchScopedCreateBlocked(ws);
  const { label, code } = workspaceActiveBranchLabel(ws);

  if (blocked) {
    return (
      <div
        className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-950 leading-relaxed"
        role="alert"
      >
        <p className="font-semibold flex items-center gap-2">
          <AlertTriangle size={16} className="shrink-0" aria-hidden />
          Cannot create a purchase order here
        </p>
        <p className="mt-1 text-[12px]">{ws?.branchScopedCreateMessage || branchScopedCreateBlockedMessage(ws)}</p>
      </div>
    );
  }

  const pad = compact ? 'px-3 py-2.5' : 'px-4 py-3';
  const text = compact ? 'text-xs' : 'text-sm';

  return (
    <div
      className={`rounded-xl border border-amber-200/90 bg-amber-50/90 ${pad} ${text} text-amber-950 leading-relaxed`}
      role="group"
      aria-labelledby="po-branch-confirm-heading"
    >
      <p id="po-branch-confirm-heading" className="font-semibold flex items-center gap-2 text-zarewa-teal">
        <Building2 size={16} className="shrink-0 text-amber-800" aria-hidden />
        Branch for this purchase
      </p>
      <p className="mt-1.5">
        This order will be registered for{' '}
        <strong className="text-zarewa-teal">
          {label}
          {code ? ` (${code})` : ''}
        </strong>
        . Stock, GRN, supplier payments, and transport follow that branch only — not another factory.
      </p>
      <p className="mt-1 text-ui-xs text-amber-900/90 uppercase tracking-wide font-semibold">
        Wrong branch in the top bar? Change it before saving.
      </p>
      <label className="mt-3 flex cursor-pointer items-start gap-2.5 rounded-lg border border-amber-300/60 bg-white/80 px-3 py-2.5">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => onConfirmedChange(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-amber-400 text-zarewa-teal focus:ring-zarewa-teal/30"
        />
        <span className="text-xs font-semibold text-slate-800 leading-snug">
          I confirm this purchase is for <span className="text-zarewa-teal">{label}</span> and matches the branch selected
          above.
        </span>
      </label>
    </div>
  );
}
