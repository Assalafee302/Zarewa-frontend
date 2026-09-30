import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { apiFetch } from '../../lib/apiBase';
import { appConfirm } from '../../lib/appConfirm';
import { formatNgn } from '../../Data/mockData';
import { formatPersonName } from '../../lib/formatPersonName';
import { ZareApprovalHint } from '../ZareApprovalHint';
import { DecisionBand, DecisionWhatNext } from '../management/DecisionSurface';
import {
  quotationBelowFloorExceptionApproved,
  quotationBelowFloorPendingMdApproval,
  quotationHasPaymentForMdBelowFloorQueue,
} from '../../lib/quotationPriceException';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useToast } from '../../context/ToastContext';

/** Permission gate: BM, MD, or administrator may stamp below-floor exceptions. */
function actorMayApproveBelowFloorPriceException(ws) {
  if (!ws) return false;
  if (ws.hasPermission?.('*')) return true;
  if (ws.hasPermission?.('md.price_exception.approve')) return true;
  if (ws.hasPermission?.('bm.price_exception.approve')) return true;
  const rk = String(ws.session?.user?.roleKey ?? '').trim().toLowerCase();
  return rk === 'md' || rk === 'admin' || rk === 'sales_manager' || rk === 'branch_manager';
}

/**
 * Below-floor pricing gate: branch manager, MD, or administrator approves before cutting list / refunds.
 *
 * @param {{
 *   quotationId: string;
 *   quotation?: object | null;
 *   onQuotationUpdated?: (q: object) => void;
 *   className?: string;
 *   layout?: 'banner' | 'desk';
 * }} props
 */
export function QuotationPriceExceptionPanel({
  quotationId,
  quotation,
  onQuotationUpdated,
  className = '',
  layout = 'banner',
}) {
  const ws = useWorkspace();
  const { show: showToast } = useToast();
  const qid = String(quotationId || '').trim();
  const [violations, setViolations] = useState([]);
  const [hasFloorRows, setHasFloorRows] = useState(false);
  const [quoteRow, setQuoteRow] = useState(quotation ?? null);
  const [loading, setLoading] = useState(false);
  const [approving, setApproving] = useState(false);
  const [deskAck, setDeskAck] = useState(false);

  const canApproveBelowFloor = useMemo(() => actorMayApproveBelowFloorPriceException(ws), [ws]);

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

  const approved = quotationBelowFloorExceptionApproved(quoteRow);
  const paidForQueue = quotationHasPaymentForMdBelowFloorQueue(quoteRow);
  const showApproveAction = paidForQueue && !approved;
  const showPanel = hasFloorRows && violations.length > 0;
  if (!qid || !showPanel) return null;

  const onApproveBelowFloor = async () => {
    if (!ws?.canMutate) {
      showToast('You do not have permission to record approvals.', { variant: 'error' });
      return;
    }
    if (!canApproveBelowFloor) {
      showToast(
        'Only a branch manager, the Managing Director, or an administrator may approve a below-floor price exception.',
        { variant: 'error' }
      );
      return;
    }
    if (!quotationHasPaymentForMdBelowFloorQueue(quoteRow)) {
      showToast('Post a customer receipt before approving below-floor pricing.', {
        variant: 'error',
      });
      return;
    }
    if (layout === 'desk') {
      if (!deskAck) {
        showToast('Tick that you have reviewed this below-floor sale.', { variant: 'error' });
        return;
      }
    } else if (
      !(await appConfirm({
        message:
          'Approve below-floor pricing for this quotation? Cutting lists and refunds may proceed after this step.',
      }))
    ) {
      return;
    }
    setApproving(true);
    try {
      // Shared endpoint: MD/admin stamp MD columns; branch manager stamps BM columns and notifies MD.
      const { ok, data } = await apiFetch(
        `/api/quotations/${encodeURIComponent(qid)}/md-price-exception-approve`,
        {
          method: 'PATCH',
          body: JSON.stringify({}),
        }
      );
      if (!ok || !data?.ok) {
        showToast(data?.error || 'Could not record below-floor approval.', { variant: 'error' });
        return;
      }
      if (data.delta && ws?.applyWriteDelta?.(data.delta)) {
        if (data.quotation) {
          setQuoteRow((prev) => ({ ...(prev || {}), ...data.quotation }));
          if (Array.isArray(data.quotation.pricingViolations)) setViolations(data.quotation.pricingViolations);
          if (data.quotation.pricingHasFloorRows != null) setHasFloorRows(Boolean(data.quotation.pricingHasFloorRows));
          onQuotationUpdated?.(data.quotation);
        }
      } else if (data.quotation) {
        mergeQuote(data.quotation);
      }
      showToast('Below-floor price exception approved — cutting list and refunds may proceed.');
      if (!(data.delta && typeof ws?.applyWriteDelta === 'function')) {
        if (typeof ws?.refreshDomain === 'function') void ws.refreshDomain('sales');
        else if (typeof ws?.refresh === 'function') await ws.refresh();
      }
    } finally {
      setApproving(false);
    }
  };

  const totalGapNgn = violations.reduce((sum, v) => {
    const quoted = Number(v.quotedPerMeter) || 0;
    const min = Number(v.minAllowedPerMeter ?? v.minimumPerMeter ?? v.floorPerMeter) || 0;
    if (!(min > 0) || !(quoted > 0) || quoted >= min) return sum;
    return sum + (min - quoted);
  }, 0);

  const violationRows = violations.map((v, i) => {
    const quoted = Number(v.quotedPerMeter) || 0;
    const min = Number(v.minAllowedPerMeter ?? v.minimumPerMeter ?? v.floorPerMeter) || 0;
    const floor = Number(v.floorPerMeter) || min;
    const gap = min > 0 && quoted > 0 && quoted < min ? min - quoted : 0;
    const label =
      v.code === 'below_floor'
        ? v.trimWorkbook ||
          v.priceBasis === 'published_list_plus_ridge' ||
          v.priceBasis === 'workbook_floor_plus_ridge'
          ? 'Below trim workbook floor'
          : 'Below workbook floor'
        : 'Below trading band';
    return {
      key: `${v.lineCategory || 'line'}-${v.lineIndex ?? i}-${v.code || 'v'}`,
      title: `${v.lineCategory || 'line'} #${Number(v.lineIndex) + 1}`,
      label,
      quoted,
      floor,
      min,
      gap,
      floorWhy: v.floorWhy,
    };
  });

  const approveControls = (
    <>
      {ws?.canMutate && canApproveBelowFloor && showApproveAction ? (
        <button
          type="button"
          onClick={() => void onApproveBelowFloor()}
          disabled={approving}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-zarewa-teal px-3 py-2.5 text-ui-xs font-black uppercase tracking-widest text-white hover:brightness-105 disabled:opacity-40"
        >
          <CheckCircle2 size={16} />
          {approving ? 'Recording…' : 'Approve below-floor pricing'}
        </button>
      ) : null}
      {!approved && !canApproveBelowFloor ? (
        <ZareApprovalHint
          compact
          context={{
            referenceNo: qid,
            documentType: 'quotation',
            status: 'pricing_blocked',
            canApprove: false,
            missingPermission:
              'Below-floor pricing needs branch manager, Managing Director, or administrator approval before cutting list or refunds.',
            zareQuery: `Why can't I create a cutting list on quotation ${qid} with below-floor pricing?`,
          }}
        />
      ) : null}
      {approved ? (
        <p className="text-ui-xs font-medium text-emerald-900/90">Below-floor approval on file.</p>
      ) : quotationBelowFloorPendingMdApproval(quoteRow) && paidForQueue ? (
        <p className="text-ui-xs text-amber-900/85">Awaiting branch manager, MD, or administrator approval.</p>
      ) : quotationBelowFloorPendingMdApproval(quoteRow) && !paidForQueue ? (
        <p className="text-ui-xs text-amber-900/85">Not on the approval queue until a receipt is posted.</p>
      ) : null}
    </>
  );

  if (layout === 'desk') {
    const customer = formatPersonName(quoteRow?.customerName || quoteRow?.customer_name || '');
    return (
      <div className={`space-y-3 ${className}`.trim()} role="status">
        <DecisionBand
          tone="flagged"
          eyebrow="Below-floor price"
          title={qid}
          subtitle={customer || null}
          aside={
            totalGapNgn > 0 && !approved ? (
              <>
                <p className="text-ui-xs font-bold uppercase text-slate-400">Shortfall</p>
                <p className="text-xl font-black tabular-nums text-rose-800">~{formatNgn(totalGapNgn)}/m</p>
                <p className="text-ui-xs text-slate-500">vs workbook floor</p>
              </>
            ) : null
          }
        >
          <p className="mt-2 text-sm leading-relaxed text-slate-800">
            {approved
              ? 'This exception is already on file. Cutting lists and refunds may proceed if other gates are satisfied.'
              : paidForQueue
                ? 'One or more lines are quoted below the workbook floor. Cutting lists and refunds stay blocked until you approve.'
                : 'Lines are below the workbook floor. A customer receipt must be posted before this can sit on the approval queue.'}
          </p>
          {quoteRow?.pricingFloor?.freezeWhy ? (
            <p className="mt-1 text-xs leading-relaxed text-slate-600">{quoteRow.pricingFloor.freezeWhy}</p>
          ) : null}
        </DecisionBand>

        {loading ? <p className="text-xs font-semibold text-slate-500">Checking pricing…</p> : null}

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-ui-xs font-bold uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2">Line</th>
                <th className="px-3 py-2 text-right">Quoted</th>
                <th className="px-3 py-2 text-right">Floor</th>
                <th className="px-3 py-2 text-right">Gap</th>
              </tr>
            </thead>
            <tbody>
              {violationRows.map((row) => (
                <tr key={row.key} className="border-b border-slate-100 last:border-0">
                  <td className="px-3 py-2.5">
                    <p className="font-semibold capitalize text-slate-800">{row.title}</p>
                    <p className="text-ui-xs text-slate-500">{row.label}</p>
                    {row.floorWhy ? <p className="mt-0.5 text-ui-xs text-slate-500">{row.floorWhy}</p> : null}
                  </td>
                  <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-slate-900">
                    {formatNgn(row.quoted)}/m
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">{formatNgn(row.floor)}/m</td>
                  <td className="px-3 py-2.5 text-right font-bold tabular-nums text-rose-700">
                    {row.gap > 0 ? `−${formatNgn(row.gap)}/m` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <DecisionWhatNext title="If you approve">
          Cutting lists and refunds may proceed on this quotation. The Managing Director is notified; they do not need
          to re-approve.
        </DecisionWhatNext>

        {showApproveAction && ws?.canMutate && canApproveBelowFloor ? (
          <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs leading-snug text-slate-700">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-zarewa-teal focus:ring-zarewa-teal"
              checked={deskAck}
              onChange={(e) => setDeskAck(e.target.checked)}
            />
            <span>
              I have reviewed quoted ₦/m against the workbook floor and accept this sale below floor on {qid}.
            </span>
          </label>
        ) : null}

        <div className="space-y-2">{approveControls}</div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border border-amber-300 bg-amber-50/95 px-3 py-2.5 space-y-2 ${className}`.trim()}
      role="status"
    >
      <p className="text-ui-xs font-black text-amber-950 uppercase tracking-wide">Pricing policy</p>
      <p className="text-ui-xs text-amber-950/90 leading-relaxed">
        {approved
          ? 'Below-floor approval is on file — cutting lists and refunds may proceed if other gates are satisfied.'
          : paidForQueue
            ? 'Quoted ₦/m is below the material workbook floor on one or more lines. Cutting lists and refunds are blocked until a branch manager, the Managing Director, or an administrator approves this exception.'
            : 'Quoted ₦/m is below the material workbook floor on one or more lines. Cutting lists and refunds stay blocked. Approval is requested only after a customer receipt is posted.'}
      </p>
      {quoteRow?.pricingFloor?.freezeWhy ? (
        <p className="text-ui-xs text-amber-950/80 leading-relaxed">{quoteRow.pricingFloor.freezeWhy}</p>
      ) : null}
      {totalGapNgn > 0 && !approved ? (
        <p className="text-ui-xs font-semibold text-amber-950 bg-amber-100/80 border border-amber-200 rounded-lg px-2 py-1.5">
          Margin impact: ~{formatNgn(totalGapNgn)}/m total shortfall vs minimum across flagged lines (before qty).
        </p>
      ) : null}
      {loading ? <p className="text-ui-xs text-amber-900/70">Checking pricing…</p> : null}
      <ul className="text-ui-xs text-amber-950 space-y-1.5 list-none pl-0">
        {violationRows.map((row) => (
          <li key={row.key} className="rounded-lg border border-amber-200/80 bg-white/70 px-2.5 py-2 space-y-1">
            <p className="font-semibold capitalize">
              {row.title}: {row.label}
            </p>
            <div className="flex flex-wrap gap-1.5">
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-slate-700">
                Quoted {formatNgn(row.quoted)}/m
              </span>
              <span className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-red-800">
                Floor {formatNgn(row.floor)}/m
              </span>
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-amber-950">
                Min {formatNgn(row.min)}/m
              </span>
              {row.gap > 0 ? (
                <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-rose-800">
                  Gap −{formatNgn(row.gap)}/m
                </span>
              ) : null}
            </div>
            {row.floorWhy ? <p className="text-[10px] leading-snug text-amber-950/80">{row.floorWhy}</p> : null}
          </li>
        ))}
      </ul>
      {approveControls}
    </div>
  );
}
