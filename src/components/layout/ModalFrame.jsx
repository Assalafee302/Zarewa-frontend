import React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';

/**
 * Full-viewport modal shell rendered via Radix Portal.
 * Handles accessible focus-trapping, escape-to-close, and Framer Motion layout transitions.
 */
const ELEVATED_SURFACE_CLASS =
  'relative z-10 flex min-h-0 w-full max-w-[min(1200px,calc(100dvw-1.5rem))] items-start justify-center rounded-2xl shadow-[0_28px_80px_-36px_rgba(15,23,42,0.45)] outline-none sm:rounded-[32px]';
const PLAIN_SURFACE_CLASS =
  'relative z-10 flex min-h-0 w-full max-h-[min(92dvh,960px)] max-w-[min(1200px,calc(100dvw-1.5rem))] items-stretch justify-center outline-none';

export function ModalFrame({
  isOpen,
  onClose,
  children,
  title = 'Dialog',
  description,
  /** When false, no overlay / scroll lock (e.g. while a body-portaled print preview is open). */
  modal = true,
  /** Visible dismiss control (Radix still closes on Escape and overlay click when modal). */
  showCloseButton = true,
  closeDisabled = false,
  /**
   * `elevated` — default motion shell with soft shadow (legacy).
   * `plain` — transparent shell; child panel supplies border/shadow so there is a single card chrome.
   */
  surface = 'elevated',
  /** Full viewport on small screens — profile forms, wizards. */
  edgeToEdgeMobile = false,
  /**
   * `default` — standard modal stack.
   * `nested` — sits above an already-open modal (remark / confirm over decision hub).
   */
  layer = 'default',
}) {
  const reduceMotion = useReducedMotion();
  const overlayTransition = reduceMotion ? { duration: 0 } : { duration: 0.3 };
  const contentTransition = reduceMotion
    ? { duration: 0 }
    : { type: 'spring', bounce: 0, duration: 0.45 };
  const zOverlay =
    layer === 'nested'
      ? 'fixed inset-0 z-[var(--z-layer-modal-nested)] bg-[#0f172a]/60 backdrop-blur-md'
      : 'fixed inset-0 z-[var(--z-layer-modal)] bg-[#0f172a]/60 backdrop-blur-md';
  const zShellBase =
    layer === 'nested'
      ? 'fixed inset-0 z-[var(--z-layer-modal-nested)]'
      : 'fixed inset-0 z-[var(--z-layer-modal)]';
  const closeZ =
    layer === 'nested'
      ? 'z-[var(--z-layer-modal-nested-close,1095)]'
      : 'z-[var(--z-layer-modal-close,1070)]';

  return (
    <DialogPrimitive.Root
      modal={modal}
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose?.();
      }}
    >
      <AnimatePresence>
        {isOpen && (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={overlayTransition}
                className={zOverlay}
              />
            </DialogPrimitive.Overlay>
            <DialogPrimitive.Content asChild>
              <div
                className={
                  edgeToEdgeMobile
                    ? `${zShellBase} flex items-stretch justify-center overflow-hidden outline-none sm:items-center sm:overflow-y-auto sm:overscroll-y-contain sm:px-6 sm:py-12`
                    : `${zShellBase} flex items-start justify-center overflow-y-auto overscroll-y-contain px-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] outline-none sm:items-center sm:px-6 sm:py-12`
                }
              >
                <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>
                <DialogPrimitive.Description className="sr-only">
                  {description ?? 'Modal dialog content.'}
                </DialogPrimitive.Description>
                <motion.div
                  initial={reduceMotion ? false : { opacity: 0, scale: 0.96, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={reduceMotion ? undefined : { opacity: 0, scale: 0.96, y: 10 }}
                  transition={contentTransition}
                  className={
                    edgeToEdgeMobile && surface === 'plain'
                      ? 'relative z-10 flex h-[100dvh] max-h-[100dvh] w-full max-w-none min-h-0 items-stretch justify-center outline-none sm:h-auto sm:max-h-[min(92dvh,960px)] sm:max-w-[min(1200px,calc(100dvw-1.5rem))]'
                      : surface === 'plain'
                        ? PLAIN_SURFACE_CLASS
                        : ELEVATED_SURFACE_CLASS
                  }
                >
                  {showCloseButton ? (
                    <DialogPrimitive.Close asChild>
                      <button
                        type="button"
                        disabled={closeDisabled}
                        aria-label="Close dialog"
                        className={`absolute right-3 top-3 ${closeZ} flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/90 bg-white/95 text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-40`}
                      >
                        <X className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden />
                      </button>
                    </DialogPrimitive.Close>
                  ) : null}
                  {children}
                </motion.div>
              </div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}
