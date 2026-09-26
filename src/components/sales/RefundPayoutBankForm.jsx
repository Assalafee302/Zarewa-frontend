import React, { useEffect, useMemo, useState } from 'react';
import { CreditCard } from 'lucide-react';
import { ModalFrame } from '../layout';
import { RecentPayeeSuggestionChips } from '../office/RecentPayeeSuggestionChips.jsx';

const COMMON_BANKS = [
  'Access Bank',
  'GTBank',
  'UBA',
  'Zenith Bank',
  'First Bank',
  'Fidelity Bank',
  'FCMB',
  'Sterling Bank',
  'Union Bank',
  'Wema Bank',
  'Ecobank',
  'OPay',
  'Palmpay',
  'Moniepoint',
  'Kuda',
];

/**
 * Compact nested modal to capture bank details for a refund recipient.
 */
export function RefundPayoutBankForm({
  open,
  title = 'Add payout bank',
  subtitle = '',
  initial = {},
  saving = false,
  error = '',
  suggestions = [],
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

  const bankListId = 'refund-payout-bank-names';
  const rememberedBanks = useMemo(() => {
    const extra = suggestions
      .map((s) => String(s.payeeBankName || '').trim())
      .filter(Boolean);
    return [...new Set([...COMMON_BANKS, ...extra])];
  }, [suggestions]);

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
          <RecentPayeeSuggestionChips
            variant="dark"
            heading="Remembered accounts"
            suggestions={suggestions}
            onSelect={(s) => {
              setBankAccountName(s.payeeName || bankAccountName);
              setBankName(s.payeeBankName || '');
              setBankAccountNo(String(s.payeeAccountNo || '').replace(/\D/g, ''));
            }}
          />
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
              placeholder="e.g. Access Bank, OPay"
              required
              list={bankListId}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-sky-500/60"
            />
            <datalist id={bankListId}>
              {rememberedBanks.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </label>
          <label className="block space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Account number</span>
            <input
              value={bankAccountNo}
              onChange={(e) => setBankAccountNo(e.target.value.replace(/[^\d]/g, '').slice(0, 20))}
              placeholder="NUBAN / wallet number"
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
