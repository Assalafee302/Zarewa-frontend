import React, { Suspense } from 'react';
import { X, Copy, Check } from 'lucide-react';
import { ModalFrame } from '../layout';
import { lazyWithRetry } from '../../lib/lazyWithRetry';
import { registerStatusTone, PROD_REG } from '../../lib/productionRegisterUi';
import { PageLoader } from '../ui/PageLoader';

const LiveProductionMonitor = lazyWithRetry(
  () => import('../LiveProductionMonitor').then((m) => ({ default: m.LiveProductionMonitor })),
  { id: 'LiveProductionMonitor' }
);

/**
 * Operations: modal opened from **Edit register** — coil plan, run log, completion.
 * LiveProductionMonitor (~250KB) loads only when the modal opens.
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
  const [status, setStatus] = React.useState(null);
  const [headerMeta, setHeaderMeta] = React.useState(null);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setStatus(null);
      setHeaderMeta(null);
      setCopied(false);
    }
  }, [open]);

  const handleCopyId = () => {
    if (!id) return;
    navigator.clipboard?.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ModalFrame isOpen={open} onClose={onClose} surface="plain" title="" showCloseButton={false}>
      <div className={PROD_REG.modalPanel}>
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--z-border-subtle)] bg-white px-3 py-2.5 sm:px-4">
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
              {headerMeta?.customerName ? (
                <span className="truncate text-ui-xs font-semibold text-[var(--z-text)]" title={headerMeta.customerName}>
                  · {headerMeta.customerName}
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-1.5 pt-0.5">
              <p className="truncate font-mono text-ui-xs font-semibold text-zarewa-teal" title={id}>
                {id || '—'}
              </p>
              {id ? (
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="rounded p-0.5 text-[var(--z-text-muted)] hover:bg-[var(--z-surface-muted)] hover:text-zarewa-teal focus:outline-none"
                  title="Copy cutting list ID"
                  aria-label="Copy cutting list ID"
                >
                  {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                </button>
              ) : null}
              {headerMeta?.machineName ? (
                <span className="truncate text-ui-xs text-[var(--z-text-muted)]">
                  · {headerMeta.machineName}
                </span>
              ) : null}
              {subtitle ? (
                <span className="truncate font-sans font-normal text-[var(--z-text-muted)] text-ui-xs">· {subtitle}</span>
              ) : null}
            </div>
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
          ) : open ? (
            <Suspense fallback={<PageLoader message="Loading production register…" className="min-h-[16rem]" />}>
              <LiveProductionMonitor
                focusCuttingListId={id}
                hideJobSidebar
                inModal
                operationsRegisterEdit
                viewOnly={false}
                initialRecallIntent={Boolean(initialRecallIntent)}
                onModalClose={onClose}
                showModalCloseButton={false}
                onRegisterHeaderMeta={(meta) => {
                  setStatus(meta?.status || null);
                  setHeaderMeta(meta || null);
                }}
              />
            </Suspense>
          ) : null}
        </div>
      </div>
    </ModalFrame>
  );
}
