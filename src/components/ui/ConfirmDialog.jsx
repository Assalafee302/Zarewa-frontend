/* eslint-disable react-refresh/only-export-components */
import React, { useCallback, useMemo, useState } from 'react';
import { ModalFrame } from '../layout';
import { Button } from './button';

/**
 * Accessible confirm dialog — replaces window.confirm.
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
  if (!open) return null;

  const confirmClass =
    variant === 'danger'
      ? 'bg-rose-600 hover:bg-rose-500 text-white'
      : undefined;

  return (
    <ModalFrame
      isOpen={open}
      onClose={() => !busy && onCancel?.()}
      title={title}
      description={description || 'Confirmation dialog'}
      closeDisabled={busy}
      layer="nested"
    >
      <div className="z-modal-panel w-full max-w-md p-6 sm:p-8 space-y-5">
        <div aria-hidden="true">
          <h3 className="text-lg font-black text-zarewa-teal">{title}</h3>
          {description ? (
            <p className="mt-2 text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{description}</p>
          ) : null}
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
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
      </div>
    </ModalFrame>
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
