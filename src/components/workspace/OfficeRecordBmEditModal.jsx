import React, { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

export default function OfficeRecordBmEditModal({ open, thread, onClose, onSave, busy }) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [editReason, setEditReason] = useState('');

  useEffect(() => {
    if (open && thread) {
      setSubject(thread.subject || '');
      setBody(thread.body || '');
      setEditReason('');
    }
  }, [open, thread]);

  const save = async () => {
    const ok = await onSave?.({ subject, body, editReason });
    if (ok) onClose?.();
  };

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose?.()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[210] bg-slate-900/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[211] max-h-[90vh] w-[min(100%,32rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
          <div className="flex items-center justify-between gap-2">
            <Dialog.Title className="text-lg font-bold text-slate-900">Edit office record</Dialog.Title>
            <Dialog.Close className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close">
              <X size={18} />
            </Dialog.Close>
          </div>
          <p className="mt-2 text-xs text-slate-600">Prior version is saved to the audit trail.</p>
          <label className="mt-4 block text-xs font-semibold text-slate-700">
            Subject
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </label>
          <label className="mt-3 block text-xs font-semibold text-slate-700">
            Body
            <textarea
              className="mt-1 w-full rounded-lg border border-slate-200 p-3 text-sm"
              rows={5}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </label>
          <label className="mt-3 block text-xs font-semibold text-slate-700">
            Reason for edit
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={editReason}
              onChange={(e) => setEditReason(e.target.value)}
              placeholder="e.g. Clarified machine fault details"
            />
          </label>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void save()}
              className="flex-1 rounded-xl bg-teal-800 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy ? 'Saving…' : 'Save edits'}
            </button>
            <button
              type="button"
              onClick={() => onClose?.()}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700"
            >
              Cancel
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
