import React from 'react';
import { X } from 'lucide-react';
import { ModalFrame } from '../layout';
import { LiveProductionMonitor } from '../LiveProductionMonitor';

/**
 * Operations: modal opened from **Edit register** — coil plan, run log, completion, and post-completion tools.
 * Whether controls are enabled follows the selected production job inside {@link LiveProductionMonitor}
 * (Planned / Running vs Completed / Cancelled), not the queue row’s “closed” chip.
 *
 * @param {{
 *   isOpen: boolean;
 *   onClose: () => void;
 *   cuttingListId?: string | null;
 *   subtitle?: string | null;
 * }} props
 */
export function ProductionRegisterEditModal({ isOpen, onClose, cuttingListId, subtitle }) {
  const id = cuttingListId != null ? String(cuttingListId).trim() : '';
  const open = Boolean(isOpen && id);

  return (
    <ModalFrame
      isOpen={open}
      onClose={onClose}
      showCloseButton={false}
      surface="plain"
      title="Edit production register"
      description="Coil allocation, run log, completion, and conversion tools for this cutting list."
    >
      <div className="z-modal-panel flex h-[min(90dvh,860px)] w-full min-w-0 max-w-[min(44rem,calc(100dvw-1.25rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl sm:h-[min(88dvh,900px)] sm:max-w-[min(48rem,calc(100dvw-2rem))] sm:rounded-[28px]">
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-teal-100/90 bg-gradient-to-r from-teal-50/50 via-white to-white px-3 py-2.5 sm:px-4">
          <div className="min-w-0 pr-2">
            <p className="text-[8px] font-black uppercase tracking-widest text-[#134e4a]/75">Store &amp; production</p>
            <h2 className="text-[15px] font-bold tracking-tight text-[#134e4a]">Edit production register</h2>
            <p className="mt-0.5 truncate font-mono text-[11px] font-semibold text-slate-800" title={id}>
              {id || '—'}
            </p>
            {subtitle ? (
              <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-slate-600" title={subtitle}>
                {subtitle}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#134e4a]/25"
            aria-label="Close"
          >
            <X size={22} />
          </button>
        </header>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-2 sm:p-3">
          <LiveProductionMonitor
            focusCuttingListId={id}
            hideJobSidebar
            inModal
            operationsRegisterEdit
            viewOnly={false}
            onModalClose={onClose}
            showModalCloseButton={false}
          />
        </div>
      </div>
    </ModalFrame>
  );
}
