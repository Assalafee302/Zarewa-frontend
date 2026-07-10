import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { ModalFrame } from '../layout';
import { StockRegisterPanel } from './StockRegisterPanel';

function defaultMonthEndIso() {
  const d = new Date();
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return last.toISOString().slice(0, 10);
}

/**
 * Month-end stock register entry — store, manager, or procurement workflow.
 * @param {'store'|'manager'|'procurement'} roleMode
 */
export function StockRegisterMonthEndModal({
  isOpen,
  onClose,
  roleMode = 'store',
  branchId,
  branchLabel,
  showToast,
  roleKey,
  initialPeriodEnd,
}) {
  const [periodEnd, setPeriodEnd] = useState(initialPeriodEnd || defaultMonthEndIso());

  const titles = useMemo(
    () => ({
      store: 'Month-end stock count',
      manager: 'Stock register — manager review',
      procurement: 'Stock register — procurement costing',
    }),
    []
  );

  return (
    <ModalFrame
      isOpen={isOpen}
      onClose={onClose}
      showCloseButton={false}
      surface="plain"
      title={titles[roleMode] || 'Stock register'}
    >
      <div
        className={`z-modal-panel-lg flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl ${
          roleMode === 'manager' ? 'max-w-5xl' : 'max-w-3xl'
        }`}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p className="text-ui-xs font-black uppercase tracking-widest text-slate-400">Physical stock register</p>
            <h2 className="text-lg font-bold text-zarewa-teal">{titles[roleMode]}</h2>
            <p className="text-sm text-slate-600 mt-0.5">{branchLabel || branchId}</p>
          </div>
          <button type="button" onClick={onClose} className="z-btn-secondary p-2" aria-label="Close">
            <X size={18} />
          </button>
        </header>
        <div className="shrink-0 border-b border-slate-100 px-4 py-3 sm:px-5 bg-slate-50/80">
          <label className="block text-sm max-w-xs">
            <span className="font-semibold text-slate-700">Period end date</span>
            <input
              type="date"
              className="z-input w-full mt-1"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
            />
          </label>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-4 py-4 sm:px-5">
          <StockRegisterPanel
            roleMode={roleMode}
            embedded
            endDate={periodEnd}
            branchId={branchId}
            branchLabel={branchLabel}
            showToast={showToast}
            roleKey={roleKey}
          />
        </div>
      </div>
    </ModalFrame>
  );
}
