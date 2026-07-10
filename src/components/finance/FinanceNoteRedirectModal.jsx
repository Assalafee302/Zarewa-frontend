import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ModalFrame, ModalScrollShell, ModalScrollBody, ModalActionFooter } from '../layout';
import { FieldLabel, Textarea } from '../ui/Input';

/**
 * Short cashier note then navigate to legacy finance for full workflow.
 */
export function FinanceNoteRedirectModal({ open, onClose, title, description, redirectTo, confirmLabel = 'Continue' }) {
  const [note, setNote] = useState('');
  const navigate = useNavigate();

  const handleConfirm = () => {
    const q = note.trim() ? `?note=${encodeURIComponent(note.trim())}` : '';
    navigate(`${redirectTo}${q}`);
    setNote('');
    onClose();
  };

  return (
    <ModalFrame isOpen={open} onClose={onClose} title={title} surface="plain">
      <ModalScrollShell size="sm">
        <ModalScrollBody className="space-y-4">
          <p className="text-sm text-slate-600">{description}</p>
          <div>
            <FieldLabel htmlFor="finance-redirect-note">Note (optional)</FieldLabel>
            <Textarea
              id="finance-redirect-note"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </ModalScrollBody>
        <ModalActionFooter onCancel={onClose} onConfirm={handleConfirm} confirmLabel={confirmLabel} />
      </ModalScrollShell>
    </ModalFrame>
  );
}
