/**
 * Apply this refund's transferable fund onto another quotation for the same customer.
 * Uses the same ledger APIs as Sales Add payment / Finance receipt confirm.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Link2 } from 'lucide-react';
import { formatNgn } from '../../Data/mockData';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useToast } from '../../context/ToastContext';
import { apiFetch } from '../../lib/apiBase';
import { REFUND_FUND_USE_LABEL } from '../../lib/refundFundApply.js';
import {
  listCustomerQuotationsWithBalanceDue,
  planApplyFromRefundSource,
  refundCreditSourceId,
  refundMayApplyCreditToQuotation,
  refundTransferableOpenNgn,
} from '../../lib/refundApplyToQuotation.js';
import { FinanceDeskQueueActionButton } from './FinanceDeskColoredQueuePanel';

export function RefundApplyToQuotationPanel({ refund, onApplied, className = '' }) {
  const ws = useWorkspace();
  const { show: showToast } = useToast();
  const refundId = String(refund?.refundID || refund?.refund_id || '').trim();
  const customerId = String(refund?.customerID || refund?.customer_id || '').trim();
  const sourceQuotationRef = String(refund?.quotationRef || refund?.quotation_ref || '').trim();

  const canApply =
    Boolean(ws?.canMutate) &&
    (Boolean(ws?.hasPermission?.('receipts.post')) ||
      Boolean(ws?.hasPermission?.('*')));

  const openNgn = useMemo(() => refundTransferableOpenNgn(refund), [refund]);
  const mayApplyKind = useMemo(() => refundMayApplyCreditToQuotation(refund), [refund]);

  const targetOptions = useMemo(() => {
    const quotations = Array.isArray(ws?.snapshot?.quotations) ? ws.snapshot.quotations : [];
    return listCustomerQuotationsWithBalanceDue(quotations, customerId);
  }, [ws?.snapshot?.quotations, customerId]);

  const [targetQuotationRef, setTargetQuotationRef] = useState('');
  const [eligible, setEligible] = useState(null);
  const [eligibleLoading, setEligibleLoading] = useState(false);
  const [eligibleError, setEligibleError] = useState('');
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    setTargetQuotationRef('');
    setEligible(null);
    setEligibleError('');
  }, [refundId]);

  useEffect(() => {
    if (!targetQuotationRef || !customerId || !refundId) {
      setEligible(null);
      setEligibleError('');
      return undefined;
    }
    let cancelled = false;
    setEligibleLoading(true);
    setEligibleError('');
    void apiFetch(
      `/api/ledger/refund-credit-eligible?customerID=${encodeURIComponent(customerId)}&targetQuotationRef=${encodeURIComponent(targetQuotationRef)}`
    ).then(({ ok, data }) => {
      if (cancelled) return;
      setEligibleLoading(false);
      if (!ok || !data?.ok) {
        setEligible(null);
        setEligibleError(String(data?.error || 'Could not load refund fund for that quotation.'));
        return;
      }
      setEligible(data);
    });
    return () => {
      cancelled = true;
    };
  }, [targetQuotationRef, customerId, refundId]);

  const plan = useMemo(() => {
    if (!eligible || !refundId) return null;
    return planApplyFromRefundSource(eligible, refundId);
  }, [eligible, refundId]);

  if (!refundId || !customerId || !mayApplyKind || !(openNgn > 0)) return null;
  if (!canApply) {
    return (
      <div
        className={`rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-600 ${className}`.trim()}
      >
        {formatNgn(openNgn)} of this refund can cover another quotation, but you need permission to post receipts
        to apply it here. Use Sales Add payment or Finance receipt confirm instead.
      </div>
    );
  }
  if (!targetOptions.length) {
    return (
      <div
        className={`rounded-xl border border-sky-200 bg-sky-50/80 px-3 py-2.5 text-xs text-sky-950 ${className}`.trim()}
      >
        {formatNgn(openNgn)} is available to apply to another job, but this customer has no quotations with balance
        due right now.
      </div>
    );
  }

  const handleApply = async () => {
    if (!plan?.ok || !(plan.applyNgn > 0) || applying) return;
    setApplying(true);
    try {
      const creditKey =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `rca-refund-${Date.now()}`;
      const { ok, data } = await apiFetch('/api/ledger/apply-refund-credit', {
        method: 'POST',
        body: JSON.stringify({
          customerID: customerId,
          targetQuotationRef,
          amountNgn: plan.applyNgn,
          sourceIds: [refundCreditSourceId(refundId)],
        }),
        headers: { 'Idempotency-Key': creditKey },
      });
      if (!ok || !data?.ok) {
        showToast(String(data?.error || 'Could not apply refund fund.'), { variant: 'error' });
        return;
      }
      showToast(
        `${formatNgn(data.appliedNgn || plan.applyNgn)} applied to ${targetQuotationRef} from refund ${refundId}.`
      );
      setTargetQuotationRef('');
      setEligible(null);
      await ws?.refresh?.();
      await onApplied?.(data);
    } finally {
      setApplying(false);
    }
  };

  return (
    <div
      className={`rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-3 space-y-2.5 text-xs text-amber-950 ${className}`.trim()}
    >
      <div className="flex items-start gap-2">
        <Link2 size={16} className="shrink-0 mt-0.5 text-amber-800" aria-hidden />
        <div className="min-w-0 space-y-1">
          <p className="font-bold text-amber-900">{REFUND_FUND_USE_LABEL} on another quotation</p>
          <p className="text-amber-950/90 leading-relaxed">
            Apply up to {formatNgn(openNgn)} from refund {refundId}
            {sourceQuotationRef ? ` (from ${sourceQuotationRef})` : ''} toward this customer&apos;s unpaid job. That
            slice counts as paid on the target quote — it is not bank clearance and is not refundable again.
          </p>
        </div>
      </div>

      <label className="block space-y-1">
        <span className="text-ui-xs font-bold uppercase tracking-wide text-amber-900/80">Target quotation</span>
        <select
          className="w-full rounded-lg border border-amber-200 bg-white px-2.5 py-2 text-sm font-medium text-slate-800"
          value={targetQuotationRef}
          onChange={(e) => setTargetQuotationRef(String(e.target.value || '').trim())}
          disabled={applying}
        >
          <option value="">Select quotation with balance due…</option>
          {targetOptions.map((q) => (
            <option key={q.id} value={q.id}>
              {q.id} · due {formatNgn(q.dueNgn)}
              {q.customer ? ` · ${q.customer}` : ''}
            </option>
          ))}
        </select>
      </label>

      {eligibleLoading ? <p className="text-slate-600">Checking transferable amount…</p> : null}
      {eligibleError ? <p className="text-rose-800 font-medium">{eligibleError}</p> : null}

      {plan?.ok && plan.applyNgn > 0 ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/90 px-2.5 py-2 text-emerald-950 space-y-1">
          <p>
            Will apply <span className="font-black tabular-nums">{formatNgn(plan.applyNgn)}</span> to{' '}
            <span className="font-mono font-bold">{targetQuotationRef}</span>
            {plan.leftoverOnRefundNgn > 0
              ? ` · ${formatNgn(plan.leftoverOnRefundNgn)} stays on this refund`
              : ' · nothing left on this refund after apply'}
            {plan.remainderDueNgn > 0
              ? ` · ${formatNgn(plan.remainderDueNgn)} still due on target after apply`
              : ' · target quote fully covered by this apply'}
          </p>
          <FinanceDeskQueueActionButton tone="teal" onClick={handleApply} disabled={applying}>
            {applying ? 'Applying…' : `Apply ${formatNgn(plan.applyNgn)} to ${targetQuotationRef}`}
          </FinanceDeskQueueActionButton>
        </div>
      ) : null}

      {targetQuotationRef && !eligibleLoading && plan && !plan.ok ? (
        <p className="text-rose-800">{plan.error || 'Nothing to apply for this quotation.'}</p>
      ) : null}
    </div>
  );
}
