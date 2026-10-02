import React, { useEffect, useMemo, useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useInventory } from '../../context/InventoryContext';
import { useToast } from '../../context/ToastContext';
import { apiFetch } from '../../lib/apiBase';
import { formatNgn } from '../../shared/lib/formatNgn.js';
import { treasuryAccountDisplayName, treasuryAccountsForWorkspace } from '../../lib/treasuryAccountsStore';
import {
  parseNairaInput,
  previewExtraPayment,
  previewPaymentCorrection,
  todayISO,
} from '../../lib/supplierOverpaymentDesk.js';

const TABS = [
  { id: 'pay', title: 'Record extra payment', hint: 'Second transfer, or cash above the order' },
  { id: 'rev', title: 'Record reversal', hint: 'Supplier refund or bank recall' },
  { id: 'edit', title: 'Correct a wrong payment', hint: 'Type the amount that left the bank' },
];

function Field({ label, children, hint }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-ui-xs font-bold uppercase tracking-wide text-slate-500">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-slate-500">{hint}</span> : null}
    </label>
  );
}

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-zarewa-teal focus:ring-2 focus:ring-teal-100';

function Kpi({ label, value, detail, tone }) {
  const tones = {
    plain: 'border-slate-200 bg-white',
    good: 'border-emerald-200 bg-emerald-50',
    due: 'border-amber-200 bg-amber-50',
    excess: 'border-violet-200 bg-violet-50',
  };
  return (
    <div className={`rounded-2xl border p-4 ${tones[tone] || tones.plain}`}>
      <p className="text-ui-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-black tabular-nums text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-600">{detail}</p>
    </div>
  );
}

/**
 * Second supplier payment, amount correction, and overpayment refund.
 * Rendered inside Procurement → Payments, not as its own desk.
 * @param {{ initialPoId?: string }} [props]
 */
export function SupplierOverpaymentPanel({ initialPoId = '' }) {
  const ws = useWorkspace();
  const { purchaseOrders } = useInventory();
  const { show: showToast } = useToast();
  const [poId, setPoId] = useState(String(initialPoId || '').trim());
  const [query, setQuery] = useState(String(initialPoId || '').trim());
  const [tab, setTab] = useState('pay');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [position, setPosition] = useState(null);
  const [movements, setMovements] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [payForm, setPayForm] = useState({
    amount: '',
    reason: 'duplicate_payment',
    treasuryAccountId: '',
    dateISO: todayISO(),
    reference: '',
    note: '',
  });
  const [revForm, setRevForm] = useState({
    amount: '',
    reason: 'supplier_refund',
    treasuryAccountId: '',
    dateISO: todayISO(),
    reference: '',
    note: '',
  });
  const [corrections, setCorrections] = useState({});

  const canPost = Boolean(ws?.hasPermission?.('finance.pay') || ws?.hasPermission?.('*'));
  const accounts = useMemo(
    () =>
      treasuryAccountsForWorkspace(ws?.snapshot, ws?.session, {
        payableBranchId: position?.branchId,
      }),
    [ws?.snapshot, ws?.session, position?.branchId]
  );

  const suggestions = useMemo(() => {
    const rows = Array.isArray(purchaseOrders) ? purchaseOrders : [];
    const q = query.trim().toLowerCase();
    return rows
      .filter((po) => {
        if (!q) return true;
        const id = String(po.poID || po.poId || '').toLowerCase();
        const name = String(po.supplierName || '').toLowerCase();
        return id.includes(q) || name.includes(q);
      })
      .slice(0, 8);
  }, [purchaseOrders, query]);

  useEffect(() => {
    const next = String(initialPoId || '').trim();
    if (!next) return;
    setPoId(next);
    setQuery(next);
  }, [initialPoId]);

  useEffect(() => {
    if (!accounts.length) return;
    setPayForm((f) => ({ ...f, treasuryAccountId: f.treasuryAccountId || String(accounts[0].id) }));
    setRevForm((f) => ({ ...f, treasuryAccountId: f.treasuryAccountId || String(accounts[0].id) }));
  }, [accounts]);

  useEffect(() => {
    if (!poId) {
      setPosition(null);
      setMovements([]);
      setPayments([]);
      setLoadError('');
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setLoadError('');
    apiFetch(`/api/purchase-orders/${encodeURIComponent(poId)}/supplier-overpayment`)
      .then(({ ok, data }) => {
        if (cancelled) return;
        if (!ok || !data?.position) {
          setPosition(null);
          setMovements([]);
          setPayments([]);
          setLoadError(data?.error || 'Purchase order not found.');
          return;
        }
        setPosition(data.position);
        setMovements(Array.isArray(data.movements) ? data.movements : []);
        setPayments(Array.isArray(data.payments) ? data.payments : []);
        setQuery(data.position.poId || poId);
      })
      .catch(() => {
        if (!cancelled) setLoadError('Could not load this purchase order.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [poId]);

  const openPo = (id) => {
    const next = String(id || query || '').trim();
    if (!next) return;
    setPoId(next);
    setQuery(next);
  };

  const payPreview = previewExtraPayment({
    stillOwedNgn: position?.stillOwedNgn,
    amountNgn: parseNairaInput(payForm.amount),
  });

  async function postAction(path, body, success) {
    if (!canPost) {
      showToast('Recording these payments needs finance pay permission.', { variant: 'error' });
      return;
    }
    if (!ws?.canMutate) {
      showToast('Workspace is read-only.', { variant: 'error' });
      return;
    }
    setBusy(true);
    try {
      const { ok, data } = await apiFetch(path, { method: 'POST', body: JSON.stringify(body) });
      if (!ok || data?.ok === false) {
        showToast(data?.error || 'Could not save.', { variant: 'error' });
        return;
      }
      if (data.position) setPosition(data.position);
      if (Array.isArray(data.movements)) setMovements(data.movements);
      if (Array.isArray(data.payments)) setPayments(data.payments);
      else if (poId) {
        const fresh = await apiFetch(`/api/purchase-orders/${encodeURIComponent(poId)}/supplier-overpayment`);
        if (fresh.ok && fresh.data?.position) {
          setPosition(fresh.data.position);
          setMovements(fresh.data.movements || []);
          setPayments(fresh.data.payments || []);
        }
      }
      showToast(success(data), { variant: 'success' });
    } finally {
      setBusy(false);
    }
  }

  const obligation = Number(position?.obligationNgn) || 0;
  const paid = Number(position?.supplierPaidNgn) || 0;
  const owed = Number(position?.stillOwedNgn) || 0;
  const excess = Number(position?.excessNgn) || 0;

  return (
    <div className="space-y-4">
      <form
        className="mb-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          openPo(query);
        }}
      >
        <Field label="Purchase order">
          <input
            className={inputClass}
            list="supplier-overpayment-pos"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="PO number or supplier"
          />
          <datalist id="supplier-overpayment-pos">
            {suggestions.map((po) => {
              const id = po.poID || po.poId;
              return <option key={id} value={id}>{`${po.supplierName || 'Supplier'} · ${po.status || ''}`}</option>;
            })}
          </datalist>
        </Field>
        <button type="submit" className="z-btn-primary rounded-xl px-4 py-2.5 text-sm font-bold">
          Open order
        </button>
      </form>

      {!poId ? (
        <p className="text-sm text-slate-600">Choose a purchase order to see what has been paid and what is still owed.</p>
      ) : null}
      {loading ? <p className="text-sm text-slate-600">Loading balances…</p> : null}
      {loadError ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{loadError}</p>
      ) : null}

      {position ? (
        <div className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-mono text-sm font-bold text-zarewa-teal">#{position.poId}</p>
                <h2 className="text-lg font-black text-slate-900">{position.supplierName || 'Supplier'}</h2>
              </div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {position.status || 'Open'} · {position.branchId || 'Branch'}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Kpi label="Order obligation" value={formatNgn(obligation)} detail="Agreed line total or landed cost" />
              <Kpi label="Total disbursed" value={formatNgn(paid)} detail="Every posted payment on this order" />
              <Kpi
                label="Still owed"
                value={formatNgn(owed)}
                detail={owed === 0 ? 'Paid in full' : 'Outstanding on the order'}
                tone={owed === 0 ? 'good' : 'due'}
              />
              <Kpi
                label="Excess"
                value={formatNgn(excess)}
                detail={excess > 0 ? 'Supplier owes this back' : 'Nothing above the order'}
                tone={excess > 0 ? 'excess' : 'plain'}
              />
            </div>
          </section>

          <div className="grid gap-2 md:grid-cols-3">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`rounded-2xl border px-4 py-3 text-left ${
                  tab === item.id ? 'border-zarewa-teal bg-white shadow-sm' : 'border-slate-200 bg-slate-50'
                }`}
              >
                <span className="block text-sm font-bold text-slate-900">{item.title}</span>
                <span className="block text-xs text-slate-500">{item.hint}</span>
              </button>
            ))}
          </div>

          {!canPost ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              You can review this order. Posting a payment, reversal, or correction needs finance pay permission.
            </p>
          ) : null}

          {tab === 'pay' ? (
            <form
              className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"
              onSubmit={(e) => {
                e.preventDefault();
                const amountNgn = parseNairaInput(payForm.amount);
                if (payPreview.withinInvoice) {
                  showToast('That amount is still within the invoice. Record it as a normal supplier payment.', {
                    variant: 'error',
                  });
                  return;
                }
                postAction(
                  `/api/purchase-orders/${encodeURIComponent(position.poId)}/supplier-excess-payment`,
                  {
                    amountNgn,
                    treasuryAccountId: Number(payForm.treasuryAccountId),
                    dateISO: payForm.dateISO,
                    reference: payForm.reference,
                    note: payForm.note,
                    reason: payForm.reason,
                  },
                  (data) =>
                    data.duplicate
                      ? 'That bank reference was already recorded.'
                      : `Recorded ${formatNgn(data.amountNgn)}. ${formatNgn(data.advanceNgn)} is held as excess.`
                );
              }}
            >
              <p className="text-sm text-slate-600">
                Use this when money already left the bank a second time, or one transfer was larger than the order.
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Why">
                  <select
                    className={inputClass}
                    value={payForm.reason}
                    onChange={(e) => setPayForm((f) => ({ ...f, reason: e.target.value }))}
                  >
                    <option value="duplicate_payment">We paid this supplier twice</option>
                    <option value="overpayment">One transfer was more than the order</option>
                  </select>
                </Field>
                <Field label="Amount that left the bank">
                  <input
                    className={inputClass}
                    inputMode="numeric"
                    value={payForm.amount}
                    onChange={(e) => setPayForm((f) => ({ ...f, amount: e.target.value }))}
                    required
                  />
                </Field>
                <Field label="Bank account">
                  <select
                    className={inputClass}
                    value={payForm.treasuryAccountId}
                    onChange={(e) => setPayForm((f) => ({ ...f, treasuryAccountId: e.target.value }))}
                    required
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {treasuryAccountDisplayName(a)} · {formatNgn(a.balance)}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Date">
                  <input
                    type="date"
                    className={inputClass}
                    value={payForm.dateISO}
                    onChange={(e) => setPayForm((f) => ({ ...f, dateISO: e.target.value }))}
                    required
                  />
                </Field>
                <Field label="Bank reference">
                  <input
                    className={inputClass}
                    minLength={3}
                    value={payForm.reference}
                    onChange={(e) => setPayForm((f) => ({ ...f, reference: e.target.value }))}
                    required
                  />
                </Field>
                <Field label="Note">
                  <input
                    className={inputClass}
                    minLength={8}
                    value={payForm.note}
                    onChange={(e) => setPayForm((f) => ({ ...f, note: e.target.value }))}
                    placeholder="What happened"
                    required
                  />
                </Field>
              </div>
              {payPreview.amountNgn > 0 ? (
                <p className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-950">
                  {payPreview.withinInvoice
                    ? `${formatNgn(payPreview.amountNgn)} still fits the invoice. Pay that from Procurement, not here.`
                    : `${formatNgn(payPreview.settlementNgn)} settles the order. ${formatNgn(payPreview.advanceNgn)} is held as excess the supplier owes back.`}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <button type="button" className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold" onClick={() => setPayForm((f) => ({ ...f, amount: String(obligation || '') }))}>
                  Fill full order value
                </button>
                <button
                  type="button"
                  className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold"
                  onClick={() => setPayForm((f) => ({ ...f, amount: String((owed || 0) + 100_000) }))}
                >
                  Fill balance + ₦100,000
                </button>
              </div>
              <button type="submit" disabled={busy || !canPost} className="z-btn-primary rounded-xl px-4 py-2.5 text-sm font-bold disabled:opacity-50">
                {busy ? 'Saving…' : 'Post extra payment'}
              </button>
            </form>
          ) : null}

          {tab === 'rev' ? (
            <form
              className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"
              onSubmit={(e) => {
                e.preventDefault();
                const amountNgn = parseNairaInput(revForm.amount);
                if (amountNgn > excess) {
                  showToast(`Only ${formatNgn(excess)} is above the order.`, { variant: 'error' });
                  return;
                }
                postAction(
                  `/api/purchase-orders/${encodeURIComponent(position.poId)}/supplier-overpayment-reversal`,
                  {
                    amountNgn,
                    treasuryAccountId: Number(revForm.treasuryAccountId),
                    dateISO: revForm.dateISO,
                    reference: revForm.reference,
                    note: revForm.note,
                    reason: revForm.reason,
                  },
                  (data) =>
                    data.duplicate
                      ? 'That bank reference was already recorded.'
                      : `Recorded ${formatNgn(data.amountNgn)} coming back. Paid total is now ${formatNgn(data.position?.supplierPaidNgn)}.`
                );
              }}
            >
              {excess <= 0 ? (
                <p className="text-sm text-slate-600">
                  Nothing is above the order value yet. Record the extra payment first, or correct a payment that was typed too high.
                </p>
              ) : (
                <p className="text-sm text-slate-600">
                  {formatNgn(excess)} can come back. This is for cash the supplier refunded or the bank recalled, not for a typing mistake.
                </p>
              )}
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Why">
                  <select
                    className={inputClass}
                    value={revForm.reason}
                    onChange={(e) => setRevForm((f) => ({ ...f, reason: e.target.value }))}
                  >
                    <option value="supplier_refund">Supplier refunded the overpayment</option>
                    <option value="bank_reversal">Bank reversed the extra payment</option>
                  </select>
                </Field>
                <Field label="Amount coming back">
                  <input
                    className={inputClass}
                    inputMode="numeric"
                    value={revForm.amount}
                    onChange={(e) => setRevForm((f) => ({ ...f, amount: e.target.value }))}
                    required
                  />
                </Field>
                <Field label="Receiving account">
                  <select
                    className={inputClass}
                    value={revForm.treasuryAccountId}
                    onChange={(e) => setRevForm((f) => ({ ...f, treasuryAccountId: e.target.value }))}
                    required
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {treasuryAccountDisplayName(a)} · {formatNgn(a.balance)}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Date">
                  <input
                    type="date"
                    className={inputClass}
                    value={revForm.dateISO}
                    onChange={(e) => setRevForm((f) => ({ ...f, dateISO: e.target.value }))}
                    required
                  />
                </Field>
                <Field label="Bank reference">
                  <input
                    className={inputClass}
                    minLength={3}
                    value={revForm.reference}
                    onChange={(e) => setRevForm((f) => ({ ...f, reference: e.target.value }))}
                    required
                  />
                </Field>
                <Field label="Note">
                  <input
                    className={inputClass}
                    minLength={8}
                    value={revForm.note}
                    onChange={(e) => setRevForm((f) => ({ ...f, note: e.target.value }))}
                    required
                  />
                </Field>
              </div>
              <button
                type="button"
                className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold"
                onClick={() => setRevForm((f) => ({ ...f, amount: String(excess || '') }))}
                disabled={excess <= 0}
              >
                Fill full excess
              </button>
              <button type="submit" disabled={busy || !canPost || excess <= 0} className="z-btn-primary rounded-xl px-4 py-2.5 text-sm font-bold disabled:opacity-50">
                {busy ? 'Saving…' : 'Post reversal'}
              </button>
            </form>
          ) : null}

          {tab === 'edit' ? (
            <section className="space-y-3">
              <p className="text-sm text-slate-600">
                Choose the bank line and enter the amount that actually left the account. The difference updates the bank, the paid total, and the accounts. The original line stays.
              </p>
              {payments.length === 0 ? (
                <p className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-600">
                  {paid > 0
                    ? `${formatNgn(paid)} is marked paid, but there is no bank payment line to edit.`
                    : 'No supplier payment has been posted on this order yet.'}
                </p>
              ) : (
                payments.map((row) => {
                  const draft = corrections[row.id] || { amount: String(row.amountPaidNgn || ''), note: '' };
                  const preview = previewPaymentCorrection({
                    obligationNgn: obligation,
                    supplierPaidNgn: paid,
                    currentLineNgn: row.amountPaidNgn,
                    nextLineNgn: parseNairaInput(draft.amount),
                  });
                  return (
                    <form
                      key={row.id}
                      className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4"
                      onSubmit={(e) => {
                        e.preventDefault();
                        postAction(
                          `/api/purchase-orders/${encodeURIComponent(position.poId)}/supplier-payment-correction`,
                          {
                            movementId: row.id,
                            amountNgn: parseNairaInput(draft.amount),
                            note: draft.note,
                          },
                          (data) =>
                            data.noOp
                              ? `That payment is already ${formatNgn(data.amountNgn)}.`
                              : `Corrected from ${formatNgn(data.previousAmountNgn)} to ${formatNgn(data.amountNgn)}.`
                        );
                      }}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-bold text-slate-900">{row.kindLabel || 'Supplier payment'}</p>
                          <p className="text-xs text-slate-500">
                            {String(row.postedAtISO || '').slice(0, 10)} · {row.accountName || 'Account'} · {row.reference || 'no reference'}
                          </p>
                        </div>
                        <p className="text-sm font-black tabular-nums">Entered {formatNgn(row.amountPaidNgn)}</p>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <Field label="Correct amount paid">
                          <input
                            className={inputClass}
                            inputMode="numeric"
                            value={draft.amount}
                            onChange={(e) =>
                              setCorrections((prev) => ({ ...prev, [row.id]: { ...draft, amount: e.target.value } }))
                            }
                            required
                          />
                        </Field>
                        <Field label="Why the figure was wrong">
                          <input
                            className={inputClass}
                            minLength={8}
                            value={draft.note}
                            onChange={(e) =>
                              setCorrections((prev) => ({ ...prev, [row.id]: { ...draft, note: e.target.value } }))
                            }
                            required
                          />
                        </Field>
                      </div>
                      {!preview.unchanged && parseNairaInput(draft.amount) > 0 ? (
                        <p className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-950">
                          Paid total becomes {formatNgn(preview.nextPaidNgn)}. Still owed {formatNgn(preview.stillOwedNgn)}. Excess {formatNgn(preview.excessNgn)}.
                        </p>
                      ) : null}
                      <button type="submit" disabled={busy || !canPost} className="z-btn-primary rounded-xl px-4 py-2.5 text-sm font-bold disabled:opacity-50">
                        {busy ? 'Saving…' : 'Save corrected amount'}
                      </button>
                    </form>
                  );
                })
              )}
            </section>
          ) : null}

          <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <h3 className="text-sm font-black text-slate-900">Extra payments and refunds</h3>
            {movements.length === 0 ? (
              <p className="mt-2 text-sm text-slate-600">None recorded on this screen yet.</p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-ui-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="py-2 pr-3">Date</th>
                      <th className="py-2 pr-3">Kind</th>
                      <th className="py-2 pr-3">Account</th>
                      <th className="py-2 pr-3">Reference</th>
                      <th className="py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.map((row) => {
                      const inbound = Number(row.amountNgn) > 0;
                      return (
                        <tr key={row.id} className="border-t border-slate-100">
                          <td className="py-2 pr-3">{String(row.postedAtISO || '').slice(0, 10)}</td>
                          <td className="py-2 pr-3">{inbound ? 'Reversal' : 'Extra payment'}</td>
                          <td className="py-2 pr-3">{row.accountName || '—'}</td>
                          <td className="py-2 pr-3 font-mono text-xs">{row.reference || '—'}</td>
                          <td className={`py-2 text-right font-bold tabular-nums ${inbound ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {inbound ? '+' : '−'}
                            {formatNgn(Math.abs(row.amountNgn))}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
