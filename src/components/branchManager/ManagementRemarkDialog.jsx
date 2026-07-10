import React, { useEffect, useState } from 'react';
import { ModalFrame } from '../layout';
import { Button } from '../ui';

/**
 * Replaces window.prompt for management decisions — remark / reason capture.
 */
export function ManagementRemarkDialog({
  open,
  title = 'Add a note',
  description = '',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  placeholder = '',
  minLength = 0,
  optional = false,
  multiline = true,
  busy = false,
  variant = 'primary',
  value: controlledValue,
  onChange: controlledOnChange,
  onConfirm,
  onCancel,
}) {
  const [internalValue, setInternalValue] = useState('');
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : internalValue;
  const setValue = isControlled ? controlledOnChange : setInternalValue;
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      if (!isControlled) setInternalValue('');
      setError('');
    }
  }, [open, title, isControlled]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = String(value || '').trim();
    if (!optional && trimmed.length < minLength) {
      setError(minLength > 0 ? `Enter at least ${minLength} characters.` : 'This field is required.');
      return;
    }
    if (optional && trimmed.length > 0 && trimmed.length < minLength) {
      setError(`If provided, enter at least ${minLength} characters.`);
      return;
    }
    onConfirm?.(trimmed);
  };

  if (!open) return null;

  const confirmClass =
    variant === 'danger'
      ? 'bg-rose-600 hover:bg-rose-500 text-white'
      : 'bg-zarewa-teal hover:brightness-105 text-white';

  return (
    <ModalFrame isOpen={open} onClose={() => !busy && onCancel?.()}>
      <form
        onSubmit={handleSubmit}
        className="z-modal-panel w-full max-w-md p-6 sm:p-8 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h3 className="text-lg font-black text-zarewa-teal">{title}</h3>
          {description ? <p className="mt-2 text-sm text-slate-600 leading-relaxed">{description}</p> : null}
        </div>
        {multiline ? (
          <textarea
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError('');
            }}
            rows={3}
            autoFocus
            placeholder={placeholder}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-zarewa-teal/15"
          />
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError('');
            }}
            autoFocus
            placeholder={placeholder}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-zarewa-teal/15"
          />
        )}
        {error ? <p className="text-xs font-semibold text-rose-700">{error}</p> : null}
        {optional ? (
          <p className="text-xs text-slate-500">Optional — leave blank if not needed.</p>
        ) : null}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end pt-2">
          <Button type="button" variant="outline" disabled={busy} onClick={() => onCancel?.()}>
            {cancelLabel}
          </Button>
          <button
            type="submit"
            disabled={busy}
            className={`inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-wide disabled:opacity-50 ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </form>
    </ModalFrame>
  );
}

/**
 * Replaces window.confirm for bulk / destructive management actions.
 * @deprecated Import from `../ui/ConfirmDialog` instead.
 */
export { ConfirmDialog as ManagementConfirmDialog } from '../ui/ConfirmDialog';
