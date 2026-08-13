import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Link2, RefreshCw } from 'lucide-react';
import { apiFetch } from '../../lib/apiBase';
import { formatNgn } from '../../Data/mockData';

/**
 * Finance: duplicate treasury queue — Finance registered bank inflow and Sales posted receipt/advance separately.
 * Shows exact matches plus close-amount / close-date suggestions.
 * Merge is enabled only when amounts match exactly (dates may be within ±2 days).
 */
export function BankDepositExceptionPanel({ canPost = false, showToast, onChanged }) {
  const [exceptions, setExceptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/bank-deposits/exceptions/duplicates');
      if (!res.ok || !res.data?.ok) {
        showToast?.(res.data?.error || 'Could not load duplicate exceptions.', { variant: 'error' });
        return;
      }
      setExceptions(Array.isArray(res.data.exceptions) ? res.data.exceptions : []);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const merge = useCallback(
    async (row) => {
      if (!canPost || !row?.canMerge) return;
      const key = `${row.depositId}:${row.ledgerEntryId}`;
      setBusyId(key);
      try {
        const res = await apiFetch(`/api/bank-deposits/${encodeURIComponent(row.depositId)}/merge`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ledgerEntryId: row.ledgerEntryId }),
        });
        if (!res.ok || !res.data?.ok) {
          showToast?.(res.data?.error || 'Merge failed.', { variant: 'error' });
          return;
        }
        showToast?.(`Linked ${row.depositId} to ${row.ledgerEntryId} and removed duplicate treasury.`, {
          variant: 'success',
        });
        await load();
        await onChanged?.();
      } finally {
        setBusyId('');
      }
    },
    [canPost, load, onChanged, showToast]
  );

  return (
    <div className="space-y-3 rounded-xl border border-amber-200/90 bg-amber-50/40 p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-amber-900 flex items-center gap-1.5">
            <AlertTriangle size={14} /> Duplicate cash exceptions
          </h3>
          <p className="text-ui-xs text-slate-600 mt-1 max-w-2xl">
            Unlinked bank deposits paired with receipt/advance treasury credits by exact or close amount (±₦100 or 1%)
            and exact or close date (±2 days). Merge requires an exact amount; close-date pairs are mergeable.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-ui-xs font-bold uppercase text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-amber-100 bg-white">
        <table className="min-w-full text-ui-xs">
          <thead className="bg-amber-50/80 text-ui-xs uppercase text-amber-900/80">
            <tr>
              <th className="px-2 py-1.5 text-left">Deposit</th>
              <th className="px-2 py-1.5 text-left">Ledger</th>
              <th className="px-2 py-1.5 text-left">Customer</th>
              <th className="px-2 py-1.5 text-right">Amount</th>
              <th className="px-2 py-1.5 text-left">Date</th>
              <th className="px-2 py-1.5 text-left">Match</th>
              <th className="px-2 py-1.5 text-left">Reference</th>
              {canPost ? <th className="px-2 py-1.5 text-right">Action</th> : null}
            </tr>
          </thead>
          <tbody>
            {exceptions.length === 0 ? (
              <tr>
                <td colSpan={canPost ? 8 : 7} className="px-2 py-6 text-center text-slate-400">
                  {loading ? 'Loading…' : 'No duplicate exceptions — treasury looks clean.'}
                </td>
              </tr>
            ) : (
              exceptions.map((row) => {
                const key = `${row.depositId}:${row.ledgerEntryId}`;
                const ref = row.depositBankReference || row.ledgerBankReference || '—';
                const hints = Array.isArray(row.matchHints) ? row.matchHints : [];
                const amountLabel =
                  row.amountExact || row.ledgerAmountNgn == null
                    ? formatNgn(row.amountNgn)
                    : `${formatNgn(row.amountNgn)} / ${formatNgn(row.ledgerAmountNgn ?? row.treasuryAmountNgn)}`;
                const dateLabel =
                  row.dateExact || !row.ledgerBankDateISO
                    ? row.bankDateISO
                    : `${row.bankDateISO} / ${row.ledgerBankDateISO}`;
                return (
                  <tr key={key} className="border-t border-amber-50 hover:bg-amber-50/30">
                    <td className="px-2 py-1.5 font-mono font-bold text-zarewa-teal">{row.depositId}</td>
                    <td className="px-2 py-1.5 font-mono">{row.ledgerEntryId}</td>
                    <td className="px-2 py-1.5">{row.customerName || '—'}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums font-semibold">{amountLabel}</td>
                    <td className="px-2 py-1.5 tabular-nums">{dateLabel}</td>
                    <td className="px-2 py-1.5 text-slate-600">
                      {hints.length ? hints.join(', ') : row.canMerge ? 'exact' : 'suggested'}
                      {!row.canMerge ? (
                        <span className="block text-amber-800/90">Close amount — review only</span>
                      ) : null}
                    </td>
                    <td className="px-2 py-1.5 font-mono truncate max-w-[8rem]" title={ref}>
                      {ref}
                    </td>
                    {canPost ? (
                      <td className="px-2 py-1.5 text-right">
                        {row.canMerge ? (
                          <button
                            type="button"
                            disabled={busyId === key}
                            onClick={() => void merge(row)}
                            className="inline-flex items-center gap-1 rounded-md bg-amber-700 px-2 py-0.5 text-ui-xs font-bold uppercase text-white disabled:opacity-50"
                          >
                            <Link2 size={11} /> {busyId === key ? 'Merging…' : 'Merge'}
                          </button>
                        ) : (
                          <span className="text-slate-400 uppercase tracking-wide">Suggest only</span>
                        )}
                      </td>
                    ) : null}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
