import React, { useCallback, useEffect, useMemo } from 'react';
import { Link2 } from 'lucide-react';
import { formatNgn } from '../../Data/mockData';
import { apiFetch } from '../../lib/apiBase';
import { bankDepositStatusLabel, openBankDepositsFromSnapshot, scoreBankDepositMatch } from '../../lib/bankDeposits';

/**
 * Optional link to a registered unlinked bank deposit (avoids duplicate treasury credit).
 * Ranks by exact/close amount, exact/close date (±2 days), and bank reference.
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

  const ranked = useMemo(() => {
    const target = { amountNgn, bankDateISO, bankReference };
    return [...deposits]
      .map((d) => {
        const match = scoreBankDepositMatch(d, target);
        return { deposit: d, match };
      })
      .sort(
        (a, b) =>
          b.match.score - a.match.score ||
          String(b.deposit.bankDateISO || '').localeCompare(String(a.deposit.bankDateISO || ''))
      );
  }, [deposits, amountNgn, bankReference, bankDateISO]);

  const suggested = useMemo(() => ranked.filter((r) => r.match.score > 0).slice(0, 5), [ranked]);

  const reserve = useCallback(async (depositId) => {
    if (!depositId) return;
    await apiFetch(`/api/bank-deposits/${encodeURIComponent(depositId)}/reserve`, { method: 'PATCH' });
  }, []);

  const release = useCallback(async (depositId) => {
    if (!depositId) return;
    await apiFetch(`/api/bank-deposits/${encodeURIComponent(depositId)}/release-reservation`, {
      method: 'PATCH',
    });
  }, []);

  useEffect(() => {
    const id = String(value || '').trim();
    if (!id || disabled) return;
    const stillLinkable = ranked.some((r) => String(r.deposit.id) === id);
    if (!stillLinkable) onChange?.('');
  }, [value, ranked, disabled, onChange]);

  useEffect(() => {
    const id = String(value || '').trim();
    if (!id || disabled) return;
    void reserve(id);
    return () => {
      void release(id);
    };
  }, [value, disabled, reserve, release]);

  if (!ranked.length) {
    return (
      <p className={`text-ui-xs text-slate-500 leading-snug ${className}`}>
        No unlinked bank deposits in this branch. Finance can register bank payments when money arrives before Sales
        identifies the customer.
      </p>
    );
  }

  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="flex items-center gap-1.5 text-ui-xs font-bold uppercase tracking-wide text-zarewa-teal">
        <Link2 size={12} /> Link bank deposit (optional)
      </label>
      {suggested.length > 0 ? (
        <p className="text-ui-xs text-teal-900/80 leading-snug">
          Suggested: {suggested.map((r) => r.deposit.id).join(', ')}
          {suggested[0]?.match?.matchHints?.length
            ? ` (${suggested[0].match.matchHints.join(', ')})`
            : ''}
          . Close amount (±₦100 or 1%) and close date (±2 days) are ranked higher.
        </p>
      ) : null}
      <select
        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-800 disabled:opacity-60"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.value)}
      >
        <option value="">— Post new treasury movement (no link) —</option>
        {ranked.map(({ deposit: d, match }) => {
          const hint =
            match.score > 0 && match.matchHints.length ? ` · ${match.matchHints.join(', ')}` : '';
          return (
            <option key={d.id} value={d.id}>
              {match.score > 0 ? '★ ' : ''}
              {d.id} · {formatNgn(d.remainingNgn)} left · {d.bankDateISO}
              {d.bankReference ? ` · ${d.bankReference}` : ''} · {bankDepositStatusLabel(d.status)}
              {hint}
            </option>
          );
        })}
      </select>
      {value ? (
        <p className="text-ui-xs text-teal-800 leading-snug">
          Treasury will not credit again for the linked portion — cash was recorded when Finance registered this deposit.
        </p>
      ) : (
        <p className="text-ui-xs text-amber-800 leading-snug">
          If this payment matches a row below (exact or close amount/date), link it to avoid duplicate cash in treasury.
        </p>
      )}
    </div>
  );
}
