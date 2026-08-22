import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { ModalFrame } from '../layout';
import { LiveProductionMonitor } from '../LiveProductionMonitor';
import { registerStatusTone, PROD_REG } from '../../lib/productionRegisterUi';

/**
 * Operations: modal opened from **Edit register** — coil plan, run log, completion.
 */
export function ProductionRegisterEditModal({
  isOpen,
  onClose,
  cuttingListId,
  subtitle,
  initialRecallIntent = false,
}) {
  const id = cuttingListId != null ? String(cuttingListId).trim() : '';
  const open = Boolean(isOpen);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (!open) setStatus(null);
  }, [open]);

  return (
    <ModalFrame isOpen={open} onClose={onClose} surface="plain" title="" showCloseButton={false}>
      <div className={PROD_REG.modalPanel}>
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--z-border-subtle)] px-2.5 py-2 sm:px-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <h2 className="text-sm font-bold text-[var(--z-text)]">Production register</h2>
              {status ? (
                <span
                  className={`rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${registerStatusTone(status)}`}
                >
                  {status}
                </span>
              ) : null}
            </div>
            <p className="truncate font-mono text-ui-xs font-semibold text-zarewa-teal" title={id}>
              {id || '—'}
              {subtitle ? (
                <span className="ml-1.5 font-sans font-normal text-[var(--z-text-muted)]">· {subtitle}</span>
              ) : null}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-[var(--z-text-muted)] hover:bg-[var(--z-surface-muted)] hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zarewa-teal/25"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </header>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[var(--z-bg)]/30 p-1 sm:p-1.5">
          {!id ? (
            <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50/80 px-3 py-4 text-sm text-amber-950">
              Missing cutting list id — refresh the workspace and try again.
            </div>
          ) : (
            <LiveProductionMonitor
              focusCuttingListId={id}
              hideJobSidebar
              inModal
              operationsRegisterEdit
              viewOnly={false}
              initialRecallIntent={Boolean(initialRecallIntent)}
              onModalClose={onClose}
              showModalCloseButton={false}
              onRegisterHeaderMeta={(meta) => setStatus(meta?.status || null)}
            />
          )}
        </div>
      </div>
    </ModalFrame>
  );
}
