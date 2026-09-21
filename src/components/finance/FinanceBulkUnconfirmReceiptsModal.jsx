import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Undo2, X } from 'lucide-react';
import { apiFetch } from '../../lib/apiBase';
import { formatNgn } from '../../Data/mockData';
import {
  RECEIPT_BULK_UNCONFIRM_CONFIRM_PHRASE,
  resolveBulkUnconfirmDateRange,
} from '../../lib/receiptClearance.js';

function defaultYearMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Finance approve: unconfirm all confirmed receipts for a branch month so they can be reconfirmed.
 */
export function FinanceBulkUnconfirmReceiptsModal({
  open,
  onClose,
  branchLabel = '',
  canMutate = false,
  showToast,
  onDone,
}) {
  const [yearMonth, setYearMonth] = useState(defaultYearMonth);
  const [reason, setReason] = useState('Reconfirm all receipts for this month');
  const [confirmPhrase, setConfirmPhrase] = useState('');
  const [preview, setPreview] = useState(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [runBusy, setRunBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setYearMonth(defaultYearMonth());
    setReason('Reconfirm all receipts for this month');
    setConfirmPhrase('');
    setPreview(null);
    setError('');
    setPreviewBusy(false);
    setRunBusy(false);
  }, [open]);

  const range = useMemo(() => resolveBulkUnconfirmDateRange({ yearMonth }), [yearMonth]);

  const loadPreview = useCallback(async () => {
    if (!range.ok) {
      setError(range.error || 'Pick a valid month.');
      setPreview(null);
      return;
    }
    setPreviewBusy(true);
    setError('');
    try {
      const qs = new URLSearchParams({ yearMonth: String(yearMonth).trim() });
      const { ok, data } = await apiFetch(`/api/sales-receipts/bulk-unconfirm/preview?${qs}`);
      if (!ok || !data?.ok) {
        setPreview(null);
        setError(data?.error || 'Could not preview matching receipts.');
        return;
      }
      setPreview(data);
    } finally {
      setPreviewBusy(false);
    }
  }, [range, yearMonth]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      void loadPreview();
    }, 200);
    return () => clearTimeout(t);
  }, [open, yearMonth, loadPreview]);

  const runBulkUnconfirm = useCallback(async () => {
    if (!canMutate) {
      showToast?.('Connect to the API server to unconfirm receipts.', { variant: 'error' });
      return;
    }
    if (!range.ok) {
      setError(range.error || 'Pick a valid month.');
      return;
    }
    if (String(reason || '').trim().length < 3) {
      setError('Enter a short reason (at least 3 characters).');
      return;
    }
    if (String(confirmPhrase || '').trim() !== RECEIPT_BULK_UNCONFIRM_CONFIRM_PHRASE) {
      setError(`Type ${RECEIPT_BULK_UNCONFIRM_CONFIRM_PHRASE} exactly to continue.`);
      return;
    }
    setRunBusy(true);
    setError('');
    try {
      const { ok, data, status } = await apiFetch('/api/sales-receipts/bulk-unconfirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          yearMonth: String(yearMonth).trim(),
          reason: String(reason).trim(),
          confirmPhrase: String(confirmPhrase).trim(),
        }),
      });
      const partial = status === 207 || data?.code === 'PARTIAL_FAILURE';
      if ((!ok && !partial) || (!data?.ok && !partial)) {
        setError(data?.error || 'Bulk unconfirm failed.');
        showToast?.(data?.error || 'Bulk unconfirm failed.', { variant: 'error' });
        return;
      }
      const n = Number(data?.unconfirmedCount) || 0;
      const failN = Number(data?.failedCount) || 0;
      showToast?.(
        failN > 0
          ? `Unconfirmed ${n} receipt(s); ${failN} failed — review and retry failures individually.`
          : `Unconfirmed ${n} receipt(s) for ${yearMonth}. They are back in Pending clearance for reconfirm.`,
        { variant: failN > 0 ? 'warning' : 'success' }
      );
      onDone?.(data);
      onClose?.();
    } finally {
      setRunBusy(false);
    }
  }, [
    canMutate,
    confirmPhrase,
    onClose,
    onDone,
    range,
    reason,
    showToast,
    yearMonth,
  ]);

  if (!open) return null;

  const count = Number(preview?.count) || 0;
  const amount = Number(preview?.totalAmountNgn) || 0;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/40 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div>
            <p className="text-ui-xs font-black uppercase tracking-wide text-rose-800">Bulk unconfirm receipts</p>
            <p className="mt-0.5 text-sm text-slate-600 leading-relaxed">
              Return every confirmed receipt in this branch for a month to Pending clearance so Finance can reconfirm
              them. Posted treasury/ledger stays; only clearance is undone.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3 px-4 py-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-ui-xs text-slate-700">
            Branch scope: <span className="font-bold">{branchLabel || 'Current workspace branch'}</span>
          </div>

          <label className="block space-y-1">
            <span className="text-ui-xs font-bold uppercase tracking-wide text-slate-500">Month</span>
            <input
              type="month"
              value={yearMonth}
              onChange={(e) => setYearMonth(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>

          <div className="rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-ui-xs text-amber-950">
            {previewBusy ? (
              'Counting confirmed receipts…'
            ) : preview ? (
              <>
                <span className="font-black tabular-nums">{count}</span> confirmed receipt
                {count === 1 ? '' : 's'}
                {count ? (
                  <>
                    {' '}
                    · <span className="font-black tabular-nums">{formatNgn(amount)}</span>
                  </>
                ) : null}{' '}
                from {preview.dateFrom} to {preview.dateTo}
              </>
            ) : (
              'Pick a month to preview matches.'
            )}
          </div>

          <label className="block space-y-1">
            <span className="text-ui-xs font-bold uppercase tracking-wide text-slate-500">Reason</span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="Why are you unconfirming this month?"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-ui-xs font-bold uppercase tracking-wide text-slate-500">
              Type {RECEIPT_BULK_UNCONFIRM_CONFIRM_PHRASE}
            </span>
            <input
              type="text"
              value={confirmPhrase}
              onChange={(e) => setConfirmPhrase(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono"
              autoComplete="off"
              spellCheck={false}
            />
          </label>

          {error ? <p className="text-ui-xs font-semibold text-rose-700">{error}</p> : null}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-ui-xs font-bold uppercase tracking-wide text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={runBusy || previewBusy || count <= 0 || !canMutate}
            onClick={() => void runBulkUnconfirm()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-rose-600 px-3 py-1.5 text-ui-xs font-black uppercase tracking-wide text-white hover:bg-rose-700 disabled:opacity-50"
          >
            <Undo2 size={12} className={runBusy ? 'animate-pulse' : ''} />
            {runBusy ? 'Unconfirming…' : `Unconfirm ${count || 0} receipt${count === 1 ? '' : 's'}`}
          </button>
        </div>
      </div>
    </div>
  );
}
