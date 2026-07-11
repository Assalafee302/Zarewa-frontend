import React from 'react';
import { X } from 'lucide-react';
import { ModalFrame } from '../../layout';
import { formatStockRegisterMonth } from '../../../lib/stockRegisterPeriod';
import { StockRegisterBmClearanceWorkspace } from './StockRegisterBmClearanceWorkspace';

/** Thin modal shell around BM clearance workspace (legacy entry). */
export function StockRegisterBmReviewModal({
  open,
  onClose,
  register,
  workflow,
  periodKey,
  periodEnd,
  branchLabel,
  showToast,
  onSaved,
  onPrint,
}) {
  return (
    <ModalFrame isOpen={open} onClose={onClose} showCloseButton={false} surface="plain" title="Manager stock review">
      <div className="z-modal-panel-lg flex max-h-[92dvh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p className="text-ui-xs font-black uppercase tracking-widest text-slate-400">Branch manager review</p>
            <h2 className="text-lg font-bold text-zarewa-teal">Stock register clearance</h2>
            <p className="text-sm text-slate-600 mt-0.5">
              {branchLabel} · {formatStockRegisterMonth(periodEnd)}
            </p>
          </div>
          <button type="button" onClick={onClose} className="z-btn-secondary p-2" aria-label="Close">
            <X size={18} />
          </button>
        </header>
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-4 py-4 sm:px-5">
          {open ? (
            <StockRegisterBmClearanceWorkspace
              register={register}
              workflow={workflow}
              periodKey={periodKey}
              showToast={showToast}
              onSaved={onSaved}
              onPrint={onPrint}
              onApproved={() => onClose?.()}
              onReturned={() => onClose?.()}
            />
          ) : null}
        </div>
      </div>
    </ModalFrame>
  );
}
