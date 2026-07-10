import React, { useState } from 'react';
import { formatNgn } from '../../Data/mockData';
import { postCreditExceptionDecision, revokeCreditExceptionApi } from '../../hooks/useCreditExceptions';
import { ModalFrame, ModalScrollShell, ModalScrollBody, ModalActionFooter } from '../layout';
import { Button } from '../ui/button';
import { FieldLabel, Textarea } from '../ui/Input';

/**
 * @param {{
 *   open: boolean;
 *   onClose: () => void;
 *   item: object | null;
 *   mode: 'review' | 'revoke';
 *   onDone?: () => void;
 * }} props
 */
export function CreditExceptionDecisionModal({ open, onClose, item, mode, onDone }) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!item) return null;

  async function submit(decision) {
    setBusy(true);
    setError('');
    const r =
      mode === 'revoke'
        ? await revokeCreditExceptionApi(item.id, { decisionNote: note })
        : await postCreditExceptionDecision(item.id, decision, { decisionNote: note });
    setBusy(false);
    if (!r.ok) {
      setError(r.error || 'Could not save decision');
      return;
    }
    setNote('');
    onDone?.();
    onClose();
  }

  return (
    <ModalFrame
      isOpen={open}
      onClose={onClose}
      title={mode === 'revoke' ? 'Revoke credit' : 'Review credit request'}
      surface="plain"
    >
      <ModalScrollShell size="sm">
        <ModalScrollBody className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-zarewa-teal">
              {mode === 'revoke' ? 'Revoke credit' : 'Review credit request'}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Quotation <span className="font-bold text-slate-900">{item.quotationRef}</span> · Credit{' '}
              <span className="font-bold">{formatNgn(item.amountNgn)}</span>
            </p>
          </div>
          <p className="text-xs text-slate-500">{item.reason || 'No reason provided'}</p>
          <p className="text-xs font-medium text-amber-800 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2">
            Customer debt remains until paid. This only affects delivery release permission.
          </p>
          <div>
            <FieldLabel htmlFor="credit-decision-note">Decision note</FieldLabel>
            <Textarea
              id="credit-decision-note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional note for audit trail"
            />
          </div>
          {error ? <p className="text-sm font-bold text-rose-700">{error}</p> : null}
        </ModalScrollBody>
        <ModalActionFooter onCancel={onClose} cancelDisabled={busy}>
          {mode === 'revoke' ? (
            <Button type="button" variant="destructive" onClick={() => submit('revoke')} disabled={busy}>
              Revoke credit
            </Button>
          ) : (
            <>
              <Button type="button" variant="destructive" onClick={() => submit('reject')} disabled={busy}>
                Reject
              </Button>
              <Button type="button" onClick={() => submit('approve')} disabled={busy}>
                Approve
              </Button>
            </>
          )}
        </ModalActionFooter>
      </ModalScrollShell>
    </ModalFrame>
  );
}
