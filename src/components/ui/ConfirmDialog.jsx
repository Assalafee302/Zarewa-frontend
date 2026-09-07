/* eslint-disable react-refresh/only-export-components */
import React, { useCallback, useMemo, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Button } from './button';

/**
 * Accessible confirm dialog — replaces window.confirm.
 * CSS-only shell (no framer-motion) so auth boot does not download motion (~120KB).
 */
export function ConfirmDialog({
  open,
  title = 'Confirm',
  description = '',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  busy = false,
  variant = 'primary',
  onConfirm,
  onCancel,
}) {
  const confirmClass =
    variant === 'danger'
      ? 'bg-rose-600 hover:bg-rose-500 text-white'
      : undefined;

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        if (!next && !busy) onCancel?.();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[var(--z-layer-modal-nested)] bg-[#0f172a]/60 backdrop-blur-md" />
        <DialogPrimitive.Content
          className="fixed left-1/2 top-1/2 z-[var(--z-layer-modal-nested)] w-[min(28rem,calc(100dvw-1.5rem))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/70 bg-white p-6 shadow-[0_28px_80px_-36px_rgba(15,23,42,0.45)] outline-none sm:p-8"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogPrimitive.Title className="text-lg font-black text-zarewa-teal">{title}</DialogPrimitive.Title>
          {description ? (
            <DialogPrimitive.Description className="mt-2 text-sm leading-relaxed whitespace-pre-wrap text-slate-600">
              {description}
            </DialogPrimitive.Description>
          ) : (
            <DialogPrimitive.Description className="sr-only">Confirmation dialog</DialogPrimitive.Description>
          )}
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" size="default" disabled={busy} onClick={() => onCancel?.()}>
              {cancelLabel}
            </Button>
            <Button
              type="button"
              size="default"
              variant={variant === 'danger' ? 'destructive' : 'default'}
              disabled={busy}
              onClick={() => onConfirm?.()}
              className={confirmClass}
            >
              {confirmLabel}
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

const EMPTY_CONFIG = {
  open: false,
  title: 'Confirm',
  description: '',
  confirmLabel: 'Confirm',
  cancelLabel: 'Cancel',
  variant: 'primary',
  busy: false,
};

/**
 * Promise-based confirm dialog hook.
 * @returns {{ confirm: (opts) => Promise<boolean>; dialogProps: object; ConfirmDialogHost: React.ComponentType }}
 */
export function useConfirmDialog() {
  const [config, setConfig] = useState(EMPTY_CONFIG);
  const resolverRef = React.useRef(null);

  const confirm = useCallback((opts = {}) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setConfig({
        open: true,
        title: opts.title ?? 'Confirm',
        description: opts.description ?? opts.message ?? '',
        confirmLabel: opts.confirmLabel ?? 'Confirm',
        cancelLabel: opts.cancelLabel ?? 'Cancel',
        variant: opts.variant ?? 'primary',
        busy: false,
      });
    });
  }, []);

  const close = useCallback((result) => {
    setConfig((c) => ({ ...c, open: false, busy: false }));
    const resolve = resolverRef.current;
    resolverRef.current = null;
    resolve?.(result);
  }, []);

  const dialogProps = useMemo(
    () => ({
      ...config,
      onConfirm: () => close(true),
      onCancel: () => close(false),
    }),
    [config, close]
  );

  const ConfirmDialogHost = useCallback(
    () => <ConfirmDialog {...dialogProps} />,
    [dialogProps]
  );

  return { confirm, dialogProps, ConfirmDialogHost };
}
