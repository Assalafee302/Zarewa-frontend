import React, { useEffect, useMemo, useState } from 'react';
import { formatNgn } from '../../Data/mockData';
import { apiFetch } from '../../lib/apiBase';
import { ModalFrame, ModalScrollShell, ModalScrollBody, ModalActionFooter } from '../layout';

/**
 * Finance Phase A (A6): Refund Credit App for one quotation, opened after the cashier cancelled
 * a cash receipt that had no bank payment. Nothing is pre-selected: the cashier ticks the refund
 * or credit to use. Posted in the cashier's name through /api/ledger/apply-refund-credit.
 * `target` = { customerId, customerName, quotationRef, amountNgn }
 */
export function UseRefundCreditModal({ target, onClose, onApplied }) {
  const [eligible, setEligible] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [picked, setPicked] = useState([]);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setPicked([]);
    setError('');
    setEligible(null);
    setAmount(target?.amountNgn ? String(Math.round(target.amountNgn)) : '');
    if (!target?.customerId || !target?.quotationRef) return undefined;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { ok, data } = await apiFetch(
        `/api/ledger/refund-credit-eligible?customerID=${encodeURIComponent(target.customerId)}&targetQuotationRef=${encodeURIComponent(target.quotationRef)}`
      );
      if (cancelled) return;
      setLoading(false);
      if (!ok || !data?.ok) {
        setError(data?.error || 'Could not load the refund credit for this quotation.');
        return;
      }
      setEligible(data);
    })().catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [target]);

  const sources = useMemo(() => (Array.isArray(eligible?.sources) ? eligible.sources : []), [eligible]);
  const pickedNgn = sources
    .filter((s) => picked.includes(s.id))
    .reduce((sum, s) => sum + Math.max(0, Math.round(Number(s.availableNgn) || 0)), 0);
  const amountNgn = Math.round(Number(String(amount).replace(/[^\d.]/g, '')) || 0);
  const canApply = picked.length > 0 && amountNgn > 0 && amountNgn <= pickedNgn && !busy;

  const apply = async (e) => {
    e.preventDefault();
    if (!canApply) return;
    setBusy(true);
    setError('');
    try {
      const { ok, data } = await apiFetch('/api/ledger/apply-refund-credit', {
        method: 'POST',
        body: JSON.stringify({
          customerID: target.customerId,
          targetQuotationRef: target.quotationRef,
          amountNgn,
          sourceIds: picked,
        }),
      });
      if (!ok || !data?.ok) {
        setError(data?.error || 'Could not apply the refund credit.');
        return;
      }
      onApplied?.(data);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalFrame isOpen={Boolean(target)} onClose={onClose} title="Refund Credit App" surface="plain">
      <ModalScrollShell>
        <form onSubmit={apply} data-testid="use-refund-credit-form">
          <ModalScrollBody className="space-y-4">
            <p className="text-sm text-slate-700">
              Apply {target?.customerName || 'the customer'}&apos;s refund credit to{' '}
              <span className="font-mono font-semibold">{target?.quotationRef}</span>. The cash receipt was cancelled — no
              bank payment.
            </p>
            {loading ? <p className="text-xs text-slate-500">Loading refund credit…</p> : null}
            {!loading && eligible && !sources.length ? (
              <p className="text-xs font-semibold text-amber-800">No refund or credit can be applied to this quotation.</p>
            ) : null}
            <ul className="space-y-1.5">
              {sources.map((s) => (
                <li key={s.id}>
                  <label className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs">
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={picked.includes(s.id)}
                      onChange={(e) =>
                        setPicked((prev) => (e.target.checked ? [...prev, s.id] : prev.filter((id) => id !== s.id)))
                      }
                    />
                    <span className="flex-1">
                      <span className="font-semibold text-slate-800">{s.label || s.id}</span>
                      <span className="block text-slate-500">{s.recommendation || ''}</span>
                    </span>
                    <span className="font-black tabular-nums text-zarewa-teal">{formatNgn(s.availableNgn)}</span>
                  </label>
                </li>
              ))}
            </ul>
            <label className="block space-y-1">
              <span className="text-ui-xs font-bold uppercase tracking-wide text-slate-500">Amount to apply</span>
              <input
                className="z-finance-field tabular-nums"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </label>
            {picked.length > 0 && amountNgn > pickedNgn ? (
              <p className="text-xs font-semibold text-amber-800">Only {formatNgn(pickedNgn)} is available on what you ticked.</p>
            ) : null}
            {error ? <p className="text-xs font-semibold text-rose-700">{error}</p> : null}
          </ModalScrollBody>
          <ModalActionFooter
            onCancel={onClose}
            cancelLabel="Close"
            cancelDisabled={busy}
            confirmType="submit"
            confirmLabel={amountNgn > 0 ? `Apply ${formatNgn(amountNgn)} credit` : 'Apply credit'}
            confirmDisabled={!canApply}
            confirmLoading={busy}
            confirmLoadingLabel="Applying…"
          />
        </form>
      </ModalScrollShell>
    </ModalFrame>
  );
}
