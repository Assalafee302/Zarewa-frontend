import React from 'react';
import { formatPersonName } from '../../lib/formatPersonName';
import { DecisionBand, DecisionFact, DecisionWhatNext } from './DecisionSurface';

/**
 * Cash-tab payable withdrawal review.
 */
export function RegisterSettlementApprovalPreview({
  settlementId,
  row = null,
  formatNgn,
}) {
  const r = row && typeof row === 'object' ? row : {};
  const amount = formatNgn(r.amountNgn ?? r.amount_ngn);
  const requestedAt = String(r.requestedAtIso || r.requested_at_iso || '').slice(0, 10);
  const party = r.partyName || r.party_name;
  const requester = formatPersonName(r.requestedByName || r.requested_by_name || '');

  return (
    <div className="animate-in fade-in space-y-3 duration-200 text-slate-700">
      <DecisionBand
        tone="payment"
        eyebrow="Payable withdrawal"
        title={settlementId || r.settlementId || '—'}
        subtitle={party || null}
        aside={
          <>
            <p className="text-ui-xs font-bold uppercase text-slate-400">Amount</p>
            <p className="text-xl font-black tabular-nums text-slate-900">{amount}</p>
            {requestedAt ? (
              <p className="mt-0.5 text-ui-xs uppercase tracking-wide text-slate-500">{requestedAt}</p>
            ) : null}
          </>
        }
      >
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <DecisionFact label="Register line" value={r.registerLineId || r.register_line_id} mono />
          <DecisionFact label="Requested by" value={requester} />
        </div>
        {r.reason ? (
          <p className="mt-3 whitespace-pre-wrap rounded-lg border border-slate-100 bg-white px-3 py-2 text-sm leading-relaxed text-slate-700">
            {r.reason}
          </p>
        ) : null}
      </DecisionBand>

      <DecisionWhatNext title="If you approve">
        Finance can pay out {amount}
        {party ? ` to ${party}` : ''}. Reject stops this withdrawal and keeps the cash on the register.
      </DecisionWhatNext>
    </div>
  );
}
