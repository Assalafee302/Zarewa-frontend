import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../lib/apiBase';
import { formatNgn } from '../Data/mockData';
import { ZareApprovalHint } from './ZareApprovalHint';
import {
  quotationBelowFloorExceptionApproved,
  quotationBelowFloorPendingMdApproval,
} from '../lib/quotationPriceException';
import { useWorkspace } from '../context/WorkspaceContext';
import { useToast } from '../context/ToastContext';

/**
 * Below-floor pricing gate: MD or administrator approves before cutting list and production.
 *
 * @param {{
 *   quotationId: string;
 *   quotation?: object | null;
 *   onQuotationUpdated?: (q: object) => void;
 *   className?: string;
 * }} props
 */
export function QuotationPriceExceptionPanel({
  quotationId,
  quotation,
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
  const [mdApproving, setMdApproving] = useState(false);

  const canApproveMdPriceException = useMemo(() => {
    if (ws?.hasPermission?.('*')) return true;
    if (ws?.hasPermission?.('md.price_exception.approve')) return true;
    const rk = String(ws?.session?.user?.roleKey ?? '').trim().toLowerCase();
    return rk === 'md' || rk === 'admin';
  }, [ws?.session?.user?.roleKey, ws]);

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

  const mdApproved = quotationBelowFloorExceptionApproved(quoteRow);
  const showPanel = hasFloorRows && violations.length > 0;
  if (!qid || !showPanel) return null;

  const onMdPriceExceptionApprove = async () => {
    if (!ws?.canMutate) {
      showToast('You do not have permission to record approvals.', { variant: 'error' });
      return;
    }
    if (!canApproveMdPriceException) {
      showToast('Only the Managing Director or an administrator may approve a below-floor price exception.', {
        variant: 'error',
      });
      return;
    }
    if (
      !window.confirm(
        'Approve below-floor pricing for this quotation? Cutting lists and production may proceed after this step.'
      )
    )
      return;
    setMdApproving(true);
    try {
      const { ok, data } = await apiFetch(
        `/api/quotations/${encodeURIComponent(qid)}/md-price-exception-approve`,
        {
          method: 'PATCH',
          body: JSON.stringify({}),
        }
      );
      if (!ok || !data?.ok) {
        showToast(data?.error || 'Could not record MD approval.', { variant: 'error' });
        return;
      }
      if (data.quotation) mergeQuote(data.quotation);
      showToast('MD below-floor approval recorded — cutting list and production may proceed.');
      if (typeof ws?.refresh === 'function') await ws.refresh();
    } finally {
      setMdApproving(false);
    }
  };

  return (
    <div
      className={`rounded-xl border border-amber-300 bg-amber-50/95 px-3 py-2.5 space-y-2 ${className}`.trim()}
      role="status"
    >
      <p className="text-[10px] font-black text-amber-950 uppercase tracking-wide">Pricing policy</p>
      <p className="text-[10px] text-amber-950/90 leading-relaxed">
        {mdApproved
          ? 'MD below-floor approval is on file — cutting lists and production may proceed if other gates are satisfied.'
          : 'Quoted ₦/m is below the material workbook floor on one or more lines. Cutting lists and production are blocked until the Managing Director or an administrator approves this exception.'}
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
      {ws?.canMutate && canApproveMdPriceException && !mdApproved ? (
        <button
          type="button"
          onClick={() => void onMdPriceExceptionApprove()}
          disabled={mdApproving}
          className="inline-flex items-center justify-center rounded-lg bg-[#134e4a] px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-white hover:bg-[#0f3d39] disabled:opacity-40"
        >
          {mdApproving ? 'Recording…' : 'MD: approve below-floor pricing'}
        </button>
      ) : null}
      {!mdApproved && !canApproveMdPriceException ? (
        <ZareApprovalHint
          compact
          context={{
            referenceNo: qid,
            documentType: 'quotation',
            status: 'pricing_blocked',
            canApprove: false,
            missingPermission:
              'Below-floor pricing needs Managing Director or administrator approval before cutting list or production.',
            zareQuery: `Why can't I create a cutting list on quotation ${qid} with below-floor pricing?`,
          }}
        />
      ) : null}
      {mdApproved ? (
        <p className="text-[9px] text-emerald-900/90 font-medium">MD approval on file.</p>
      ) : quotationBelowFloorPendingMdApproval(quoteRow) ? (
        <p className="text-[9px] text-amber-900/85">Awaiting MD or administrator approval.</p>
      ) : null}
    </div>
  );
}
