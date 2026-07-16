import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../lib/apiBase';
import { appConfirm } from '../lib/appConfirm';
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
  const wsHasPermission = ws?.hasPermission;
  const wsRoleKey = ws?.session?.user?.roleKey;
  const { show: showToast } = useToast();
  const qid = String(quotationId || '').trim();
  const [violations, setViolations] = useState([]);
  const [hasFloorRows, setHasFloorRows] = useState(false);
  const [quoteRow, setQuoteRow] = useState(quotation ?? null);
  const [loading, setLoading] = useState(false);
  const [mdApproving, setMdApproving] = useState(false);

  const canApproveMdPriceException = useMemo(() => {
    if (wsHasPermission?.('*')) return true;
    if (wsHasPermission?.('md.price_exception.approve')) return true;
    const rk = String(wsRoleKey ?? '').trim().toLowerCase();
    return rk === 'md' || rk === 'admin';
  }, [wsHasPermission, wsRoleKey]);

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
      !(await appConfirm({
        message: 'Approve below-floor pricing for this quotation? Cutting lists and production may proceed after this step.',
      }))
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

  const totalGapNgn = violations.reduce((sum, v) => {
    const quoted = Number(v.quotedPerMeter) || 0;
    const min = Number(v.minAllowedPerMeter ?? v.minimumPerMeter ?? v.floorPerMeter) || 0;
    if (!(min > 0) || !(quoted > 0) || quoted >= min) return sum;
    return sum + (min - quoted);
  }, 0);

  return (
    <div
      className={`rounded-xl border border-amber-300 bg-amber-50/95 px-3 py-2.5 space-y-2 ${className}`.trim()}
      role="status"
    >
      <p className="text-ui-xs font-black text-amber-950 uppercase tracking-wide">Pricing policy</p>
      <p className="text-ui-xs text-amber-950/90 leading-relaxed">
        {mdApproved
          ? 'MD below-floor approval is on file — cutting lists and production may proceed if other gates are satisfied.'
          : 'Quoted ₦/m is below the material workbook floor on one or more lines. Cutting lists and production are blocked until the Managing Director or an administrator approves this exception.'}
      </p>
      {totalGapNgn > 0 && !mdApproved ? (
        <p className="text-ui-xs font-semibold text-amber-950 bg-amber-100/80 border border-amber-200 rounded-lg px-2 py-1.5">
          Margin impact: ~{formatNgn(totalGapNgn)}/m total shortfall vs minimum across flagged lines (before qty).
        </p>
      ) : null}
      {loading ? <p className="text-ui-xs text-amber-900/70">Checking pricing…</p> : null}
      <ul className="text-ui-xs text-amber-950 space-y-1.5 list-none pl-0">
        {violations.map((v, i) => {
          const quoted = Number(v.quotedPerMeter) || 0;
          const min = Number(v.minAllowedPerMeter ?? v.minimumPerMeter ?? v.floorPerMeter) || 0;
          const floor = Number(v.floorPerMeter) || min;
          const gap = min > 0 && quoted > 0 && quoted < min ? min - quoted : 0;
          const label =
            v.code === 'below_floor'
              ? v.trimWorkbook || v.priceBasis === 'published_list_plus_ridge'
                ? 'Below trim list price'
                : 'Below workbook floor'
              : 'Below trading band';
          return (
            <li
              key={i}
              className="rounded-lg border border-amber-200/80 bg-white/70 px-2.5 py-2 space-y-1"
            >
              <p className="font-semibold capitalize">
                {v.lineCategory || 'line'} #{Number(v.lineIndex) + 1}: {label}
              </p>
              <div className="flex flex-wrap gap-1.5">
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-slate-700">
                  Quoted {formatNgn(quoted)}/m
                </span>
                <span className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-red-800">
                  Floor {formatNgn(floor)}/m
                </span>
                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-amber-950">
                  Min {formatNgn(min)}/m
                </span>
                {gap > 0 ? (
                  <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-rose-800">
                    Gap −{formatNgn(gap)}/m
                  </span>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
      {ws?.canMutate && canApproveMdPriceException && !mdApproved ? (
        <button
          type="button"
          onClick={() => void onMdPriceExceptionApprove()}
          disabled={mdApproving}
          className="inline-flex items-center justify-center rounded-lg bg-zarewa-teal px-3 py-2 text-ui-xs font-bold uppercase tracking-wide text-white hover:bg-[#0f3d39] disabled:opacity-40"
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
        <p className="text-ui-xs text-emerald-900/90 font-medium">MD approval on file.</p>
      ) : quotationBelowFloorPendingMdApproval(quoteRow) ? (
        <p className="text-ui-xs text-amber-900/85">Awaiting MD or administrator approval.</p>
      ) : null}
    </div>
  );
}
