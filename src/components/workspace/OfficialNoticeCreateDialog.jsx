import React, { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

/**
 * Publish an official notice — titled form, not browser prompts.
 */
export function OfficialNoticeCreateDialog({
  open,
  onClose,
  onPublish,
  busy = false,
  blocked = false,
  blockedMessage,
}) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setTitle('');
      setContent('');
      setError('');
    }
  }, [open]);

  const canSubmit = !busy && !blocked && title.trim() && content.trim();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError('');
    const result = await onPublish?.({ title: title.trim(), content: content.trim() });
    if (result === true) {
      onClose?.();
      return;
    }
    setError(typeof result === 'string' && result.trim() ? result : 'Could not publish notice.');
  };

  return (
    <Dialog.Root open={open} onOpenChange={(next) => { if (!next && !busy) onClose?.(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[200] bg-slate-900/40" />
        <Dialog.Content
          aria-describedby="official-notice-hint"
          className="fixed inset-x-0 bottom-0 z-[201] max-h-[92vh] overflow-y-auto rounded-t-2xl border border-slate-200 bg-white p-4 shadow-xl sm:inset-x-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl"
        >
          <div className="flex items-center justify-between gap-2">
            <Dialog.Title className="text-lg font-bold text-slate-900">Create official notice</Dialog.Title>
            <Dialog.Close
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              aria-label="Close"
              disabled={busy}
            >
              <X size={18} aria-hidden />
            </Dialog.Close>
          </div>
          <p id="official-notice-hint" className="mt-1 text-sm text-slate-600">
            Published notices appear on every desk that acknowledges company announcements.
          </p>

          {blocked ? (
            <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {blockedMessage || 'Reconnect before publishing notices.'}
            </p>
          ) : (
            <form className="mt-4 space-y-3" onSubmit={(e) => void handleSubmit(e)}>
              <div>
                <label htmlFor="official-notice-title" className="mb-1 block text-sm font-semibold text-slate-800">
                  Title
                </label>
                <input
                  id="official-notice-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  autoComplete="off"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-zarewa-teal focus-visible:ring-offset-1"
                />
              </div>
              <div>
                <label htmlFor="official-notice-content" className="mb-1 block text-sm font-semibold text-slate-800">
                  Notice
                </label>
                <textarea
                  id="official-notice-content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  required
                  rows={6}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-zarewa-teal focus-visible:ring-offset-1"
                />
              </div>
              {error ? (
                <p className="text-sm font-semibold text-rose-800" role="alert">
                  {error}
                </p>
              ) : null}
              <div className="flex flex-wrap justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => onClose?.()}
                  disabled={busy}
                  className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="rounded-lg bg-teal-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy ? 'Publishing…' : 'Publish notice'}
                </button>
              </div>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
