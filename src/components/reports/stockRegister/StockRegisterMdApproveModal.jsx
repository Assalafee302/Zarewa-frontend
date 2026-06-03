import React, { useState } from 'react';
import { CheckCircle2, Loader2, X } from 'lucide-react';
import { ModalFrame } from '../../layout';
import { formatNgn } from '../../../Data/mockData';
import { postStockRegisterWorkflow } from './stockRegisterApi';

/**
 * MD executive approval after procurement costing.
 */
export function StockRegisterMdApproveModal({
  open,
  onClose,
  periodKey,
  periodEnd,
  branchLabel,
  register,
  workflow,
  showToast,
  onSaved,
}) {
  const [approving, setApproving] = useState(false);

  const submit = async () => {
    setApproving(true);
    try {
      const { ok, data } = await postStockRegisterWorkflow({ action: 'md_approve', periodKey });
      if (!ok || !data?.ok) {
        showToast?.(data?.error || 'MD approval failed.', { variant: 'error' });
        return;
      }
      showToast?.('MD approved — procurement may capture closing.');
      onSaved?.(data);
      onClose?.();
    } finally {
      setApproving(false);
    }
  };

  const status = workflow?.status || 'draft';
  const disabled = status !== 'procurement_costed';
  const total = register?.summary?.totalClosingValueNgn;

  return (
    <ModalFrame isOpen={open} onClose={onClose} showCloseButton={false} surface="plain" title="MD stock register approval">
      <div className="z-modal-panel-lg flex max-h-[90dvh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Executive sign-off</p>
            <h2 className="text-lg font-bold text-[#134e4a]">Approve month-end stock</h2>
            <p className="text-sm text-slate-600 mt-0.5">
              {branchLabel} · {periodEnd}
            </p>
          </div>
          <button type="button" onClick={onClose} className="z-btn-secondary p-2" aria-label="Close">
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 px-4 py-4 sm:px-5 space-y-3 text-sm">
          <p className="text-slate-700">
            Procurement costing by{' '}
            <strong>{workflow?.procurementCostedByName || 'procurement'}</strong>
            {workflow?.procurementCostedAtISO ? (
              <> on {String(workflow.procurementCostedAtISO).slice(0, 10)}</>
            ) : null}
            .
          </p>
          {total != null ? (
            <p className="text-base font-black text-[#134e4a]">
              Total closing value: {formatNgn(total || 0)}
            </p>
          ) : null}
          {disabled ? (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2">
              Register must be procurement-costed before MD approval (current: {status.replace(/_/g, ' ')}).
            </p>
          ) : (
            <p className="text-xs text-slate-500">
              After approval, procurement captures closing snapshots — this cannot be undone without admin support.
            </p>
          )}
        </div>

        <footer className="shrink-0 flex flex-wrap gap-2 border-t border-slate-100 px-4 py-3 sm:px-5">
          <button type="button" className="z-btn-secondary" onClick={onClose} disabled={approving}>
            Cancel
          </button>
          <button
            type="button"
            className="z-btn-primary inline-flex items-center gap-2"
            onClick={submit}
            disabled={disabled || approving}
          >
            {approving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            MD approve
          </button>
        </footer>
      </div>
    </ModalFrame>
  );
}
