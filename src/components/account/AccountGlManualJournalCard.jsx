import React, { useState } from 'react';
import { apiFetch } from '../../lib/apiBase';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Minimal balanced manual journal (two lines) with optional shared cost-center tag on both lines.
 */
export function AccountGlManualJournalCard({ showToast, onPosted, canPost }) {
  const [entryDate, setEntryDate] = useState(todayIso);
  const [memo, setMemo] = useState('');
  const [costCenter, setCostCenter] = useState('');
  const [debitAccount, setDebitAccount] = useState('6100');
  const [creditAccount, setCreditAccount] = useState('1000');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);

  if (!canPost) return null;

  const submit = async (e) => {
    e.preventDefault();
    const amt = Math.round(Number(String(amount).replace(/,/g, '')) || 0);
    if (!amt || amt <= 0) {
      showToast('Enter a positive amount.', { variant: 'error' });
      return;
    }
    const cc = costCenter.trim().slice(0, 64) || undefined;
    const lines = [
      { accountCode: debitAccount.trim(), debitNgn: amt, memo: memo.trim() || null, costCenter: cc },
      { accountCode: creditAccount.trim(), creditNgn: amt, memo: memo.trim() || null, costCenter: cc },
    ];
    setBusy(true);
    try {
      const { ok, data } = await apiFetch('/api/gl/journal', {
        method: 'POST',
        body: JSON.stringify({
          entryDateISO: entryDate,
          memo: memo.trim() || 'Manual journal',
          lines,
        }),
      });
      if (!ok || !data?.ok) {
        const msg = data?.error || 'Could not post journal.';
        showToast(data?.code ? `${msg} (${data.code})` : msg, { variant: 'error' });
        return;
      }
      showToast(data.duplicate ? 'Journal already exists for this source (idempotent).' : 'Journal posted.', {
        variant: 'success',
      });
      onPosted?.();
      setAmount('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border border-slate-200/60 bg-white/60 backdrop-blur-md p-4 shadow-sm">
      <h3 className="text-xs font-bold text-[#134e4a] uppercase tracking-widest mb-3">Manual GL journal (balanced)</h3>
      <p className="text-[10px] text-slate-600 mb-4 leading-relaxed">
        Two-line balanced entry for adjustments. Use GL account <span className="font-mono">codes</span> from your chart
        (defaults shown). Optional cost center is stored on each line for TB filtering (Reports → GL pilot).
      </p>
      <form className="space-y-3" onSubmit={submit}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Entry date</label>
            <input type="date" className="z-input w-full" value={entryDate} onChange={(ev) => setEntryDate(ev.target.value)} />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Amount (₦)</label>
            <input
              className="z-input w-full"
              inputMode="numeric"
              value={amount}
              onChange={(ev) => setAmount(ev.target.value)}
              placeholder="e.g. 50000"
            />
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Memo</label>
          <input className="z-input w-full" value={memo} onChange={(ev) => setMemo(ev.target.value)} placeholder="Why this entry" />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Cost center (optional)</label>
          <input
            className="z-input w-full"
            value={costCenter}
            onChange={(ev) => setCostCenter(ev.target.value)}
            maxLength={64}
            placeholder="Tag for reporting (same on both lines)"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Debit account code</label>
            <input className="z-input w-full font-mono" value={debitAccount} onChange={(ev) => setDebitAccount(ev.target.value)} />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Credit account code</label>
            <input className="z-input w-full font-mono" value={creditAccount} onChange={(ev) => setCreditAccount(ev.target.value)} />
          </div>
        </div>
        <button type="submit" className="z-btn-primary w-full sm:w-auto !text-[11px]" disabled={busy}>
          {busy ? 'Posting…' : 'Post journal'}
        </button>
      </form>
    </div>
  );
}
