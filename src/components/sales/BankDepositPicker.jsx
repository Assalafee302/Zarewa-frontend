import React, { useCallback, useEffect, useMemo } from 'react';
import { Link2 } from 'lucide-react';
import { formatNgn } from '../../Data/mockData';
import { apiFetch } from '../../lib/apiBase';
import { bankDepositStatusLabel, openBankDepositsFromSnapshot } from '../../lib/bankDeposits';

/**
 * Optional link to a registered unlinked bank deposit (avoids duplicate treasury credit).
 */
export function BankDepositPicker({
  value = '',
  onChange,
  amountNgn = 0,
  bankDateISO = '',
  bankReference = '',
  snapshot,
  disabled = false,
  className = '',
}) {
  const deposits = useMemo(() => openBankDepositsFromSnapshot(snapshot), [snapshot]);

  const sorted = useMemo(() => {
    const amt = Math.round(Number(amountNgn) || 0);
    const ref = String(bankReference || '').trim().toLowerCase();
    const date = String(bankDateISO || '').slice(0, 10);
    return [...deposits].sort((a, b) => {
      let sa = 0;
      let sb = 0;
      if (ref && String(a.bankReference || '').trim().toLowerCase() === ref) sa += 100;
      if (ref && String(b.bankReference || '').trim().toLowerCase() === ref) sb += 100;
      if (amt > 0 && Math.round(Number(a.amountNgn) || 0) === amt) sa += 40;
      if (amt > 0 && Math.round(Number(b.amountNgn) || 0) === amt) sb += 40;
      if (date && String(a.bankDateISO) === date) sa += 20;
      if (date && String(b.bankDateISO) === date) sb += 20;
      return sb - sa || String(b.bankDateISO || '').localeCompare(String(a.bankDateISO || ''));
    });
  }, [deposits, amountNgn, bankReference, bankDateISO]);

  const reserve = useCallback(
    async (depositId) => {
      if (!depositId) return;
      await apiFetch(`/api/bank-deposits/${encodeURIComponent(depositId)}/reserve`, { method: 'PATCH' });
    },
    []
  );

  const release = useCallback(async (depositId) => {
    if (!depositId) return;
    await apiFetch(`/api/bank-deposits/${encodeURIComponent(depositId)}/release-reservation`, {
      method: 'PATCH',
    });
  }, []);

  useEffect(() => {
    const id = String(value || '').trim();
    if (!id || disabled) return;
    const stillLinkable = sorted.some((d) => String(d.id) === id);
    if (!stillLinkable) onChange?.('');
  }, [value, sorted, disabled, onChange]);

  useEffect(() => {
    const id = String(value || '').trim();
    if (!id || disabled) return;
    void reserve(id);
    return () => {
      void release(id);
    };
  }, [value, disabled, reserve, release]);

  if (!sorted.length) {
    return (
      <p className={`text-[10px] text-slate-500 leading-snug ${className}`}>
        No unlinked bank deposits in this branch. Finance can register bank payments when money arrives before Sales
        identifies the customer.
      </p>
    );
  }

  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-[#134e4a]">
        <Link2 size={12} /> Link bank deposit (optional)
      </label>
      <select
        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-medium text-slate-800 disabled:opacity-60"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.value)}
      >
        <option value="">— Post new treasury movement (no link) —</option>
        {sorted.map((d) => (
          <option key={d.id} value={d.id}>
            {d.id} · {formatNgn(d.remainingNgn)} left · {d.bankDateISO}
            {d.bankReference ? ` · ${d.bankReference}` : ''} · {bankDepositStatusLabel(d.status)}
          </option>
        ))}
      </select>
      {value ? (
        <p className="text-[9px] text-teal-800 leading-snug">
          Treasury will not credit again for the linked portion — cash was recorded when Finance registered this deposit.
        </p>
      ) : (
        <p className="text-[9px] text-amber-800 leading-snug">
          If this payment matches a row below, link it to avoid duplicate cash in treasury.
        </p>
      )}
    </div>
  );
}
