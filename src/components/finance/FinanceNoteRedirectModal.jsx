import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { FinanceActionButton } from './FinanceActionButton';

/**
 * Short cashier note then navigate to legacy finance for full workflow.
 */
export function FinanceNoteRedirectModal({ open, onClose, title, description, redirectTo, confirmLabel = 'Continue' }) {
  const [note, setNote] = useState('');
  const navigate = useNavigate();
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-lg font-black text-[#134e4a]">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <div className="space-y-4 p-5">
          <p className="text-sm text-slate-600">{description}</p>
          <label className="block text-xs font-bold text-slate-600">
            Note (optional)
            <textarea
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          <div className="flex justify-end gap-2">
            <FinanceActionButton variant="secondary" onClick={onClose}>
              Cancel
            </FinanceActionButton>
            <FinanceActionButton
              variant="primary"
              onClick={() => {
                const q = note.trim() ? `?note=${encodeURIComponent(note.trim())}` : '';
                navigate(`${redirectTo}${q}`);
                onClose();
              }}
            >
              {confirmLabel}
            </FinanceActionButton>
          </div>
        </div>
      </div>
    </div>
  );
}
