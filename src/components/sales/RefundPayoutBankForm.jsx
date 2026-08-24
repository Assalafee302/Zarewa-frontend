import React, { useEffect, useState } from 'react';
import { CreditCard } from 'lucide-react';
import { ModalFrame } from '../layout';

/**
 * Compact nested modal to capture bank details for a refund recipient.
 * Must sit above RefundModal (ModalFrame layer nested) — a plain z-80 overlay
 * opens behind the refund dialog and looks like “Add bank” does nothing.
 *
 * @param {{
 *   open: boolean;
 *   title?: string;
 *   subtitle?: string;
 *   initial?: { bankAccountName?: string; bankName?: string; bankAccountNo?: string };
 *   saving?: boolean;
 *   error?: string;
 *   onClose: () => void;
 *   onSave: (bank: { bankAccountName: string; bankName: string; bankAccountNo: string }) => void | Promise<void>;
 * }} props
 */
export function RefundPayoutBankForm({
  open,
  title = 'Add payout bank',
  subtitle = '',
  initial = {},
  saving = false,
  error = '',
  onClose,
  onSave,
}) {
  const [bankAccountName, setBankAccountName] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccountNo, setBankAccountNo] = useState('');

  useEffect(() => {
    if (!open) return;
    setBankAccountName(String(initial.bankAccountName || '').trim());
    setBankName(String(initial.bankName || '').trim());
    setBankAccountNo(String(initial.bankAccountNo || '').trim());
  }, [open, initial.bankAccountName, initial.bankName, initial.bankAccountNo]);

  const submit = (e) => {
    e.preventDefault();
    void onSave({
      bankAccountName: bankAccountName.trim(),
      bankName: bankName.trim(),
      bankAccountNo: bankAccountNo.trim().replace(/\s+/g, ''),
    });
  };

  return (
    <ModalFrame
      isOpen={open}
      onClose={() => {
        if (saving) return;
        onClose?.();
      }}
      title={title}
      description={subtitle || 'Save bank details for refund payout.'}
      layer="nested"
      surface="plain"
      showCloseButton={false}
      closeDisabled={saving}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="refund-payout-bank-title"
        className="w-full max-w-md rounded-2xl border border-slate-600 bg-slate-900 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-700 px-4 py-3">
          <div className="min-w-0">
            <p id="refund-payout-bank-title" className="flex items-center gap-2 text-sm font-bold text-white">
              <CreditCard size={16} className="text-sky-300" />
              {title}
            </p>
            {subtitle ? <p className="mt-1 text-ui-xs text-slate-400 leading-snug">{subtitle}</p> : null}
          </div>
        </div>
        <form onSubmit={submit} className="space-y-3 px-4 py-4">
          <label className="block space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Account name</span>
            <input
              autoFocus
              value={bankAccountName}
              onChange={(e) => setBankAccountName(e.target.value)}
              placeholder="Name on the account"
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-sky-500/60"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Bank name</span>
            <input
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="e.g. Access Bank"
              required
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-sky-500/60"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Account number</span>
            <input
              value={bankAccountNo}
              onChange={(e) => setBankAccountNo(e.target.value.replace(/[^\d]/g, '').slice(0, 20))}
              placeholder="NUBAN / account number"
              inputMode="numeric"
              required
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white tabular-nums outline-none focus:border-sky-500/60"
            />
          </label>
          {error ? <p className="text-ui-xs text-rose-300 leading-snug">{error}</p> : null}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !bankName.trim() || bankAccountNo.trim().length < 6}
              className="rounded-lg bg-sky-600 px-3 py-2 text-xs font-bold text-white hover:bg-sky-500 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save & use'}
            </button>
          </div>
        </form>
      </div>
    </ModalFrame>
  );
}
