import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { formatNgn } from '../../Data/mockData';
import {
  FinanceDeskColoredQueuePanel,
  FinanceDeskColoredQueueRow,
  FinanceDeskQueueActionButton,
} from './FinanceDeskColoredQueuePanel';

/**
 * Finance desk summary for haulage treasury lines not linked to PO transport.
 */
export function OrphanHaulageDeskPanel({
  orphanRows = [],
  canAccessProcurement = false,
  linkBusyId = '',
  onLinkAsHaulage,
}) {
  const [poDrafts, setPoDrafts] = useState({});
  if (!orphanRows.length) return null;
  return (
    <FinanceDeskColoredQueuePanel
      theme="rose"
      title="Unlinked haulage payments — not linked to PO transport"
      icon={<AlertTriangle size={16} strokeWidth={2} />}
      count={orphanRows.length}
      description="These treasury outflows look like haulage but are outside the PO transport payment flow. Reconcile in Procurement transport reconciliation or confirm as general expense."
      testId="finance-orphan-haulage-panel"
      action={
        canAccessProcurement ? (
          <Link
            to="/procurement"
            state={{ focusTab: 'transport' }}
            className="text-ui-xs font-bold uppercase text-rose-900 underline-offset-2 hover:underline"
          >
            Transport reconciliation
          </Link>
        ) : null
      }
    >
      <ul className="space-y-1.5">
        {orphanRows.slice(0, 8).map((row) => (
          <FinanceDeskColoredQueueRow
            key={row.movementId}
            theme="rose"
            title={
              <>
                <span className="font-mono">{row.movementId}</span>
                <span className="font-medium text-slate-600">
                  {' '}
                  · {row.counterpartyName || row.type || 'Haulage'}
                </span>
              </>
            }
            meta={`${String(row.postedAtISO || '').slice(0, 10)} · ${row.reason}`}
            amount={formatNgn(row.amountNgn)}
            actions={
              <div className="flex flex-col items-end gap-1">
                {row.sourceKind === 'PAYMENT_REQUEST' && row.sourceId && onLinkAsHaulage ? (
                  <form
                    className="flex flex-wrap items-center justify-end gap-1"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const poId = String(poDrafts[row.movementId] || '').trim();
                      if (!poId) return;
                      void onLinkAsHaulage(row, poId);
                    }}
                  >
                    <input
                      value={poDrafts[row.movementId] || ''}
                      onChange={(e) =>
                        setPoDrafts((prev) => ({ ...prev, [row.movementId]: e.target.value }))
                      }
                      placeholder="PO id"
                      aria-label={`PO for ${row.movementId}`}
                      className="w-28 rounded border border-rose-200 bg-white px-1.5 py-1 text-ui-xs font-mono"
                    />
                    <FinanceDeskQueueActionButton
                      tone="teal"
                      disabled={linkBusyId === `haulage-link:${row.movementId}` || !String(poDrafts[row.movementId] || '').trim()}
                      onClick={() => {
                        const poId = String(poDrafts[row.movementId] || '').trim();
                        if (!poId) return;
                        void onLinkAsHaulage(row, poId);
                      }}
                    >
                      Use as haulage
                    </FinanceDeskQueueActionButton>
                  </form>
                ) : null}
                <Link
                  to="/accounts"
                  state={{ accountsTab: 'movements' }}
                  className="text-ui-xs font-bold uppercase text-rose-900 hover:underline"
                >
                  View
                </Link>
              </div>
            }
          />
        ))}
      </ul>
      {orphanRows.length > 8 ? (
        <p className="text-ui-xs text-rose-900/70 mt-2 px-1">
          +{orphanRows.length - 8} more in Procurement → Transport reconciliation
        </p>
      ) : null}
    </FinanceDeskColoredQueuePanel>
  );
}
