import React, { useCallback, useMemo, useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { apiFetch } from '../../lib/apiBase';
import { formatNgn } from '../../Data/mockData';
import { bankDepositReclassKindLabel, bankDepositStatusLabel, BANK_DEPOSIT_RECLASS_OPTIONS } from '../../lib/bankDeposits';
import {
  treasuryAccountDisplayName,
  treasuryAccountsForWorkspace,
} from '../../lib/treasuryAccountsStore';
import { compareSelectLabels } from '../../lib/selectOptionSort';

/**
 * Finance: register bank inflow → treasury credit + unlinked pool for Sales.
 */
export function RegisterBankDepositPanel({
  snapshot,
  session,
  branchScope,
  viewAllBranches,
  canPost = false,
  onRegistered,
  showToast,
}) {
  const [form, setForm] = useState({
    bankDateISO: new Date().toISOString().slice(0, 10),
    description: '',
    bankReference: '',
    amountNgn: '',
    treasuryAccountId: '',
    note: '',
  });
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState('open');
  const [actionBusyId, setActionBusyId] = useState('');
  const [reclassDraft, setReclassDraft] = useState({ depositId: '', kind: '', note: '' });

  const treasuryList = useMemo(() => {
    const raw =
      treasuryAccountsForWorkspace(snapshot, session, {
        branchScope,
        viewAllBranches,
      }) || [];
    return [...raw].sort((a, b) =>
      compareSelectLabels(treasuryAccountDisplayName(a), treasuryAccountDisplayName(b))
    );
  }, [snapshot, session, branchScope, viewAllBranches]);

  const deposits = useMemo(() => {
    const rows = Array.isArray(snapshot?.bankDeposits) ? snapshot.bankDeposits : [];
    if (filter === 'all') return rows;
    return rows.filter((d) => {
      const st = String(d.status || '').toUpperCase();
      return ['OPEN', 'PARTIAL', 'RESERVED'].includes(st) && Math.round(Number(d.remainingNgn) || 0) > 0;
    });
  }, [snapshot?.bankDeposits, filter]);

  const submit = useCallback(async () => {
    if (!canPost) return;
    const bankDateISO = String(form.bankDateISO || '').trim();
    const description = String(form.description || '').trim();
    const amountNgn = Math.round(Number(String(form.amountNgn).replace(/,/g, '')) || 0);
    const treasuryAccountId = Number(form.treasuryAccountId);
    if (!bankDateISO || !description || !amountNgn || !treasuryAccountId) {
      showToast?.('Enter date, description, amount, and treasury account.', { variant: 'error' });
      return;
    }
    setBusy(true);
    try {
      const res = await apiFetch('/api/bank-deposits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bankDateISO,
          description,
          bankReference: form.bankReference.trim(),
          amountNgn,
          treasuryAccountId,
          note: form.note.trim(),
        }),
      });
      if (!res.ok || !res.data?.ok) {
        showToast?.(res.data?.error || 'Could not register bank payment.', { variant: 'error' });
        return;
      }
      showToast?.(`Registered ${res.data.id} — visible to Sales as unlinked.`, { variant: 'success' });
      setForm((f) => ({ ...f, description: '', bankReference: '', amountNgn: '', note: '' }));
      await onRegistered?.();
    } finally {
      setBusy(false);
    }
  }, [canPost, form, onRegistered, showToast]);

  const reverseDeposit = useCallback(
    async (depositId) => {
      if (!canPost) return;
      if (!window.confirm('Reverse this unlinked deposit? Treasury credit will be removed.')) return;
      setActionBusyId(depositId);
      try {
        const res = await apiFetch(`/api/bank-deposits/${encodeURIComponent(depositId)}/reverse`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        if (!res.ok || !res.data?.ok) {
          showToast?.(res.data?.error || 'Could not reverse deposit.', { variant: 'error' });
          return;
        }
        showToast?.(`Reversed ${depositId}.`, { variant: 'success' });
        await onRegistered?.();
      } finally {
        setActionBusyId('');
      }
    },
    [canPost, onRegistered, showToast]
  );

  const submitReclass = useCallback(
    async (depositId) => {
      if (!canPost || !depositId) return;
      const kind = String(reclassDraft.kind || '').trim();
      if (!kind) {
        showToast?.('Select a reclass type.', { variant: 'error' });
        return;
      }
      if (!window.confirm('Reclassify this deposit as non-customer income? It cannot be linked to Sales after.')) {
        return;
      }
      setActionBusyId(depositId);
      try {
        const res = await apiFetch(`/api/bank-deposits/${encodeURIComponent(depositId)}/reclass`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reclassKind: kind, note: reclassDraft.note.trim() }),
        });
        if (!res.ok || !res.data?.ok) {
          showToast?.(res.data?.error || 'Could not reclass deposit.', { variant: 'error' });
          return;
        }
        showToast?.(`Reclassified ${depositId} as ${bankDepositReclassKindLabel(kind)}.`, { variant: 'success' });
        setReclassDraft({ depositId: '', kind: '', note: '' });
        await onRegistered?.();
      } finally {
        setActionBusyId('');
      }
    },
    [canPost, onRegistered, reclassDraft.kind, reclassDraft.note, showToast]
  );

  return (
    <div className="space-y-3 rounded-lg border border-sky-200/80 bg-white p-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#134e4a]">Register bank payment</h3>
          <p className="text-[10px] text-slate-600 mt-1 max-w-2xl">
            Record money that hit the bank before Sales knows the customer. Credits treasury once; Sales links when
            posting receipt or advance.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void onRegistered?.()}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[9px] font-bold uppercase text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {canPost ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 rounded-lg border border-slate-100 bg-slate-50/80 p-3">
          <label className="text-[9px] font-bold text-slate-600">
            Bank date
            <input
              type="date"
              className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1 text-[10px]"
              value={form.bankDateISO}
              onChange={(e) => setForm((f) => ({ ...f, bankDateISO: e.target.value }))}
            />
          </label>
          <label className="text-[9px] font-bold text-slate-600 sm:col-span-2">
            Bank narration / description
            <input
              className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1 text-[10px]"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="e.g. UBA NIP INFLOW"
            />
          </label>
          <label className="text-[9px] font-bold text-slate-600">
            Transfer reference
            <input
              className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1 text-[10px] font-mono"
              value={form.bankReference}
              onChange={(e) => setForm((f) => ({ ...f, bankReference: e.target.value }))}
            />
          </label>
          <label className="text-[9px] font-bold text-slate-600">
            Amount (₦)
            <input
              className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1 text-[10px] tabular-nums"
              value={form.amountNgn}
              onChange={(e) => setForm((f) => ({ ...f, amountNgn: e.target.value }))}
            />
          </label>
          <label className="text-[9px] font-bold text-slate-600">
            Treasury account
            <select
              className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1 text-[10px]"
              value={form.treasuryAccountId}
              onChange={(e) => setForm((f) => ({ ...f, treasuryAccountId: e.target.value }))}
            >
              <option value="">Select…</option>
              {treasuryList.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {treasuryAccountDisplayName(acc)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-[9px] font-bold text-slate-600 sm:col-span-3">
            Internal note (optional)
            <input
              className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1 text-[10px]"
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            />
          </label>
          <div className="sm:col-span-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => void submit()}
              className="inline-flex items-center gap-1 rounded-lg bg-[#134e4a] px-3 py-1.5 text-[10px] font-black uppercase text-white disabled:opacity-50"
            >
              <Plus size={14} /> {busy ? 'Saving…' : 'Register & credit treasury'}
            </button>
          </div>
        </div>
      ) : null}

      <div>
        <div className="flex flex-wrap gap-1 mb-2">
          {[
            ['open', 'Unlinked'],
            ['all', 'All'],
          ].map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setFilter(k)}
              className={`rounded-md px-2 py-0.5 text-[9px] font-bold uppercase ${
                filter === k ? 'bg-sky-700 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full text-[10px]">
            <thead className="bg-slate-50 text-[9px] uppercase text-slate-500">
              <tr>
                <th className="px-2 py-1.5 text-left">Id</th>
                <th className="px-2 py-1.5 text-left">Date</th>
                <th className="px-2 py-1.5 text-right">Amount</th>
                <th className="px-2 py-1.5 text-right">Remaining</th>
                <th className="px-2 py-1.5 text-left">Status</th>
                <th className="px-2 py-1.5 text-left">Reference</th>
                <th className="px-2 py-1.5 text-left">Description</th>
                {canPost ? <th className="px-2 py-1.5 text-right">Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {deposits.length === 0 ? (
                <tr>
                  <td colSpan={canPost ? 8 : 7} className="px-2 py-6 text-center text-slate-400">
                    No bank deposits for this filter.
                  </td>
                </tr>
              ) : (
                deposits.map((d) => {
                  const canAct =
                    canPost &&
                    Math.round(Number(d.remainingNgn) || 0) === Math.round(Number(d.amountNgn) || 0) &&
                    ['OPEN', 'PARTIAL', 'RESERVED'].includes(String(d.status || '').toUpperCase());
                  const showReclass = reclassDraft.depositId === d.id;
                  return (
                  <tr key={d.id} className="border-t border-slate-100 hover:bg-slate-50/80">
                    <td className="px-2 py-1.5 font-mono font-bold text-[#134e4a]">{d.id}</td>
                    <td className="px-2 py-1.5 tabular-nums">{d.bankDateISO}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums font-semibold">{formatNgn(d.amountNgn)}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{formatNgn(d.remainingNgn)}</td>
                    <td className="px-2 py-1.5">
                      {bankDepositStatusLabel(d.status)}
                      {d.reclassKind ? (
                        <span className="block text-[9px] text-slate-500">{bankDepositReclassKindLabel(d.reclassKind)}</span>
                      ) : null}
                    </td>
                    <td className="px-2 py-1.5 font-mono truncate max-w-[8rem]" title={d.bankReference}>
                      {d.bankReference || '—'}
                    </td>
                    <td className="px-2 py-1.5 truncate max-w-[12rem]" title={d.description}>
                      {d.description || '—'}
                    </td>
                    {canPost ? (
                      <td className="px-2 py-1.5 text-right align-top">
                        {canAct ? (
                          <div className="flex flex-col items-end gap-1">
                            <div className="flex flex-wrap justify-end gap-1">
                              <button
                                type="button"
                                disabled={actionBusyId === d.id}
                                onClick={() => void reverseDeposit(d.id)}
                                className="rounded border border-rose-200 px-1.5 py-0.5 text-[9px] font-bold uppercase text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                              >
                                Reverse
                              </button>
                              <button
                                type="button"
                                disabled={actionBusyId === d.id}
                                onClick={() =>
                                  setReclassDraft((prev) =>
                                    prev.depositId === d.id
                                      ? { depositId: '', kind: '', note: '' }
                                      : { depositId: d.id, kind: '', note: '' }
                                  )
                                }
                                className="rounded border border-violet-200 px-1.5 py-0.5 text-[9px] font-bold uppercase text-violet-700 hover:bg-violet-50 disabled:opacity-50"
                              >
                                {showReclass ? 'Cancel' : 'Reclass'}
                              </button>
                            </div>
                            {showReclass ? (
                              <div className="mt-1 w-full max-w-[14rem] rounded border border-violet-100 bg-violet-50/50 p-1.5 text-left space-y-1">
                                <select
                                  className="w-full rounded border border-slate-200 px-1 py-0.5 text-[9px]"
                                  value={reclassDraft.kind}
                                  onChange={(e) => setReclassDraft((f) => ({ ...f, kind: e.target.value }))}
                                >
                                  <option value="">Type…</option>
                                  {BANK_DEPOSIT_RECLASS_OPTIONS.map((o) => (
                                    <option key={o.value} value={o.value}>
                                      {o.label}
                                    </option>
                                  ))}
                                </select>
                                <input
                                  className="w-full rounded border border-slate-200 px-1 py-0.5 text-[9px]"
                                  placeholder="Note (optional)"
                                  value={reclassDraft.note}
                                  onChange={(e) => setReclassDraft((f) => ({ ...f, note: e.target.value }))}
                                />
                                <button
                                  type="button"
                                  disabled={actionBusyId === d.id}
                                  onClick={() => void submitReclass(d.id)}
                                  className="w-full rounded bg-violet-700 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white disabled:opacity-50"
                                >
                                  Confirm reclass
                                </button>
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-[9px] text-slate-400">—</span>
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
    </div>
  );
}
