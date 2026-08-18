import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, Link2, RefreshCw } from 'lucide-react';
import { apiFetch } from '../../lib/apiBase';
import { formatNgn } from '../../Data/mockData';
import {
  AppTable,
  AppTableBody,
  AppTableTd,
  AppTableTh,
  AppTableThead,
  AppTableTr,
  AppTableWrap,
} from '../ui/AppDataTable';

/**
 * Finance: duplicate treasury queue — Finance registered bank inflow and Sales posted receipt/advance separately.
 * Shows exact matches plus close-amount / close-date suggestions.
 * Merge is enabled only when amounts match exactly (dates may be within ±2 days).
 */
export function BankDepositExceptionPanel({ canPost = false, showToast, onChanged }) {
  const [exceptions, setExceptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/bank-deposits/exceptions/duplicates');
      if (!res.ok || !res.data?.ok) {
        showToast?.(res.data?.error || 'Could not load duplicate exceptions.', { variant: 'error' });
        return;
      }
      setExceptions(Array.isArray(res.data.exceptions) ? res.data.exceptions : []);
      if (Array.isArray(res.data.exceptions) && res.data.exceptions.length > 0) {
        setOpen(true);
      }
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
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex min-w-0 flex-1 items-start gap-1.5 text-left"
          aria-expanded={open}
        >
          <span className="mt-0.5 text-amber-800">
            {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </span>
          <span>
            <h3 className="text-xs font-bold uppercase tracking-widest text-amber-900 flex items-center gap-1.5">
              <AlertTriangle size={14} /> Duplicate cash exceptions
              <span className="font-semibold tabular-nums text-amber-800">({exceptions.length})</span>
            </h3>
            <p className="text-ui-xs text-slate-600 mt-1 max-w-2xl">
              Unlinked bank deposits paired with receipt/advance treasury credits. Merge when amounts match.
            </p>
          </span>
        </button>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-ui-xs font-bold uppercase text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {open ? (
      <AppTableWrap>
        <AppTable role="numeric">
          <AppTableThead>
            <AppTableTh>Deposit</AppTableTh>
            <AppTableTh>Ledger</AppTableTh>
            <AppTableTh>Customer</AppTableTh>
            <AppTableTh align="right">Amount</AppTableTh>
            <AppTableTh>Date</AppTableTh>
            <AppTableTh>Match</AppTableTh>
            <AppTableTh>Reference</AppTableTh>
            {canPost ? <AppTableTh align="right">Action</AppTableTh> : null}
          </AppTableThead>
          <AppTableBody>
            {exceptions.length === 0 ? (
              <AppTableTr>
                <AppTableTd colSpan={canPost ? 8 : 7} truncate={false} className="text-center text-slate-500">
                  {loading ? 'Loading…' : 'No duplicate exceptions — treasury looks clean.'}
                </AppTableTd>
              </AppTableTr>
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
                  <AppTableTr key={key}>
                    <AppTableTd monospace title={row.depositId}>
                      {row.depositId}
                    </AppTableTd>
                    <AppTableTd monospace title={row.ledgerEntryId}>
                      {row.ledgerEntryId}
                    </AppTableTd>
                    <AppTableTd title={row.customerName || ''}>{row.customerName || '—'}</AppTableTd>
                    <AppTableTd align="right">{amountLabel}</AppTableTd>
                    <AppTableTd>{dateLabel || '—'}</AppTableTd>
                    <AppTableTd truncate={false}>
                      {hints.length ? hints.join(', ') : row.canMerge ? 'exact' : 'suggested'}
                      {!row.canMerge ? (
                        <span className="block text-ui-xs text-amber-800/90">Close amount — review only</span>
                      ) : null}
                    </AppTableTd>
                    <AppTableTd monospace title={ref}>
                      {ref}
                    </AppTableTd>
                    {canPost ? (
                      <AppTableTd align="right" truncate={false}>
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
                          <span className="text-slate-400 uppercase tracking-wide text-ui-xs">Suggest only</span>
                        )}
                      </AppTableTd>
                    ) : null}
                  </AppTableTr>
                );
              })
            )}
          </AppTableBody>
        </AppTable>
      </AppTableWrap>
      ) : null}
    </div>
  );
}
