import React, { useState } from 'react';
import { CheckCircle2, Loader2, ShieldCheck, X } from 'lucide-react';
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
  const [ack, setAck] = useState(false);

  React.useEffect(() => {
    if (open) setAck(false);
  }, [open]);

  const submit = async () => {
    if (!ack) {
      showToast?.('Confirm the acknowledgment before approving.', { variant: 'error' });
      return;
    }
    setApproving(true);
    try {
      const { ok, data } = await postStockRegisterWorkflow({ action: 'md_approve', periodKey });
      if (!ok || !data?.ok) {
        showToast?.(data?.error || 'MD approval failed.', { variant: 'error' });
        return;
      }
      showToast?.('Closing value approved — procurement may Capture & lock.');
      onSaved?.(data);
      onClose?.();
    } finally {
      setApproving(false);
    }
  };

  const status = workflow?.status || 'draft';
  const disabled = status !== 'procurement_costed';
  const summary = register?.summary || {};
  const total = summary.totalClosingValueNgn;

  return (
    <ModalFrame isOpen={open} onClose={onClose} showCloseButton={false} surface="plain" title="MD stock register approval">
      <div className="z-modal-panel-lg flex max-h-[90dvh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
          <div>
            <p className="text-ui-xs font-black uppercase tracking-widest text-slate-400">Executive sign-off</p>
            <h2 className="text-lg font-bold text-zarewa-teal">Approve closing stock value</h2>
            <p className="text-sm text-slate-600 mt-0.5">
              {branchLabel} · {periodEnd}
            </p>
          </div>
          <button type="button" onClick={onClose} className="z-btn-secondary p-2" aria-label="Close" disabled={approving}>
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

          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 space-y-1.5">
            {[
              ['Aluminium', summary.aluminium?.valueNgn],
              ['Aluzinc', summary.aluzinc?.valueNgn],
              ['Stone-coated', summary.stoneCoated?.valueNgn],
              ['Accessories', summary.accessories?.valueNgn],
            ].map(([label, v]) => (
              <div key={label} className="flex justify-between text-xs gap-3">
                <span className="text-slate-600">{label}</span>
                <span className="font-semibold tabular-nums text-slate-800">
                  {v != null ? formatNgn(v || 0) : '—'}
                </span>
              </div>
            ))}
            <div className="flex justify-between pt-2 border-t border-slate-200 text-sm">
              <span className="font-bold text-slate-800">Total closing</span>
              <span className="font-black text-zarewa-teal tabular-nums">
                {total != null ? formatNgn(total || 0) : '—'}
              </span>
            </div>
          </div>

          {disabled ? (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2">
              Register must be procurement-costed before approval (current: {status.replace(/_/g, ' ')}).
            </p>
          ) : (
            <p className="text-xs text-slate-600 leading-relaxed">
              This approves the <strong>closing value</strong>. Procurement then runs <strong>Capture &amp; lock</strong>{' '}
              to freeze snapshots. Capture is the stock lock (executive reopen needs a written reason).
            </p>
          )}

          {!disabled ? (
            <label className="flex items-start gap-2 text-sm cursor-pointer rounded-lg border border-slate-200 p-3">
              <input
                type="checkbox"
                className="mt-0.5 rounded border-slate-300 text-teal-700"
                checked={ack}
                onChange={(e) => setAck(e.target.checked)}
              />
              <span>
                I approve closing value{' '}
                <strong>{total != null ? formatNgn(total || 0) : '—'}</strong> for{' '}
                {branchLabel || 'this branch'} / {periodEnd}.
              </span>
            </label>
          ) : null}
        </div>

        <footer className="shrink-0 flex flex-wrap gap-2 border-t border-slate-100 px-4 py-3 sm:px-5">
          <button type="button" className="z-btn-secondary" onClick={onClose} disabled={approving}>
            Cancel
          </button>
          <button
            type="button"
            className="z-btn-primary inline-flex items-center gap-2"
            onClick={submit}
            disabled={disabled || approving || !ack}
          >
            {approving ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
            Approve closing stock value
          </button>
        </footer>
      </div>
    </ModalFrame>
  );
}
