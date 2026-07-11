import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, Loader2, Lock, X } from 'lucide-react';
import { ModalFrame } from '../../layout';
import { captureStockRegisterClosing } from './stockRegisterApi';

/**
 * Confirm month-end closing capture — procurement, requires md_approved + lock ack.
 */
export function StockRegisterCaptureConfirmModal({
  open,
  onClose,
  periodEnd,
  branchLabel,
  workflow,
  showToast,
  onSaved,
}) {
  const [capturing, setCapturing] = useState(false);
  const [ack, setAck] = useState(false);
  const [showAcct, setShowAcct] = useState(false);

  React.useEffect(() => {
    if (open) {
      setAck(false);
      setShowAcct(false);
    }
  }, [open]);

  const submit = async () => {
    if (!ack) {
      showToast?.('Tick the acknowledgment before locking.', { variant: 'error' });
      return;
    }
    setCapturing(true);
    try {
      const { ok, data } = await captureStockRegisterClosing(periodEnd);
      if (!ok || !data?.ok) {
        showToast?.(data?.error || 'Capture failed.', { variant: 'error' });
        return;
      }
      showToast?.(
        `Closing captured (${data.coilLineCount ?? '—'} coil lines)${
          data.varianceNgn ? ` · variance ₦${Number(data.varianceNgn).toLocaleString()}` : ''
        } — register locked.${data.glWarning ? ` GL note: ${data.glWarning}` : ''}`,
        data.glWarning ? { variant: 'warning' } : undefined
      );
      onSaved?.(data);
      onClose?.();
    } finally {
      setCapturing(false);
    }
  };

  const status = workflow?.status || 'draft';
  const disabled = status !== 'md_approved';

  return (
    <ModalFrame isOpen={open} onClose={onClose} showCloseButton={false} surface="plain" title="Capture closing stock">
      <div className="z-modal-panel-lg flex max-h-[90dvh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
          <div>
            <p className="text-ui-xs font-black uppercase tracking-widest text-slate-400">Month-end lock</p>
            <h2 className="text-lg font-bold text-zarewa-teal">Capture &amp; lock register</h2>
            <p className="text-sm text-slate-600 mt-0.5">
              {branchLabel} · {periodEnd}
            </p>
          </div>
          <button type="button" onClick={onClose} className="z-btn-secondary p-2" aria-label="Close" disabled={capturing}>
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 px-4 py-4 sm:px-5 space-y-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-sm text-amber-950 flex gap-2">
            <AlertTriangle size={18} className="shrink-0 text-amber-700" />
            <div className="space-y-1">
              <p className="font-semibold">This locks next month&apos;s opening stock from this count.</p>
              <p className="text-xs leading-relaxed">
                Snapshots are frozen for <strong>{periodEnd}</strong>. Edits stop until an executive reopens with a
                written reason. This is <strong>not</strong> the finance accounting-period lock.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="text-ui-xs font-bold text-slate-600 inline-flex items-center gap-1"
            onClick={() => setShowAcct((v) => !v)}
          >
            {showAcct ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            Accounting detail
          </button>
          {showAcct ? (
            <p className="text-xs text-slate-600 leading-relaxed rounded-lg border border-slate-200 bg-slate-50 p-2">
              Count variances (BM overrides × cost) may post to GL 5055 ↔ 1300. Full closing value is stored on the
              period; inventory 1300 is not re-capitalised (perpetual).
            </p>
          ) : null}

          {disabled ? (
            <p className="text-xs text-slate-600">
              Status: <strong>{status.replace(/_/g, ' ')}</strong> — MD approval required before capture.
            </p>
          ) : (
            <p className="text-xs text-teal-800">
              MD approved by {workflow?.mdApprovedByName || '—'} on{' '}
              {String(workflow?.mdApprovedAtISO || '').slice(0, 10) || '—'}.
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
                I understand this <strong>locks</strong> the stock register for {periodEnd}
                {branchLabel ? ` (${branchLabel})` : ''}.
              </span>
            </label>
          ) : null}
        </div>

        <footer className="shrink-0 flex flex-wrap gap-2 border-t border-slate-100 px-4 py-3 sm:px-5">
          <button type="button" className="z-btn-secondary" onClick={onClose} disabled={capturing}>
            Cancel
          </button>
          <button
            type="button"
            className="z-btn-primary inline-flex items-center gap-2"
            onClick={submit}
            disabled={disabled || capturing || !ack}
          >
            {capturing ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
            Capture &amp; lock
          </button>
        </footer>
      </div>
    </ModalFrame>
  );
}
