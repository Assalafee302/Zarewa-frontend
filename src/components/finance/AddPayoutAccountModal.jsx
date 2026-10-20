import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/apiBase';
import { payoutAccountProblem } from '../../shared/lib/payoutAccountGuard.js';
import { ModalFrame, ModalScrollShell, ModalScrollBody, ModalActionFooter } from '../layout';

const INPUT = 'z-finance-field';

/**
 * Finance Phase A (A1): fill a payee's missing bank + 10-digit account from the pay desk.
 * `request` = { target: 'refund' | 'payment_request' | 'transport_agent', label, ...ids }.
 * The server refuses when the payee already has a usable account.
 */
export function AddPayoutAccountModal({ request, onClose, onSaved }) {
  const [form, setForm] = useState({ bankName: '', accountNo: '', accountName: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setForm({ bankName: '', accountNo: '', accountName: String(request?.payeeName || '') });
    setError('');
  }, [request]);

  const problem = payoutAccountProblem({ bankName: form.bankName, accountNo: form.accountNo });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (problem || busy || !request) return;
    setBusy(true);
    setError('');
    try {
      const { ok, data } = await apiFetch('/api/payout-accounts', {
        method: 'POST',
        body: JSON.stringify({ ...request, ...form }),
      });
      if (!ok || !data?.ok) {
        setError(data?.error || 'Could not save the payout account.');
        return;
      }
      onSaved?.(data);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalFrame isOpen={Boolean(request)} onClose={onClose} title="Add payout account" surface="plain">
      <ModalScrollShell>
        <form onSubmit={handleSubmit} data-testid="add-payout-account-form">
          <ModalScrollBody className="space-y-4">
            <p className="text-sm text-slate-700">
              <span className="font-semibold">{request?.label || 'Payee'}</span> has no usable payout account. Pay stays
              off until a bank and a 10-digit account number are on the profile.
            </p>
            <label className="block space-y-1">
              <span className="text-ui-xs font-bold uppercase tracking-wide text-slate-500">Bank</span>
              <input
                className={INPUT}
                value={form.bankName}
                onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))}
                placeholder="e.g. Moniepoint"
                autoFocus
              />
            </label>
            <label className="block space-y-1">
              <span className="text-ui-xs font-bold uppercase tracking-wide text-slate-500">Account number (10 digits)</span>
              <input
                className={`${INPUT} font-mono tabular-nums`}
                inputMode="numeric"
                value={form.accountNo}
                onChange={(e) => setForm((f) => ({ ...f, accountNo: e.target.value }))}
                placeholder="0123456789"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-ui-xs font-bold uppercase tracking-wide text-slate-500">Account name</span>
              <input
                className={INPUT}
                value={form.accountName}
                onChange={(e) => setForm((f) => ({ ...f, accountName: e.target.value }))}
              />
            </label>
            {form.bankName || form.accountNo ? (
              problem ? (
                <p className="text-xs font-semibold text-amber-800">{problem}</p>
              ) : (
                <p className="text-xs font-semibold text-teal-800">Account looks complete.</p>
              )
            ) : null}
            {error ? <p className="text-xs font-semibold text-rose-700">{error}</p> : null}
            <p className="text-ui-xs text-slate-500">Saved to the payee profile and the open document. Audited.</p>
          </ModalScrollBody>
          <ModalActionFooter
            onCancel={onClose}
            cancelDisabled={busy}
            confirmType="submit"
            confirmLabel="Save payout account"
            confirmDisabled={busy || Boolean(problem)}
            confirmLoading={busy}
            confirmLoadingLabel="Saving…"
          />
        </form>
      </ModalScrollShell>
    </ModalFrame>
  );
}
