import React, { useCallback, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Plus, RefreshCw } from 'lucide-react';
import { apiFetch } from '../../lib/apiBase';
import { appConfirm } from '../../lib/appConfirm';
import { formatNgn } from '../../Data/mockData';
import { bankDepositReclassKindLabel, bankDepositStatusLabel, BANK_DEPOSIT_RECLASS_OPTIONS } from '../../lib/bankDeposits';
import { useFinanceDepositQuoteMatches } from '../../hooks/useFinanceDepositQuoteMatches.js';
import {
  treasuryAccountDisplayName,
  treasuryAccountsForWorkspace,
} from '../../lib/treasuryAccountsStore';
import { compareSelectLabels } from '../../lib/selectOptionSort';
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
  const [formOpen, setFormOpen] = useState(false);
  const [filter, setFilter] = useState('open');
  const [actionBusyId, setActionBusyId] = useState('');
  const [reclassDraft, setReclassDraft] = useState({ depositId: '', kind: '', note: '' });
  const { byDeposit, busyKey, runMatch, canApply, canConfirmPending } = useFinanceDepositQuoteMatches();

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
      setFormOpen(false);
      await onRegistered?.();
    } finally {
      setBusy(false);
    }
  }, [canPost, form, onRegistered, showToast]);

  const reverseDeposit = useCallback(
    async (depositId) => {
      if (!canPost) return;
      if (!(await appConfirm({ message: 'Reverse this unlinked deposit? Treasury credit will be removed.', variant: 'danger' }))) return;
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
      if (!(await appConfirm({ message: 'Reclassify this deposit as non-customer income? It cannot be linked to Sales after.', variant: 'danger' }))) {
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
          <h3 className="text-xs font-bold uppercase tracking-widest text-zarewa-teal">Register bank payment</h3>
          <p className="text-ui-xs text-slate-600 mt-1 max-w-2xl">
            Record money that hit the bank before Sales knows the customer. Credits treasury once; Sales or this
            panel links it when the amount fits a quotation remaining balance.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {canPost ? (
            <button
              type="button"
              onClick={() => setFormOpen((v) => !v)}
              className="inline-flex items-center gap-1 rounded-lg bg-zarewa-teal px-2.5 py-1 text-ui-xs font-bold uppercase text-white hover:brightness-110"
              aria-expanded={formOpen}
            >
              {formOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {formOpen ? 'Close form' : 'New payment'}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => void onRegistered?.()}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-ui-xs font-bold uppercase text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
      </div>

      {canPost && formOpen ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 rounded-lg border border-slate-100 bg-slate-50/80 p-3">
          <label className="text-ui-xs font-bold text-slate-600">
            Bank date
            <input
              type="date"
              className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1 text-ui-xs"
              value={form.bankDateISO}
              onChange={(e) => setForm((f) => ({ ...f, bankDateISO: e.target.value }))}
            />
          </label>
          <label className="text-ui-xs font-bold text-slate-600 sm:col-span-2">
            Bank narration / description
            <input
              className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1 text-ui-xs"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="e.g. UBA NIP INFLOW"
            />
          </label>
          <label className="text-ui-xs font-bold text-slate-600">
            Transfer reference
            <input
              className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1 text-ui-xs font-mono"
              value={form.bankReference}
              onChange={(e) => setForm((f) => ({ ...f, bankReference: e.target.value }))}
            />
          </label>
          <label className="text-ui-xs font-bold text-slate-600">
            Amount (₦)
            <input
              className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1 text-ui-xs tabular-nums"
              value={form.amountNgn}
              onChange={(e) => setForm((f) => ({ ...f, amountNgn: e.target.value }))}
            />
          </label>
          <label className="text-ui-xs font-bold text-slate-600">
            Treasury account
            <select
              className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1 text-ui-xs"
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
          <label className="text-ui-xs font-bold text-slate-600 sm:col-span-3">
            Internal note (optional)
            <input
              className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1 text-ui-xs"
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            />
          </label>
          <div className="sm:col-span-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => void submit()}
              className="inline-flex items-center gap-1 rounded-lg bg-zarewa-teal px-3 py-1.5 text-ui-xs font-black uppercase text-white disabled:opacity-50"
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
              className={`rounded-md px-2 py-0.5 text-ui-xs font-bold uppercase ${
                filter === k ? 'bg-sky-700 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <AppTableWrap>
          <AppTable role="numeric">
            <AppTableThead>
              <AppTableTh>Id</AppTableTh>
              <AppTableTh>Date</AppTableTh>
              <AppTableTh align="right">Amount</AppTableTh>
              <AppTableTh align="right">Remaining</AppTableTh>
              <AppTableTh>Status</AppTableTh>
              <AppTableTh>Reference</AppTableTh>
              <AppTableTh>Description</AppTableTh>
              <AppTableTh>Fits quote</AppTableTh>
              {canPost ? <AppTableTh align="right">Actions</AppTableTh> : null}
            </AppTableThead>
            <AppTableBody>
              {deposits.length === 0 ? (
                <AppTableTr>
                  <AppTableTd colSpan={canPost ? 9 : 8} truncate={false} className="text-center text-slate-500">
                    No bank deposits for this filter.
                  </AppTableTd>
                </AppTableTr>
              ) : (
                deposits.map((d) => {
                  const canAct =
                    canPost &&
                    Math.round(Number(d.remainingNgn) || 0) === Math.round(Number(d.amountNgn) || 0) &&
                    ['OPEN', 'PARTIAL', 'RESERVED'].includes(String(d.status || '').toUpperCase());
                  const showReclass = reclassDraft.depositId === d.id;
                  return (
                    <AppTableTr key={d.id}>
                      <AppTableTd monospace title={d.id}>
                        {d.id}
                      </AppTableTd>
                      <AppTableTd>{d.bankDateISO || '—'}</AppTableTd>
                      <AppTableTd align="right">{formatNgn(d.amountNgn)}</AppTableTd>
                      <AppTableTd align="right">{formatNgn(d.remainingNgn)}</AppTableTd>
                      <AppTableTd truncate={false}>
                        {bankDepositStatusLabel(d.status)}
                        {d.reclassKind ? (
                          <span className="block text-ui-xs text-slate-500">
                            {bankDepositReclassKindLabel(d.reclassKind)}
                          </span>
                        ) : null}
                      </AppTableTd>
                      <AppTableTd monospace title={d.bankReference || ''}>
                        {d.bankReference || '—'}
                      </AppTableTd>
                      <AppTableTd title={d.description || ''}>{d.description || '—'}</AppTableTd>
                      <AppTableTd truncate={false}>
                        {(() => {
                          const match = byDeposit.get(d.id);
                          if (!match) return <span className="text-ui-xs text-slate-400">—</span>;
                          const canAct =
                            match.action === 'confirm_receipt' ? canConfirmPending : canApply;
                          if (!canAct) {
                            return (
                              <span className="text-ui-xs font-semibold text-teal-800">
                                {match.quotationRef}
                              </span>
                            );
                          }
                          return (
                            <button
                              type="button"
                              disabled={busyKey === match.key}
                              onClick={() => void runMatch(match)}
                              className="rounded border border-teal-200 bg-teal-50 px-1.5 py-0.5 text-ui-xs font-bold uppercase text-teal-900 hover:bg-teal-100 disabled:opacity-50"
                              title={`${match.quotationRef} · ${match.customer || ''} · ${formatNgn(match.quoteBalanceNgn)}`}
                            >
                              {busyKey === match.key ? 'Posting…' : `Fits ${match.quotationRef}`}
                            </button>
                          );
                        })()}
                      </AppTableTd>
                      {canPost ? (
                        <AppTableTd align="right" truncate={false}>
                          {canAct ? (
                            <div className="flex flex-col items-end gap-1">
                              <div className="flex flex-wrap justify-end gap-1">
                                <button
                                  type="button"
                                  disabled={actionBusyId === d.id}
                                  onClick={() => void reverseDeposit(d.id)}
                                  className="rounded border border-rose-200 px-1.5 py-0.5 text-ui-xs font-bold uppercase text-rose-700 hover:bg-rose-50 disabled:opacity-50"
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
                                  className="rounded border border-violet-200 px-1.5 py-0.5 text-ui-xs font-bold uppercase text-violet-700 hover:bg-violet-50 disabled:opacity-50"
                                >
                                  {showReclass ? 'Cancel' : 'Reclass'}
                                </button>
                              </div>
                              {showReclass ? (
                                <div className="mt-1 w-full max-w-[14rem] rounded border border-violet-100 bg-violet-50/50 p-1.5 text-left space-y-1">
                                  <select
                                    className="w-full rounded border border-slate-200 px-1 py-0.5 text-ui-xs"
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
                                    className="w-full rounded border border-slate-200 px-1 py-0.5 text-ui-xs"
                                    placeholder="Note (optional)"
                                    value={reclassDraft.note}
                                    onChange={(e) => setReclassDraft((f) => ({ ...f, note: e.target.value }))}
                                  />
                                  <button
                                    type="button"
                                    disabled={actionBusyId === d.id}
                                    onClick={() => void submitReclass(d.id)}
                                    className="w-full rounded bg-violet-700 px-1.5 py-0.5 text-ui-xs font-bold uppercase text-white disabled:opacity-50"
                                  >
                                    Confirm reclass
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-ui-xs text-slate-400">—</span>
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
      </div>
    </div>
  );
}
