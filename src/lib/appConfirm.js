/**
 * Promise-based confirm bridge — works inside React components and plain modules.
 * Registered by ConfirmProvider on mount; falls back to window.confirm only before hydration.
 */

let confirmImpl = null;

export function registerAppConfirm(fn) {
  confirmImpl = fn;
}

export function unregisterAppConfirm() {
  confirmImpl = null;
}

/**
 * @param {string | { title?: string; message?: string; description?: string; confirmLabel?: string; cancelLabel?: string; variant?: 'primary' | 'danger' }} opts
 * @returns {Promise<boolean>}
 */
export async function appConfirm(opts = {}) {
  const normalized =
    typeof opts === 'string'
      ? { message: opts }
      : {
          title: opts.title,
          message: opts.message ?? opts.description ?? '',
          confirmLabel: opts.confirmLabel,
          cancelLabel: opts.cancelLabel,
          variant: opts.variant,
        };

  if (confirmImpl) {
    return confirmImpl(normalized);
  }

  const text = [normalized.title, normalized.message].filter(Boolean).join('\n\n');
  return window.confirm(text || 'Continue?');
}
