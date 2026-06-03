import React, { useState } from 'react';
import { AlertTriangle, Loader2, Lock, X } from 'lucide-react';
import { ModalFrame } from '../../layout';
import { captureStockRegisterClosing } from './stockRegisterApi';

/**
 * Confirm month-end closing capture — procurement only, requires md_approved.
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

  const submit = async () => {
    setCapturing(true);
    try {
      const { ok, data } = await captureStockRegisterClosing(periodEnd);
      if (!ok || !data?.ok) {
        showToast?.(data?.error || 'Capture failed.', { variant: 'error' });
        return;
      }
      showToast?.(`Closing captured (${data.coilLineCount ?? '—'} coil lines) — next month opening ready.`);
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
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Month-end lock</p>
            <h2 className="text-lg font-bold text-[#134e4a]">Capture closing stock</h2>
            <p className="text-sm text-slate-600 mt-0.5">
              {branchLabel} · {periodEnd}
            </p>
          </div>
          <button type="button" onClick={onClose} className="z-btn-secondary p-2" aria-label="Close">
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 px-4 py-4 sm:px-5 space-y-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-sm text-amber-950 flex gap-2">
            <AlertTriangle size={18} className="shrink-0 text-amber-700" />
            <p>
              This writes coil and product snapshots for <strong>{periodEnd}</strong> and locks the register. Next
              month&apos;s opening balances come from this capture.
            </p>
          </div>

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
        </div>

        <footer className="shrink-0 flex flex-wrap gap-2 border-t border-slate-100 px-4 py-3 sm:px-5">
          <button type="button" className="z-btn-secondary" onClick={onClose} disabled={capturing}>
            Cancel
          </button>
          <button
            type="button"
            className="z-btn-primary inline-flex items-center gap-2"
            onClick={submit}
            disabled={disabled || capturing}
          >
            {capturing ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
            Capture &amp; lock
          </button>
        </footer>
      </div>
    </ModalFrame>
  );
}
