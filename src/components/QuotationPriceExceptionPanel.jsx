import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../lib/apiBase';
import { formatNgn } from '../Data/mockData';
import {
  quotationBmPriceExceptionApproved,
  quotationFlaggedForMdPriceReview,
  quotationMdPriceReviewConfirmed,
  quotationRefundBlockedPendingMdPriceConfirm,
} from '../lib/quotationPriceException';
import { useWorkspace } from '../context/WorkspaceContext';
import { useToast } from '../context/ToastContext';

/**
 * Below-floor pricing gate: branch manager (or admin) approves before production start;
 * MD confirms after production before customer refund.
 *
 * @param {{
 *   quotationId: string;
 *   quotation?: object | null;
 *   productionClosedForQuote?: boolean;
 *   onQuotationUpdated?: (q: object) => void;
 *   className?: string;
 * }} props
 */
export function QuotationPriceExceptionPanel({
  quotationId,
  quotation,
  productionClosedForQuote = false,
  onQuotationUpdated,
  className = '',
}) {
  const ws = useWorkspace();
  const { showToast } = useToast();
  const qid = String(quotationId || '').trim();
  const [violations, setViolations] = useState([]);
  const [hasFloorRows, setHasFloorRows] = useState(false);
  const [quoteRow, setQuoteRow] = useState(quotation ?? null);
  const [loading, setLoading] = useState(false);
  const [bmApproving, setBmApproving] = useState(false);
  const [mdConfirming, setMdConfirming] = useState(false);

  const canApproveBmPriceException = useMemo(() => {
    const rk = String(ws?.session?.user?.roleKey ?? '').trim().toLowerCase();
    return rk === 'sales_manager' || rk === 'branch_manager' || rk === 'admin';
  }, [ws?.session?.user?.roleKey]);

  const mergeQuote = useCallback(
    (q) => {
      if (!q) return;
      setQuoteRow((prev) => ({ ...(prev || {}), ...q }));
      if (Array.isArray(q.pricingViolations)) setViolations(q.pricingViolations);
      if (q.pricingHasFloorRows != null) setHasFloorRows(Boolean(q.pricingHasFloorRows));
      if (typeof ws?.mergeQuotationIntoSnapshot === 'function') ws.mergeQuotationIntoSnapshot(q);
      onQuotationUpdated?.(q);
    },
    [onQuotationUpdated, ws]
  );

  useEffect(() => {
    setQuoteRow(quotation ?? null);
    if (Array.isArray(quotation?.pricingViolations)) {
      setViolations(quotation.pricingViolations);
      setHasFloorRows(Boolean(quotation.pricingHasFloorRows));
    }
  }, [quotation, qid]);

  useEffect(() => {
    if (!qid) {
      setViolations([]);
      setHasFloorRows(false);
      return;
    }
    if (Array.isArray(quotation?.pricingViolations) && quotation.pricingViolations.length > 0) {
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { ok, data } = await apiFetch(`/api/quotations/${encodeURIComponent(qid)}`);
        if (cancelled || !ok || !data?.quotation) return;
        const q = data.quotation;
        setViolations(Array.isArray(q.pricingViolations) ? q.pricingViolations : []);
        setHasFloorRows(Boolean(q.pricingHasFloorRows));
        mergeQuote(q);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [qid, quotation?.pricingViolations, mergeQuote]);

  const bmApproved = quotationBmPriceExceptionApproved(quoteRow);
  const showPanel = hasFloorRows && violations.length > 0;
  if (!qid || !showPanel) return null;

  const onBmPriceExceptionApprove = async () => {
    if (!ws?.canMutate) {
      showToast('You do not have permission to record approvals.', { variant: 'error' });
      return;
    }
    if (!canApproveBmPriceException || !ws?.hasPermission?.('refunds.approve')) {
      showToast(
        'Only a branch manager or administrator (with refund approval) may approve a below-floor price exception.',
        { variant: 'error' }
      );
      return;
    }
    if (
      !window.confirm(
        'Approve below-floor pricing for this quotation? Production may start. The Managing Director must confirm after production before any customer refund.'
      )
    )
      return;
    setBmApproving(true);
    try {
      const { ok, data } = await apiFetch(`/api/quotations/${encodeURIComponent(qid)}/bm-price-exception`, {
        method: 'PATCH',
        body: JSON.stringify({}),
      });
      if (!ok || !data?.ok) {
        showToast(data?.error || 'Could not record branch manager approval.', { variant: 'error' });
        return;
      }
      if (data.quotation) mergeQuote(data.quotation);
      showToast('Below-floor approval recorded — you can Save & start production.');
      if (typeof ws?.refresh === 'function') await ws.refresh();
    } finally {
      setBmApproving(false);
    }
  };

  const onMdPriceExceptionConfirm = async () => {
    if (!ws?.canMutate) {
      showToast('You do not have permission to record MD confirmation.', { variant: 'error' });
      return;
    }
    if (!ws?.hasPermission?.('md.price_exception.approve')) {
      showToast('Only the Managing Director can confirm this below-floor exception.', { variant: 'error' });
      return;
    }
    if (!productionClosedForQuote) {
      showToast('Complete or cancel production on this quotation before MD confirmation.', { variant: 'error' });
      return;
    }
    if (
      !window.confirm(
        'Confirm MD review of the below-floor price exception? Customer refunds on this quotation may proceed after this step.'
      )
    )
      return;
    setMdConfirming(true);
    try {
      const { ok, data } = await apiFetch(
        `/api/quotations/${encodeURIComponent(qid)}/md-price-exception-confirm`,
        {
          method: 'PATCH',
          body: JSON.stringify({}),
        }
      );
      if (!ok || !data?.ok) {
        showToast(data?.error || 'Could not record MD confirmation.', { variant: 'error' });
        return;
      }
      if (data.quotation) mergeQuote(data.quotation);
      showToast('MD price review confirmed.');
      if (typeof ws?.refresh === 'function') await ws.refresh();
    } finally {
      setMdConfirming(false);
    }
  };

  return (
    <div
      className={`rounded-xl border border-amber-300 bg-amber-50/95 px-3 py-2.5 space-y-2 ${className}`.trim()}
      role="status"
    >
      <p className="text-[10px] font-black text-amber-950 uppercase tracking-wide">Pricing policy — production blocked</p>
      <p className="text-[10px] text-amber-950/90 leading-relaxed">
        {bmApproved
          ? quotationRefundBlockedPendingMdPriceConfirm(quoteRow)
            ? 'Branch manager approved below-floor pricing — production may proceed. After production, the Managing Director must confirm before any customer refund.'
            : 'Below-floor exception is on file — production may proceed if coils and other gates are satisfied.'
          : 'Quoted ₦/m is below the current material workbook floor on one or more lines. This often happens when the quote was prepared before prices were synced. Production cannot start until a branch manager or administrator approves the locked quote price.'}
      </p>
      {loading ? <p className="text-[9px] text-amber-900/70">Checking pricing…</p> : null}
      <ul className="text-[10px] text-amber-950 space-y-1 list-disc pl-4">
        {violations.map((v, i) => (
          <li key={i}>
            <span className="font-semibold capitalize">{v.lineCategory || 'line'}</span> #{Number(v.lineIndex) + 1}:{' '}
            {v.code === 'below_floor' ? 'Below workbook floor' : 'Below trading band'} — quoted{' '}
            {formatNgn(v.quotedPerMeter)}/m; minimum {formatNgn(v.minAllowedPerMeter ?? v.floorPerMeter)}/m
          </li>
        ))}
      </ul>
      {ws?.canMutate &&
      canApproveBmPriceException &&
      ws?.hasPermission?.('refunds.approve') &&
      !bmApproved ? (
        <button
          type="button"
          onClick={() => void onBmPriceExceptionApprove()}
          disabled={bmApproving}
          className="inline-flex items-center justify-center rounded-lg bg-amber-800 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-white hover:bg-amber-900 disabled:opacity-40"
        >
          {bmApproving ? 'Recording…' : 'Approve below-floor pricing (unlock production)'}
        </button>
      ) : null}
      {!bmApproved && (!canApproveBmPriceException || !ws?.hasPermission?.('refunds.approve')) ? (
        <p className="text-[9px] text-amber-900/85">
          Ask your branch manager (or an administrator) to open Sales → Quotations →{' '}
          <span className="font-mono font-semibold">{qid}</span> and approve the below-floor exception, or use the button
          above if your role allows it.
        </p>
      ) : null}
      {ws?.canMutate &&
      ws?.hasPermission?.('md.price_exception.approve') &&
      quotationRefundBlockedPendingMdPriceConfirm(quoteRow) &&
      productionClosedForQuote ? (
        <button
          type="button"
          onClick={() => void onMdPriceExceptionConfirm()}
          disabled={mdConfirming}
          className="inline-flex items-center justify-center rounded-lg bg-[#134e4a] px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-white hover:bg-[#0f3d39] disabled:opacity-40"
        >
          {mdConfirming ? 'Confirming…' : 'MD: confirm review (required before refund)'}
        </button>
      ) : null}
      {quotationRefundBlockedPendingMdPriceConfirm(quoteRow) && !productionClosedForQuote ? (
        <p className="text-[9px] text-amber-900/85">
          MD confirmation is only needed <strong className="font-semibold">after</strong> production is completed or
          cancelled — not to start the run.
        </p>
      ) : null}
      {bmApproved && quotationFlaggedForMdPriceReview(quoteRow) && quotationMdPriceReviewConfirmed(quoteRow) ? (
        <p className="text-[9px] text-emerald-900/90 font-medium">MD review confirmed — refunds may proceed when eligible.</p>
      ) : null}
    </div>
  );
}
