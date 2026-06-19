import React, { useCallback, useMemo, useState } from 'react';
import { Download, Plus, Printer, RefreshCw } from 'lucide-react';
import { apiFetch } from '../../lib/apiBase';
import { formatNgn } from '../../Data/mockData';
import { openReconciliationListPrint, unreconciledBankLinesPrintPayload } from '../../lib/reconciliationPrint';

/**
 * Daily bank line queue: list, detail, manual POST, PATCH match (CSV import out of v1 scope).
 */
export function AccountBankReconciliationPanel({
  lines = [],
  treasuryAccounts = [],
  treasuryMovements = [],
  canPost = false,
  canApprove = false,
  branchLabel = '',
  onWorkspaceRefresh,
  showToast,
}) {
  const [filter, setFilter] = useState('all');
  const [selectedId, setSelectedId] = useState('');
  const [busyId, setBusyId] = useState('');
  const [savingManual, setSavingManual] = useState(false);
  const [manual, setManual] = useState({ bankDateISO: '', description: '', amountNgn: '' });
  const [patchForm, setPatchForm] = useState({ systemMatch: '', settledAmountNgn: '', status: 'Review' });

  const filtered = useMemo(() => {
    const arr = Array.isArray(lines) ? lines : [];
    if (filter === 'all') return arr;
    return arr.filter((l) => String(l.status || '') === filter);
  }, [lines, filter]);

  const selected = useMemo(
    () => filtered.find((l) => String(l.id) === String(selectedId)) || null,
    [filtered, selectedId]
  );

  React.useEffect(() => {
    if (selected) {
      setPatchForm({
        systemMatch: String(selected.systemMatch || ''),
        settledAmountNgn:
          selected.settledAmountNgn != null && selected.settledAmountNgn !== ''
            ? String(selected.settledAmountNgn)
            : '',
        status: String(selected.status || 'Review'),
      });
    }
  }, [selected]);

  const movementNetByTreasuryId = useMemo(() => {
    const m = new Map();
    for (const mv of treasuryMovements || []) {
      const tid = String(mv?.treasuryAccountId ?? '').trim();
      if (!tid) continue;
      const amt = Math.round(Number(mv?.amountNgn) || 0);
      m.set(tid, (m.get(tid) || 0) + amt);
    }
    return m;
  }, [treasuryMovements]);

  const openUnreconciledPrint = useCallback(() => {
    const payload = unreconciledBankLinesPrintPayload(lines, { branchLabel });
    if (!payload.rows.length) {
      showToast?.('No unreconciled bank lines to print.', { variant: 'info' });
      return;
    }
    if (!openReconciliationListPrint(payload)) {
      showToast?.('Could not open print preview.', { variant: 'error' });
    }
  }, [branchLabel, lines, showToast]);

  const exportCsv = useCallback(() => {
    const rows = filtered.length ? filtered : lines;
    if (!rows.length) {
      showToast?.('No lines to export.', { variant: 'info' });
      return;
    }
    const header = [
      'id',
      'bankDateISO',
      'description',
      'amountNgn',
      'systemMatch',
      'status',
      'branchId',
    ].join(',');
    const esc = (v) => {
      const s = String(v ?? '');
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const body = rows
      .map((r) =>
        [
          esc(r.id),
          esc(r.bankDateISO),
          esc(r.description),
          esc(r.amountNgn),
          esc(r.systemMatch),
          esc(r.status),
          esc(r.branchId),
        ].join(',')
      )
      .join('\n');
    const blob = new Blob([`${header}\n${body}`], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `bank-recon-lines-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast?.('Export started.', { variant: 'success' });
  }, [filtered, lines, showToast]);

  const submitManual = useCallback(async () => {
    if (!canPost) return;
    const bankDateISO = String(manual.bankDateISO || '').trim();
    const description = String(manual.description || '').trim();
    const amountNgn = Math.round(Number(String(manual.amountNgn).replace(/,/g, '')) || 0);
    if (!bankDateISO || !description || !amountNgn) {
      showToast?.('Enter date, description, and non-zero amount.', { variant: 'error' });
      return;
    }
    setSavingManual(true);
    try {
      const res = await apiFetch('/api/bank-reconciliation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bankDateISO, description, amountNgn }),
      });
      if (!res.ok || !res.data?.ok) {
        showToast?.(res.data?.error || 'Could not create line.', { variant: 'error' });
        return;
      }
      showToast?.('Bank line added.', { variant: 'success' });
      setManual({ bankDateISO: '', description: '', amountNgn: '' });
      await onWorkspaceRefresh?.();
    } finally {
      setSavingManual(false);
    }
  }, [canPost, manual, onWorkspaceRefresh, showToast]);

  const applyPatch = useCallback(async () => {
    if (!canPost || !selected) return;
    setBusyId(selected.id);
    try {
      const body = {
        status: patchForm.status,
        systemMatch: patchForm.systemMatch.trim(),
      };
      if (patchForm.settledAmountNgn !== '') {
        const n = Math.round(Number(String(patchForm.settledAmountNgn).replace(/,/g, '')) || 0);
        if (Number.isFinite(n)) body.settledAmountNgn = n;
      }
      const res = await apiFetch(`/api/bank-reconciliation/${encodeURIComponent(selected.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok || res.data?.ok === false) {
        showToast?.(res.data?.error || 'Update failed.', { variant: 'error' });
        return;
      }
      showToast?.('Line updated.', { variant: 'success' });
      await onWorkspaceRefresh?.();
    } finally {
      setBusyId('');
    }
  }, [canPost, onWorkspaceRefresh, patchForm, selected, showToast]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      <div className="lg:col-span-2 space-y-3 rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-[11px] font-black uppercase tracking-widest text-[#134e4a]">Statement lines</h4>
          <div className="flex flex-wrap gap-1">
            {['all', 'Review', 'Matched', 'Excluded'].map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setFilter(k === 'all' ? 'all' : k)}
                className={`rounded-md px-2 py-0.5 text-[9px] font-bold uppercase ${
                  (k === 'all' && filter === 'all') || filter === k
                    ? 'bg-[#134e4a] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {k === 'all' ? 'All' : k}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void onWorkspaceRefresh?.()}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[9px] font-bold uppercase text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw size={12} /> Refresh
          </button>
          <button
            type="button"
            onClick={openUnreconciledPrint}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[9px] font-bold uppercase text-slate-700 hover:bg-slate-50"
          >
            <Printer size={12} /> Print unreconciled
          </button>
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[9px] font-bold uppercase text-slate-700 hover:bg-slate-50"
          >
            <Download size={12} /> Export CSV
          </button>
        </div>
        <p className="text-[9px] text-slate-500 leading-relaxed">
          Daily discipline: add lines manually (e.g. EOD check, exceptions). Match to receipt IDs like{' '}
          <span className="font-mono">RC-2026-014</span> when ready.{branchLabel ? ` Branch: ${branchLabel}.` : ''}
        </p>
        <ul className="max-h-[min(420px,50vh)] space-y-1 overflow-y-auto pr-0.5">
          {filtered.map((line) => (
            <li key={line.id}>
              <button
                type="button"
                onClick={() => setSelectedId(String(line.id))}
                className={`w-full rounded-lg border px-2 py-1.5 text-left transition-colors ${
                  String(selectedId) === String(line.id)
                    ? 'border-teal-400 bg-teal-50/80'
                    : 'border-slate-200/70 bg-slate-50/50 hover:bg-white'
                }`}
              >
                <div className="flex justify-between gap-2 text-[10px] font-bold text-[#134e4a]">
                  <span className="truncate font-mono">{line.id}</span>
                  <span className="shrink-0 tabular-nums">{formatNgn(line.amountNgn)}</span>
                </div>
                <div className="mt-0.5 text-[9px] text-slate-500 line-clamp-2">{line.description}</div>
                <div className="mt-0.5 flex justify-between text-[8px] font-bold uppercase text-slate-500">
                  <span>{line.bankDateISO}</span>
                  <span>{line.status}</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
        {!filtered.length ? (
          <p className="text-[10px] text-slate-400 py-4 text-center border border-dashed border-slate-200 rounded-lg">
            No lines for this filter.
          </p>
        ) : null}
      </div>

      <div className="lg:col-span-3 space-y-4">
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3 shadow-sm">
          <h4 className="text-[11px] font-black uppercase tracking-widest text-[#134e4a] mb-2">
            Treasury snapshot (posted movements)
          </h4>
          <ul className="grid gap-1 sm:grid-cols-2">
            {(treasuryAccounts || []).map((acc) => {
              const tid = String(acc?.id ?? '');
              const book = Math.round(Number(acc?.balance) || 0);
              const netMv = movementNetByTreasuryId.get(tid) || 0;
              return (
                <li
                  key={tid || acc.name}
                  className="rounded-lg border border-white/80 bg-white px-2 py-1.5 text-[10px] shadow-sm"
                >
                  <p className="font-bold text-slate-800 truncate">{acc.name || tid}</p>
                  <p className="tabular-nums font-black text-[#134e4a]">Book {formatNgn(book)}</p>
                  <p className="text-[8px] text-slate-500">Net movements (in view): {formatNgn(netMv)}</p>
                </li>
              );
            })}
          </ul>
        </div>

        {canPost ? (
          <div className="rounded-xl border border-teal-200/70 bg-white p-3 shadow-sm space-y-2">
            <h4 className="text-[11px] font-black uppercase tracking-widest text-[#134e4a] flex items-center gap-1">
              <Plus size={14} /> Add manual line
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <label className="text-[9px] font-bold text-slate-600">
                Bank date
                <input
                  type="date"
                  className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1 text-[10px]"
                  value={manual.bankDateISO}
                  onChange={(e) => setManual((m) => ({ ...m, bankDateISO: e.target.value }))}
                />
              </label>
              <label className="text-[9px] font-bold text-slate-600 sm:col-span-2">
                Description
                <input
                  className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1 text-[10px]"
                  value={manual.description}
                  onChange={(e) => setManual((m) => ({ ...m, description: e.target.value }))}
                  placeholder="e.g. EOD balance check / unidentified inflow"
                />
              </label>
              <label className="text-[9px] font-bold text-slate-600">
                Amount (₦)
                <input
                  className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1 text-[10px] tabular-nums"
                  value={manual.amountNgn}
                  onChange={(e) => setManual((m) => ({ ...m, amountNgn: e.target.value }))}
                  placeholder="-5000 or 250000"
                />
              </label>
            </div>
            <button
              type="button"
              disabled={savingManual}
              onClick={() => void submitManual()}
              className="rounded-lg bg-[#134e4a] px-3 py-1.5 text-[10px] font-black uppercase text-white disabled:opacity-50"
            >
              {savingManual ? 'Saving…' : 'Save line'}
            </button>
          </div>
        ) : null}

        <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm space-y-2 min-h-[12rem]">
          <h4 className="text-[11px] font-black uppercase tracking-widest text-[#134e4a]">Line detail</h4>
          {!selected ? (
            <p className="text-[10px] text-slate-500">Select a line to edit match and status.</p>
          ) : (
            <>
              <div className="text-[10px] text-slate-600 space-y-1">
                <p>
                  <span className="font-bold">ID:</span> <span className="font-mono">{selected.id}</span>
                </p>
                <p>
                  <span className="font-bold">Amount:</span> {formatNgn(selected.amountNgn)}
                </p>
                <p className="whitespace-pre-wrap">{selected.description}</p>
              </div>
              {canPost ? (
                <div className="space-y-2 border-t border-slate-100 pt-2">
                  <label className="block text-[9px] font-bold text-slate-600">
                    Status
                    <select
                      className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1 text-[10px]"
                      value={patchForm.status}
                      onChange={(e) => setPatchForm((p) => ({ ...p, status: e.target.value }))}
                    >
                      {['Review', 'Matched', 'Excluded', 'PendingManager'].map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-[9px] font-bold text-slate-600">
                    System match (receipt id, e.g. RC-2026-014)
                    <input
                      className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1 text-[10px] font-mono"
                      value={patchForm.systemMatch}
                      onChange={(e) => setPatchForm((p) => ({ ...p, systemMatch: e.target.value }))}
                    />
                  </label>
                  <label className="block text-[9px] font-bold text-slate-600">
                    Settled amount (optional, for variance)
                    <input
                      className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1 text-[10px] tabular-nums"
                      value={patchForm.settledAmountNgn}
                      onChange={(e) => setPatchForm((p) => ({ ...p, settledAmountNgn: e.target.value }))}
                    />
                  </label>
                  <button
                    type="button"
                    disabled={busyId === selected.id}
                    onClick={() => void applyPatch()}
                    className="rounded-lg bg-[#134e4a] px-3 py-1.5 text-[10px] font-black uppercase text-white disabled:opacity-50"
                  >
                    {busyId === selected.id ? 'Saving…' : 'Apply update'}
                  </button>
                </div>
              ) : (
                <p className="text-[9px] text-slate-500">View only — finance.post required to edit.</p>
              )}
              {canApprove && selected.status !== 'Excluded' ? (
                <p className="text-[9px] text-amber-800">
                  Variance approvals use the existing approve-variance action from finance tooling when amounts differ.
                </p>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
