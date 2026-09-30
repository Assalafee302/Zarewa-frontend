import React from 'react';
import { DecisionBand, DecisionFact, DecisionWhatNext } from '../management/DecisionSurface';

function branchLabel(id, names) {
  const key = String(id || '').trim();
  if (!key) return '';
  return names[key] || key;
}

/**
 * Command Centre inter-branch loan MD review — route, principal, and what approve does.
 */
export function InterBranchLoanApprovalPreview({
  loanId,
  loan = null,
  row = null,
  loading = false,
  formatNgn,
  branchNameById = {},
}) {
  const l = loan && typeof loan === 'object' ? loan : {};
  const r = row && typeof row === 'object' ? row : {};
  const lenderId = l.lenderBranchId || r.lenderBranchId;
  const borrowerId = l.borrowerBranchId || r.borrowerBranchId;
  const lender = branchLabel(lenderId, branchNameById);
  const borrower = branchLabel(borrowerId, branchNameById);
  const route = lender && borrower ? `${lender} → ${borrower}` : lender || borrower || null;
  const principal = l.principalNgn ?? r.principalNgn;
  const purpose = l.purpose || r.purpose;
  const note = l.proposedNote || r.proposedNote;
  const reference = l.reference || r.reference;
  const dateISO = String(l.dateISO || r.dateISO || '').slice(0, 10);

  return (
    <div className="animate-in fade-in space-y-3 duration-200 text-slate-700">
      <DecisionBand
        tone="credit"
        eyebrow="Inter-branch loan"
        title={loanId || l.loanId || '—'}
        subtitle={route}
        aside={
          !loading && principal != null ? (
            <>
              <p className="text-ui-xs font-bold uppercase text-slate-400">Principal</p>
              <p className="text-xl font-black tabular-nums text-slate-900">{formatNgn(principal)}</p>
              {dateISO ? (
                <p className="mt-0.5 text-ui-xs uppercase tracking-wide text-slate-500">{dateISO}</p>
              ) : null}
            </>
          ) : null
        }
      >
        {loading ? <p className="mt-2 text-xs text-slate-500">Loading loan…</p> : null}
        {!loading ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <DecisionFact label="Lending branch" value={lender} />
            <DecisionFact label="Borrowing branch" value={borrower} />
            <DecisionFact label="Reference" value={reference} />
            <DecisionFact label="Purpose" value={purpose} />
          </div>
        ) : null}
        {!loading && note ? (
          <p className="mt-3 whitespace-pre-wrap rounded-lg border border-slate-100 bg-white px-3 py-2 text-sm leading-relaxed text-slate-700">
            {note}
          </p>
        ) : null}
      </DecisionBand>

      <DecisionWhatNext title="If you approve">
        Cash moves from the lending branch treasury to the borrowing branch. Reject returns the request without a
        transfer.
      </DecisionWhatNext>
    </div>
  );
}
