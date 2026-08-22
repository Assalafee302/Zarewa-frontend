import React from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { ModalScrollFooter } from './ModalScrollShell';
import { cn } from '../../lib/utils';

/**
 * Standard modal footer: Cancel (left on mobile stack) + primary action (right).
 */
export function ModalActionButtons({
  onCancel,
  cancelLabel = 'Cancel',
  cancelDisabled = false,
  onConfirm,
  confirmLabel = 'Save',
  confirmDisabled = false,
  confirmLoading = false,
  confirmLoadingLabel = 'Saving…',
  confirmVariant = 'default',
  confirmType = 'button',
  form,
  children,
  className = '',
}) {
  const showConfirm = Boolean(onConfirm) || confirmType === 'submit';
  return (
    <div
      className={cn(
        'flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end',
        className
      )}
    >
      {onCancel ? (
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={cancelDisabled || confirmLoading}
          className="w-full sm:w-auto"
        >
          {cancelLabel}
        </Button>
      ) : null}
      {children}
      {showConfirm ? (
        <Button
          type={confirmType}
          variant={confirmVariant}
          form={form}
          onClick={confirmType === 'button' ? onConfirm : undefined}
          disabled={confirmDisabled || confirmLoading}
          className="w-full sm:w-auto"
        >
          {confirmLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              {confirmLoadingLabel}
            </>
          ) : (
            confirmLabel
          )}
        </Button>
      ) : null}
    </div>
  );
}

/**
 * Standard modal footer: Cancel (left on mobile stack) + primary action (right).
 */
export function ModalActionFooter({ footerClassName = '', ...props }) {
  return (
    <ModalScrollFooter className={footerClassName}>
      <ModalActionButtons {...props} />
    </ModalScrollFooter>
  );
}
