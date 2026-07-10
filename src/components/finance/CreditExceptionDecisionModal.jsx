import React, { useState } from 'react';
import { X } from 'lucide-react';
import { formatNgn } from '../../Data/mockData';
import { postCreditExceptionDecision, revokeCreditExceptionApi } from '../../hooks/useCreditExceptions';
import { FinanceActionButton } from './FinanceActionButton';

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

  if (!open || !item) return null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-black text-zarewa-teal">
            {mode === 'revoke' ? 'Revoke credit' : 'Review credit request'}
          </h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700" aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <div className="space-y-4 p-5">
          <p className="text-sm text-slate-600">
            Quotation <span className="font-bold text-slate-900">{item.quotationRef}</span> · Credit{' '}
            <span className="font-bold">{formatNgn(item.amountNgn)}</span>
          </p>
          <p className="text-xs text-slate-500">{item.reason || 'No reason provided'}</p>
          <p className="text-xs font-medium text-amber-800 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2">
            Customer debt remains until paid. This only affects delivery release permission.
          </p>
          <label className="block text-xs font-bold text-slate-600">
            Decision note
            <textarea
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional note for audit trail"
            />
          </label>
          {error ? <p className="text-sm font-bold text-rose-700">{error}</p> : null}
          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <FinanceActionButton variant="secondary" onClick={onClose} disabled={busy}>
              Cancel
            </FinanceActionButton>
            {mode === 'revoke' ? (
              <FinanceActionButton variant="danger" onClick={() => submit('revoke')} disabled={busy}>
                Revoke credit
              </FinanceActionButton>
            ) : (
              <>
                <FinanceActionButton variant="danger" onClick={() => submit('reject')} disabled={busy}>
                  Reject
                </FinanceActionButton>
                <FinanceActionButton variant="primary" onClick={() => submit('approve')} disabled={busy}>
                  Approve
                </FinanceActionButton>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
