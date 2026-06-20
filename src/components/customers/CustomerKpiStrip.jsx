import React from 'react';
import { Info } from 'lucide-react';
import { formatNgn } from '../../Data/mockData';

function KpiCard({ label, value, hint, tone = 'default', action, info }) {
  const tones = {
    default: 'border-slate-200/80 bg-white',
    amber: 'border-amber-200/80 bg-gradient-to-br from-amber-50 to-white',
    violet: 'border-violet-200/80 bg-gradient-to-br from-violet-50 to-white',
    teal: 'border-teal-200/80 bg-gradient-to-br from-teal-50/80 to-white',
  };
  const labelTones = {
    default: 'text-slate-500',
    amber: 'text-amber-800',
    violet: 'text-violet-900',
    teal: 'text-teal-800',
  };
  const valueTones = {
    default: 'text-[#134e4a]',
    amber: 'text-amber-950',
    violet: 'text-violet-950',
    teal: 'text-[#134e4a]',
  };

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${tones[tone] || tones.default}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className={`text-[9px] font-black uppercase tracking-widest ${labelTones[tone] || labelTones.default}`}>
          {label}
        </p>
        {info ? (
          <details className="relative shrink-0">
            <summary
              className="list-none cursor-pointer rounded-full p-0.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none [&::-webkit-details-marker]:hidden"
              aria-label={`About ${label}`}
            >
              <Info className="size-3.5" strokeWidth={2.25} />
            </summary>
            <div className="absolute right-0 top-full z-40 mt-1.5 w-[min(calc(100vw-2rem),17.5rem)] rounded-xl border border-slate-200 bg-white p-3 text-[10px] leading-snug text-slate-700 shadow-lg">
              {info}
            </div>
          </details>
        ) : null}
      </div>
      <p className={`text-2xl font-black tabular-nums leading-none ${valueTones[tone] || valueTones.default}`}>
        {value}
      </p>
      {hint ? <p className="text-[9px] text-slate-500 mt-2 leading-snug">{hint}</p> : null}
      {action}
    </div>
  );
}

/**
 * @param {{
 *   outstandingNgn: number;
 *   advanceBalNgn: number;
 *   overpayCreditBalNgn: number;
 *   totalPaidReceiptsNgn: number;
 *   quotationsCount: number;
 *   pendingQuotationsCount: number;
 *   paymentProgressPct: number;
 *   onRefundAdvance?: () => void;
 * }} props
 */
export function CustomerKpiStrip({
  outstandingNgn,
  advanceBalNgn,
  overpayCreditBalNgn,
  totalPaidReceiptsNgn,
  quotationsCount,
  pendingQuotationsCount,
  paymentProgressPct,
  onRefundAdvance,
}) {
  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-3 mb-8">
      <KpiCard
        label="Outstanding balance"
        value={formatNgn(outstandingNgn)}
        hint="Receivable after completed production only."
        tone="teal"
      />
      <KpiCard
        label="Advance (deposit)"
        value={formatNgn(advanceBalNgn)}
        tone="amber"
        info={
          <>
            Voluntary deposits until applied to a quotation or refunded. Use <strong>Refund advance</strong> for cash
            out.
          </>
        }
        action={
          advanceBalNgn > 0 && onRefundAdvance ? (
            <button
              type="button"
              onClick={onRefundAdvance}
              className="mt-2 text-[9px] font-bold uppercase text-amber-900 hover:underline"
            >
              Refund advance
            </button>
          ) : null
        }
      />
      <KpiCard
        label="Overpayment credit"
        value={formatNgn(overpayCreditBalNgn)}
        tone="violet"
        info={<>From receipts above balance due — separate from deposit advance. Refund via Sales → Refunds.</>}
      />
      <KpiCard
        label="Total paid"
        value={formatNgn(totalPaidReceiptsNgn)}
        hint="Receipts and ledger posts (deduplicated)."
      />
      <KpiCard
        label="Quotations"
        value={String(quotationsCount)}
        hint={`${pendingQuotationsCount} pending / unpaid`}
      />
      <KpiCard
        label="Payment coverage"
        value={`${paymentProgressPct}%`}
        hint="Share of invoice totals covered by payments."
        action={
          <div className="mt-2 h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#134e4a] to-teal-400 transition-all"
              style={{ width: `${paymentProgressPct}%` }}
            />
          </div>
        }
      />
    </section>
  );
}
