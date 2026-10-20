import React, { useState } from 'react';
import { apiFetch } from '../../lib/apiBase';
import { attentionFromDateLine } from '../../shared/lib/attentionFromDate.js';

function money(formatNgn, amount) {
  if (amount == null || amount === '' || !Number.isFinite(Number(amount))) return '';
  return typeof formatNgn === 'function' ? formatNgn(amount) : `₦${Math.round(Number(amount)).toLocaleString('en-NG')}`;
}

function stockRow(period) {
  const label = period?.periodKey || period?.periodEndIso || 'Stock review';
  return {
    id: `stock:${period?.id || label}`,
    title: `${period?.branchId || ''} ${label}`.trim(),
    recordDateIso: period?.periodEndIso || '',
    amountNgn: null,
    attention: { sentence: `Monthly stock review ${label} is waiting for manager sign-off.` },
  };
}

/**
 * Line under the attention list. Clicking it shows the older rows read-only.
 * It does not approve, clear, or acknowledge them.
 */
export function AttentionFromDateNote({
  fromDate,
  hiddenCount = 0,
  extraItems = [],
  formatNgn,
}) {
  const extras = Array.isArray(extraItems) ? extraItems : [];
  const total = Math.max(0, Number(hiddenCount) || 0) + extras.length;
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');

  if (!fromDate) return null;
  const line = attentionFromDateLine(fromDate, total);

  async function toggle() {
    if (total === 0) return;
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (rows) return;
    setBusy(true);
    setError('');
    try {
      const { ok, data } = await apiFetch('/api/management/attention?hidden=1');
      if (!ok || data?.ok === false) {
        setError(data?.error || 'Could not load the older items.');
        setRows([]);
        return;
      }
      setRows(Array.isArray(data?.hiddenOlderItems) ? data.hiddenOlderItems : []);
    } catch (e) {
      setError(String(e?.message || e));
      setRows([]);
    } finally {
      setBusy(false);
    }
  }

  const shown = [...(rows || []), ...extras.map(stockRow)];

  return (
    <div className="border-t border-slate-100 px-4 py-2" data-testid="attention-from-date">
      {total > 0 ? (
        <button
          type="button"
          onClick={() => void toggle()}
          className="text-left text-[11px] font-semibold text-slate-500 hover:text-zarewa-teal"
          aria-expanded={open}
        >
          {line}
        </button>
      ) : (
        <p className="text-[11px] font-semibold text-slate-500">{line}</p>
      )}
      {open ? (
        <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50" aria-label="Older items, read only">
          <p className="border-b border-slate-200 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
            Read only
          </p>
          {busy ? <p className="px-3 py-2 text-xs text-slate-500">Loading…</p> : null}
          {error ? <p className="px-3 py-2 text-xs text-rose-700">{error}</p> : null}
          {!busy && shown.length === 0 ? (
            <p className="px-3 py-2 text-xs text-slate-500">No older items.</p>
          ) : null}
          <ul className="divide-y divide-slate-200">
            {shown.map((it) => (
              <li key={it.id} className="px-3 py-2 text-xs text-slate-600">
                <span className="font-mono font-bold text-slate-800">{it.title || it.id}</span>
                {it.recordDateIso || it.atIso ? <span> · {String(it.recordDateIso || it.atIso).slice(0, 10)}</span> : null}
                {money(formatNgn, it.amountNgn) ? <span> · {money(formatNgn, it.amountNgn)}</span> : null}
                <span className="mt-0.5 block text-slate-700">{it.attention?.sentence || it.subtitle || ''}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
