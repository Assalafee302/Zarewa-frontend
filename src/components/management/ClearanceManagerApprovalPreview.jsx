import React, { Fragment } from 'react';
import { RefreshCw, CheckCircle2, RotateCcw, Flag, Unlock, Zap } from 'lucide-react';
import { formatPersonName } from '../../lib/formatPersonName';
import { IntelDetailRow, IntelPanel, IntelStat } from './managementIntelUi';
import { ManagementQuotationIntelGrid } from './ManagementQuotationIntelGrid';

function percentPaid(paid, total) {
  const p = Math.round(Number(paid) || 0);
  const t = Math.round(Number(total) || 0);
  if (t <= 0) return p > 0 ? 100 : 0;
  return Math.min(100, Math.round((p / t) * 100));
}

/**
 * Four-quadrant clearance / flagged / production-gate review for Management action inbox.
 */
export function ClearanceManagerApprovalPreview({
  quoteId,
  inboxRow,
  auditData,
  paymentIntel,
  loadingAudit,
  loadingIntel,
  formatNgn,
  decisionBusy,
  reviewContext = 'clearance',
  fromProductionGate = false,
  cuttingListId = '',
  showReleasePayments = false,
  onApprove,
  onDisapprove,
  onFlag,
  onReleasePayments,
  onProductionOverride,
  canProductionOverride = true,
  canManagerClearance = true,
  canReleasePaymentHolds = false,
}) {
  /** Keep line items visible during background refund-intel refresh when data is already loaded. */
  const loading = loadingAudit || (loadingIntel && !paymentIntel);
  const paidNgn = Number(inboxRow?.paid_ngn ?? auditData?.summary?.paidNgn) || 0;
  const totalNgn = Number(inboxRow?.total_ngn ?? auditData?.summary?.orderTotalNgn) || 0;
  const pct = percentPaid(paidNgn, totalNgn);
  const refunds = Array.isArray(auditData?.refunds) ? auditData.refunds : [];

  const titleByContext = {
    clearance: 'Manager clearance',
    flagged: 'Flagged quotation',
    production: 'Production gate',
  };
  const accentByContext = {
    clearance: 'text-teal-700',
    flagged: 'text-rose-700',
    production: 'text-amber-700',
  };

  return (
    <div className="animate-in fade-in space-y-3 duration-200">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="min-w-0">
          <p className={`text-[10px] font-bold uppercase tracking-widest ${accentByContext[reviewContext] || accentByContext.clearance}`}>
            {titleByContext[reviewContext] || titleByContext.clearance}
          </p>
          <h2 className="font-mono text-lg font-black leading-tight text-slate-900">{quoteId}</h2>
          <p className="mt-0.5 truncate text-sm font-semibold text-slate-700">
            {formatPersonName(inboxRow?.customer_name || '—')}
          </p>
          {fromProductionGate ? (
            <p className="mt-1 text-[10px] leading-snug text-amber-800">
              Production gate (low payment){cuttingListId ? ` · cutting list ${cuttingListId}` : ''}.{' '}
              {Math.round(Number(inboxRow?.paid_ngn) || 0) <= 0
                ? 'Zero payment — MD approval required before cutting list / production.'
                : 'Branch Manager may approve when some payment is on file but below threshold.'}
            </p>
          ) : null}
          {reviewContext === 'flagged' && inboxRow?.manager_flag_reason ? (
            <p className="mt-1 text-[10px] leading-snug text-rose-800 line-clamp-3">{inboxRow.manager_flag_reason}</p>
          ) : null}
        </div>
        <div className="text-right">
          <p className="text-[9px] font-bold uppercase text-slate-400">Paid on quote</p>
          <p className="text-xl font-black tabular-nums text-emerald-800">{formatNgn(paidNgn)}</p>
          <p className="text-[10px] text-slate-500">
            of {formatNgn(totalNgn)} · <strong>{pct}%</strong>
          </p>
          {inboxRow?.date_iso ? (
            <p className="mt-0.5 text-[10px] text-slate-400">
              Quote date {new Date(inboxRow.date_iso).toLocaleDateString()}
            </p>
          ) : null}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-16">
          <RefreshCw className="animate-spin text-[#134e4a]" size={28} />
          <span className="text-[11px] font-semibold text-slate-500">Loading quotation context…</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <ManagementQuotationIntelGrid auditData={auditData} paymentIntel={paymentIntel} formatNgn={formatNgn} />

          <IntelPanel
            title="Clearance & decision"
            hint="Payment position, refunds on file, and manager actions for this quotation."
          >
            <div className="mb-3 grid grid-cols-2 gap-1.5">
              <IntelStat label="Paid in" value={formatNgn(paidNgn)} accent />
              <IntelStat label="Order total" value={formatNgn(totalNgn)} />
              <IntelStat label="% paid" value={`${pct}%`} />
              <IntelStat
                label="Outstanding"
                value={formatNgn(Math.max(0, totalNgn - paidNgn))}
              />
            </div>

            <IntelDetailRow label="Quote status" value={inboxRow?.status || auditData?.quotation?.status} />
            {reviewContext === 'flagged' ? (
              <IntelDetailRow label="Flag reason" value={inboxRow?.manager_flag_reason} />
            ) : null}
            {inboxRow?.manager_flagged_at_iso ? (
              <IntelDetailRow
                label="Flagged at"
                value={String(inboxRow.manager_flagged_at_iso).slice(0, 16).replace('T', ' ')}
              />
            ) : null}

            {refunds.length > 0 ? (
              <Fragment>
                <p className="mb-1 mt-2 text-[9px] font-black uppercase text-slate-400">
                  Refunds on quote ({refunds.length})
                </p>
                <div className="mb-3 space-y-1.5">
                  {refunds.map((r) => (
                    <div
                      key={r.refund_id}
                      className="rounded-lg border border-amber-200/80 bg-amber-50/60 px-2 py-1.5"
                    >
                      <div className="flex justify-between gap-2">
                        <span className="font-mono text-[10px] font-bold text-amber-950">{r.refund_id}</span>
                        <span className="font-bold tabular-nums text-amber-900">{formatNgn(r.amount_ngn)}</span>
                      </div>
                      <p className="text-[10px] text-slate-700">
                        {r.status} · {r.product || '—'}
                      </p>
                    </div>
                  ))}
                </div>
              </Fragment>
            ) : (
              <p className="mb-3 text-[10px] text-slate-500">No refund requests on this quotation.</p>
            )}

            <p className="mb-2 text-[10px] leading-snug text-slate-500">
              Approve records manager clearance. Disapprove or Flag both move the quote to the flagged inbox with your
              reason.
            </p>

            {showReleasePayments && canReleasePaymentHolds ? (
              <button
                type="button"
                disabled={decisionBusy}
                onClick={onReleasePayments}
                className="mb-2 flex w-full items-center justify-center gap-2 rounded-xl border border-sky-200 bg-sky-600 p-3 text-white transition-colors hover:bg-sky-500 disabled:opacity-50"
              >
                <Unlock size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest">Release for payments</span>
              </button>
            ) : null}

            {canManagerClearance ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <button
                type="button"
                disabled={decisionBusy}
                onClick={onApprove}
                className="flex flex-col items-center gap-1.5 rounded-xl bg-emerald-600 p-3 text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
              >
                <CheckCircle2 size={16} />
                <span className="text-[9px] font-black uppercase tracking-widest">Approve</span>
              </button>
              <button
                type="button"
                disabled={decisionBusy}
                onClick={onDisapprove}
                className="flex flex-col items-center gap-1.5 rounded-xl bg-slate-600 p-3 text-white transition-colors hover:bg-slate-500 disabled:opacity-50"
              >
                <RotateCcw size={16} />
                <span className="text-[9px] font-black uppercase tracking-widest">Disapprove</span>
              </button>
              <button
                type="button"
                disabled={decisionBusy}
                onClick={onFlag}
                className="flex flex-col items-center gap-1.5 rounded-xl bg-rose-600 p-3 text-white transition-colors hover:bg-rose-500 disabled:opacity-50"
              >
                <Flag size={16} />
                <span className="text-[9px] font-black uppercase tracking-widest">Flag</span>
              </button>
            </div>
            ) : (
              <p className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] text-amber-950">
                Quotation clearance requires Branch Manager, MD, or Administrator login.
              </p>
            )}

            {fromProductionGate && canProductionOverride ? (
              <button
                type="button"
                disabled={decisionBusy}
                onClick={onProductionOverride}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 p-3 text-white transition-colors hover:bg-teal-600 disabled:opacity-50"
              >
                <Zap size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest">Production override (low payment)</span>
              </button>
            ) : null}
            {fromProductionGate && !canProductionOverride ? (
              <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] text-amber-950">
                {Math.round(Number(inboxRow?.paid_ngn) || 0) <= 0
                  ? 'Zero payment on this quote — only the Managing Director can record production approval.'
                  : 'Production gate override requires Branch Manager or MD login.'}
              </p>
            ) : null}
          </IntelPanel>
        </div>
      )}
    </div>
  );
}
