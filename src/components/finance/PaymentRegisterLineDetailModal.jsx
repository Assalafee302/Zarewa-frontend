/**
 * Opened Payment register line — this debit, sibling till/bank legs, and the source money story.
 */
import React, { useMemo } from 'react';
import { ModalFrame, ModalScrollShell, ModalScrollBody, ModalActionFooter } from '../layout';
import { formatNgn } from '../../Data/mockData';
import { formatPayoutQueueDate } from '../../lib/financeTreasuryPayoutQueueMeta';
import { buildPaymentRegisterLineDetail } from '../../lib/paymentRegisterLineDetail';

function MoneyRow({ label, value, tone }) {
  const cls =
    tone === 'rose'
      ? 'text-rose-800'
      : tone === 'emerald'
        ? 'text-emerald-800'
        : tone === 'amber'
          ? 'text-amber-900'
          : tone === 'violet'
            ? 'text-violet-900'
            : tone === 'teal'
              ? 'text-zarewa-teal'
              : 'text-slate-900';
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <span className={`font-black tabular-nums ${cls}`}>{formatNgn(value)}</span>
    </div>
  );
}

function Fact({ label, value }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-ui-xs font-bold uppercase tracking-widest text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-slate-800 break-words whitespace-pre-wrap">{value}</p>
    </div>
  );
}

export function PaymentRegisterLineDetailModal({
  row,
  isOpen,
  onClose,
  movements,
  refund,
  paymentRequest,
  expense,
  onOpenSource,
}) {
  const detail = useMemo(() => {
    if (!row) return null;
    return buildPaymentRegisterLineDetail({
      row,
      movements,
      refund,
      paymentRequest,
      expense,
    });
  }, [row, movements, refund, paymentRequest, expense]);

  if (!row || !detail) return null;

  const sourceLabel =
    detail.sourceKind === 'REFUND'
      ? 'Open refund'
      : detail.sourceKind === 'PAYMENT_REQUEST'
        ? 'Open request'
        : detail.sourceKind === 'EXPENSE'
          ? 'Open expense'
          : 'Open source';

  return (
    <ModalFrame isOpen={isOpen} onClose={onClose} title={`Payment ${detail.sourceId || detail.movementId}`} surface="plain">
      <ModalScrollShell>
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
          <div className="min-w-0">
            <p className="text-ui-xs font-bold uppercase tracking-widest text-zarewa-teal">{detail.typeLabel}</p>
            <h2 className="text-lg font-black text-slate-900 break-words">{detail.headline}</h2>
            <p className="mt-0.5 text-xs font-semibold text-slate-500">
              {formatPayoutQueueDate(detail.postedAtISO) || '—'}
              {detail.sourceId ? ` · ${detail.sourceId}` : ''}
            </p>
          </div>
          <p className="shrink-0 text-xl font-black tabular-nums text-zarewa-teal">{formatNgn(detail.amountNgn)}</p>
        </div>
        <ModalScrollBody className="px-5 pb-4 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-3 space-y-2">
            <p className="text-ui-xs font-bold uppercase tracking-wide text-slate-500">What happened</p>
            <ul className="space-y-1.5">
              {detail.sentences.map((sentence, index) => (
                <li key={`${index}-${sentence.slice(0, 24)}`} className="text-sm leading-relaxed text-slate-800">
                  {sentence}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 space-y-1.5">
            <p className="text-ui-xs font-bold uppercase tracking-wide text-slate-500 mb-1">Money</p>
            {detail.money.map((item) => (
              <MoneyRow key={item.label} label={item.label} value={item.amountNgn} tone={item.tone} />
            ))}
            {detail.accountName ? (
              <p className="pt-1 text-xs font-semibold text-slate-600">
                Paid from {detail.accountName}
                {detail.accountDetail ? ` · ${detail.accountDetail}` : ''}
              </p>
            ) : null}
          </div>

          {detail.splits.length > 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 space-y-1.5">
              <p className="text-ui-xs font-bold uppercase tracking-wide text-slate-500">Who the refund is for</p>
              <ul className="space-y-1">
                {detail.splits.map((split) => (
                  <li key={`${split.kind}-${split.label}`} className="flex justify-between gap-3 text-xs text-slate-800">
                    <span className="min-w-0 truncate" title={split.label}>
                      {split.label}
                      {split.companyNgn > 0 ? ` · company ${formatNgn(split.companyNgn)}` : ''}
                    </span>
                    <span className="shrink-0 tabular-nums font-bold">{formatNgn(split.netNgn)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {detail.legs.length > 0 ? (
            <div className="rounded-xl border border-teal-200 bg-teal-50/50 px-3 py-3 space-y-1.5">
              <p className="text-ui-xs font-bold uppercase tracking-wide text-teal-900">
                Till and bank lines on {detail.sourceId || 'this source'}
              </p>
              <ul className="space-y-1.5">
                {detail.legs.map((leg) => (
                  <li
                    key={leg.movementId || `${leg.postedAtISO}-${leg.amountNgn}`}
                    className={`rounded-lg px-2 py-1.5 text-xs ${
                      leg.isThisLine ? 'bg-white ring-1 ring-teal-300' : ''
                    }`}
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-slate-700">
                        {formatPayoutQueueDate(leg.postedAtISO) || '—'}
                        {leg.accountName ? ` · ${leg.accountName}` : ''}
                        {leg.direction === 'back' ? ' · back in' : ''}
                        {leg.isThisLine ? ' · this line' : ''}
                      </span>
                      <span
                        className={`tabular-nums font-bold ${
                          leg.direction === 'back' ? 'text-amber-900' : 'text-teal-950'
                        }`}
                      >
                        {leg.direction === 'back' ? '−' : ''}
                        {formatNgn(leg.amountAbs)}
                      </span>
                    </div>
                    {leg.reference || leg.note ? (
                      <p className="mt-0.5 text-slate-600">
                        {[leg.reference, leg.note].filter(Boolean).join(' · ')}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {detail.facts.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {detail.facts.map((fact) => (
                <Fact key={`${fact.label}-${fact.value}`} label={fact.label} value={fact.value} />
              ))}
            </div>
          ) : null}

          {detail.trail.length > 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 space-y-1">
              <p className="text-ui-xs font-bold uppercase tracking-wide text-slate-500">Who touched it</p>
              {detail.trail.map((step) => (
                <p key={step.label} className="text-xs text-slate-700">
                  <span className="font-semibold">{step.label}</span>
                  {step.value ? ` · ${step.value}` : ''}
                </p>
              ))}
            </div>
          ) : null}
        </ModalScrollBody>
        <ModalActionFooter
          onCancel={onClose}
          cancelLabel="Close"
          onConfirm={detail.canOpenSource && onOpenSource ? onOpenSource : undefined}
          confirmLabel={sourceLabel}
        />
      </ModalScrollShell>
    </ModalFrame>
  );
}
