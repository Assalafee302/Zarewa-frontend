import React from 'react';
import { ModalFrame } from '../layout/ModalFrame';
import { useTrackedUnsavedForm } from '../../hooks/useTrackedUnsavedForm';
import { WorkPayStepPills } from './workPayFormUi';

const SIZE_CLASS = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

/**
 * Polished modal shell for Leave / Loans / Attendance forms — matches employment profile modal layout.
 */
export function WorkPayFormModal({
  isOpen,
  onClose,
  eyebrow,
  title,
  description,
  steps,
  currentStep = 0,
  footer,
  children,
  size = 'lg',
  trackId,
  trackUnsaved = true,
  closeDisabled = false,
}) {
  const stableTrackId =
    trackId || `work-pay-${String(title || 'modal').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`.replace(/^-|-$/g, '');
  const { captureEdited, wrapClose } = useTrackedUnsavedForm(stableTrackId, {
    isOpen,
    blockTracking: !trackUnsaved,
    hydrateKey: title,
  });
  const handleClose = onClose && !closeDisabled ? wrapClose(onClose) : undefined;
  const progressPct = steps?.length ? Math.round(((currentStep + 1) / steps.length) * 100) : null;

  return (
    <ModalFrame isOpen={isOpen} onClose={handleClose} title={title} description={description} surface="plain" closeDisabled={closeDisabled}>
      <div
        className={`z-modal-panel flex w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl max-h-[min(92dvh,900px)] ${SIZE_CLASS[size] || SIZE_CLASS.lg}`}
        onInput={trackUnsaved ? captureEdited : undefined}
        onChange={trackUnsaved ? captureEdited : undefined}
      >
        <header className="shrink-0 border-b border-slate-100 bg-gradient-to-r from-teal-50/80 to-white px-4 py-4 pr-14 sm:px-6">
          {eyebrow ? <p className="text-ui-xs font-bold uppercase tracking-[0.14em] text-zarewa-teal">{eyebrow}</p> : null}
          <h2 className="mt-0.5 text-lg font-black tracking-tight text-slate-900 sm:text-xl">{title}</h2>
          {description ? <p className="mt-1 text-xs leading-relaxed text-slate-600 sm:text-sm">{description}</p> : null}
        </header>

        {steps?.length ? (
          <>
            <div className="shrink-0 border-b border-slate-100 bg-slate-50/90 px-4 py-3 sm:px-6">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="font-semibold text-slate-600">
                  Step {currentStep + 1} of {steps.length}
                </span>
                <span className="font-bold tabular-nums text-zarewa-teal">{progressPct}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200/90">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-zarewa-teal to-teal-500 transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
            <WorkPayStepPills steps={steps} currentStep={currentStep} />
          </>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar bg-slate-50/40 px-4 py-4 sm:px-6 sm:py-5">{children}</div>

        {footer ? (
          <footer className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 shadow-[0_-8px_24px_-12px_rgba(15,23,42,0.12)] sm:px-6 sm:py-4">
            {footer}
          </footer>
        ) : null}
      </div>
    </ModalFrame>
  );
}
