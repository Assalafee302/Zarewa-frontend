import React, { useState } from 'react';
import { Package } from 'lucide-react';
import { apiFetch } from '../../lib/apiBase';
import { ModalFrame } from '../layout';
import {
  buildPaymentRequestBodyFromForm,
  createExpenseRequestLineItem,
} from '../../lib/expenseRequestFormCore.js';

const MACHINE_TAGS = ['', 'Generator', 'Forklift', 'Other'];

/**
 * Consumables / supplies request — never writes maintenance_cost_lines.
 * In-stock → jump to inventory; buy → payment request (Fuel & lubricant / Accessories).
 */
export function RequestSuppliesPanel({ branchId = '', onGoInventory }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('buy'); // stock | buy
  const [category, setCategory] = useState('');
  const [machineTag, setMachineTag] = useState('');
  const [item, setItem] = useState('');
  const [amount, setAmount] = useState('');
  const [payee, setPayee] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [okMsg, setOkMsg] = useState('');

  const effectiveCategory = (() => {
    if (category) return category;
    if (machineTag === 'Generator' || machineTag === 'Forklift') return 'Fuel & lubricant';
    return '';
  })();

  const submitBuy = async () => {
    if (!effectiveCategory) {
      setError('Choose a category (Fuel & lubricant or Accessories).');
      return;
    }
    const amt = Math.round(Number(amount) || 0);
    if (amt <= 0 || !item.trim()) {
      setError('Item and amount are required.');
      return;
    }
    setBusy(true);
    setError('');
    const line = createExpenseRequestLineItem();
    line.item = machineTag ? `${item.trim()} [${machineTag}]` : item.trim();
    line.unit = '1';
    line.unitPriceNgn = String(amt);
    const body = buildPaymentRequestBodyFromForm({
      lines: [line],
      requestDate: new Date().toISOString().slice(0, 10),
      requestReference: branchId ? `SUP-${branchId}` : 'SUPPLIES',
      expenseCategory: effectiveCategory,
      categoryJustification: '',
      description: machineTag
        ? `Supplies for ${machineTag}: ${item.trim()}`
        : `Supplies: ${item.trim()}`,
      payeeName: payee,
      payeeAccountNo: '',
      payeeBankName: '',
      attachment: null,
    });
    const res = await apiFetch('/api/payment-requests', { method: 'POST', body }).catch(() => ({
      ok: false,
    }));
    setBusy(false);
    if (!res.ok || res.data?.ok === false) {
      setError(res.data?.error || 'Could not submit purchase request.');
      return;
    }
    setOkMsg('Purchase request submitted for Branch Manager approval.');
    setItem('');
    setAmount('');
    setTimeout(() => setOpen(false), 700);
  };

  const inputClass =
    'w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-zarewa-teal/15';

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setError('');
          setOkMsg('');
          setMode('buy');
          setCategory('');
          setMachineTag('');
        }}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-ui-xs font-bold uppercase tracking-wide text-slate-700 hover:bg-slate-50"
      >
        <Package size={14} /> Request supplies
      </button>

      <ModalFrame isOpen={open} onClose={() => setOpen(false)} title="Request supplies" surface="plain">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-black text-zarewa-teal">Request supplies</p>
            <p className="text-ui-xs text-slate-500">
              Separate from plant faults — never counts toward machine lifetime maintenance.
            </p>
          </div>
          <div className="space-y-3 p-4">
            {error ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs font-semibold text-amber-950">
                {error}
              </p>
            ) : null}
            {okMsg ? (
              <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-xs font-semibold text-emerald-950">
                {okMsg}
              </p>
            ) : null}
            <div className="flex gap-2">
              <button
                type="button"
                className={`flex-1 rounded-lg border px-2 py-2 text-ui-xs font-bold uppercase ${
                  mode === 'stock' ? 'border-zarewa-teal bg-teal-50 text-zarewa-teal' : 'border-slate-200'
                }`}
                onClick={() => setMode('stock')}
              >
                In stock — issue
              </button>
              <button
                type="button"
                className={`flex-1 rounded-lg border px-2 py-2 text-ui-xs font-bold uppercase ${
                  mode === 'buy' ? 'border-zarewa-teal bg-teal-50 text-zarewa-teal' : 'border-slate-200'
                }`}
                onClick={() => setMode('buy')}
              >
                Need to buy
              </button>
            </div>

            {mode === 'stock' ? (
              <div className="space-y-3">
                <p className="text-xs text-slate-600">
                  Issue from store stock on the Stock management tab (accessories / fuel where tracked).
                </p>
                <button
                  type="button"
                  className="rounded-lg bg-zarewa-teal px-3 py-1.5 text-ui-xs font-bold uppercase text-white"
                  onClick={() => {
                    setOpen(false);
                    onGoInventory?.('accessory');
                  }}
                >
                  Open stock management
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="block text-ui-xs font-bold uppercase text-slate-500">
                  Optional machine tag
                  <select
                    className={`mt-1 ${inputClass}`}
                    value={machineTag}
                    onChange={(e) => {
                      const tag = e.target.value;
                      setMachineTag(tag);
                      if ((tag === 'Generator' || tag === 'Forklift') && !category) {
                        setCategory('Fuel & lubricant');
                      }
                    }}
                  >
                    {MACHINE_TAGS.map((t) => (
                      <option key={t || 'none'} value={t}>
                        {t || 'None'}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-ui-xs font-bold uppercase text-slate-500">
                  Category
                  <select
                    className={`mt-1 ${inputClass}`}
                    value={effectiveCategory}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="">Select…</option>
                    <option value="Fuel & lubricant">Fuel & lubricant</option>
                    <option value="Accessories">Accessories</option>
                  </select>
                </label>
                <label className="block text-ui-xs font-bold uppercase text-slate-500">
                  Item
                  <input
                    className={`mt-1 ${inputClass}`}
                    value={item}
                    onChange={(e) => setItem(e.target.value)}
                  />
                </label>
                <label className="block text-ui-xs font-bold uppercase text-slate-500">
                  Amount (₦)
                  <input
                    className={`mt-1 ${inputClass}`}
                    inputMode="numeric"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </label>
                <label className="block text-ui-xs font-bold uppercase text-slate-500">
                  Payee
                  <input
                    className={`mt-1 ${inputClass}`}
                    value={payee}
                    onChange={(e) => setPayee(e.target.value)}
                  />
                </label>
                <button
                  type="button"
                  disabled={busy}
                  className="rounded-lg bg-zarewa-teal px-3 py-1.5 text-ui-xs font-bold uppercase text-white disabled:opacity-50"
                  onClick={() => void submitBuy()}
                >
                  {busy ? 'Submitting…' : 'Submit purchase request'}
                </button>
              </div>
            )}
          </div>
        </div>
      </ModalFrame>
    </>
  );
}
