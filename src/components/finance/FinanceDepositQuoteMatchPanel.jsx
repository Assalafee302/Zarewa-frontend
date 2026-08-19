import React from 'react';
import { Link2 } from 'lucide-react';
import { formatNgn } from '../../Data/mockData';
import { useFinanceDepositQuoteMatches } from '../../hooks/useFinanceDepositQuoteMatches.js';

/**
 * Recommended links between registered bank payments and quotation remaining balances.
 */
export function FinanceDepositQuoteMatchPanel() {
  const { matches, busyKey, runMatch, canApply, canConfirmPending } = useFinanceDepositQuoteMatches();
  if (!matches.length) return null;

  return (
    <section
      className="space-y-2 rounded-lg border border-teal-200/80 bg-teal-50/50 p-3"
      data-testid="finance-deposit-quote-matches"
    >
      <div>
        <h3 className="text-xs font-bold uppercase tracking-widest text-zarewa-teal">
          Bank payments that fit remaining balances
        </h3>
        <p className="text-ui-xs text-slate-600 mt-0.5">
          A registered bank amount matches a quotation still to settle. Confirm to post that remaining payment from the
          bank pool — treasury will not be credited again.
        </p>
      </div>
      <ul className="space-y-2">
        {matches.map((match) => {
          const canAct =
            match.action === 'confirm_receipt' ? canConfirmPending : canApply;
          const label =
            match.action === 'confirm_receipt'
              ? `Confirm pending ${match.pendingReceipt?.id || 'receipt'}`
              : match.amountExact
                ? 'Confirm remaining payment'
                : 'Confirm close match';
          return (
            <li
              key={match.key}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-teal-100 bg-white px-2.5 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="text-ui-xs font-semibold text-slate-800">
                  <span className="font-mono text-zarewa-teal">{match.depositId}</span>
                  {' · '}
                  {formatNgn(match.depositRemainingNgn)}
                  {' → '}
                  <span className="font-mono text-zarewa-teal">{match.quotationRef}</span>
                  {' · '}
                  {match.customer || '—'}
                  {' · balance '}
                  {formatNgn(match.quoteBalanceNgn)}
                </p>
                <p className="text-ui-xs text-slate-500 mt-0.5">
                  {match.amountExact ? 'Exact amount' : 'Close amount'}
                  {match.matchHints.length ? ` · ${match.matchHints.join(', ')}` : ''}
                  {match.action === 'confirm_receipt'
                    ? ' · Sales already recorded this remaining payment — confirm clearance.'
                    : ` · Post ${formatNgn(match.applyNgn)} from the registered bank payment.`}
                </p>
              </div>
              {canAct ? (
                <button
                  type="button"
                  disabled={busyKey === match.key}
                  onClick={() => void runMatch(match)}
                  className="inline-flex items-center gap-1 rounded-lg bg-zarewa-teal px-2.5 py-1 text-ui-xs font-bold uppercase text-white hover:brightness-110 disabled:opacity-50"
                >
                  <Link2 size={12} />
                  {busyKey === match.key ? 'Posting…' : label}
                </button>
              ) : (
                <span className="text-ui-xs font-semibold text-teal-800">Recommended</span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
