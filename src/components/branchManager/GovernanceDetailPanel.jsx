import React, { useMemo } from 'react';
import { AlertTriangle, ExternalLink, ShieldAlert } from 'lucide-react';
import { Button } from '../ui';

function governanceSubtype(item) {
  const id = String(item?.id || '');
  if (id.startsWith('dual_control:')) return 'dual_control';
  if (id.startsWith('payment_gate:')) return 'payment_gate';
  return 'governance';
}

/**
 * Inline governance risk review — explains dual-control and payment-gate breaches.
 */
export function GovernanceDetailPanel({
  item,
  onClose,
  onOpenRefund,
  onOpenQuotation,
  onOpenProductionQc,
  onOpenProcurement,
}) {
  const subtype = useMemo(() => governanceSubtype(item), [item]);
  const reasons = Array.isArray(item?.reasons) ? item.reasons.filter(Boolean) : [];
  const row = item?.row || {};

  if (!item) return null;

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-4">
        <div className="flex items-start gap-3">
          <ShieldAlert size={22} className="text-rose-700 shrink-0 mt-0.5" aria-hidden />
          <div className="min-w-0">
            <p className="text-ui-xs font-black uppercase tracking-widest text-rose-800">Risk & governance</p>
            <h3 className="text-base font-black text-rose-950 mt-1 font-mono">{item.title || item.id}</h3>
            <p className="text-sm text-rose-900/90 mt-2 leading-relaxed">{item.subtitle || 'Management review required.'}</p>
          </div>
        </div>
      </div>

      {reasons.length > 0 ? (
        <div className="space-y-2">
          <p className="text-ui-xs font-black uppercase tracking-widest text-slate-500">Why this is flagged</p>
          <ul className="space-y-1.5">
            {reasons.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" aria-hidden />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {subtype === 'dual_control' ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 text-sm text-slate-700 leading-relaxed">
          <p className="font-semibold text-slate-900">Dual-control segregation</p>
          <p>
            Finance policy requires different people to request, approve, and pay refunds. When the same user appears in
            more than one step, the branch manager should verify the refund is legitimate before payout continues.
          </p>
          {row.kind === 'same_requester_approver' ? (
            <p className="text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs font-semibold">
              The person who requested this refund also approved it.
            </p>
          ) : null}
          {row.kind === 'same_approver_payer' ? (
            <p className="text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs font-semibold">
              The person who approved this refund also recorded payment.
            </p>
          ) : null}
          {item.refundId || row.refundId ? (
            <Button type="button" size="sm" onClick={() => onOpenRefund?.(item.refundId || row.refundId)}>
              <ExternalLink size={14} />
              Open refund review
            </Button>
          ) : null}
        </div>
      ) : null}

      {subtype === 'payment_gate' ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 text-sm text-slate-700 leading-relaxed">
          <p className="font-semibold text-slate-900">Payment gate on completed production</p>
          <p>
            A production job finished while the linked quotation was below the payment threshold and without a branch
            manager production override on file.
          </p>
          <dl className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg bg-slate-50 p-2">
              <dt className="text-slate-400 font-bold uppercase">Job</dt>
              <dd className="font-mono font-bold text-slate-800">{item.jobId || row.jobId || '—'}</dd>
            </div>
            <div className="rounded-lg bg-slate-50 p-2">
              <dt className="text-slate-400 font-bold uppercase">Paid on quote</dt>
              <dd className="font-bold text-slate-800">{row.paidPct != null ? `${row.paidPct}%` : '—'}</dd>
            </div>
            <div className="rounded-lg bg-slate-50 p-2 col-span-2">
              <dt className="text-slate-400 font-bold uppercase">Quotation</dt>
              <dd className="font-mono font-bold text-zarewa-teal">{item.quotationRef || row.quotationRef || '—'}</dd>
            </div>
          </dl>
          <div className="flex flex-wrap gap-2">
            {item.quotationRef || row.quotationRef ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onOpenQuotation?.(item.quotationRef || row.quotationRef)}
              >
                Open quotation
              </Button>
            ) : null}
            {item.jobId || row.jobId ? (
              <Button type="button" size="sm" variant="outline" onClick={() => onOpenProductionQc?.(item.jobId || row.jobId)}>
                Open production QC
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200">
        <Button type="button" variant="outline" size="sm" onClick={() => onOpenProcurement?.()}>
          Procurement desk
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={() => {
            // Acknowledge closes the review surface; underlying risk remains until the linked work item is resolved.
            onClose?.();
          }}
        >
          Mark reviewed
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => onClose?.()}>
          Close
        </Button>
      </div>
    </div>
  );
}
